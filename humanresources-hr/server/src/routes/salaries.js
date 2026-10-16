import express from 'express'
import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const MAX_PAYLOAD_BYTES = 16 * 1024
const MAX_RECORDS = 5000

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

function payloadSize(value) {
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8') } catch { return Infinity }
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
      Number.isNaN(Date.parse(`${record.effectiveDate}T00:00:00Z`)) ||
      new Date(`${record.effectiveDate}T00:00:00Z`).toISOString().slice(0, 10) !== record.effectiveDate) {
    return 'Informe uma data de vigência válida no formato AAAA-MM-DD.'
  }
  if (typeof record.reason !== 'string' || !record.reason.trim() || record.reason.length > 120) {
    return 'Informe um motivo válido de até 120 caracteres.'
  }
  if (typeof (record.notes || '') !== 'string' || String(record.notes || '').length > 4000) {
    return 'As observações devem ter no máximo 4000 caracteres.'
  }
  if (payloadSize(record) > MAX_PAYLOAD_BYTES) return 'O registro salarial excede o limite permitido.'
  return null
}

async function resolveEmployee(companyId, employeeId, client = pool) {
  if (employeeId === undefined || employeeId === null || !String(employeeId).trim()) return null
  const result = await client.query(
    `SELECT id, name
     FROM employees
     WHERE company_id = $1
       AND (
         id::text = $2
         OR registration_data->>'legacyId' = $2
         OR registration_data->>'legacy_id' = $2
         OR registration_data->>'idLegacy' = $2
         OR registration_data->>'id' = $2
       )
     ORDER BY CASE WHEN id::text = $2 THEN 0 ELSE 1 END
     LIMIT 1`,
    [companyId, String(employeeId)]
  )
  return result.rows[0] || null
}

function mapSalaryRow(row) {
  const legacy = row.payload && typeof row.payload === 'object' && !Array.isArray(row.payload)
    ? row.payload
    : {}
  return {
    ...legacy,
    id: String(row.external_id),
    employeeId: row.employee_id ? String(row.employee_id) : String(row.external_employee_id || legacy.employeeId || ''),
    employeeName: row.employee_name || legacy.employeeName || '',
    salary: Number(row.salary),
    effectiveDate: String(row.effective_date).slice(0, 10),
    reason: row.reason,
    notes: row.notes || '',
    createdAt: legacy.createdAt || row.created_at,
    createdBy: legacy.createdBy || '',
    ...(row.updated_at ? { updatedAt: row.updated_at } : {})
  }
}

async function listSalaryHistory(companyId, client = pool) {
  const result = await client.query(
    `SELECT external_id, employee_id, external_employee_id, employee_name,
            salary, effective_date, reason, notes, payload, created_at, updated_at
     FROM salary_history
     WHERE company_id = $1
     ORDER BY effective_date DESC, created_at DESC, external_id`,
    [companyId]
  )
  return result.rows.map(mapSalaryRow)
}

async function withCompanyLock(client, companyId) {
  await client.query(
    'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
    [String(companyId), 'salary-history:normalized']
  )
}

async function respondWithHistory(res, status = 200, companyId) {
  const salaryHistory = await listSalaryHistory(companyId)
  return res.status(status).json({ salaryHistory })
}

router.get('/', async (req, res, next) => {
  if (!canView(req.user)) return res.status(403).json({ message: 'Você não tem permissão para visualizar salários.' })
  try {
    const salaryHistory = await listSalaryHistory(req.user.companyId)
    return res.json({ salaryHistory })
  } catch (error) { return next(error) }
})

router.post('/', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para cadastrar salários.' })
  const validationError = validateRecord(req.body)
  if (validationError) return res.status(400).json({ message: validationError })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await withCompanyLock(client, req.user.companyId)
    const employee = await resolveEmployee(req.user.companyId, req.body.employeeId, client)
    if (!employee) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'O funcionário informado não pertence à empresa autenticada.' })
    }

    const countResult = await client.query(
      'SELECT COUNT(*)::integer AS total FROM salary_history WHERE company_id = $1',
      [req.user.companyId]
    )
    if (countResult.rows[0].total >= MAX_RECORDS) {
      await client.query('ROLLBACK')
      return res.status(413).json({ message: 'O histórico salarial atingiu o limite de registros permitido.' })
    }

    const duplicate = await client.query(
      `SELECT 1 FROM salary_history
       WHERE company_id = $1 AND employee_id = $2 AND effective_date = $3::date
       LIMIT 1`,
      [req.user.companyId, employee.id, req.body.effectiveDate]
    )
    if (duplicate.rowCount) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Já existe um registro salarial para este funcionário nesta data de vigência.' })
    }

    const record = {
      id: randomUUID(),
      employeeId: String(employee.id),
      employeeName: String(req.body.employeeName || employee.name || '').trim().slice(0, 180),
      salary: Math.round(Number(req.body.salary) * 100) / 100,
      effectiveDate: req.body.effectiveDate,
      reason: req.body.reason.trim(),
      notes: String(req.body.notes || '').trim(),
      createdAt: new Date().toISOString(),
      createdBy: req.user.name || req.user.username || 'Usuário'
    }
    await client.query(
      `INSERT INTO salary_history (
         company_id, external_id, employee_id, external_employee_id, employee_name,
         salary, effective_date, reason, notes, payload, created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10::jsonb, $11, $11)`,
      [req.user.companyId, record.id, employee.id, String(req.body.employeeId), record.employeeName,
        record.salary, record.effectiveDate, record.reason, record.notes, JSON.stringify(record), req.user.userId || null]
    )
    await client.query('COMMIT')
    return await respondWithHistory(res, 201, req.user.companyId)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally { client.release() }
})

router.put('/:id', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para alterar salários.' })
  const validationError = validateRecord(req.body)
  if (validationError) return res.status(400).json({ message: validationError })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await withCompanyLock(client, req.user.companyId)
    const currentResult = await client.query(
      `SELECT * FROM salary_history
       WHERE company_id = $1 AND external_id = $2
       FOR UPDATE`,
      [req.user.companyId, String(req.params.id)]
    )
    const current = currentResult.rows[0]
    if (!current) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Registro salarial não encontrado.' })
    }
    if (!current.employee_id) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Este registro legado não está vinculado a um funcionário válido. Corrija o vínculo antes de editá-lo.' })
    }

    const duplicate = await client.query(
      `SELECT 1 FROM salary_history
       WHERE company_id = $1 AND employee_id = $2 AND effective_date = $3::date AND external_id <> $4
       LIMIT 1`,
      [req.user.companyId, current.employee_id, req.body.effectiveDate, String(req.params.id)]
    )
    if (duplicate.rowCount) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Já existe um registro salarial para este funcionário nesta data de vigência.' })
    }

    const legacy = current.payload && typeof current.payload === 'object' && !Array.isArray(current.payload)
      ? current.payload
      : {}
    const updated = {
      ...legacy,
      id: String(current.external_id),
      employeeId: current.employee_id ? String(current.employee_id) : String(current.external_employee_id || ''),
      employeeName: current.employee_name || legacy.employeeName || '',
      salary: Math.round(Number(req.body.salary) * 100) / 100,
      effectiveDate: req.body.effectiveDate,
      reason: req.body.reason.trim(),
      notes: String(req.body.notes || '').trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.name || req.user.username || 'Usuário'
    }
    await client.query(
      `UPDATE salary_history
       SET salary = $1, effective_date = $2::date, reason = $3, notes = $4,
           payload = $5::jsonb, updated_by = $6
       WHERE company_id = $7 AND external_id = $8`,
      [updated.salary, updated.effectiveDate, updated.reason, updated.notes, JSON.stringify(updated),
        req.user.userId || null, req.user.companyId, String(req.params.id)]
    )
    await client.query('COMMIT')
    return await respondWithHistory(res, 200, req.user.companyId)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally { client.release() }
})

router.delete('/:id', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para excluir salários.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await withCompanyLock(client, req.user.companyId)
    const result = await client.query(
      `DELETE FROM salary_history
       WHERE company_id = $1 AND external_id = $2`,
      [req.user.companyId, String(req.params.id)]
    )
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Registro salarial não encontrado.' })
    }
    await client.query('COMMIT')
    return await respondWithHistory(res, 200, req.user.companyId)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally { client.release() }
})

export default router
