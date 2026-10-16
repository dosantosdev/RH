import express from 'express'
import { Buffer } from 'node:buffer'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

const MODULE_KEY = /^[a-z][a-z0-9_-]{0,79}$/
const RECORD_KEY = /^[^\s]{1,180}$/
const MAX_PAYLOAD_BYTES = 256 * 1024
const MAX_IMPORT_RECORDS = 500

const MODULE_PERMISSIONS = {
  salaries: { view: ['finance_salary_view', 'finance_salary_manage'], manage: ['finance_salary_manage'] },
  payroll: { view: ['finance_payroll_view', 'finance_payroll_manage'], manage: ['finance_payroll_manage'] },
  financial_events: { view: ['finance_events_view', 'finance_events_manage'], manage: ['finance_events_manage'] },
  financial_advanced: { view: ['finance_advanced_view', 'finance_advanced_manage'], manage: ['finance_advanced_manage'] },
  trainings: { view: ['trainings_view'], manage: ['trainings_create', 'trainings_edit', 'trainings_delete'] },
  evaluations: { view: ['evaluations_view'], manage: ['evaluations_create', 'evaluations_edit', 'evaluations_delete'] },
  // O módulo legado continua protegido durante a transição dos dados.
  timekeeping: { view: ['ponto_controle_view', 'ponto_controle_edit'], manage: ['ponto_controle_edit'] },
  // Cada domínio separado usa suas permissões específicas no servidor.
  // Isso impede que a permissão de controle geral conceda automaticamente
  // acesso a jornadas, banco de horas, fechamentos e atestados.
  timekeeping_clock: { view: ['ponto_controle_view', 'ponto_controle_edit'], manage: ['ponto_controle_edit'] },
  timekeeping_bank_hours: { view: ['ponto_banco_horas_view', 'ponto_banco_horas_manage'], manage: ['ponto_banco_horas_manage'] },
  timekeeping_schedules: { view: ['ponto_jornadas_view', 'ponto_jornadas_create', 'ponto_jornadas_edit', 'ponto_jornadas_delete'], manage: ['ponto_jornadas_create', 'ponto_jornadas_edit', 'ponto_jornadas_delete'] },
  timekeeping_closings: { view: ['ponto_fechamento_view', 'ponto_fechamento_manage'], manage: ['ponto_fechamento_manage'] },
  timekeeping_medical: { view: ['ponto_atestados_view', 'ponto_atestados_manage'], manage: ['ponto_atestados_manage'] },
  recruitment: { view: ['recruitment_view'], manage: ['recruitment_create', 'recruitment_edit', 'recruitment_delete'] }
}

function hasModulePermission(user, moduleKey, action) {
  const rules = MODULE_PERMISSIONS[moduleKey]
  if (!rules) return true
  if (user?.isAdmin === true) return true

  const permissions = Array.isArray(user?.permissions) ? user.permissions : []
  const requiredPermissions = rules[action] || []
  return requiredPermissions.some((permission) => permissions.includes(permission))
}

function denyIfModulePermissionMissing(req, res, action) {
  if (hasModulePermission(req.user, req.params.moduleKey, action)) return false
  res.status(403).json({ message: 'Você não tem permissão para acessar ou alterar os dados deste módulo.' })
  return true
}

function validateModule(value) {
  return typeof value === 'string' && MODULE_KEY.test(value)
}

function validateRecordKey(value) {
  return typeof value === 'string' && RECORD_KEY.test(value)
}

function payloadSize(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8')
  } catch {
    return Infinity
  }
}

function canImport(user) {
  return user?.isAdmin === true
}

function isDedicatedSalaryRecord(moduleKey, recordKey) {
  return moduleKey === 'salaries' && recordKey === 'salaryHistory'
}

function rejectDedicatedSalaryRecord(req, res) {
  if (!isDedicatedSalaryRecord(req.params.moduleKey, req.params.recordKey)) return false
  res.status(409).json({ message: 'O histórico salarial usa a API dedicada /api/salaries.' })
  return true
}


function rejectDedicatedFinancialAdvancedRecord(req, res) {
  const mapping = {
    financialVacations: 'vacations',
    financialThirteenths: 'thirteenths',
    financialTerminations: 'terminations'
  }
  if (req.params.moduleKey !== 'financial_advanced' || !mapping[req.params.recordKey]) return false
  res.status(409).json({
    message: `Este domínio financeiro usa a API dedicada /api/financial-advanced/${mapping[req.params.recordKey]}.`
  })
  return true
}

function rejectDedicatedPayrollRecord(req, res) {
  if (req.params.moduleKey !== 'payroll' || req.params.recordKey !== 'payrolls') return false
  res.status(409).json({ message: 'A folha de pagamento usa a API dedicada /api/payrolls.' })
  return true
}

/**
 * Lista registros de um módulo da empresa autenticada.
 * Não aceita companyId vindo do cliente: o escopo sempre vem do token.
 */
router.get('/:moduleKey', async (req, res, next) => {
  if (denyIfModulePermissionMissing(req, res, 'view')) return
  try {
    const { moduleKey } = req.params
    if (!validateModule(moduleKey)) {
      return res.status(400).json({ message: 'Identificador de módulo inválido.' })
    }

    const result = await pool.query(
      `SELECT record_key AS "recordKey", payload, created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM app_records
       WHERE company_id = $1 AND module_key = $2
       ORDER BY updated_at DESC
       LIMIT 5000`,
      [req.user.companyId, moduleKey]
    )
    const rows = result.rows.filter((row) =>
      !(moduleKey === 'salaries' && row.recordKey === 'salaryHistory') &&
      !(moduleKey === 'payroll' && row.recordKey === 'payrolls') &&
      !(moduleKey === 'financial_advanced' && [
        'financialVacations', 'financialThirteenths', 'financialTerminations'
      ].includes(row.recordKey))
    )
    return res.json(rows)
  } catch (error) {
    return next(error)
  }
})

router.get('/:moduleKey/:recordKey', async (req, res, next) => {
  if (denyIfModulePermissionMissing(req, res, 'view')) return
  if (rejectDedicatedSalaryRecord(req, res)) return
  if (rejectDedicatedPayrollRecord(req, res)) return
  if (rejectDedicatedFinancialAdvancedRecord(req, res)) return
  try {
    const { moduleKey, recordKey } = req.params
    if (moduleKey === 'financial_events' && recordKey === 'financialEvents') {
      return res.status(409).json({
        message: 'O catálogo de eventos financeiros usa a API dedicada /api/financial-events.'
      })
    }
    if (!validateModule(moduleKey) || !validateRecordKey(recordKey)) {
      return res.status(400).json({ message: 'Identificador inválido.' })
    }

    const result = await pool.query(
      `SELECT record_key AS "recordKey", payload, created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM app_records
       WHERE company_id = $1 AND module_key = $2 AND record_key = $3`,
      [req.user.companyId, moduleKey, recordKey]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Registro não encontrado.' })
    return res.json(result.rows[0])
  } catch (error) {
    return next(error)
  }
})

router.put('/:moduleKey/:recordKey', async (req, res, next) => {
  if (denyIfModulePermissionMissing(req, res, 'manage')) return
  if (rejectDedicatedSalaryRecord(req, res)) return
  if (rejectDedicatedPayrollRecord(req, res)) return
  if (rejectDedicatedFinancialAdvancedRecord(req, res)) return
  try {
    const { moduleKey, recordKey } = req.params
    const payload = req.body?.payload
    if (moduleKey === 'financial_events' && recordKey === 'financialEvents') {
      return res.status(409).json({
        message: 'O catálogo de eventos financeiros usa a API dedicada /api/financial-events.'
      })
    }
    if (!validateModule(moduleKey) || !validateRecordKey(recordKey)) {
      return res.status(400).json({ message: 'Identificador inválido.' })
    }
    if (payload === undefined || payloadSize(payload) > MAX_PAYLOAD_BYTES) {
      return res.status(400).json({ message: 'Informe um conteúdo válido de até 256 KB.' })
    }

    const result = await pool.query(
      `INSERT INTO app_records
         (company_id, module_key, record_key, payload, created_by, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, $5)
       ON CONFLICT (company_id, module_key, record_key)
       DO UPDATE SET payload = EXCLUDED.payload,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()
       RETURNING record_key AS "recordKey", payload, created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [req.user.companyId, moduleKey, recordKey, JSON.stringify(payload), req.user.userId || null]
    )
    return res.json(result.rows[0])
  } catch (error) {
    return next(error)
  }
})

router.delete('/:moduleKey/:recordKey', async (req, res, next) => {
  if (denyIfModulePermissionMissing(req, res, 'manage')) return
  if (rejectDedicatedSalaryRecord(req, res)) return
  if (rejectDedicatedPayrollRecord(req, res)) return
  if (rejectDedicatedFinancialAdvancedRecord(req, res)) return
  try {
    const { moduleKey, recordKey } = req.params
    if (moduleKey === 'financial_events' && recordKey === 'financialEvents') {
      return res.status(409).json({
        message: 'O catálogo de eventos financeiros usa a API dedicada /api/financial-events.'
      })
    }
    if (!validateModule(moduleKey) || !validateRecordKey(recordKey)) {
      return res.status(400).json({ message: 'Identificador inválido.' })
    }
    const result = await pool.query(
      `DELETE FROM app_records
       WHERE company_id = $1 AND module_key = $2 AND record_key = $3`,
      [req.user.companyId, moduleKey, recordKey]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Registro não encontrado.' })
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

/**
 * Importação assistida dos arrays antigos do navegador.
 * Somente admin pode executar. Upsert idempotente por recordKey e sem excluir
 * registros do banco que não estejam no arquivo importado.
 */
router.post('/legacy-import', async (req, res, next) => {
  if (!canImport(req.user)) {
    return res.status(403).json({ message: 'Somente o administrador pode importar dados legados.' })
  }

  const records = req.body?.records
  if (!Array.isArray(records) || records.length > MAX_IMPORT_RECORDS) {
    return res.status(400).json({ message: `Envie de 1 a ${MAX_IMPORT_RECORDS} registros por lote.` })
  }

  for (const record of records) {
    if (record?.moduleKey === 'salaries' && record?.recordKey === 'salaryHistory') {
      return res.status(409).json({
        message: 'O histórico salarial deve ser salvo pela API dedicada /api/salaries.'
      })
    }
    if (record?.moduleKey === 'financial_events' && record?.recordKey === 'financialEvents') {
      return res.status(409).json({
        message: 'O catálogo de eventos financeiros deve ser salvo pela API dedicada /api/financial-events.'
      })
    }
    if (record?.moduleKey === 'payroll' && record?.recordKey === 'payrolls') {
      return res.status(409).json({
        message: 'A folha de pagamento deve ser salva pela API dedicada /api/payrolls.'
      })
    }
    if (record?.moduleKey === 'financial_advanced' && [
      'financialVacations', 'financialThirteenths', 'financialTerminations'
    ].includes(record?.recordKey)) {
      return res.status(409).json({
        message: 'Férias, 13º e rescisões devem ser salvos pela API dedicada /api/financial-advanced.'
      })
    }
    if (!validateModule(record?.moduleKey) || !validateRecordKey(record?.recordKey) ||
        record.payload === undefined || payloadSize(record.payload) > MAX_PAYLOAD_BYTES) {
      return res.status(400).json({ message: 'O lote contém registro inválido ou acima de 256 KB.' })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let imported = 0
    for (const record of records) {
      await client.query(
        `INSERT INTO app_records
           (company_id, module_key, record_key, payload, created_by, updated_by)
         VALUES ($1, $2, $3, $4::jsonb, $5, $5)
         ON CONFLICT (company_id, module_key, record_key)
         DO UPDATE SET payload = EXCLUDED.payload,
                       updated_by = EXCLUDED.updated_by,
                       updated_at = NOW()`,
        [req.user.companyId, record.moduleKey, record.recordKey,
          JSON.stringify(record.payload), req.user.userId || null]
      )
      imported += 1
    }
    await client.query('COMMIT')
    return res.json({ imported, message: 'Lote importado sem apagar registros não enviados.' })
  } catch (error) {
    await client.query('ROLLBACK')
    return next(error)
  } finally {
    client.release()
  }
})

export default router
