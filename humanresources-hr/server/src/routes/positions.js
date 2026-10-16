import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const selectSql = `
  SELECT
    p.id,
    p.name,
    p.branch_id AS "branchId",
    b.name AS "branchName",
    p.department_id AS "departmentId",
    d.name AS "departmentName",
    p.role_id AS "cargoId",
    r.name AS "cargoName",
    p.parent_position_id AS "parentPositionId",
    parent.name AS "parentPositionName",
    p.employee_id AS "employeeId",
    p.status,
    (p.status <> 'inactive') AS active,
    COALESCE(p.metadata, '{}'::jsonb) AS metadata,
    COALESCE(p.metadata->>'scheduleType', r.schedule_type, 'weekly') AS "scheduleType",
    COALESCE(NULLIF(p.metadata->>'workload', '')::numeric, NULLIF(REPLACE(REGEXP_REPLACE(COALESCE(r.workload, ''), '[^0-9,.-]', '', 'g'), ',', '.'), '')::numeric, 0) AS workload,
    COALESCE(NULLIF(p.metadata->>'dailyHours', '')::numeric, r.daily_hours, 0) AS "dailyHours",
    COALESCE(NULLIF(p.metadata->>'workDaysPerWeek', '')::numeric, r.work_days_per_week, 0) AS "workDaysPerWeek",
    COALESCE(NULLIF(p.metadata->>'cycleWorkDays', '')::numeric, r.cycle_work_days, 0) AS "cycleWorkDays",
    COALESCE(NULLIF(p.metadata->>'cycleRestDays', '')::numeric, r.cycle_rest_days, 0) AS "cycleRestDays",
    p.created_at AS "createdAt"
  FROM positions p
  LEFT JOIN branches b ON b.id = p.branch_id AND b.company_id = p.company_id
  LEFT JOIN departments d ON d.id = p.department_id AND d.company_id = p.company_id
  LEFT JOIN roles r ON r.id = p.role_id AND r.company_id = p.company_id
  LEFT JOIN positions parent ON parent.id = p.parent_position_id AND parent.company_id = p.company_id
`

function tenant(req) {
  return req.user?.companyId
}

function cleanId(value) {
  if (value === undefined || value === null || value === '') return null
  return String(value)
}

function toMetadata(body) {
  const metadata = {
    scheduleType: body.scheduleType || 'weekly',
    workload: body.workload === '' || body.workload == null ? null : Number(body.workload),
    dailyHours: body.dailyHours === '' || body.dailyHours == null ? null : Number(body.dailyHours),
    workDaysPerWeek: body.workDaysPerWeek === '' || body.workDaysPerWeek == null ? null : Number(body.workDaysPerWeek),
    cycleWorkDays: body.cycleWorkDays === '' || body.cycleWorkDays == null ? null : Number(body.cycleWorkDays),
    cycleRestDays: body.cycleRestDays === '' || body.cycleRestDays == null ? null : Number(body.cycleRestDays)
  }
  return metadata
}

async function validateReferences(client, body, companyId, excludeId = null) {
  const checks = [
    ['branchId', 'branches', 'A filial selecionada não pertence à empresa atual.'],
    ['departmentId', 'departments', 'O departamento selecionado não pertence à empresa atual.'],
    ['cargoId', 'roles', 'O cargo selecionado não pertence à empresa atual.']
  ]

  for (const [field, table, message] of checks) {
    const id = cleanId(body[field])
    if (!id) return { error: `Selecione ${field === 'branchId' ? 'a filial' : field === 'departmentId' ? 'o departamento' : 'o cargo'}.` }
    const result = await client.query(
      `SELECT id FROM ${table} WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    )
    if (!result.rowCount) return { error: message }
  }

  const departmentBranch = await client.query(
    'SELECT branch_id FROM departments WHERE id = $1 AND company_id = $2',
    [cleanId(body.departmentId), companyId]
  )
  if (departmentBranch.rowCount &&
      departmentBranch.rows[0].branch_id &&
      String(departmentBranch.rows[0].branch_id) !== String(body.branchId)) {
    return { error: 'O departamento selecionado não pertence à filial escolhida.' }
  }

  const parentId = cleanId(body.parentPositionId)
  if (parentId) {
    if (excludeId && parentId === String(excludeId)) {
      return { error: 'Uma posição não pode ser superior dela mesma.' }
    }
    const parent = await client.query(
      'SELECT id, branch_id, department_id FROM positions WHERE id = $1 AND company_id = $2',
      [parentId, companyId]
    )
    if (!parent.rowCount) return { error: 'A posição superior não pertence à empresa atual.' }
    if (String(parent.rows[0].branch_id) !== String(body.branchId) ||
        String(parent.rows[0].department_id) !== String(body.departmentId)) {
      return { error: 'A posição superior deve pertencer à mesma filial e departamento.' }
    }
    // Impede ciclos indiretos na hierarquia.
    let cursor = parentId
    const visited = new Set()
    while (cursor) {
      if (cursor === String(excludeId)) return { error: 'A hierarquia criaria um ciclo entre posições.' }
      if (visited.has(cursor)) return { error: 'A hierarquia atual contém um ciclo inválido.' }
      visited.add(cursor)
      const ancestor = await client.query(
        'SELECT parent_position_id FROM positions WHERE id = $1 AND company_id = $2',
        [cursor, companyId]
      )
      cursor = ancestor.rows[0]?.parent_position_id ? String(ancestor.rows[0].parent_position_id) : null
    }
  }
  return { error: null }
}

router.get('/', requirePermission('roles_view'), async (req, res, next) => {
  try {
    const result = await pool.query(`${selectSql} WHERE p.company_id = $1 ORDER BY r.name, p.created_at`, [tenant(req)])
    res.json(result.rows.map(({ metadata: _metadata, ...row }) => row))
  } catch (error) { next(error) }
})

router.post('/', requirePermission('roles_create'), async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const body = req.body || {}
    const validation = await validateReferences(client, body, tenant(req))
    if (validation.error) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: validation.error })
    }

    const metadata = toMetadata(body)
    const result = await client.query(
      `INSERT INTO positions
        (company_id, branch_id, department_id, role_id, name, parent_position_id, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id`,
      [
        tenant(req), body.branchId, body.departmentId, body.cargoId,
        String(body.name || body.cargoName || '').trim() || null, cleanId(body.parentPositionId),
        body.active === false ? 'inactive' : 'open', JSON.stringify(metadata)
      ]
    )
    const saved = await client.query(`${selectSql} WHERE p.id = $1 AND p.company_id = $2`, [result.rows[0].id, tenant(req)])
    await client.query('COMMIT')
    res.status(201).json(saved.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

router.patch('/:id', requirePermission('roles_edit'), async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const body = req.body || {}
    const existing = await client.query(
      'SELECT id FROM positions WHERE id = $1 AND company_id = $2',
      [req.params.id, tenant(req)]
    )
    if (!existing.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Posição não encontrada.' })
    }

    const validation = await validateReferences(client, body, tenant(req), req.params.id)
    if (validation.error) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: validation.error })
    }

    const metadata = toMetadata(body)
    await client.query(
      `UPDATE positions
       SET branch_id = $3, department_id = $4, role_id = $5, name = $6,
           parent_position_id = $7, status = $8, metadata = $9::jsonb
       WHERE id = $1 AND company_id = $2`,
      [
        req.params.id, tenant(req), body.branchId, body.departmentId, body.cargoId,
        String(body.name || body.cargoName || '').trim() || null, cleanId(body.parentPositionId),
        body.active === false ? 'inactive' : 'open', JSON.stringify(metadata)
      ]
    )
    const saved = await client.query(`${selectSql} WHERE p.id = $1 AND p.company_id = $2`, [req.params.id, tenant(req)])
    await client.query('COMMIT')
    res.json(saved.rows[0])
  } catch (error) {
    await client.query('ROLLBACK')
    next(error)
  } finally {
    client.release()
  }
})

router.delete('/:id', requirePermission('roles_delete'), async (req, res, next) => {
  try {
    const id = req.params.id
    const companyId = tenant(req)
    const [children, employees, exists] = await Promise.all([
      pool.query('SELECT 1 FROM positions WHERE parent_position_id = $1 AND company_id = $2 LIMIT 1', [id, companyId]),
      pool.query('SELECT 1 FROM employees WHERE position_id = $1 AND company_id = $2 LIMIT 1', [id, companyId]),
      pool.query('SELECT 1 FROM positions WHERE id = $1 AND company_id = $2', [id, companyId])
    ])
    if (!exists.rowCount) return res.status(404).json({ message: 'Posição não encontrada.' })
    if (children.rowCount) return res.status(409).json({ message: 'Não é possível excluir uma posição que possui subordinados.' })
    if (employees.rowCount) return res.status(409).json({ message: 'Não é possível excluir uma posição vinculada a funcionários.' })
    await pool.query('DELETE FROM positions WHERE id = $1 AND company_id = $2', [id, companyId])
    res.status(204).end()
  } catch (error) { next(error) }
})

export default router
