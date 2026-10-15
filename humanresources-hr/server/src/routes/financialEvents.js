import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const MODULE_KEY = 'financial_events'
const RECORD_KEY = 'financialEvents'
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
    if (event.id === undefined || event.id === null || !String(event.id).trim()) {
      return 'Todos os eventos precisam ter um identificador.'
    }
    if (!String(event.name || '').trim()) {
      return 'Todos os eventos precisam ter um nome.'
    }
    if (!EVENT_TYPES.has(event.type)) {
      return 'Um evento contém tipo inválido.'
    }
    if (!CALCULATION_TYPES.has(event.calculationType)) {
      return 'Um evento contém tipo de cálculo inválido.'
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

/**
 * Consulta o catálogo de eventos financeiros da empresa autenticada.
 * A lista continua em JSONB nesta etapa, mas a tela já não depende do
 * contrato síncrono do localStorage para consultar ou alterar o catálogo.
 */
router.get('/', async (req, res, next) => {
  if (!canView(req.user)) {
    return res.status(403).json({ message: 'Você não tem permissão para visualizar eventos financeiros.' })
  }

  try {
    const result = await pool.query(
      `SELECT payload
       FROM app_records
       WHERE company_id = $1 AND module_key = $2 AND record_key = $3
       LIMIT 1`,
      [req.user.companyId, MODULE_KEY, RECORD_KEY]
    )
    const events = result.rows[0]?.payload
    return res.json({ events: Array.isArray(events) ? events : [] })
  } catch (error) {
    return next(error)
  }
})

/**
 * Persiste a lista validada como uma única operação no PostgreSQL.
 * O escopo da empresa é sempre obtido do token, nunca do corpo enviado.
 */
router.put('/', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({ message: 'Você não tem permissão para gerenciar eventos financeiros.' })
  }

  const events = req.body?.events
  const validationError = validateEvents(events)
  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  try {
    const result = await pool.query(
      `INSERT INTO app_records
         (company_id, module_key, record_key, payload, created_by, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, $5)
       ON CONFLICT (company_id, module_key, record_key)
       DO UPDATE SET payload = EXCLUDED.payload,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()
       RETURNING payload, updated_at AS "updatedAt"`,
      [req.user.companyId, MODULE_KEY, RECORD_KEY, JSON.stringify(events), req.user.userId || null]
    )
    return res.json({
      events: Array.isArray(result.rows[0]?.payload) ? result.rows[0].payload : [],
      updatedAt: result.rows[0]?.updatedAt || null
    })
  } catch (error) {
    return next(error)
  }
})

export default router
