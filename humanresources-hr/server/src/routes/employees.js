import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

function isoDate(value) {
  if (!value) return null
  const text = String(value).trim()
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  return null
}

function normalizeDependent(dependent = {}) {
  return {
    name: String(dependent.name || '').trim(),
    cpf: dependent.cpf ? String(dependent.cpf).trim() : null,
    birthDate: isoDate(dependent.birthDate ?? dependent.birth_date),
    relationship: dependent.relationship ? String(dependent.relationship).trim() : null,
    data: {
      ...(dependent.data && typeof dependent.data === 'object' ? dependent.data : {}),
      rg: dependent.rg || dependent.data?.rg || ''
    }
  }
}

async function replaceDependents(client, employeeId, dependents) {
  if (!Array.isArray(dependents)) return
  await client.query('DELETE FROM employee_dependents WHERE employee_id = $1', [employeeId])
  for (const raw of dependents) {
    const dependent = normalizeDependent(raw)
    if (!dependent.name) continue
    await client.query(
      `INSERT INTO employee_dependents (employee_id, name, cpf, birth_date, relationship, data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [employeeId, dependent.name, dependent.cpf, dependent.birthDate, dependent.relationship, JSON.stringify(dependent.data)]
    )
  }
}

async function readDependents(client, employeeId) {
  const result = await client.query(
    `SELECT id, name, cpf, birth_date, relationship, data
     FROM employee_dependents WHERE employee_id = $1 ORDER BY name`,
    [employeeId]
  )
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    cpf: row.cpf || '',
    birthDate: row.birth_date ? String(row.birth_date).slice(0, 10).split('-').reverse().join('/') : '',
    relationship: row.relationship || '',
    rg: row.data?.rg || '',
    data: row.data || {}
  }))
}

const organizationReferenceTables = {
  branchId: { table: 'branches', label: 'filial' },
  departmentId: { table: 'departments', label: 'departamento' },
  roleId: { table: 'roles', label: 'cargo' },
  positionId: { table: 'positions', label: 'posição' }
}

async function validateOrganizationReferences(client, companyId, body) {
  for (const [field, config] of Object.entries(organizationReferenceTables)) {
    const value = body[field]
    if (value === undefined || value === null || value === '') continue

    // As chaves primárias das tabelas organizacionais são UUIDs.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value))) {
      return `O identificador da ${config.label} é inválido. Atualize os catálogos e selecione novamente.`
    }

    const result = await client.query(
      `SELECT 1 FROM ${config.table} WHERE id = $1 AND company_id = $2`,
      [value, companyId]
    )
    if (!result.rowCount) {
      return `A ${config.label} selecionada não pertence à empresa atual ou não existe mais.`
    }
  }

  if (body.branchId && body.departmentId) {
    const department = await client.query(
      'SELECT 1 FROM departments WHERE id = $1 AND company_id = $2 AND branch_id = $3',
      [body.departmentId, companyId, body.branchId]
    )
    if (!department.rowCount) {
      return 'O departamento selecionado não está vinculado à filial escolhida.'
    }
  }

  if (body.positionId) {
    const positionResult = await client.query(
      'SELECT branch_id, department_id, role_id FROM positions WHERE id = $1 AND company_id = $2',
      [body.positionId, companyId]
    )
    const position = positionResult.rows[0]
    if (!position) {
      return 'A posição selecionada não pertence à empresa atual ou não existe mais.'
    }
    if (body.branchId && position.branch_id && String(position.branch_id) !== String(body.branchId)) {
      return 'A posição selecionada não pertence à filial escolhida.'
    }
    if (body.departmentId && position.department_id && String(position.department_id) !== String(body.departmentId)) {
      return 'A posição selecionada não pertence ao departamento escolhido.'
    }
    if (body.roleId && position.role_id && String(position.role_id) !== String(body.roleId)) {
      return 'O cargo da posição selecionada não corresponde ao cargo informado.'
    }
  }

  return null
}

async function findDuplicateEmployee(client, companyId, body, excludeId = null) {
  const cpf = String(body.cpf || '').replace(/\D/g, '')
  const rg = String(body.rg || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!cpf && !rg) return null

  const result = await client.query(
    `SELECT id, name
       FROM employees
      WHERE company_id = $1
        AND (
          ($2::text IS NOT NULL AND regexp_replace(COALESCE(cpf, ''), '[^0-9]', '', 'g') = $2)
          OR
          ($3::text IS NOT NULL AND lower(regexp_replace(COALESCE(rg, ''), '[^a-zA-Z0-9]', '', 'g')) = $3)
        )
        AND ($4::uuid IS NULL OR id <> $4::uuid)
      LIMIT 1`,
    [companyId, cpf || null, rg || null, excludeId]
  )

  return result.rows[0] || null
}

router.get('/', requirePermission('employees_view'), async (req, res, next) => {
  try {
    const { status, search } = req.query
    const values = [req.user.companyId]
    const where = ['e.company_id = $1']
    if (status) {
      values.push(status)
      where.push(`e.status = $${values.length}`)
    }
    if (search) {
      values.push(`%${search}%`)
      where.push(`(e.name ILIKE $${values.length} OR COALESCE(e.cpf, '') ILIKE $${values.length} OR COALESCE(e.email, '') ILIKE $${values.length})`)
    }
    const result = await pool.query(
      `SELECT e.*, b.name AS branch_name, d.name AS department_name, r.name AS role_name
       FROM employees e
       LEFT JOIN branches b ON b.id = e.branch_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE ${where.join(' AND ')} ORDER BY e.name`, values
    )
    return res.json(result.rows)
  } catch (error) { return next(error) }
})

router.get('/:id', requirePermission('employees_view'), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT e.*, b.name AS branch_name, d.name AS department_name, r.name AS role_name
       FROM employees e
       LEFT JOIN branches b ON b.id = e.branch_id
       LEFT JOIN departments d ON d.id = e.department_id
       LEFT JOIN roles r ON r.id = e.role_id
       WHERE e.id = $1 AND e.company_id = $2`, [req.params.id, req.user.companyId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Funcionário não encontrado.' })
    const employee = result.rows[0]
    employee.dependents = await readDependents(client, employee.id)
    return res.json(employee)
  } catch (error) { return next(error) } finally { client.release() }
})

router.post('/', requirePermission('employees_create'), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const {
      name, cpf, rg, email, phone, birthDate, admissionDate, terminationDate,
      branchId, departmentId, roleId, positionId, status = 'active', registrationData = {}
    } = req.body || {}
    if (!name?.trim()) return res.status(400).json({ message: 'Nome é obrigatório.' })
    await client.query('BEGIN')

    const referenceError = await validateOrganizationReferences(client, req.user.companyId, {
      branchId, departmentId, roleId, positionId
    })
    if (referenceError) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: referenceError })
    }

    const duplicate = await findDuplicateEmployee(client, req.user.companyId, { cpf, rg })
    if (duplicate) {
      await client.query('ROLLBACK')
      return res.status(409).json({
        message: 'Já existe um funcionário cadastrado com o mesmo CPF ou RG nesta empresa.'
      })
    }

    const data = registrationData && typeof registrationData === 'object' ? { ...registrationData } : {}
    const dependents = Array.isArray(data.dependents) ? data.dependents : []
    delete data.dependents
    const result = await client.query(
      `INSERT INTO employees
        (company_id, branch_id, department_id, role_id, position_id, name, cpf, rg, email, phone,
         birth_date, admission_date, termination_date, status, registration_data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [req.user.companyId, branchId || null, departmentId || null, roleId || null, positionId || null,
        name.trim(), cpf || null, rg || null, email || null, phone || null, isoDate(birthDate),
        isoDate(admissionDate), isoDate(terminationDate), status, JSON.stringify(data)]
    )
    await replaceDependents(client, result.rows[0].id, dependents)
    await client.query('COMMIT')
    const employee = result.rows[0]
    employee.dependents = await readDependents(client, employee.id)
    return res.status(201).json(employee)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally { client.release() }
})

router.patch('/:id', requirePermission('employees_edit'), async (req, res, next) => {
  const client = await pool.connect()
  try {
    const {
      name, cpf, rg, email, phone, birthDate, admissionDate, terminationDate,
      branchId, departmentId, roleId, positionId, status, registrationData
    } = req.body || {}
    await client.query('BEGIN')
    const data = registrationData && typeof registrationData === 'object' ? { ...registrationData } : null
    const dependents = data && Array.isArray(data.dependents) ? data.dependents : undefined
    if (data) delete data.dependents
    const result = await client.query(
      `UPDATE employees SET
         name = COALESCE($3, name), cpf = COALESCE($4, cpf), rg = COALESCE($5, rg),
         email = COALESCE($6, email), phone = COALESCE($7, phone),
         birth_date = COALESCE($8, birth_date), admission_date = COALESCE($9, admission_date),
         termination_date = COALESCE($10, termination_date), branch_id = COALESCE($11, branch_id),
         department_id = COALESCE($12, department_id), role_id = COALESCE($13, role_id),
         position_id = COALESCE($14, position_id), status = COALESCE($15, status),
         registration_data = COALESCE($16, registration_data), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 RETURNING *`,
      [req.params.id, req.user.companyId, name ?? null, cpf ?? null, rg ?? null, email ?? null,
        phone ?? null, isoDate(birthDate), isoDate(admissionDate), isoDate(terminationDate),
        branchId ?? null, departmentId ?? null, roleId ?? null, positionId ?? null, status ?? null,
        data === null ? null : JSON.stringify(data)]
    )
    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Funcionário não encontrado.' })
    }
    if (dependents !== undefined) await replaceDependents(client, req.params.id, dependents)
    await client.query('COMMIT')
    const employee = result.rows[0]
    employee.dependents = await readDependents(client, employee.id)
    return res.json(employee)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    return next(error)
  } finally { client.release() }
})

router.delete('/:id', requirePermission('employees_delete'), async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 AND company_id = $2 RETURNING id',
      [req.params.id, req.user.companyId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Funcionário não encontrado.' })
    return res.status(204).end()
  } catch (error) { return next(error) }
})

export default router
