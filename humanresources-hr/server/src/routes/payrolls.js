import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const MODULE_KEY = 'payroll'
const RECORD_KEY = 'payrolls'
const MAX_PAYROLLS = 1000
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024
const MAX_EMPLOYEES_PER_PAYROLL = 5000

function hasPermission(user, permission) {
  return user?.isAdmin === true ||
    (Array.isArray(user?.permissions) && user.permissions.includes(permission))
}

function canView(user) {
  return hasPermission(user, 'finance_payroll_view') ||
    hasPermission(user, 'finance_payroll_manage')
}

function canManage(user) {
  return hasPermission(user, 'finance_payroll_manage')
}

function payloadSize(value) {
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8') } catch { return Infinity }
}

function validatePayroll(payroll) {
  if (!payroll || typeof payroll !== 'object' || Array.isArray(payroll)) {
    return 'Envie uma folha de pagamento válida.'
  }
  if (typeof payroll.id !== 'string' || !payroll.id.trim() || payroll.id.length > 120) {
    return 'A folha precisa ter um identificador válido.'
  }
  if (typeof payroll.competence !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(payroll.competence)) {
    return 'Informe uma competência válida no formato AAAA-MM.'
  }
  if (!['draft', 'closed'].includes(payroll.status)) {
    return 'O status da folha é inválido.'
  }
  if (!Array.isArray(payroll.employees) || payroll.employees.length > MAX_EMPLOYEES_PER_PAYROLL) {
    return 'A folha contém uma lista de funcionários inválida.'
  }
  if (payloadSize(payroll) > MAX_PAYLOAD_BYTES) {
    return 'A folha excede o limite de armazenamento permitido.'
  }

  for (const employee of payroll.employees) {
    if (!employee || typeof employee !== 'object' || Array.isArray(employee) ||
        employee.employeeId === undefined || employee.employeeId === null ||
        !String(employee.employeeId).trim()) {
      return 'A folha contém um funcionário inválido.'
    }
    for (const amountKey of ['baseSalary', 'grossSalary', 'totalDeductions', 'netSalary']) {
      if (employee[amountKey] !== undefined &&
          (!Number.isFinite(Number(employee[amountKey])) || Number(employee[amountKey]) < 0 || Number(employee[amountKey]) > 1000000000)) {
        return `O valor ${amountKey} contém um número inválido.`
      }
    }
    for (const listKey of ['earnings', 'deductions']) {
      if (employee[listKey] !== undefined && !Array.isArray(employee[listKey])) {
        return `A lista ${listKey} da folha é inválida.`
      }
      for (const item of employee[listKey] || []) {
        if (!item || typeof item !== 'object' || !Number.isFinite(Number(item.amount)) || Number(item.amount) < 0) {
          return `A folha contém um item inválido em ${listKey}.`
        }
      }
    }
  }
  return null
}

async function ensureEmployeesInCompany(client, companyId, payroll) {
  const ids = [...new Set((payroll.employees || []).map((employee) => String(employee.employeeId)))]
  if (!ids.length) return true

  const result = await client.query(
    `SELECT id::text AS id,
            registration_data->>'legacyId' AS legacy_id,
            registration_data->>'legacy_id' AS legacy_id_alt,
            registration_data->>'idLegacy' AS id_legacy,
            registration_data->>'id' AS registration_id
     FROM employees
     WHERE company_id = $1
       AND (
         id::text = ANY($2::text[])
         OR registration_data->>'legacyId' = ANY($2::text[])
         OR registration_data->>'legacy_id' = ANY($2::text[])
         OR registration_data->>'idLegacy' = ANY($2::text[])
         OR registration_data->>'id' = ANY($2::text[])
       )`,
    [companyId, ids]
  )

  const valid = new Set()
  for (const row of result.rows) {
    for (const value of [row.id, row.legacy_id, row.legacy_id_alt, row.id_legacy, row.registration_id]) {
      if (value !== null && value !== undefined) valid.add(String(value))
    }
  }
  return ids.every((id) => valid.has(id))
}

async function lockPayrolls(client, companyId) {
  await client.query(
    'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
    [String(companyId), 'payroll:payrolls']
  )
  const result = await client.query(
    `SELECT payload FROM app_records
     WHERE company_id = $1 AND module_key = $2 AND record_key = $3
     FOR UPDATE`,
    [companyId, MODULE_KEY, RECORD_KEY]
  )
  return Array.isArray(result.rows[0]?.payload) ? result.rows[0].payload : []
}

async function savePayrolls(client, companyId, userId, payrolls) {
  if (!Array.isArray(payrolls) || payrolls.length > MAX_PAYROLLS || payloadSize(payrolls) > MAX_PAYLOAD_BYTES) {
    const error = new Error('O conjunto de folhas excede os limites permitidos.')
    error.status = 413
    throw error
  }
  await client.query(
    `INSERT INTO app_records
       (company_id, module_key, record_key, payload, created_by, updated_by)
     VALUES ($1, $2, $3, $4::jsonb, $5, $5)
     ON CONFLICT (company_id, module_key, record_key)
     DO UPDATE SET payload = EXCLUDED.payload,
                   updated_by = EXCLUDED.updated_by,
                   updated_at = NOW()`,
    [companyId, MODULE_KEY, RECORD_KEY, JSON.stringify(payrolls), userId || null]
  )
}

async function withLockedPayrolls(req, operation) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const payrolls = await lockPayrolls(client, req.user.companyId)
    const result = await operation({ client, payrolls })
    if (result?.rollback) {
      await client.query('ROLLBACK')
      return result
    }
    await savePayrolls(client, req.user.companyId, req.user.userId, result.payrolls)
    await client.query('COMMIT')
    return { ...result, status: result.status || 200 }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    client.release()
  }
}

function currentVersionMatches(current, expectedUpdatedAt) {
  const currentVersion = current?.updatedAt ?? null
  const expectedVersion = expectedUpdatedAt ?? null
  return currentVersion === expectedVersion
}

router.get('/', async (req, res, next) => {
  if (!canView(req.user)) return res.status(403).json({ message: 'Você não tem permissão para visualizar a folha de pagamento.' })
  try {
    const result = await pool.query(
      `SELECT payload FROM app_records
       WHERE company_id = $1 AND module_key = $2 AND record_key = $3 LIMIT 1`,
      [req.user.companyId, MODULE_KEY, RECORD_KEY]
    )
    const payrolls = Array.isArray(result.rows[0]?.payload) ? result.rows[0].payload : []
    return res.json({ payrolls })
  } catch (error) { return next(error) }
})

router.post('/', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para criar folhas de pagamento.' })
  const payroll = req.body?.payroll
  const validationError = validatePayroll(payroll)
  if (validationError) return res.status(400).json({ message: validationError })
  if (payroll.status !== 'draft') return res.status(400).json({ message: 'Uma nova folha precisa ser criada em aberto.' })

  try {
    const result = await withLockedPayrolls(req, async ({ client, payrolls }) => {
      if (payrolls.some((item) => item.competence === payroll.competence)) {
        return { rollback: true, status: 409, body: { message: 'Já existe uma folha para esta competência.' } }
      }
      if (payrolls.some((item) => String(item.id) === String(payroll.id))) {
        return { rollback: true, status: 409, body: { message: 'O identificador desta folha já está em uso.' } }
      }
      if (!(await ensureEmployeesInCompany(client, req.user.companyId, payroll))) {
        return { rollback: true, status: 400, body: { message: 'A folha contém funcionários que não pertencem à empresa autenticada.' } }
      }
      const now = new Date().toISOString()
      const saved = { ...payroll, status: 'draft', createdAt: payroll.createdAt || now, updatedAt: now }
      return { payrolls: [...payrolls, saved], payroll: saved, status: 201 }
    })
    if (result.rollback) return res.status(result.status).json(result.body)
    return res.status(result.status).json({ payroll: result.payroll, payrolls: result.payrolls })
  } catch (error) { return next(error) }
})

router.put('/:id', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para alterar a folha de pagamento.' })
  const payroll = req.body?.payroll
  const validationError = validatePayroll(payroll)
  if (validationError) return res.status(400).json({ message: validationError })
  if (String(payroll.id) !== String(req.params.id) || payroll.status !== 'draft') {
    return res.status(400).json({ message: 'A alteração deve manter o identificador e o status em aberto da folha.' })
  }

  try {
    const result = await withLockedPayrolls(req, async ({ client, payrolls }) => {
      const index = payrolls.findIndex((item) => String(item.id) === String(req.params.id))
      if (index < 0) return { rollback: true, status: 404, body: { message: 'Folha de pagamento não encontrada.' } }
      const current = payrolls[index]
      if (current.status === 'closed') return { rollback: true, status: 409, body: { message: 'A folha está fechada e não pode ser alterada.' } }
      if (!currentVersionMatches(current, req.body?.expectedUpdatedAt)) {
        return { rollback: true, status: 409, body: { message: 'A folha foi alterada por outra sessão. Atualize os dados antes de tentar novamente.' } }
      }
      if (payroll.competence !== current.competence) {
        return { rollback: true, status: 400, body: { message: 'A competência de uma folha existente não pode ser alterada.' } }
      }
      if (!(await ensureEmployeesInCompany(client, req.user.companyId, payroll))) {
        return { rollback: true, status: 400, body: { message: 'A folha contém funcionários que não pertencem à empresa autenticada.' } }
      }
      const saved = { ...payroll, status: 'draft', updatedAt: new Date().toISOString() }
      const updated = [...payrolls]
      updated[index] = saved
      return { payrolls: updated, payroll: saved }
    })
    if (result.rollback) return res.status(result.status).json(result.body)
    return res.json({ payroll: result.payroll, payrolls: result.payrolls })
  } catch (error) { return next(error) }
})

router.patch('/:id/status', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para alterar o status da folha.' })
  const action = req.body?.action
  if (!['close', 'reopen'].includes(action)) return res.status(400).json({ message: 'Ação de status inválida.' })

  try {
    const result = await withLockedPayrolls(req, async ({ payrolls, client }) => {
      const index = payrolls.findIndex((item) => String(item.id) === String(req.params.id))
      if (index < 0) return { rollback: true, status: 404, body: { message: 'Folha de pagamento não encontrada.' } }
      const current = payrolls[index]
      if (!currentVersionMatches(current, req.body?.expectedUpdatedAt)) {
        return { rollback: true, status: 409, body: { message: 'A folha foi alterada por outra sessão. Atualize os dados antes de tentar novamente.' } }
      }

      const now = new Date().toISOString()
      const actor = String(req.user.name || req.user.username || 'Usuário').slice(0, 180)
      let updated
      if (action === 'close') {
        if (current.status !== 'draft') return { rollback: true, status: 409, body: { message: 'Somente folhas em aberto podem ser fechadas.' } }
        const candidate = req.body?.payroll
        const validationError = validatePayroll(candidate)
        if (validationError) return { rollback: true, status: 400, body: { message: validationError } }
        if (String(candidate.id) !== String(current.id) || candidate.competence !== current.competence || candidate.status !== 'closed') {
          return { rollback: true, status: 400, body: { message: 'Os dados enviados para fechamento são inválidos.' } }
        }
        if (!(await ensureEmployeesInCompany(client, req.user.companyId, candidate))) {
          return { rollback: true, status: 400, body: { message: 'A folha contém funcionários que não pertencem à empresa autenticada.' } }
        }
        const history = Array.isArray(candidate.history) ? candidate.history : []
        updated = {
          ...candidate,
          status: 'closed',
          closedAt: candidate.closedAt || now,
          closedBy: actor,
          updatedAt: now,
          history: [...history.filter((entry) => entry?.action !== 'closed'), { action: 'closed', date: now, user: actor }]
        }
      } else {
        if (current.status !== 'closed') return { rollback: true, status: 409, body: { message: 'Somente folhas fechadas podem ser reabertas.' } }
        updated = {
          ...current,
          status: 'draft',
          closedAt: null,
          reopenedAt: now,
          reopenedBy: actor,
          updatedAt: now,
          history: [...(Array.isArray(current.history) ? current.history : []), { action: 'reopened', date: now, user: actor }]
        }
      }
      const nextPayrolls = [...payrolls]
      nextPayrolls[index] = updated
      return { payrolls: nextPayrolls, payroll: updated }
    })
    if (result.rollback) return res.status(result.status).json(result.body)
    return res.json({ payroll: result.payroll, payrolls: result.payrolls })
  } catch (error) { return next(error) }
})

router.delete('/:id', async (req, res, next) => {
  if (!canManage(req.user)) return res.status(403).json({ message: 'Você não tem permissão para excluir folhas de pagamento.' })
  try {
    const result = await withLockedPayrolls(req, async ({ payrolls }) => {
      const current = payrolls.find((item) => String(item.id) === String(req.params.id))
      if (!current) return { rollback: true, status: 404, body: { message: 'Folha de pagamento não encontrada.' } }
      if (current.status === 'closed') return { rollback: true, status: 409, body: { message: 'A folha fechada não pode ser excluída.' } }
      if (!currentVersionMatches(current, req.body?.expectedUpdatedAt)) {
        return { rollback: true, status: 409, body: { message: 'A folha foi alterada por outra sessão. Atualize os dados antes de tentar novamente.' } }
      }
      return { payrolls: payrolls.filter((item) => String(item.id) !== String(req.params.id)), deletedId: req.params.id }
    })
    if (result.rollback) return res.status(result.status).json(result.body)
    return res.json({ deletedId: result.deletedId, payrolls: result.payrolls })
  } catch (error) { return next(error) }
})

export default router
