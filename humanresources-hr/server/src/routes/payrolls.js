import express from 'express'
import { Buffer } from 'node:buffer'
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
  return (
    user?.isAdmin === true ||
    (Array.isArray(user?.permissions) && user.permissions.includes(permission))
  )
}

function canView(user) {
  return (
    hasPermission(user, 'finance_payroll_view') ||
    hasPermission(user, 'finance_payroll_manage')
  )
}

function canManage(user) {
  return hasPermission(user, 'finance_payroll_manage')
}

function payloadSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8')
  } catch {
    return Infinity
  }
}

function validatePayroll(payroll) {
  if (!payroll || typeof payroll !== 'object' || Array.isArray(payroll)) {
    return 'Envie uma folha de pagamento válida.'
  }

  if (
    typeof payroll.id !== 'string' ||
    !payroll.id.trim() ||
    payroll.id.length > 120
  ) {
    return 'A folha precisa ter um identificador válido.'
  }

  if (
    typeof payroll.competence !== 'string' ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(payroll.competence)
  ) {
    return 'Informe uma competência válida no formato AAAA-MM.'
  }

  if (!['draft', 'closed'].includes(payroll.status)) {
    return 'O status da folha é inválido.'
  }

  if (
    !Array.isArray(payroll.employees) ||
    payroll.employees.length > MAX_EMPLOYEES_PER_PAYROLL
  ) {
    return 'A folha contém uma lista de funcionários inválida.'
  }

  if (payloadSize(payroll) > MAX_PAYLOAD_BYTES) {
    return 'A folha excede o limite de armazenamento permitido.'
  }

  for (const employee of payroll.employees) {
    if (
      !employee ||
      typeof employee !== 'object' ||
      Array.isArray(employee) ||
      employee.employeeId === undefined ||
      employee.employeeId === null ||
      !String(employee.employeeId).trim()
    ) {
      return 'A folha contém um funcionário inválido.'
    }

    for (const amountKey of [
      'baseSalary',
      'grossSalary',
      'totalDeductions',
      'netSalary'
    ]) {
      if (
        employee[amountKey] !== undefined &&
        (!Number.isFinite(Number(employee[amountKey])) ||
          Number(employee[amountKey]) < 0 ||
          Number(employee[amountKey]) > 1000000000)
      ) {
        return `O valor ${amountKey} contém um número inválido.`
      }
    }

    for (const listKey of ['earnings', 'deductions']) {
      if (
        employee[listKey] !== undefined &&
        !Array.isArray(employee[listKey])
      ) {
        return `A lista ${listKey} da folha é inválida.`
      }

      for (const item of employee[listKey] || []) {
        if (
          !item ||
          typeof item !== 'object' ||
          !Number.isFinite(Number(item.amount)) ||
          Number(item.amount) < 0 ||
          Number(item.amount) > 1000000000
        ) {
          return `A folha contém um item inválido em ${listKey}.`
        }
      }
    }
  }

  return null
}

async function ensureEmployeesInCompany(client, companyId, payroll) {
  const ids = [
    ...new Set(
      (payroll.employees || []).map((employee) => String(employee.employeeId))
    )
  ]

  if (!ids.length) return true

  const result = await client.query(
    `SELECT
       id::text AS id,
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
    for (const value of [
      row.id,
      row.legacy_id,
      row.legacy_id_alt,
      row.id_legacy,
      row.registration_id
    ]) {
      if (value !== null && value !== undefined) {
        valid.add(String(value))
      }
    }
  }

  return ids.every((id) => valid.has(id))
}

function mapDatabaseStatus(status) {
  return status === 'closed' ? 'closed' : 'draft'
}

function toCompetence(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 7)
  }

  return String(value || '').slice(0, 7)
}

function toIso(value, fallback = new Date().toISOString()) {
  if (!value) return fallback

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

async function loadPayrolls(client, companyId) {
  const result = await client.query(
    `SELECT
       p.id::text AS database_id,
       p.external_id,
       p.competence,
       p.status AS database_status,
       p.data,
       p.created_at,
       p.updated_at,
       COALESCE(
         jsonb_agg(
           CASE
             WHEN pi.data = '{}'::jsonb THEN
               jsonb_build_object(
                 'employeeId',
                 COALESCE(
                   pi.external_employee_id,
                   pi.employee_id::text,
                   ''
                 ),
                 'baseSalary', pi.base_salary,
                 'earningsTotal', pi.earnings,
                 'totalDeductions', pi.deductions,
                 'inss', pi.inss,
                 'irrf', pi.irrf,
                 'fgts', pi.fgts,
                 'netSalary', pi.net_salary,
                 'overtimeMinutes', pi.overtime_minutes,
                 'overtimeAmount', pi.overtime_amount,
                 'earnings',
                 COALESCE(entry_rows.earnings, '[]'::jsonb),
                 'deductions',
                 COALESCE(entry_rows.deductions, '[]'::jsonb)
               )
             ELSE
               jsonb_set(
                 jsonb_set(
                   pi.data,
                   '{earnings}',
                   CASE
                     WHEN entry_rows.earnings IS NOT NULL
                       THEN entry_rows.earnings
                     ELSE COALESCE(
                       pi.data->'earnings',
                       '[]'::jsonb
                     )
                   END,
                   true
                 ),
                 '{deductions}',
                 CASE
                   WHEN entry_rows.deductions IS NOT NULL
                     THEN entry_rows.deductions
                   ELSE COALESCE(
                     pi.data->'deductions',
                     '[]'::jsonb
                   )
                 END,
                 true
               )
           END
           ORDER BY pi.external_id
         ) FILTER (WHERE pi.id IS NOT NULL),
         '[]'::jsonb
       ) AS employee_items
     FROM payrolls p
     LEFT JOIN payroll_items pi
       ON pi.payroll_id = p.id
     LEFT JOIN LATERAL (
       SELECT
         jsonb_agg(
           entry.payload
           ORDER BY entry.sort_order, entry.external_id
         ) FILTER (
           WHERE entry.entry_type = 'earning'
         ) AS earnings,
         jsonb_agg(
           entry.payload
           ORDER BY entry.sort_order, entry.external_id
         ) FILTER (
           WHERE entry.entry_type = 'deduction'
         ) AS deductions
       FROM payroll_item_entries entry
       WHERE entry.payroll_item_id = pi.id
     ) entry_rows ON TRUE
     WHERE p.company_id = $1
     GROUP BY p.id
     ORDER BY p.competence DESC, p.created_at DESC`,
    [companyId]
  )

  return result.rows.map((row) => {
    const data =
      row.data && typeof row.data === 'object' && !Array.isArray(row.data)
        ? row.data
        : {}

    const employeeItems = Array.isArray(row.employee_items)
      ? row.employee_items
      : []

    return {
      ...data,
      id: String(row.external_id),
      competence: toCompetence(row.competence),
      status: mapDatabaseStatus(row.database_status),
      employees:
        employeeItems.length || !Array.isArray(data.employees)
          ? employeeItems
          : data.employees,
      createdAt: toIso(row.created_at, data.createdAt),
      updatedAt: toIso(row.updated_at, data.updatedAt)
    }
  })
}

async function lockPayrolls(client, companyId) {
  // Serializa alterações por empresa e bloqueia as folhas existentes.
  await client.query(
    'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
    [String(companyId), 'payroll:payrolls']
  )

  await client.query(
    'SELECT id FROM payrolls WHERE company_id = $1 FOR UPDATE',
    [companyId]
  )

  return loadPayrolls(client, companyId)
}

async function resolveEmployeeDatabaseId(
  client,
  companyId,
  externalEmployeeId
) {
  if (
    externalEmployeeId === undefined ||
    externalEmployeeId === null ||
    !String(externalEmployeeId).trim()
  ) {
    return null
  }

  const result = await client.query(
    `SELECT id
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
    [companyId, String(externalEmployeeId)]
  )

  return result.rows[0]?.id || null
}

function safeAmount(value) {
  const amount = Number(value)

  return Number.isFinite(amount) && amount >= 0 && amount <= 1000000000
    ? amount
    : 0
}

function sumItems(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (total, item) => total + safeAmount(item?.amount),
    0
  )
}

async function savePayrolls(client, companyId, userId, payrolls) {
  if (
    !Array.isArray(payrolls) ||
    payrolls.length > MAX_PAYROLLS ||
    payloadSize(payrolls) > MAX_PAYLOAD_BYTES
  ) {
    const error = new Error(
      'O conjunto de folhas excede os limites permitidos.'
    )
    error.status = 413
    throw error
  }

  const retainedExternalIds = []

  for (const payroll of payrolls) {
    const competence = String(payroll?.competence || '')

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)) {
      const error = new Error(
        'Uma folha contém competência inválida para persistência.'
      )
      error.status = 400
      throw error
    }

    const externalId = String(payroll.id)
    retainedExternalIds.push(externalId)

    const updatedAt = toIso(payroll.updatedAt)
    const createdAt = toIso(payroll.createdAt, updatedAt)
    const status = payroll.status === 'closed' ? 'closed' : 'open'

    const storedData = { ...payroll }
    delete storedData.employees

    const parentResult = await client.query(
      `INSERT INTO payrolls (
         company_id,
         external_id,
         competence,
         status,
         totals,
         data,
         created_by,
         updated_by,
         created_at,
         updated_at,
         closed_at
       ) VALUES (
         $1,
         $2,
         $3::date,
         $4,
         $5::jsonb,
         $6::jsonb,
         $7,
         $7,
         $8::timestamptz,
         $9::timestamptz,
         CASE WHEN $6::jsonb->>'status' = 'closed' THEN COALESCE(NULLIF($6::jsonb->>'closedAt', '')::timestamptz, $9::timestamptz) ELSE NULL ENDfor endpoint in \
  "/api/users" \
  "/api/documents" \
  "/api/documents/owners"
do
  echo ""
  echo "========== $endpoint =========="
  curl -sS -w "\nHTTP %{http_code}\n" \
    "http://localhost:3334$endpoint" \
    -H "Authorization: Bearer $TOKEN"
done
       )
       ON CONFLICT (company_id, external_id)
       DO UPDATE SET
         competence = EXCLUDED.competence,
         status = EXCLUDED.status,
         totals = EXCLUDED.totals,
         data = EXCLUDED.data,
         updated_by = EXCLUDED.updated_by,
         updated_at = EXCLUDED.updated_at,
         closed_at = EXCLUDED.closed_at
       RETURNING id`,
      [
        companyId,
        externalId,
        `${competence}-01`,
        status,
        JSON.stringify(
          payroll.totals && typeof payroll.totals === 'object'
            ? payroll.totals
            : {}
        ),
        JSON.stringify(storedData),
        userId || null,
        createdAt,
        updatedAt
      ]
    )

    const payrollDatabaseId = parentResult.rows[0].id

    // Cada funcionário possui um registro próprio na folha.
    // Os dados adicionais são preservados no campo JSON data.
    await client.query('DELETE FROM payroll_items WHERE payroll_id = $1', [
      payrollDatabaseId
    ])

    for (const employee of Array.isArray(payroll.employees)
      ? payroll.employees
      : []) {
      const externalEmployeeId = String(
        employee.employeeId ?? employee.id ?? ''
      )

      const employeeDatabaseId = await resolveEmployeeDatabaseId(
        client,
        companyId,
        externalEmployeeId
      )

      const itemExternalId =
        externalEmployeeId ||
        `item-${Buffer.from(JSON.stringify(employee))
          .toString('base64url')
          .slice(0, 160)}`

      const earnings = sumItems(employee.earnings)
      const deductions = sumItems(employee.deductions)

      const employeeItemResult = await client.query(
        `INSERT INTO payroll_items (
           payroll_id,
           employee_id,
           external_id,
           external_employee_id,
           base_salary,
           earnings,
           deductions,
           inss,
           irrf,
           fgts,
           net_salary,
           overtime_minutes,
           overtime_amount,
           data,
           created_at,
           updated_at
         ) VALUES (
           $1,
           $2,
           $3,
           $4,
           $5,
           $6,
           $7,
           $8,
           $9,
           $10,
           $11,
           $12,
           $13,
           $14::jsonb,
           $15::timestamptz,
           $16::timestamptz
         )
         RETURNING id`,
        [
          payrollDatabaseId,
          employeeDatabaseId,
          itemExternalId,
          externalEmployeeId || null,
          safeAmount(employee.baseSalary),
          earnings || safeAmount(employee.earningsTotal),
          deductions ||
            safeAmount(employee.deductionsTotal ?? employee.totalDeductions),
          safeAmount(employee.inss),
          safeAmount(employee.irrf),
          safeAmount(employee.fgts),
          safeAmount(employee.netSalary),
          Math.max(
            0,
            Math.min(
              1000000000,
              Number.parseInt(employee.overtimeMinutes, 10) || 0
            )
          ),
          safeAmount(employee.overtimeAmount),
          JSON.stringify(employee),
          createdAt,
          updatedAt
        ]
      )

      const payrollItemDatabaseId = employeeItemResult.rows[0].id

      for (const [entryType, entries] of [
        ['earning', Array.isArray(employee.earnings) ? employee.earnings : []],
        [
          'deduction',
          Array.isArray(employee.deductions) ? employee.deductions : []
        ]
      ]) {
        for (const [sortOrder, entry] of entries.entries()) {
          const entryExternalId = `${String(
            entry?.id ??
              entry?.financialEventId ??
              entry?.eventCode ??
              entry?.code ??
              entryType
          )}:${sortOrder}`

          await client.query(
            `INSERT INTO payroll_item_entries (
               payroll_item_id,
               external_id,
               entry_type,
               sort_order,
               event_code,
               event_name,
               amount,
               payload,
               created_at,
               updated_at
             ) VALUES (
               $1,
               $2,
               $3,
               $4,
               $5,
               $6,
               $7,
               $8::jsonb,
               $9::timestamptz,
               $9::timestamptz
             )`,
            [
              payrollItemDatabaseId,
              entryExternalId,
              entryType,
              sortOrder,
              String(entry?.eventCode ?? entry?.code ?? '').slice(0, 80) ||
                null,
              String(entry?.eventName ?? entry?.name ?? '').slice(0, 180) ||
                null,
              safeAmount(entry?.amount),
              JSON.stringify(entry ?? {}),
              updatedAt
            ]
          )
        }
      }
    }
  }

  if (retainedExternalIds.length) {
    await client.query(
      `DELETE FROM payrolls
       WHERE company_id = $1
         AND NOT (external_id = ANY($2::text[]))`,
      [companyId, retainedExternalIds]
    )
  } else {
    await client.query('DELETE FROM payrolls WHERE company_id = $1', [
      companyId
    ])
  }
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

    await savePayrolls(
      client,
      req.user.companyId,
      req.user.userId,
      result.payrolls
    )

    await client.query('COMMIT')

    return {
      ...result,
      status: result.status || 200
    }
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

// Lista as folhas da empresa autenticada.
router.get('/', async (req, res, next) => {
  if (!canView(req.user)) {
    return res.status(403).json({
      message: 'Você não tem permissão para visualizar a folha de pagamento.'
    })
  }

  try {
    const payrolls = await loadPayrolls(pool, req.user.companyId)

    return res.json({ payrolls })
  } catch (error) {
    return next(error)
  }
})

// Cria uma nova folha de pagamento em aberto.
router.post('/', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({
      message: 'Você não tem permissão para criar folhas de pagamento.'
    })
  }

  const payroll = req.body?.payroll
  const validationError = validatePayroll(payroll)

  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  if (payroll.status !== 'draft') {
    return res.status(400).json({
      message: 'Uma nova folha precisa ser criada em aberto.'
    })
  }

  try {
    const result = await withLockedPayrolls(
      req,
      async ({ client, payrolls }) => {
        if (payrolls.some((item) => item.competence === payroll.competence)) {
          return {
            rollback: true,
            status: 409,
            body: {
              message: 'Já existe uma folha para esta competência.'
            }
          }
        }

        if (payrolls.some((item) => String(item.id) === String(payroll.id))) {
          return {
            rollback: true,
            status: 409,
            body: {
              message: 'O identificador desta folha já está em uso.'
            }
          }
        }

        if (
          !(await ensureEmployeesInCompany(client, req.user.companyId, payroll))
        ) {
          return {
            rollback: true,
            status: 400,
            body: {
              message:
                'A folha contém funcionários que não pertencem à empresa autenticada.'
            }
          }
        }

        const now = new Date().toISOString()

        const saved = {
          ...payroll,
          status: 'draft',
          createdAt: payroll.createdAt || now,
          updatedAt: now
        }

        return {
          payrolls: [...payrolls, saved],
          payroll: saved,
          status: 201
        }
      }
    )

    if (result.rollback) {
      return res.status(result.status).json(result.body)
    }

    return res.status(result.status).json({
      payroll: result.payroll,
      payrolls: result.payrolls
    })
  } catch (error) {
    return next(error)
  }
})

// Atualiza uma folha que ainda está em aberto.
router.put('/:id', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({
      message: 'Você não tem permissão para alterar a folha de pagamento.'
    })
  }

  const payroll = req.body?.payroll
  const validationError = validatePayroll(payroll)

  if (validationError) {
    return res.status(400).json({ message: validationError })
  }

  if (
    String(payroll.id) !== String(req.params.id) ||
    payroll.status !== 'draft'
  ) {
    return res.status(400).json({
      message:
        'A alteração deve manter o identificador e o status em aberto da folha.'
    })
  }

  try {
    const result = await withLockedPayrolls(
      req,
      async ({ client, payrolls }) => {
        const index = payrolls.findIndex(
          (item) => String(item.id) === String(req.params.id)
        )

        if (index < 0) {
          return {
            rollback: true,
            status: 404,
            body: {
              message: 'Folha de pagamento não encontrada.'
            }
          }
        }

        const current = payrolls[index]

        if (current.status === 'closed') {
          return {
            rollback: true,
            status: 409,
            body: {
              message: 'A folha está fechada e não pode ser alterada.'
            }
          }
        }

        if (!currentVersionMatches(current, req.body?.expectedUpdatedAt)) {
          return {
            rollback: true,
            status: 409,
            body: {
              message:
                'A folha foi alterada por outra sessão. Atualize os dados antes de tentar novamente.'
            }
          }
        }

        if (payroll.competence !== current.competence) {
          return {
            rollback: true,
            status: 400,
            body: {
              message:
                'A competência de uma folha existente não pode ser alterada.'
            }
          }
        }

        if (
          !(await ensureEmployeesInCompany(client, req.user.companyId, payroll))
        ) {
          return {
            rollback: true,
            status: 400,
            body: {
              message:
                'A folha contém funcionários que não pertencem à empresa autenticada.'
            }
          }
        }

        const saved = {
          ...payroll,
          status: 'draft',
          updatedAt: new Date().toISOString()
        }

        const updated = [...payrolls]
        updated[index] = saved

        return {
          payrolls: updated,
          payroll: saved
        }
      }
    )

    if (result.rollback) {
      return res.status(result.status).json(result.body)
    }

    return res.json({
      payroll: result.payroll,
      payrolls: result.payrolls
    })
  } catch (error) {
    return next(error)
  }
})

// Fecha ou reabre uma folha, mantendo o histórico da operação.
router.patch('/:id/status', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({
      message: 'Você não tem permissão para alterar o status da folha.'
    })
  }

  const action = req.body?.action

  if (!['close', 'reopen'].includes(action)) {
    return res.status(400).json({
      message: 'Ação de status inválida.'
    })
  }

  try {
    const result = await withLockedPayrolls(
      req,
      async ({ payrolls, client }) => {
        const index = payrolls.findIndex(
          (item) => String(item.id) === String(req.params.id)
        )

        if (index < 0) {
          return {
            rollback: true,
            status: 404,
            body: {
              message: 'Folha de pagamento não encontrada.'
            }
          }
        }

        const current = payrolls[index]

        if (!currentVersionMatches(current, req.body?.expectedUpdatedAt)) {
          return {
            rollback: true,
            status: 409,
            body: {
              message:
                'A folha foi alterada por outra sessão. Atualize os dados antes de tentar novamente.'
            }
          }
        }

        const now = new Date().toISOString()
        const actor = String(
          req.user.name || req.user.username || 'Usuário'
        ).slice(0, 180)

        let updated

        if (action === 'close') {
          if (current.status !== 'draft') {
            return {
              rollback: true,
              status: 409,
              body: {
                message: 'Somente folhas em aberto podem ser fechadas.'
              }
            }
          }

          const candidate = req.body?.payroll
          const validationError = validatePayroll(candidate)

          if (validationError) {
            return {
              rollback: true,
              status: 400,
              body: { message: validationError }
            }
          }

          if (
            String(candidate.id) !== String(current.id) ||
            candidate.competence !== current.competence ||
            candidate.status !== 'closed'
          ) {
            return {
              rollback: true,
              status: 400,
              body: {
                message: 'Os dados enviados para fechamento são inválidos.'
              }
            }
          }

          if (
            !(await ensureEmployeesInCompany(
              client,
              req.user.companyId,
              candidate
            ))
          ) {
            return {
              rollback: true,
              status: 400,
              body: {
                message:
                  'A folha contém funcionários que não pertencem à empresa autenticada.'
              }
            }
          }

          const history = Array.isArray(candidate.history)
            ? candidate.history
            : []

          updated = {
            ...candidate,
            status: 'closed',
            closedAt: candidate.closedAt || now,
            closedBy: actor,
            updatedAt: now,
            history: [
              ...history.filter((entry) => entry?.action !== 'closed'),
              {
                action: 'closed',
                date: now,
                user: actor
              }
            ]
          }
        } else {
          if (current.status !== 'closed') {
            return {
              rollback: true,
              status: 409,
              body: {
                message: 'Somente folhas fechadas podem ser reabertas.'
              }
            }
          }

          updated = {
            ...current,
            status: 'draft',
            closedAt: null,
            reopenedAt: now,
            reopenedBy: actor,
            updatedAt: now,
            history: [
              ...(Array.isArray(current.history) ? current.history : []),
              {
                action: 'reopened',
                date: now,
                user: actor
              }
            ]
          }
        }

        const nextPayrolls = [...payrolls]
        nextPayrolls[index] = updated

        return {
          payrolls: nextPayrolls,
          payroll: updated
        }
      }
    )

    if (result.rollback) {
      return res.status(result.status).json(result.body)
    }

    return res.json({
      payroll: result.payroll,
      payrolls: result.payrolls
    })
  } catch (error) {
    return next(error)
  }
})

// Exclui somente folhas em aberto.
router.delete('/:id', async (req, res, next) => {
  if (!canManage(req.user)) {
    return res.status(403).json({
      message: 'Você não tem permissão para excluir folhas de pagamento.'
    })
  }

  try {
    const result = await withLockedPayrolls(req, async ({ payrolls }) => {
      const current = payrolls.find(
        (item) => String(item.id) === String(req.params.id)
      )

      if (!current) {
        return {
          rollback: true,
          status: 404,
          body: {
            message: 'Folha de pagamento não encontrada.'
          }
        }
      }

      if (current.status === 'closed') {
        return {
          rollback: true,
          status: 409,
          body: {
            message: 'A folha fechada não pode ser excluída.'
          }
        }
      }

      if (!currentVersionMatches(current, req.body?.expectedUpdatedAt)) {
        return {
          rollback: true,
          status: 409,
          body: {
            message:
              'A folha foi alterada por outra sessão. Atualize os dados antes de tentar novamente.'
          }
        }
      }

      return {
        payrolls: payrolls.filter(
          (item) => String(item.id) !== String(req.params.id)
        ),
        deletedId: req.params.id
      }
    })

    if (result.rollback) {
      return res.status(result.status).json(result.body)
    }

    return res.json({
      deletedId: result.deletedId,
      payrolls: result.payrolls
    })
  } catch (error) {
    return next(error)
  }
})

export default router
