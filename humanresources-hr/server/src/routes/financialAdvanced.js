import express from 'express'
import { Buffer } from 'node:buffer'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const TYPES = {
  vacations: { type: 'vacation', dateField: 'startDate', key: 'financialVacations' },
  thirteenths: { type: 'thirteenth', dateField: 'year', key: 'financialThirteenths' },
  terminations: { type: 'termination', dateField: 'dismissalDate', key: 'financialTerminations' }
}
const MAX_RECORD_BYTES = 256 * 1024
const MAX_IMPORT_RECORDS = 2000

function hasPermission(user, permission) {
  return user?.isAdmin === true ||
    (Array.isArray(user?.permissions) && user.permissions.includes(permission))
}

function canView(user) {
  return hasPermission(user, 'finance_advanced_view') || hasPermission(user, 'finance_advanced_manage')
}

function canManage(user) {
  return hasPermission(user, 'finance_advanced_manage')
}

function getType(value) {
  return TYPES[value] || null
}

function payloadSize(value) {
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8') } catch { return Infinity }
}

function validateRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return 'Envie um registro financeiro válido.'
  if (record.id !== undefined && (record.id === null || !String(record.id).trim() || String(record.id).length > 180)) {
    return 'O identificador do registro é inválido.'
  }
  if (payloadSize(record) > MAX_RECORD_BYTES) return 'O registro excede o limite de 256 KB.'
  if (record.employeeId !== undefined && record.employeeId !== null && String(record.employeeId).length > 180) {
    return 'O identificador do funcionário é inválido.'
  }
  if (record.status !== undefined && (typeof record.status !== 'string' || record.status.length > 40)) {
    return 'O status do registro é inválido.'
  }
  return null
}

function getRecordDate(typeConfig, record) {
  const value = record[typeConfig.dateField]
  if (typeConfig.type === 'thirteenth') {
    const year = String(value ?? '')
    return /^[0-9]{4}$/.test(year) ? `${year}-12-31` : null
  }

  const date = String(value ?? '')
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) return null
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
    ? date
    : null
}

async function resolveEmployee(client, companyId, employeeExternalId, { allowUnresolved = false } = {}) {
  if (employeeExternalId === null || employeeExternalId === undefined || String(employeeExternalId).trim() === '') {
    return { id: null, externalId: null }
  }
  const externalId = String(employeeExternalId)
  const result = await client.query(
    `SELECT id::text AS id
     FROM employees
     WHERE company_id = $1 AND (
       id::text = $2 OR registration_data->>'legacyId' = $2
       OR registration_data->>'legacy_id' = $2
       OR registration_data->>'idLegacy' = $2
       OR registration_data->>'id' = $2
     )
     ORDER BY CASE WHEN id::text = $2 THEN 0 ELSE 1 END
     LIMIT 1`,
    [companyId, externalId]
  )
  if (!result.rowCount) {
    if (allowUnresolved) return { id: null, externalId }
    const error = new Error('O funcionário selecionado não pertence à empresa autenticada ou não existe.')
    error.status = 400
    throw error
  }
  return { id: result.rows[0].id, externalId }
}

async function saveRecord(client, req, typeConfig, record, externalId, { insertOnly = false, allowUnresolvedEmployee = false } = {}) {
  const employee = await resolveEmployee(client, req.user.companyId, record.employeeId, {
    allowUnresolved: allowUnresolvedEmployee
  })
  const normalized = { ...record, id: externalId }
  const status = String(record.status || 'draft')
  const date = getRecordDate(typeConfig, record)
  const result = await client.query(
    `INSERT INTO financial_advanced_records (
       company_id, record_type, external_id, employee_id, employee_external_id,
       record_date, status, payload, created_by, updated_by
     ) VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8::jsonb, $9, $9)
     ON CONFLICT (company_id, record_type, external_id)
     DO ${insertOnly ? 'NOTHING' : `UPDATE SET
       employee_id = EXCLUDED.employee_id,
       employee_external_id = EXCLUDED.employee_external_id,
       record_date = EXCLUDED.record_date,
       status = EXCLUDED.status,
       payload = EXCLUDED.payload,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`}
     RETURNING external_id, payload`,
    [req.user.companyId, typeConfig.type, externalId, employee.id, employee.externalId,
      date, status, JSON.stringify(normalized), req.user.userId || null]
  )
  return result.rows[0] || null
}

async function listRecords(companyId, typeConfig, db = pool) {
  const result = await db.query(
    `SELECT external_id, payload
     FROM financial_advanced_records
     WHERE company_id = $1 AND record_type = $2
     ORDER BY record_date DESC NULLS LAST, created_at DESC, external_id`,
    [companyId, typeConfig.type]
  )
  return result.rows.map((row) => ({ ...row.payload, id: row.external_id }))
}

router.get('/:collection', async (req, res, next) => {
  const typeConfig = getType(req.params.collection)
  if (!typeConfig) return res.status(404).json({ message: 'Coleção financeira não encontrada.' })
  if (!canView(req.user)) return res.status(403).json({ message: 'Você não tem permissão para visualizar os registros financeiros.' })
  try {
    return res.json({ records: await listRecords(req.user.companyId, typeConfig) })
  } catch (error) { return next(error) }
})

router.post('/:collection/import-legacy', async (req, res, next) => {
  const typeConfig = getType(req.params.collection)
  if (!typeConfig) return res.status(404).json({ message: 'Coleção financeira não encontrada.' })
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para importar registros financeiros.' })
  const records = req.body?.records
  if (!Array.isArray(records) || records.length > MAX_IMPORT_RECORDS) {
    return res.status(400).json({ message: `Envie uma lista de até ${MAX_IMPORT_RECORDS} registros.` })
  }
  const invalid = records.map(validateRecord).find(Boolean)
  if (invalid) return res.status(400).json({ message: invalid })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [String(req.user.companyId), `financial-advanced:${typeConfig.type}`])
    let importedCount = 0
    for (const record of records) {
      const externalId = String(record.id || `legacy-${Buffer.from(JSON.stringify(record)).toString('base64url').slice(0, 160)}`)
      const saved = await saveRecord(client, req, typeConfig, record, externalId, { insertOnly: true, allowUnresolvedEmployee: true })
      if (saved) importedCount += 1
    }
    const savedRecords = await listRecords(req.user.companyId, typeConfig, client)
    await client.query('COMMIT')
    return res.json({ records: savedRecords, importedCount })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally { client.release() }
})

router.post('/:collection', async (req, res, next) => {
  const typeConfig = getType(req.params.collection)
  if (!typeConfig) return res.status(404).json({ message: 'Coleção financeira não encontrada.' })
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para gerenciar os registros financeiros.' })
  const record = req.body?.record
  const validationError = validateRecord(record)
  if (validationError) return res.status(400).json({ message: validationError })
  const externalId = String(record.id || '')
  if (!externalId) return res.status(400).json({ message: 'O registro precisa de um identificador.' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [String(req.user.companyId), `financial-advanced:${typeConfig.type}`])
    const saved = await saveRecord(client, req, typeConfig, record, externalId, { insertOnly: true })
    if (!saved) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Este registro já existe. Atualize os dados antes de tentar novamente.' })
    }
    await client.query('COMMIT')
    return res.status(201).json({ record: { ...saved.payload, id: saved.external_id } })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally { client.release() }
})

router.put('/:collection/:id', async (req, res, next) => {
  const typeConfig = getType(req.params.collection)
  if (!typeConfig) return res.status(404).json({ message: 'Coleção financeira não encontrada.' })
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para gerenciar os registros financeiros.' })
  const record = req.body?.record
  const validationError = validateRecord(record)
  if (validationError) return res.status(400).json({ message: validationError })
  const externalId = String(req.params.id)
  if (record.id !== undefined && String(record.id) !== externalId) {
    return res.status(400).json({ message: 'O identificador do registro não pode ser alterado.' })
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))', [String(req.user.companyId), `financial-advanced:${typeConfig.type}`])
    const existing = await client.query(
      'SELECT 1 FROM financial_advanced_records WHERE company_id = $1 AND record_type = $2 AND external_id = $3 FOR UPDATE',
      [req.user.companyId, typeConfig.type, externalId]
    )
    if (!existing.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Registro financeiro não encontrado.' })
    }
    const saved = await saveRecord(client, req, typeConfig, record, externalId)
    if (!saved) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Registro financeiro não encontrado.' })
    }
    await client.query('COMMIT')
    return res.json({ record: { ...saved.payload, id: saved.external_id } })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally { client.release() }
})

router.delete('/:collection/:id', async (req, res, next) => {
  const typeConfig = getType(req.params.collection)
  if (!typeConfig) return res.status(404).json({ message: 'Coleção financeira não encontrada.' })
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para gerenciar os registros financeiros.' })
  try {
    const result = await pool.query(
      'DELETE FROM financial_advanced_records WHERE company_id = $1 AND record_type = $2 AND external_id = $3 RETURNING external_id',
      [req.user.companyId, typeConfig.type, req.params.id]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Registro financeiro não encontrado.' })
    return res.json({ deletedId: result.rows[0].external_id })
  } catch (error) { return next(error) }
})

export default router
