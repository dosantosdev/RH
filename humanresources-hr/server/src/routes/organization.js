import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const entities = {
  branches: {
    table: 'branches', permission: 'branches', fields: {
      name: 'name', code: 'code', cnpj: 'document_number', address: 'address',
      city: 'city', state: 'state', active: 'active'
    }, select: `id, name, code, document_number AS cnpj, address, city, state, active, created_at, updated_at`,
    required: ['name']
  },
  departments: {
    table: 'departments', permission: 'departments', fields: {
      name: 'name', code: 'code', description: 'description', branchId: 'branch_id', active: 'active'
    }, select: `d.id, d.name, d.code, d.description, d.branch_id AS "branchId", b.name AS "branchName", d.active, d.created_at, d.updated_at`,
    joins: 'd LEFT JOIN branches b ON b.id = d.branch_id AND b.company_id = d.company_id', alias: 'd', required: ['name']
  },
  roles: {
    table: 'roles', permission: 'roles', fields: {
      name: 'name', code: 'code', description: 'description', responsibilities: 'responsibilities',
      salaryMin: 'salary_min', salaryMax: 'salary_max', education: 'education', experience: 'experience',
      skills: 'skills', workRegime: 'work_regime', workload: 'workload', scheduleType: 'schedule_type',
      dailyHours: 'daily_hours', workDaysPerWeek: 'work_days_per_week', cycleWorkDays: 'cycle_work_days',
      cycleRestDays: 'cycle_rest_days', active: 'active', requiresCnh: 'requires_cnh',
      requiredCnhCategories: 'required_cnh_categories', requiredCertificates: 'required_certificates'
    }, select: `id, name, code, description, responsibilities, salary_min AS "salaryMin", salary_max AS "salaryMax", education, experience, skills, work_regime AS "workRegime", workload, schedule_type AS "scheduleType", daily_hours AS "dailyHours", work_days_per_week AS "workDaysPerWeek", cycle_work_days AS "cycleWorkDays", cycle_rest_days AS "cycleRestDays", active, requires_cnh AS "requiresCnh", required_cnh_categories AS "requiredCnhCategories", required_certificates AS "requiredCertificates", created_at, updated_at`,
    required: ['name']
  }
}

function companyId(req) {
  return req.user?.companyId
}
function normalizedValues(entity, body) {
  const entries = Object.entries(entity.fields).filter(([key]) => body[key] !== undefined)
  const jsonColumns = new Set(['required_cnh_categories', 'required_certificates'])
  return {
    columns: entries.map(([, column]) => column),
    values: entries.map(([key, column]) => {
      const value = body[key] === '' ? null : body[key]
      return value !== null && jsonColumns.has(column) ? JSON.stringify(value) : value
    })
  }
}

for (const [path, entity] of Object.entries(entities)) {
  const alias = entity.alias ? `${entity.alias}.` : ''
  const from = entity.joins ? `${entity.table} ${entity.joins}` : entity.table
  const idColumn = `${alias}id`
  const companyColumn = `${alias}company_id`

  router.get(`/${path}`, requirePermission(`${entity.permission}_view`), async (req, res, next) => {
    try {
      const result = await pool.query(`SELECT ${entity.select} FROM ${from} WHERE ${companyColumn} = $1 ORDER BY ${alias}name`, [companyId(req)])
      res.json(result.rows)
    } catch (error) { next(error) }
  })

  router.post(`/${path}`, requirePermission(`${entity.permission}_create`), async (req, res, next) => {
    try {
      for (const field of entity.required) if (!String(req.body?.[field] || '').trim()) return res.status(400).json({ message: `O campo ${field} é obrigatório.` })
      if (path === 'departments' && req.body?.branchId) {
        const branch = await pool.query('SELECT 1 FROM branches WHERE id = $1 AND company_id = $2', [req.body.branchId, companyId(req)])
        if (!branch.rowCount) return res.status(400).json({ message: 'A filial selecionada não pertence à empresa atual.' })
      }
      const { columns, values } = normalizedValues(entity, req.body || {})
      const result = await pool.query(`INSERT INTO ${entity.table} (company_id, ${columns.join(', ')}) VALUES ($1, ${values.map((_, i) => `$${i + 2}`).join(', ')}) RETURNING id`, [companyId(req), ...values])
      const saved = await pool.query(`SELECT ${entity.select} FROM ${from} WHERE ${idColumn} = $1 AND ${companyColumn} = $2`, [result.rows[0].id, companyId(req)])
      res.status(201).json(saved.rows[0])
    } catch (error) { next(error) }
  })

  router.patch(`/${path}/:id`, requirePermission(`${entity.permission}_edit`), async (req, res, next) => {
    try {
      if (path === 'departments' && req.body?.branchId) {
        const branch = await pool.query('SELECT 1 FROM branches WHERE id = $1 AND company_id = $2', [req.body.branchId, companyId(req)])
        if (!branch.rowCount) return res.status(400).json({ message: 'A filial selecionada não pertence à empresa atual.' })
      }
      const { columns, values } = normalizedValues(entity, req.body || {})
      if (!columns.length) return res.status(400).json({ message: 'Nenhum campo válido foi enviado.' })
      const assignments = columns.map((column, i) => `${column} = $${i + 3}`).join(', ')
      const result = await pool.query(`UPDATE ${entity.table} SET ${assignments}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id`, [req.params.id, companyId(req), ...values])
      if (!result.rowCount) return res.status(404).json({ message: 'Registro não encontrado.' })
      const saved = await pool.query(`SELECT ${entity.select} FROM ${from} WHERE ${idColumn} = $1 AND ${companyColumn} = $2`, [req.params.id, companyId(req)])
      res.json(saved.rows[0])
    } catch (error) { next(error) }
  })

  router.delete(`/${path}/:id`, requirePermission(`${entity.permission}_delete`), async (req, res, next) => {
    try {
      const result = await pool.query(`DELETE FROM ${entity.table} WHERE id = $1 AND company_id = $2 RETURNING id`, [req.params.id, companyId(req)])
      if (!result.rowCount) return res.status(404).json({ message: 'Registro não encontrado.' })
      res.status(204).end()
    } catch (error) { next(error) }
  })
}

export default router
