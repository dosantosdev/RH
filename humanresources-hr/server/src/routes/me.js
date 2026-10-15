import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const userResult = await pool.query(
      `SELECT
        u.id, u.name, u.username, u.email, u.company_id,
        u.employee_id, ar.name AS access_role_name,
        ar.display_name AS access_role_display_name,
        e.name AS employee_name, e.status AS employee_status
       FROM users u
       LEFT JOIN access_roles ar ON ar.id = u.access_role_id
       LEFT JOIN employees e ON e.id = u.employee_id
       WHERE u.id = $1 AND u.company_id = $2`,
      [req.user.userId, req.user.companyId]
    )

    if (!userResult.rowCount) {
      return res.status(404).json({ message: 'Usuário não encontrado.' })
    }

    return res.json({
      user: userResult.rows[0],
      permissions: req.user.permissions || [],
      isAdmin: Boolean(req.user.isAdmin)
    })
  } catch (error) {
    return next(error)
  }
})


// Atualiza somente os campos editáveis do próprio perfil.
// O ID e a empresa vêm do token autenticado, nunca do corpo da requisição.
router.patch('/profile', requirePermission('profile_edit'), async (req, res, next) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''

  if (!name || !username) {
    return res.status(400).json({
      message: 'Nome e usuário são obrigatórios.'
    })
  }

  if (name.length > 120 || username.length > 80) {
    return res.status(400).json({
      message: 'Nome ou usuário excede o limite permitido.'
    })
  }

  try {
    const updatedResult = await pool.query(
      `UPDATE users
       SET name = $3, username = $4, updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND active = TRUE
       RETURNING id, name, username, email, company_id, employee_id`,
      [req.user.userId, req.user.companyId, name, username]
    )

    if (!updatedResult.rowCount) {
      return res.status(404).json({
        message: 'Usuário não encontrado ou inativo.'
      })
    }

    return res.json({
      user: updatedResult.rows[0],
      message: 'Perfil atualizado com sucesso.'
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Esse nome de usuário já está sendo utilizado nesta empresa.'
      })
    }

    return next(error)
  }
})


// Autoatendimento de ponto: retorna apenas os dados do funcionário vinculado
// ao token autenticado. Não aceita employeeId informado pelo cliente.
router.get('/timekeeping/today', async (req, res, next) => {
  if (!req.user?.employeeId) {
    return res.json({
      user: { employeeId: null },
      employee: null,
      record: null
    })
  }

  try {
    const employeeResult = await pool.query(
      `SELECT e.id, e.name, e.status, e.registration_data,
              p.name AS position_name
       FROM employees e
       LEFT JOIN positions p
         ON p.id = e.position_id AND p.company_id = e.company_id
       WHERE e.id = $1 AND e.company_id = $2`,
      [req.user.employeeId, req.user.companyId]
    )

    if (!employeeResult.rowCount) {
      return res.json({
        user: { employeeId: req.user.employeeId },
        employee: null,
        record: null
      })
    }

    const employeeRow = employeeResult.rows[0]
    const registrationData = employeeRow.registration_data || {}
    const employee = {
      id: employeeRow.id,
      name: employeeRow.name || registrationData.name || '',
      status: employeeRow.status || 'active',
      position: employeeRow.position_name || registrationData.position || registrationData.jobTitle || ''
    }

    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date())
    const datePart = (type) => dateParts.find((part) => part.type === type)?.value || ''
    const date = `${datePart('year')}-${datePart('month')}-${datePart('day')}`

    const recordsResult = await pool.query(
      `SELECT payload
       FROM app_records
       WHERE company_id = $1
         AND module_key IN ('timekeeping_clock', 'timekeeping')
         AND record_key = 'timeClockRecords'
       ORDER BY CASE WHEN module_key = 'timekeeping_clock' THEN 0 ELSE 1 END`,
      [req.user.companyId]
    )

    const aliases = new Set([
      String(employeeRow.id),
      registrationData.legacyId == null ? '' : String(registrationData.legacyId),
      registrationData.legacy_id == null ? '' : String(registrationData.legacy_id),
      registrationData.id == null ? '' : String(registrationData.id)
    ].filter(Boolean))

    let record = null
    for (const row of recordsResult.rows) {
      const records = Array.isArray(row.payload) ? row.payload : []
      record = records.find((item) =>
        aliases.has(String(item?.employeeId)) && String(item?.date) === date
      ) || record
      if (record) break
    }

    return res.json({
      user: { employeeId: employeeRow.id },
      employee,
      record
    })
  } catch (error) {
    return next(error)
  }
})

// Registra a próxima batida no servidor. O funcionário, a data e a hora
// são derivados da sessão/servidor; o cliente não pode escolher outro funcionário.
router.post('/timekeeping/punch', async (req, res, next) => {
  const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : []
  if (!req.user?.isAdmin && !permissions.includes('ponto_bater')) {
    return res.status(403).json({ message: 'Você não tem permissão para registrar o ponto.' })
  }

  if (!req.user?.employeeId) {
    return res.status(400).json({ message: 'Esta conta não está vinculada a um funcionário.' })
  }

  const source = ['remote', 'biometric'].includes(req.body?.source)
    ? req.body.source
    : 'remote'
  const locationInput = req.body?.location
  let location = null

  if (locationInput && typeof locationInput === 'object' && !Array.isArray(locationInput)) {
    location = {
      latitude: Number.isFinite(Number(locationInput.latitude)) ? Number(locationInput.latitude) : null,
      longitude: Number.isFinite(Number(locationInput.longitude)) ? Number(locationInput.longitude) : null,
      accuracy: Number.isFinite(Number(locationInput.accuracy)) ? Number(locationInput.accuracy) : null,
      address: typeof locationInput.address === 'string' ? locationInput.address.slice(0, 500) : null
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    // Serializa atualizações da lista legada por empresa para evitar perda
    // de batidas simultâneas enquanto o módulo usa um payload JSONB agregado.
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(req.user.companyId), 'timekeeping_clock:timeClockRecords']
    )

    const employeeResult = await client.query(
      `SELECT id, registration_data
       FROM employees
       WHERE id = $1 AND company_id = $2 AND status = 'active'`,
      [req.user.employeeId, req.user.companyId]
    )
    if (!employeeResult.rowCount) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Funcionário ativo não encontrado.' })
    }

    const employeeRow = employeeResult.rows[0]
    const registrationData = employeeRow.registration_data || {}
    const aliases = new Set([
      String(employeeRow.id),
      registrationData.legacyId == null ? '' : String(registrationData.legacyId),
      registrationData.legacy_id == null ? '' : String(registrationData.legacy_id),
      registrationData.id == null ? '' : String(registrationData.id)
    ].filter(Boolean))

    const dateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date())
    const datePart = (type) => dateParts.find((part) => part.type === type)?.value || ''
    const date = `${datePart('year')}-${datePart('month')}-${datePart('day')}`
    const timeParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date())
    const time = `${timeParts.find((part) => part.type === 'hour')?.value || '00'}:${timeParts.find((part) => part.type === 'minute')?.value || '00'}`
    const now = new Date().toISOString()

    const currentResult = await client.query(
      `SELECT module_key, payload
       FROM app_records
       WHERE company_id = $1
         AND module_key IN ('timekeeping_clock', 'timekeeping')
         AND record_key = 'timeClockRecords'
       ORDER BY CASE WHEN module_key = 'timekeeping_clock' THEN 0 ELSE 1 END
       FOR UPDATE`,
      [req.user.companyId]
    )

    // Mescla a lista dedicada com a lista antiga sem descartar registros.
    // Em caso de duplicidade para funcionário/data, a lista dedicada prevalece.
    const recordsByEmployeeDay = new Map()
    for (const row of [...currentResult.rows].reverse()) {
      const payload = Array.isArray(row.payload) ? row.payload : []
      for (const item of payload) {
        const key = `${String(item?.employeeId)}:${String(item?.date)}`
        recordsByEmployeeDay.set(key, item)
      }
    }
    const records = [...recordsByEmployeeDay.values()]

    let record = records.find((item) =>
      aliases.has(String(item?.employeeId)) && String(item?.date) === date
    )

    const nextType = (currentRecord) => {
      const punches = Array.isArray(currentRecord?.punches) ? currentRecord.punches : []
      if (!punches.length) return 'entry'
      switch (punches[punches.length - 1]?.type) {
        case 'entry': return 'break_start'
        case 'break_start': return 'break_end'
        case 'break_end': return 'exit'
        default: return null
      }
    }

    const punchType = nextType(record)
    if (!punchType) {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Todas as batidas previstas para hoje já foram registradas.' })
    }

    if (!record) {
      record = {
        id: `${employeeRow.id}-${date}`,
        employeeId: employeeRow.id,
        date,
        punches: [],
        createdAt: now,
        updatedAt: now
      }
      records.push(record)
    } else {
      // Normaliza o vínculo antigo para o ID oficial do PostgreSQL.
      record.employeeId = employeeRow.id
    }

    const punch = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      type: punchType,
      time,
      registeredAt: now,
      source,
      registrationMethod: source,
      location
    }
    record.punches = [...(Array.isArray(record.punches) ? record.punches : []), punch]
    record.updatedAt = now

    await client.query(
      `INSERT INTO app_records
         (company_id, module_key, record_key, payload, created_by, updated_by)
       VALUES ($1, 'timekeeping_clock', 'timeClockRecords', $2::jsonb, $3, $3)
       ON CONFLICT (company_id, module_key, record_key)
       DO UPDATE SET payload = EXCLUDED.payload,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()`,
      [req.user.companyId, JSON.stringify(records), req.user.userId || null]
    )

    await client.query('COMMIT')
    return res.status(201).json({
      record,
      punch,
      nextPunchType: nextType(record)
    })
  } catch (error) {
    await client.query('ROLLBACK')
    return next(error)
  } finally {
    client.release()
  }
})

router.get('/documents', async (req, res, next) => {
  try {
    if (!req.user.employeeId) return res.json([])

    const result = await pool.query(
      `SELECT id, category, document_type, file_name,
              mime_type, size_bytes, expires_at, status, created_at
       FROM employee_documents
       WHERE company_id = $1 AND employee_id = $2
       ORDER BY created_at DESC`,
      [req.user.companyId, req.user.employeeId]
    )

    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

router.get('/payrolls', async (req, res, next) => {
  try {
    if (!req.user.employeeId) return res.json([])

    const result = await pool.query(
      `SELECT
        p.id, p.competence, p.status,
        pi.base_salary, pi.earnings, pi.deductions,
        pi.inss, pi.irrf, pi.fgts, pi.net_salary,
        pi.overtime_minutes, pi.overtime_amount
       FROM payrolls p
       JOIN payroll_items pi ON pi.payroll_id = p.id
       WHERE p.company_id = $1
         AND pi.employee_id = $2
         AND p.status = 'closed'
       ORDER BY p.competence DESC`,
      [req.user.companyId, req.user.employeeId]
    )

    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

export default router
