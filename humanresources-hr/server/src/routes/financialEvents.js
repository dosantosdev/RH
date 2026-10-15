import express from 'express'
import { Buffer } from 'node:buffer'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const MAX_EVENTS = 1000
const MAX_PAYLOAD_BYTES = 256 * 1024
const EVENT_TYPES = new Set(['provento', 'desconto'])
const CALCULATION_TYPES = new Set([
  'valor_fixo',
  'percentual_salario',
  'hora',
  'manual'
])

function hasPermission(user, permission) {
  if (user?.isAdmin === true) return true
  return Array.isArray(user?.permissions) && user.permissions.includes(permission)
}

function canView(user) {
  return hasPermission(user, 'finance_events_view') ||
    hasPermission(user, 'finance_events_manage')
}

function canManage(user) {
  return hasPermission(user, 'finance_events_manage')
}

function payloadSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8')
  } catch {
    return Infinity
  }
}

function validateEvents(events) {
  if (!Array.isArray(events) || events.length > MAX_EVENTS) {
    return 'Envie uma lista válida de até 1000 eventos financeiros.'
  }
  if (payloadSize(events) > MAX_PAYLOAD_BYTES) {
    return 'A lista de eventos excede o limite de 256 KB.'
  }

  const ids = new Set()
  const codes = new Set()
  for (const event of events) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      return 'A lista contém um evento inválido.'
    }
    if (event.id === undefined || event.id === null || !String(event.id).trim() || String(event.id).length > 180) {
      return 'Todos os eventos precisam ter um identificador válido.'
    }
    if (typeof event.name !== 'string' || !event.name.trim() || event.name.length > 180) {
      return 'Todos os eventos precisam ter um nome de até 180 caracteres.'
    }
    if (!EVENT_TYPES.has(event.type)) {
      return 'Um evento contém tipo inválido.'
    }
    if (!CALCULATION_TYPES.has(event.calculationType)) {
      return 'Um evento contém tipo de cálculo inválido.'
    }
    if (event.code !== undefined && event.code !== null && (typeof event.code !== 'string' || event.code.length > 40)) {
      return 'O código do evento deve ter no máximo 40 caracteres.'
    }
    if (event.notes !== undefined && event.notes !== null && (typeof event.notes !== 'string' || event.notes.length > 4000)) {
      return 'As observações devem ter no máximo 4000 caracteres.'
    }
    if (event.defaultValue !== undefined && event.defaultValue !== null && event.defaultValue !== '') {
      const value = Number(event.defaultValue)
      if (!Number.isFinite(value) || value < 0 || value > 1000000000) {
        return 'O valor padrão deve estar entre 0 e 1.000.000.000.'
      }
    }
    if (event.active !== undefined && typeof event.active !== 'boolean') {
      return 'O estado ativo do evento é inválido.'
    }

    const id = String(event.id)
    if (ids.has(id)) return 'Existem identificadores de evento duplicados.'
    ids.add(id)

    const code = String(event.code || '').trim().toUpperCase()
    if (code && codes.has(code)) return `O código ${code} está duplicado.`
    if (code) codes.add(code)
  }
  return null
}

function normalizeEvent(event) {
  const defaultValue = event.defaultValue === '' || event.defaultValue === undefined || event.defaultValue === null
    ? null
    : Number(event.defaultValue)
  return {
    ...event,
    id: String(event.id),
    name: event.name.trim(),
    code: String(event.code || '').trim().toUpperCase(),
    type: event.type,
    calculationType: event.calculationType,
    defaultValue,
    notes: String(event.notes || ''),
    active: event.active !== false
  }
}

/**
 * O catálogo é persistido como linhas relacionais por empresa.
 * O campo payload preserva propriedades legadas que a interface ainda utiliza.
 * A chave external_id mantém os IDs conhecidos pelo frontend.
 */
router.get('/', async (req, res, next) => {
  if (!canView(req.user)) {
    return res.status(403).json({ message: 'Você não tem permissão para visualizar eventos financeiros.' })
  }

  try {
    const result = await pool.query(
      `SELECT payload
       FROM financial_events
       WHERE company_id = $1
       ORDER BY lower(name), external_id`,
      [req.user.companyId]
    )
    const events = result.rows.map(({ payload }) => payload)
    return res.json({ events })
  } catch (error) {
    return next(error)
  }
})

/**
 * Mantém o contrato da tela atual, mas grava cada evento em uma linha.
 * A transação e o advisory lock impedem que duas listas concorrentes se
 * intercalem. O array legado em app_records é preservado como histórico,
 * não como fonte oficial após esta migração.
 */
router.put('/', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({ message: 'Você não tem permissão para gerenciar eventos financeiros.' })
  }

  const incoming = req.body?.events
  const validationError = validateEvents(incoming)
  if (validationError) {
    return res.status(400).json({ message: validationError })
  }
  const events = incoming.map(normalizeEvent)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(req.user.companyId), 'financial-events:catalog']
    )

    for (const event of events) {
      await client.query(
        `INSERT INTO financial_events (
           company_id, external_id, name, code, event_type, calculation_type,
           default_value, notes, active, payload, created_by, updated_by
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $11)
         ON CONFLICT (company_id, external_id)
         DO UPDATE SET
           name = EXCLUDED.name,
           code = EXCLUDED.code,
           event_type = EXCLUDED.event_type,
           calculation_type = EXCLUDED.calculation_type,
           default_value = EXCLUDED.default_value,
           notes = EXCLUDED.notes,
           active = EXCLUDED.active,
           payload = EXCLUDED.payload,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
        [
          req.user.companyId,
          event.id,
          event.name,
          event.code || null,
          event.type,
          event.calculationType,
          event.defaultValue,
          event.notes,
          event.active,
          JSON.stringify(event),
          req.user.userId || null
        ]
      )
    }

    if (events.length) {
      await client.query(
        `DELETE FROM financial_events
         WHERE company_id = $1 AND NOT (external_id = ANY($2::text[]))`,
        [req.user.companyId, events.map((event) => event.id)]
      )
    } else {
      await client.query(
        'DELETE FROM financial_events WHERE company_id = $1',
        [req.user.companyId]
      )
    }

    const saved = await client.query(
      `SELECT payload
       FROM financial_events
       WHERE company_id = $1
       ORDER BY lower(name), external_id`,
      [req.user.companyId]
    )
    await client.query('COMMIT')
    return res.json({
      events: saved.rows.map(({ payload }) => payload),
      updatedAt: new Date().toISOString()
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally {
    client.release()
  }
})

export default router
