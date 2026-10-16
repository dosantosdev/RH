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
 * Importação assistida do cache legado. Só insere IDs ausentes; nunca apaga nem
 * substitui registros relacionais existentes. A empresa vem do token autenticado.
 */
router.post('/import-legacy', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({ message: 'Você não tem permissão para importar eventos financeiros.' })
  }

  const incoming = req.body?.events
  const validationError = validateEvents(incoming)
  if (validationError) return res.status(400).json({ message: validationError })

  const events = incoming.map(normalizeEvent)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(req.user.companyId), 'financial-events:catalog']
    )

    let insertedCount = 0
    for (const event of events) {
      const existing = await client.query(
        'SELECT external_id FROM financial_events WHERE company_id = $1 AND external_id = $2',
        [req.user.companyId, event.id]
      )
      if (existing.rowCount) continue

      if (event.code) {
        const duplicateCode = await client.query(
          `SELECT external_id FROM financial_events
           WHERE company_id = $1 AND upper(code) = upper($2)
           LIMIT 1`,
          [req.user.companyId, event.code]
        )
        if (duplicateCode.rowCount) {
          await client.query('ROLLBACK')
          return res.status(409).json({
            message: `O código ${event.code} já existe no PostgreSQL. Resolva a duplicidade antes de importar os dados locais.`
          })
        }
      }

      const now = new Date().toISOString()
      const importedEvent = {
        ...event,
        createdAt: event.createdAt || now,
        createdBy: event.createdBy || req.user.userId || null,
        updatedAt: now,
        updatedBy: req.user.userId || null
      }
      const inserted = await client.query(
        `INSERT INTO financial_events (
           company_id, external_id, name, code, event_type, calculation_type,
           default_value, notes, active, payload, created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $11)
         ON CONFLICT (company_id, external_id) DO NOTHING`,
        [
          req.user.companyId,
          importedEvent.id,
          importedEvent.name,
          importedEvent.code || null,
          importedEvent.type,
          importedEvent.calculationType,
          importedEvent.defaultValue,
          importedEvent.notes,
          importedEvent.active,
          JSON.stringify(importedEvent),
          req.user.userId || null
        ]
      )
      insertedCount += inserted.rowCount
    }

    const saved = await client.query(
      `SELECT payload FROM financial_events
       WHERE company_id = $1
       ORDER BY lower(name), external_id`,
      [req.user.companyId]
    )
    await client.query('COMMIT')
    return res.json({
      events: saved.rows.map(({ payload }) => payload),
      importedCount: insertedCount
    })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally {
    client.release()
  }
})

/**
 * Cria um único evento. Operações por registro evitam substituir o catálogo
 * inteiro e reduzem o risco de apagar alterações feitas por outra sessão.
 */
router.post('/', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({ message: 'Você não tem permissão para gerenciar eventos financeiros.' })
  }

  const incoming = req.body?.event
  const validationError = validateEvents([incoming])
  if (validationError) return res.status(400).json({ message: validationError })

  const event = normalizeEvent(incoming)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(req.user.companyId), 'financial-events:catalog']
    )

    const existingId = await client.query(
      'SELECT 1 FROM financial_events WHERE company_id = $1 AND external_id = $2',
      [req.user.companyId, event.id]
    )
    if (existingId.rowCount) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Já existe um evento com esse identificador. Atualize a lista e tente novamente.' })
    }

    if (event.code) {
      const duplicateCode = await client.query(
        `SELECT 1 FROM financial_events
         WHERE company_id = $1 AND upper(code) = upper($2)
         LIMIT 1`,
        [req.user.companyId, event.code]
      )
      if (duplicateCode.rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ message: `O código ${event.code} já está sendo utilizado.` })
      }
    }

    const now = new Date().toISOString()
    const savedEvent = {
      ...event,
      createdAt: event.createdAt || now,
      createdBy: req.user.userId || null,
      updatedAt: now,
      updatedBy: req.user.userId || null
    }

    await client.query(
      `INSERT INTO financial_events (
         company_id, external_id, name, code, event_type, calculation_type,
         default_value, notes, active, payload, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $11)`,
      [
        req.user.companyId,
        savedEvent.id,
        savedEvent.name,
        savedEvent.code || null,
        savedEvent.type,
        savedEvent.calculationType,
        savedEvent.defaultValue,
        savedEvent.notes,
        savedEvent.active,
        JSON.stringify(savedEvent),
        req.user.userId || null
      ]
    )

    await client.query('COMMIT')
    return res.status(201).json({ event: savedEvent })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally {
    client.release()
  }
})

/**
 * Atualiza apenas um evento. Campos de compatibilidade que não fazem parte
 * do formulário são preservados no payload relacional.
 */
router.patch('/:id', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({ message: 'Você não tem permissão para gerenciar eventos financeiros.' })
  }

  const incoming = req.body?.event
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return res.status(400).json({ message: 'Envie um evento financeiro válido.' })
  }
  const validationError = validateEvents([{ ...incoming, id: req.params.id }])
  if (validationError) return res.status(400).json({ message: validationError })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(req.user.companyId), 'financial-events:catalog']
    )

    const currentResult = await client.query(
      `SELECT payload
       FROM financial_events
       WHERE company_id = $1 AND external_id = $2
       FOR UPDATE`,
      [req.user.companyId, String(req.params.id)]
    )
    if (!currentResult.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Evento financeiro não encontrado.' })
    }

    const currentPayload = currentResult.rows[0].payload && typeof currentResult.rows[0].payload === 'object'
      ? currentResult.rows[0].payload
      : {}
    const event = normalizeEvent({ ...currentPayload, ...incoming, id: String(req.params.id) })

    if (event.code) {
      const duplicateCode = await client.query(
        `SELECT 1 FROM financial_events
         WHERE company_id = $1
           AND upper(code) = upper($2)
           AND external_id <> $3
         LIMIT 1`,
        [req.user.companyId, event.code, String(req.params.id)]
      )
      if (duplicateCode.rowCount) {
        await client.query('ROLLBACK')
        return res.status(409).json({ message: `O código ${event.code} já está sendo utilizado.` })
      }
    }

    const savedEvent = {
      ...event,
      createdAt: currentPayload.createdAt || event.createdAt || new Date().toISOString(),
      createdBy: currentPayload.createdBy ?? event.createdBy ?? null,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.userId || null
    }

    await client.query(
      `UPDATE financial_events
       SET name = $3, code = $4, event_type = $5, calculation_type = $6,
           default_value = $7, notes = $8, active = $9, payload = $10::jsonb,
           updated_by = $11, updated_at = NOW()
       WHERE company_id = $1 AND external_id = $2`,
      [
        req.user.companyId,
        String(req.params.id),
        savedEvent.name,
        savedEvent.code || null,
        savedEvent.type,
        savedEvent.calculationType,
        savedEvent.defaultValue,
        savedEvent.notes,
        savedEvent.active,
        JSON.stringify(savedEvent),
        req.user.userId || null
      ]
    )

    await client.query('COMMIT')
    return res.json({ event: savedEvent })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally {
    client.release()
  }
})

/**
 * Remove somente o evento solicitado, sempre no escopo da empresa autenticada.
 */
router.delete('/:id', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({ message: 'Você não tem permissão para gerenciar eventos financeiros.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(req.user.companyId), 'financial-events:catalog']
    )
    const result = await client.query(
      `DELETE FROM financial_events
       WHERE company_id = $1 AND external_id = $2
       RETURNING external_id`,
      [req.user.companyId, String(req.params.id)]
    )
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Evento financeiro não encontrado.' })
    }
    await client.query('COMMIT')
    return res.status(204).end()
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally {
    client.release()
  }
})

/**
 * Não aceita mais substituição do catálogo inteiro. Cada alteração precisa
 * utilizar POST, PATCH ou DELETE para não apagar eventos criados em outra sessão.
 */
router.put('/', (req, res) => {
  return res.status(409).json({
    message: 'A substituição completa do catálogo foi desativada. Utilize POST, PATCH ou DELETE em /api/financial-events.'
  })
})

export default router
