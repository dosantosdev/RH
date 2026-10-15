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


// Espelho do funcionário autenticado. A API devolve somente as marcações
// e as jornadas necessárias ao período solicitado, sem aceitar employeeId.
router.get('/timekeeping/period', requirePermission('ponto_espelho_view'), async (req, res, next) => {
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : ''
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : ''
  const isoDate = /^\d{4}-\d{2}-\d{2}$/

  if (!isoDate.test(startDate) || !isoDate.test(endDate)) {
    return res.status(400).json({ message: 'Informe datas válidas no formato AAAA-MM-DD.' })
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  const days = Math.round((end - start) / 86400000)

  if (!Number.isFinite(days) || days < 0 || days > 366) {
    return res.status(400).json({ message: 'O período deve ter entre 1 e 367 dias.' })
  }

  if (!req.user?.employeeId) {
    return res.status(403).json({ message: 'Esta conta não está vinculada a um funcionário.' })
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
      return res.status(404).json({ message: 'Funcionário vinculado não encontrado.' })
    }

    const employeeRow = employeeResult.rows[0]
    const registrationData = employeeRow.registration_data || {}
    const employee = {
      id: employeeRow.id,
      name: employeeRow.name || registrationData.name || '',
      status: employeeRow.status || 'active',
      position: employeeRow.position_name || registrationData.position || registrationData.jobTitle || '',
      jobTitle: registrationData.jobTitle || employeeRow.position_name || ''
    }

    const aliases = new Set([
      String(employeeRow.id),
      registrationData.legacyId == null ? '' : String(registrationData.legacyId),
      registrationData.legacy_id == null ? '' : String(registrationData.legacy_id),
      registrationData.id == null ? '' : String(registrationData.id)
    ].filter(Boolean))

    const recordsResult = await pool.query(
      `SELECT module_key, record_key, payload
       FROM app_records
       WHERE company_id = $1
         AND module_key IN ('timekeeping_clock', 'timekeeping')
         AND record_key = 'timeClockRecords'
       ORDER BY CASE WHEN module_key = 'timekeeping_clock' THEN 0 ELSE 1 END`,
      [req.user.companyId]
    )

    const recordsByDate = new Map()
    for (const row of recordsResult.rows) {
      const items = Array.isArray(row.payload) ? row.payload : []
      for (const item of items) {
        const itemDate = String(item?.date || '')
        if (
          aliases.has(String(item?.employeeId)) &&
          itemDate >= startDate &&
          itemDate <= endDate &&
          !recordsByDate.has(itemDate)
        ) {
          // Normaliza o vínculo para o UUID oficial, sem alterar o registro no banco.
          recordsByDate.set(itemDate, { ...item, employeeId: employeeRow.id })
        }
      }
    }

    const scheduleResult = await pool.query(
      `SELECT record_key, payload
       FROM app_records
       WHERE company_id = $1
         AND module_key = 'timekeeping_schedules'
         AND record_key IN ('workSchedules', 'employeeWorkSchedules')`,
      [req.user.companyId]
    )

    const schedulePayloads = Object.fromEntries(
      scheduleResult.rows.map((row) => [row.record_key, Array.isArray(row.payload) ? row.payload : []])
    )

    const allAssignments = schedulePayloads.employeeWorkSchedules || []
    const assignments = allAssignments
      .filter((item) => aliases.has(String(item?.employeeId)))
      .map((item) => ({ ...item, employeeId: employeeRow.id }))

    const scheduleIds = new Set(assignments.map((item) => String(item?.scheduleId)))
    const workSchedules = (schedulePayloads.workSchedules || []).filter((item) =>
      scheduleIds.has(String(item?.id))
    )

    return res.json({
      employee,
      records: [...recordsByDate.values()],
      scheduleData: {
        workSchedules,
        employeeWorkSchedules: assignments
      },
      startDate,
      endDate
    })
  } catch (error) {
    return next(error)
  }
})


// Dataset autorizado para os relatórios de ponto.
// O escopo da empresa sempre vem do token e o período é validado no backend.
router.get('/timekeeping/report-data', requirePermission('ponto_controle_view'), async (req, res, next) => {
  const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : ''
  const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : ''
  const isoDate = /^\d{4}-\d{2}-\d{2}$/

  if (!isoDate.test(startDate) || !isoDate.test(endDate)) {
    return res.status(400).json({ message: 'Informe datas válidas no formato AAAA-MM-DD.' })
  }

  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)
  const dayCount = Math.round((end - start) / 86400000) + 1

  if (!Number.isFinite(dayCount) || dayCount < 1 || dayCount > 367) {
    return res.status(400).json({ message: 'O relatório deve abranger de 1 a 367 dias.' })
  }

  try {
    const [employeeResult, branchResult, recordsResult, schedulesResult, medicalResult] = await Promise.all([
      pool.query(
        `SELECT e.*, b.name AS branch_name, d.name AS department_name,
                r.name AS role_name, p.name AS position_name
         FROM employees e
         LEFT JOIN branches b ON b.id = e.branch_id AND b.company_id = e.company_id
         LEFT JOIN departments d ON d.id = e.department_id AND d.company_id = e.company_id
         LEFT JOIN roles r ON r.id = e.role_id AND r.company_id = e.company_id
         LEFT JOIN positions p ON p.id = e.position_id AND p.company_id = e.company_id
         WHERE e.company_id = $1
         ORDER BY e.name`,
        [req.user.companyId]
      ),
      pool.query(
        `SELECT id, name, active
         FROM branches
         WHERE company_id = $1
         ORDER BY name`,
        [req.user.companyId]
      ),
      pool.query(
        `SELECT module_key, record_key, payload
         FROM app_records
         WHERE company_id = $1
           AND module_key IN ('timekeeping_clock', 'timekeeping')
           AND record_key = 'timeClockRecords'
         ORDER BY CASE WHEN module_key = 'timekeeping_clock' THEN 0 ELSE 1 END`,
        [req.user.companyId]
      ),
      pool.query(
        `SELECT record_key, payload
         FROM app_records
         WHERE company_id = $1
           AND module_key = 'timekeeping_schedules'
           AND record_key IN ('workSchedules', 'employeeWorkSchedules')`,
        [req.user.companyId]
      ),
      pool.query(
        `SELECT payload
         FROM app_records
         WHERE company_id = $1
           AND module_key = 'timekeeping_medical'
           AND record_key = 'medicalCertificates'`,
        [req.user.companyId]
      )
    ])

    const employees = employeeResult.rows.map((row) => {
      const registrationData = row.registration_data && typeof row.registration_data === 'object'
        ? row.registration_data
        : {}
      return {
        ...registrationData,
        id: row.id,
        name: row.name || registrationData.name || '',
        status: row.status || 'active',
        active: row.status ? row.status === 'active' : registrationData.active !== false,
        cpf: row.cpf || registrationData.cpf || '',
        email: row.email || registrationData.email || '',
        registration: row.registration || registrationData.registration || registrationData.employeeNumber || '',
        branchId: row.branch_id || registrationData.branchId || '',
        branchName: row.branch_name || registrationData.branchName || '',
        departmentId: row.department_id || registrationData.departmentId || '',
        departmentName: row.department_name || registrationData.departmentName || '',
        roleId: row.role_id || registrationData.roleId || '',
        roleName: row.role_name || registrationData.roleName || '',
        positionId: row.position_id || registrationData.positionId || '',
        position: row.position_name || registrationData.position || registrationData.jobTitle || '',
        jobTitle: registrationData.jobTitle || row.position_name || row.role_name || '',
        legacyId: registrationData.legacyId ?? registrationData.legacy_id ?? registrationData.id ?? null,
        admissionDate: row.admission_date || registrationData.admissionDate || '',
        terminationDate: row.termination_date || registrationData.terminationDate || '',
        weeklyHours: registrationData.weeklyHours ?? registrationData.weekly_hours ?? row.weekly_hours ?? null
      }
    })

    const employeeAliases = new Map()
    for (const employee of employees) {
      const aliases = [
        employee.id,
        employee.legacyId,
        employee.legacy_id,
        employee.idLegacy
      ].filter((value) => value !== undefined && value !== null && value !== '')
      for (const alias of aliases) employeeAliases.set(String(alias), String(employee.id))
    }

    const recordsByEmployeeDate = new Map()
    for (const row of recordsResult.rows) {
      const items = Array.isArray(row.payload) ? row.payload : []
      for (const item of items) {
        const itemDate = String(item?.date || '')
        if (itemDate < startDate || itemDate > endDate) continue
        const employeeId = employeeAliases.get(String(item?.employeeId))
        if (!employeeId) continue
        const key = `${employeeId}::${itemDate}`
        if (!recordsByEmployeeDate.has(key)) {
          recordsByEmployeeDate.set(key, { ...item, employeeId })
        }
      }
    }

    const schedulePayloads = Object.fromEntries(
      schedulesResult.rows.map((row) => [row.record_key, Array.isArray(row.payload) ? row.payload : []])
    )
    const assignments = (schedulePayloads.employeeWorkSchedules || [])
      .map((item) => {
        const employeeId = employeeAliases.get(String(item?.employeeId))
        return employeeId ? { ...item, employeeId } : null
      })
      .filter(Boolean)

    const records = [...recordsByEmployeeDate.values()]
    const medicalCertificates = medicalResult.rows.flatMap((row) =>
      Array.isArray(row.payload) ? row.payload : []
    ).map((certificate) => {
      const employeeId = employeeAliases.get(String(certificate?.employeeId))
      return employeeId ? { ...certificate, employeeId } : null
    }).filter((certificate) => {
      if (!certificate) return false
      if (!certificate.startDate || !certificate.endDate) return false
      return certificate.startDate <= endDate && certificate.endDate >= startDate
    })

    return res.json({
      employees,
      branches: branchResult.rows,
      records,
      scheduleData: {
        workSchedules: schedulePayloads.workSchedules || [],
        employeeWorkSchedules: assignments
      },
      medicalCertificates,
      startDate,
      endDate
    })
  } catch (error) {
    return next(error)
  }
})


/**
 * Portal do funcionário: devolve somente workflows de avaliação vinculados
 * ao funcionário autenticado. A lista completa nunca é enviada ao navegador.
 */
router.get('/evaluation-workflows', async (req, res, next) => {
  const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : []
  const canManageEvaluations = req.user?.isAdmin === true ||
    ['evaluations_create', 'evaluations_edit', 'evaluations_delete'].some((permission) => permissions.includes(permission))
  if (!req.user?.employeeId && !canManageEvaluations) {
    return res.status(400).json({ message: 'Esta conta não está vinculada a um funcionário.' })
  }

  try {
    let aliases = new Set()
    if (req.user?.employeeId) {
      const employeeResult = await pool.query(
        `SELECT id, registration_data
         FROM employees
         WHERE id = $1 AND company_id = $2`,
        [req.user.employeeId, req.user.companyId]
      )
      if (!employeeResult.rowCount) {
        return res.status(404).json({ message: 'Funcionário não encontrado.' })
      }

      const employee = employeeResult.rows[0]
      const registration = employee.registration_data || {}
      aliases = new Set([
        employee.id,
        registration.legacyId,
        registration.legacy_id,
        registration.id
      ].filter((value) => value !== null && value !== undefined).map(String))
    }

    const result = await pool.query(
      `SELECT payload
       FROM app_records
       WHERE company_id = $1
         AND module_key = 'evaluations'
         AND record_key = 'evaluationWorkflows'
       LIMIT 1`,
      [req.user.companyId]
    )

    const workflows = Array.isArray(result.rows[0]?.payload) ? result.rows[0].payload : []

    return res.json(workflows.filter((workflow) => {
      const candidates = [
        workflow?.employeeId,
        workflow?.employee?.id,
        workflow?.employee?.employeeId
      ].filter((value) => value !== null && value !== undefined).map(String)
      const isEvaluatedEmployee = candidates.some((value) => aliases.has(value))
      const isPdiResponsible =
        String(workflow?.pdi?.responsibleUserId || '') === String(req.user.userId || '') ||
        aliases.has(String(workflow?.pdi?.responsibleEmployeeId || ''))
      return isEvaluatedEmployee || isPdiResponsible || canManageEvaluations
    }))
  } catch (error) {
    return next(error)
  }
})

/**
 * Atualiza somente o PDI de um workflow ao qual o usuário está autorizado.
 * O cliente envia respostas, nunca IDs de funcionário ou dados completos do workflow.
 */
router.post('/evaluation-workflows/:workflowId/pdi', async (req, res, next) => {
  const permissions = Array.isArray(req.user?.permissions) ? req.user.permissions : []
  const canManageEvaluations = req.user?.isAdmin === true ||
    ['evaluations_create', 'evaluations_edit', 'evaluations_delete'].some((permission) => permissions.includes(permission))
  if (!req.user?.employeeId && !canManageEvaluations) {
    return res.status(400).json({ message: 'Esta conta não está vinculada a um funcionário.' })
  }

  const workflowId = String(req.params.workflowId || '')
  const action = req.body?.action
  const answers = req.body?.answers && typeof req.body.answers === 'object' &&
    !Array.isArray(req.body.answers) ? req.body.answers : {}

  if (!workflowId || workflowId.length > 180 || !['start', 'save', 'complete'].includes(action)) {
    return res.status(400).json({ message: 'Ação ou avaliação inválida.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [String(req.user.companyId), 'evaluations:evaluationWorkflows']
    )

    let employee = { name: req.user.name || '', username: req.user.username || '', registration_data: {} }
    let aliases = new Set()
    if (req.user?.employeeId) {
      const employeeResult = await client.query(
        `SELECT e.id, e.name, u.username, e.registration_data
         FROM employees e
         LEFT JOIN users u ON u.employee_id = e.id AND u.company_id = e.company_id AND u.id = $3
         WHERE e.id = $1 AND e.company_id = $2`,
        [req.user.employeeId, req.user.companyId, req.user.userId]
      )
      if (!employeeResult.rowCount) {
        await client.query('ROLLBACK')
        return res.status(404).json({ message: 'Funcionário não encontrado.' })
      }

      employee = employeeResult.rows[0]
      const registration = employee.registration_data || {}
      aliases = new Set([
        employee.id,
        registration.legacyId,
        registration.legacy_id,
        registration.id
      ].filter((value) => value !== null && value !== undefined).map(String))
    }

    const recordResult = await client.query(
      `SELECT payload
       FROM app_records
       WHERE company_id = $1
         AND module_key = 'evaluations'
         AND record_key = 'evaluationWorkflows'
       FOR UPDATE`,
      [req.user.companyId]
    )
    if (!recordResult.rowCount || !Array.isArray(recordResult.rows[0].payload)) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Avaliações não encontradas.' })
    }

    const workflows = recordResult.rows[0].payload
    const index = workflows.findIndex((workflow) => String(workflow?.id) === workflowId)

    if (index < 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Avaliação não encontrada para este funcionário.' })
    }

    const workflow = workflows[index]
    const isPdiResponsible =
      String(workflow?.pdi?.responsibleUserId || '') === String(req.user.userId || '') ||
      aliases.has(String(workflow?.pdi?.responsibleEmployeeId || ''))
    if (!canManageEvaluations && !isPdiResponsible) {
      await client.query('ROLLBACK')
      return res.status(403).json({ message: 'Somente o responsável pelo PDI ou a Gestão de RH pode alterá-lo.' })
    }

    const pdi = workflow.pdi && typeof workflow.pdi === 'object' ? workflow.pdi : null
    if (!pdi || !Array.isArray(pdi.questions)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Esta avaliação não possui um PDI válido.' })
    }
    if (pdi.status === 'completed') {
      await client.query('ROLLBACK')
      return res.status(409).json({ message: 'Este PDI já foi concluído.' })
    }

    const now = new Date().toISOString()
    const userName = employee.name || req.user.name || req.user.username || 'Funcionário'
    let updatedPdi = { ...pdi }

    if (action === 'start') {
      updatedPdi = {
        ...updatedPdi,
        status: 'in_progress',
        startedAt: updatedPdi.startedAt || now,
        startedByUserId: req.user.userId || '',
        startedByUserName: userName
      }
    } else {
      const questions = updatedPdi.questions.map((question) => {
        if (!Object.prototype.hasOwnProperty.call(answers, String(question.id))) return question
        const rawAnswer = answers[String(question.id)]
        const answer = typeof rawAnswer === 'string' ? rawAnswer.trim().slice(0, 10000) : String(rawAnswer ?? '').slice(0, 10000)
        return { ...question, answer, answeredAt: now }
      })

      updatedPdi = {
        ...updatedPdi,
        questions,
        status: 'in_progress',
        startedAt: updatedPdi.startedAt || now
      }

      if (action === 'complete') {
        const unanswered = questions.filter((question) =>
          question.required !== false && !String(question.answer ?? '').trim()
        )
        if (unanswered.length) {
          await client.query('ROLLBACK')
          return res.status(400).json({
            message: 'Responda todas as perguntas obrigatórias antes de concluir o PDI.',
            errors: unanswered.map((question, index) => `Pergunta obrigatória pendente: ${question.text || index + 1}`)
          })
        }

        updatedPdi = {
          ...updatedPdi,
          status: 'completed',
          completedAt: now,
          completedByUserId: req.user.userId || '',
          completedByUserName: userName
        }
      }
    }

    const updatedWorkflow = {
      ...workflow,
      pdi: updatedPdi,
      updatedAt: now
    }
    workflows[index] = updatedWorkflow

    await client.query(
      `UPDATE app_records
       SET payload = $2::jsonb, updated_by = $3, updated_at = NOW()
       WHERE company_id = $1 AND module_key = 'evaluations' AND record_key = 'evaluationWorkflows'`,
      [req.user.companyId, JSON.stringify(workflows), req.user.userId || null]
    )

    await client.query('COMMIT')
    return res.json({ workflow: updatedWorkflow })
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
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
