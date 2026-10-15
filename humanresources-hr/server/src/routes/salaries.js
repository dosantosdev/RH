import express from 'express'
import { randomUUID } from 'node:crypto'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const MODULE_KEY = 'salaries'
const RECORD_KEY = 'salaryHistory'
const MAX_RECORDS = 5000
const MAX_PAYLOAD_BYTES = 1024 * 1024

function hasPermission(user, permission) {
  return user?.isAdmin === true ||
    (Array.isArray(user?.permissions) && user.permissions.includes(permission))
}

function canView(user) {
  return hasPermission(user, 'finance_salary_view') ||
    hasPermission(user, 'finance_salary_manage')
}

function canManage(user) {
  return hasPermission(user, 'finance_salary_manage')
}

function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return 'Envie um registro salarial válido.'
  }
  const salary = Number(record.salary)
  if (!Number.isFinite(salary) || salary < 0 || salary > 100000000) {
    return 'O valor salarial deve ser um número válido entre 0 e 100.000.000.'
  }
  if (typeof record.effectiveDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(record.effectiveDate) ||
      Number.isNaN(Date.parse(`${record.effectiveDate}T00:00:00Z`))) {
    return 'Informe uma data de vigência válida no formato AAAA-MM-DD.'
  }
  if (typeof record.reason !== 'string' || !record.reason.trim() || record.reason.length > 120) {
    return 'Informe um motivo válido de até 120 caracteres.'
  }
  if (typeof (record.notes || '') !== 'string' || String(record.notes || '').length > 4000) {
    return 'As observações devem ter no máximo 4000 caracteres.'
  }
  if (payloadSize(record) > 16 * 1024) return 'O registro salarial excede o limite permitido.'
  return null
}

function payloadSize(value) {
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8') } catch { return Infinity }
}


async function normalizeEmployeeReferences(companyId, history) {
  const employees = await pool.query(
    `SELECT id, registration_data
     FROM employees
     WHERE company_id = $1`,
    [companyId]
  )
  const aliases = new Map()
  for (const employee of employees.rows) {
    const registration = employee.registration_data && typeof employee.registration_data === 'object'
      ? employee.registration_data
      : {}
    for (const alias of [
      employee.id,
      registration.legacyId,
      registration.legacy_id,
      registration.idLegacy,
      registration.id
    ]) {
      if (alias !== undefined && alias !== null && String(alias).trim()) {
        aliases.set(String(alias), String(employee.id))
      }
    }
  }
  return history.map((record) => {
    if (!record || typeof record !== 'object' || record.employeeId === undefined || record.employeeId === null) {
      return record
    }
    const employeeId = aliases.get(String(record.employeeId))
    return employeeId ? { ...record, employeeId } : record
  })
}

async function withLockedHistory(companyId, userId, mutate) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Serializa alterações no histórico por empresa para evitar que duas
    // sessões sobrescrevam simultaneamente a lista JSONB inteira.
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(companyId), `${MODULE_KEY}:${RECORD_KEY}`]
    )
    const result = await client.query(
      `SELECT payload FROM app_records
       WHERE company_id = $1 AND module_key = $2 AND record_key = $3
       FOR UPDATE`,
      [companyId, MODULE_KEY, RECORD_KEY]
    )
    const history = Array.isArray(result.rows[0]?.payload) ? result.rows[0].payload : []
    const updatedHistory = await mutate(history, client)
    if (updatedHistory === null) {
      await client.query('ROLLBACK')
      return { status: 404, body: { message: 'Registro salarial não encontrado.' } }
    }
    if (!Array.isArray(updatedHistory) || updatedHistory.length > MAX_RECORDS ||
        payloadSize(updatedHistory) > MAX_PAYLOAD_BYTES) {
      await client.query('ROLLBACK')
      return { status: 413, body: { message: 'O histórico salarial excede os limites permitidos.' } }
    }
    await client.query(
      `INSERT INTO app_records
         (company_id, module_key, record_key, payload, created_by, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, $5)
       ON CONFLICT (company_id, module_key, record_key)
       DO UPDATE SET payload = EXCLUDED.payload, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [companyId, MODULE_KEY, RECORD_KEY, JSON.stringify(updatedHistory), userId || null]
    )
    await client.query('COMMIT')
    return { status: 200, body: { salaryHistory: updatedHistory } }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

async function ensureEmployeeInCompany(companyId, employeeId) {
  if (employeeId === undefined || employeeId === null || String(employeeId).trim() === '') return false
  const result = await pool.query(
    `SELECT 1 FROM employees
     WHERE company_id = $1
       AND (
         id::text = $2
         OR registration_data->>'legacyId' = $2
         OR registration_data->>'legacy_id' = $2
         OR registration_data->>'idLegacy' = $2
         OR registration_data->>'id' = $2
       )
     LIMIT 1`,
    [companyId, String(employeeId)]
  )
  return result.rowCount > 0
}

router.get('/', async (req, res, next) => {
  if (!canView(req.user)) return res.status(403).json({ message: 'Você não tem permissão para visualizar salários.' })
  try {
    const result = await pool.query(
      `SELECT payload FROM app_records
       WHERE company_id = $1 AND module_key = $2 AND record_key = $3 LIMIT 1`,
      [req.user.companyId, MODULE_KEY, RECORD_KEY]
    )
    const history = Array.isArray(result.rows[0]?.payload) ? result.rows[0].payload : []
    return res.json({ salaryHistory: await normalizeEmployeeReferences(req.user.companyId, history) })
  } catch (error) { return next(error) }
})

router.post('/', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para cadastrar salários.' })
  const validationError = validateRecord(req.body)
  if (validationError) return res.status(400).json({ message: validationError })
  try {
    if (!(await ensureEmployeeInCompany(req.user.companyId, req.body.employeeId))) {
      return res.status(400).json({ message: 'O funcionário informado não pertence à empresa autenticada.' })
    }
    const now = new Date().toISOString()
    const record = {
      id: randomUUID(),
      employeeId: String(req.body.employeeId),
      employeeName: String(req.body.employeeName || '').trim().slice(0, 180),
      salary: Math.round(Number(req.body.salary) * 100) / 100,
      effectiveDate: req.body.effectiveDate,
      reason: req.body.reason.trim(),
      notes: String(req.body.notes || '').trim(),
      createdAt: now,
      createdBy: req.user.name || req.user.username || 'Usuário'
    }
    const result = await withLockedHistory(req.user.companyId, req.user.userId, async (history) => {
      if (history.some((item) => String(item.employeeId) === record.employeeId &&
          String(item.effectiveDate) === record.effectiveDate)) {
        return history
      }
      return [...history, record]
    })
    if (result.status !== 200) return res.status(result.status).json(result.body)
    if (!result.body.salaryHistory.some((item) => item.id === record.id)) {
      return res.status(409).json({ message: 'Já existe um registro salarial para este funcionário nesta data de vigência.' })
    }
    return res.status(201).json({ salaryHistory: await normalizeEmployeeReferences(req.user.companyId, result.body.salaryHistory) })
  } catch (error) { return next(error) }
})

router.put('/:id', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para alterar salários.' })
  const validationError = validateRecord(req.body)
  if (validationError) return res.status(400).json({ message: validationError })
  try {
    const result = await withLockedHistory(req.user.companyId, req.user.userId, async (history) => {
      const index = history.findIndex((item) => String(item.id) === String(req.params.id))
      if (index < 0) return null
      const current = history[index]
      if (!(await ensureEmployeeInCompany(req.user.companyId, current.employeeId))) {
        return null
      }
      if (history.some((item, itemIndex) => itemIndex !== index &&
          String(item.employeeId) === String(current.employeeId) &&
          String(item.effectiveDate) === String(req.body.effectiveDate))) {
        const error = new Error('Já existe um registro salarial para este funcionário nesta data de vigência.')
        error.status = 409
        throw error
      }
      const updated = {
        ...current,
        salary: Math.round(Number(req.body.salary) * 100) / 100,
        effectiveDate: req.body.effectiveDate,
        reason: req.body.reason.trim(),
        notes: String(req.body.notes || '').trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: req.user.name || req.user.username || 'Usuário'
      }
      return history.map((item, itemIndex) => itemIndex === index ? updated : item)
    })
    if (result.status !== 200) return res.status(result.status).json(result.body)
    return res.json({ salaryHistory: await normalizeEmployeeReferences(req.user.companyId, result.body.salaryHistory) })
  } catch (error) {
    if (error.status === 409) return res.status(409).json({ message: error.message })
    return next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para excluir salários.' })
  try {
    const result = await withLockedHistory(req.user.companyId, req.user.userId, async (history) => {
      const target = history.find((item) => String(item.id) === String(req.params.id))
      if (!target) return null
      if (!(await ensureEmployeeInCompany(req.user.companyId, target.employeeId))) return null
      return history.filter((item) => String(item.id) !== String(req.params.id))
    })
    if (result.status !== 200) return res.status(result.status).json(result.body)
    return res.json({ salaryHistory: await normalizeEmployeeReferences(req.user.companyId, result.body.salaryHistory) })
  } catch (error) { return next(error) }
})

export default router
