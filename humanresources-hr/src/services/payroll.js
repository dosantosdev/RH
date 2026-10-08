import { getStoredArray, setStored } from './storage'

import { getCurrentSalary } from './salary'

import { calculateTimeClockPeriod, formatMinutes } from './timeClock'

import { getEmployees } from './employee'

/*
 * ============================================================
 * FOLHA DE PAGAMENTO
 * ============================================================
 *
 * Este serviço controla as folhas mensais.
 *
 * Uma folha possui:
 *
 *   competência
 *   funcionário
 *   salário-base
 *   proventos
 *   descontos
 *   informações do ponto
 *   total bruto
 *   total de descontos
 *   valor líquido
 *
 * Nesta primeira versão não fazemos cálculos legais como:
 *
 *   INSS
 *   IRRF
 *   FGTS
 *   férias
 *   13º
 *   rescisão
 *
 * Esses módulos serão adicionados posteriormente.
 * ============================================================
 */

const STORAGE_KEY = 'payrolls'

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export const PAYROLL_STATUS = {
  DRAFT: 'draft',
  CLOSED: 'closed'
}

export const PAYROLL_STATUS_LABELS = {
  draft: 'Em aberto',
  closed: 'Fechada'
}

/*
 * ============================================================
 * GERAR ID
 * ============================================================
 */

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/*
 * ============================================================
 * ACESSO AO STORAGE
 * ============================================================
 */

export function getPayrolls() {
  return getStoredArray(STORAGE_KEY)
}

function savePayrolls(payrolls) {
  setStored(STORAGE_KEY, payrolls)

  return payrolls
}

/*
 * ============================================================
 * COMPETÊNCIA
 * ============================================================
 *
 * Recebe:
 *
 *   2026-10
 *
 * Retorna:
 *
 *   {
 *     year: 2026,
 *     month: 10,
 *     startDate: '2026-10-01',
 *     endDate: '2026-10-31'
 *   }
 * ============================================================
 */

export function getPayrollCompetenceInfo(competence) {
  if (!competence || !/^\d{4}-\d{2}$/.test(competence)) {
    return null
  }

  const [year, month] = competence.split('-').map(Number)

  const lastDay = new Date(year, month, 0).getDate()

  return {
    year,
    month,

    startDate: `${year}-${String(month).padStart(2, '0')}-01`,

    endDate: `${year}-${String(month).padStart(
      2,
      '0'
    )}-${String(lastDay).padStart(2, '0')}`
  }
}

/*
 * ============================================================
 * FORMATAR COMPETÊNCIA
 * ============================================================
 */

export function formatCompetence(competence) {
  const info = getPayrollCompetenceInfo(competence)

  if (!info) {
    return competence || '-'
  }

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ]

  return `${monthNames[info.month - 1]} / ${info.year}`
}

/*
 * ============================================================
 * CÁLCULO MONETÁRIO
 * ============================================================
 */

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

/*
 * ============================================================
 * SOMA DOS PROVENTOS
 * ============================================================
 */

export function calculateEarningsTotal(earnings = []) {
  return roundMoney(
    earnings.reduce((total, item) => total + (Number(item.amount) || 0), 0)
  )
}

/*
 * ============================================================
 * SOMA DOS DESCONTOS
 * ============================================================
 */

export function calculateDeductionsTotal(deductions = []) {
  return roundMoney(
    deductions.reduce((total, item) => total + (Number(item.amount) || 0), 0)
  )
}

/*
 * ============================================================
 * TOTAL BRUTO
 * ============================================================
 */

export function calculateGrossSalary(baseSalary, earnings = []) {
  return roundMoney(
    (Number(baseSalary) || 0) + calculateEarningsTotal(earnings)
  )
}

/*
 * ============================================================
 * TOTAL LÍQUIDO
 * ============================================================
 */

export function calculateNetSalary(grossSalary, deductions = []) {
  return roundMoney(
    Math.max(
      0,
      (Number(grossSalary) || 0) - calculateDeductionsTotal(deductions)
    )
  )
}

/*
 * ============================================================
 * GERAR DADOS DO PONTO
 * ============================================================
 */

export function getPayrollTimeData(employeeId, competence) {
  const info = getPayrollCompetenceInfo(competence)

  if (!info) {
    return {
      expectedMinutes: 0,
      workedMinutes: 0,
      overtimeMinutes: 0,
      deficitMinutes: 0,
      absenceDays: 0,
      pendingDays: 0
    }
  }

  const period = calculateTimeClockPeriod(
    employeeId,
    info.startDate,
    info.endDate
  )

  return {
    expectedMinutes: period.totals.expectedMinutes,

    workedMinutes: period.totals.workedMinutes,

    overtimeMinutes: period.totals.overtimeMinutes,

    deficitMinutes: period.totals.deficitMinutes,

    absenceDays: period.totals.absenceDays,

    pendingDays: period.totals.pendingDays
  }
}

/*
 * ============================================================
 * CRIAR ITEM DE FOLHA
 * ============================================================
 */

export function createPayrollEmployee(employee, competence) {
  const info = getPayrollCompetenceInfo(competence)

  const salaryRecord = getCurrentSalary(employee.id, info?.endDate)

  const baseSalary = Number(salaryRecord?.salary) || 0

  const timeData = getPayrollTimeData(employee.id, competence)

  const earnings = []

  const deductions = []

  const grossSalary = calculateGrossSalary(baseSalary, earnings)

  const totalDeductions = calculateDeductionsTotal(deductions)

  const netSalary = calculateNetSalary(grossSalary, deductions)

  return {
    id: generateId(),

    employeeId: employee.id,

    employeeName: employee.name,

    employeeCpf: employee.cpf || '',

    employeeRegistration: employee.registration || '',

    position: employee.positionName || employee.roleName || '',

    department: employee.departmentName || '',

    branch: employee.branchName || '',

    competence,

    salaryRecordId: salaryRecord?.id || null,

    baseSalary,

    salaryEffectiveDate: salaryRecord?.effectiveDate || null,

    earnings,

    deductions,

    timeData,

    grossSalary,

    totalDeductions,

    netSalary,

    status: PAYROLL_STATUS.DRAFT
  }
}

/*
 * ============================================================
 * CRIAR FOLHA DA COMPETÊNCIA
 * ============================================================
 *
 * Cria uma folha para todos os funcionários ativos.
 *
 * Se já existir uma folha para a competência, retorna a folha
 * existente.
 * ============================================================
 */

export function createPayroll(competence, options = {}) {
  const payrolls = getPayrolls()

  const existing = payrolls.find((payroll) => payroll.competence === competence)

  if (existing) {
    return existing
  }

  const employees = getEmployees().filter(
    (employee) => employee.active !== false
  )

  const employeeRows = employees.map((employee) =>
    createPayrollEmployee(employee, competence)
  )

  const payroll = {
    id: generateId(),

    competence,

    status: PAYROLL_STATUS.DRAFT,

    employees: employeeRows,

    createdAt: new Date().toISOString(),

    createdBy: options.createdBy || 'Usuário',

    updatedAt: new Date().toISOString()
  }

  savePayrolls([...payrolls, payroll])

  return payroll
}

/*
 * ============================================================
 * BUSCAR POR COMPETÊNCIA
 * ============================================================
 */

export function getPayrollByCompetence(competence) {
  return getPayrolls().find((payroll) => payroll.competence === competence)
}

/*
 * ============================================================
 * BUSCAR POR ID
 * ============================================================
 */

export function getPayrollById(id) {
  return getPayrolls().find((payroll) => String(payroll.id) === String(id))
}

/*
 * ============================================================
 * ATUALIZAR FOLHA
 * ============================================================
 */

export function updatePayroll(updatedPayroll) {
  const payrolls = getPayrolls()

  const updated = payrolls.map((payroll) =>
    String(payroll.id) === String(updatedPayroll.id)
      ? {
          ...updatedPayroll,

          updatedAt: new Date().toISOString()
        }
      : payroll
  )

  savePayrolls(updated)

  return updated.find(
    (payroll) => String(payroll.id) === String(updatedPayroll.id)
  )
}

/*
 * ============================================================
 * ATUALIZAR FUNCIONÁRIO DA FOLHA
 * ============================================================
 */

export function updatePayrollEmployee(payrollId, employeeRow) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  const updatedEmployees = payroll.employees.map((employee) =>
    Number(employee.employeeId) === Number(employeeRow.employeeId)
      ? employeeRow
      : employee
  )

  return updatePayroll({
    ...payroll,
    employees: updatedEmployees
  })
}

/*
 * ============================================================
 * ADICIONAR PROVENTO
 * ============================================================
 */

export function addPayrollEarning(payrollId, employeeId, earning) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  const updatedEmployees = payroll.employees.map((employee) => {
    if (Number(employee.employeeId) !== Number(employeeId)) {
      return employee
    }

    const updatedEarnings = [
      ...(employee.earnings || []),
      {
        ...earning,
        id: earning.id || generateId(),

        amount: roundMoney(earning.amount)
      }
    ]

    const grossSalary = calculateGrossSalary(
      employee.baseSalary,
      updatedEarnings
    )

    const totalDeductions = calculateDeductionsTotal(employee.deductions)

    return {
      ...employee,

      earnings: updatedEarnings,

      grossSalary,

      totalDeductions,

      netSalary: calculateNetSalary(grossSalary, employee.deductions)
    }
  })

  return updatePayroll({
    ...payroll,
    employees: updatedEmployees
  })
}

/*
 * ============================================================
 * ADICIONAR DESCONTO
 * ============================================================
 */

export function addPayrollDeduction(payrollId, employeeId, deduction) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  const updatedEmployees = payroll.employees.map((employee) => {
    if (Number(employee.employeeId) !== Number(employeeId)) {
      return employee
    }

    const updatedDeductions = [
      ...(employee.deductions || []),
      {
        ...deduction,
        id: deduction.id || generateId(),

        amount: roundMoney(deduction.amount)
      }
    ]

    const grossSalary = calculateGrossSalary(
      employee.baseSalary,
      employee.earnings
    )

    const totalDeductions = calculateDeductionsTotal(updatedDeductions)

    return {
      ...employee,

      deductions: updatedDeductions,

      grossSalary,

      totalDeductions,

      netSalary: calculateNetSalary(grossSalary, updatedDeductions)
    }
  })

  return updatePayroll({
    ...payroll,
    employees: updatedEmployees
  })
}

/*
 * ============================================================
 * REMOVER ITEM
 * ============================================================
 */

export function removePayrollItem(payrollId, employeeId, itemType, itemId) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  const updatedEmployees = payroll.employees.map((employee) => {
    if (Number(employee.employeeId) !== Number(employeeId)) {
      return employee
    }

    const earnings = employee.earnings || []

    const deductions = employee.deductions || []

    const updatedEarnings =
      itemType === 'earning'
        ? earnings.filter((item) => String(item.id) !== String(itemId))
        : earnings

    const updatedDeductions =
      itemType === 'deduction'
        ? deductions.filter((item) => String(item.id) !== String(itemId))
        : deductions

    const grossSalary = calculateGrossSalary(
      employee.baseSalary,
      updatedEarnings
    )

    const totalDeductions = calculateDeductionsTotal(updatedDeductions)

    return {
      ...employee,

      earnings: updatedEarnings,

      deductions: updatedDeductions,

      grossSalary,

      totalDeductions,

      netSalary: calculateNetSalary(grossSalary, updatedDeductions)
    }
  })

  return updatePayroll({
    ...payroll,
    employees: updatedEmployees
  })
}

/*
 * ============================================================
 * FECHAR FOLHA
 * ============================================================
 */

export function closePayroll(payrollId) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  return updatePayroll({
    ...payroll,

    status: PAYROLL_STATUS.CLOSED,

    closedAt: new Date().toISOString()
  })
}

/*
 * ============================================================
 * REABRIR FOLHA
 * ============================================================
 */

export function reopenPayroll(payrollId) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  return updatePayroll({
    ...payroll,

    status: PAYROLL_STATUS.DRAFT,

    closedAt: null
  })
}

/*
 * ============================================================
 * RESUMO DA FOLHA
 * ============================================================
 */

export function calculatePayrollSummary(payroll) {
  if (!payroll) {
    return {
      employees: 0,
      baseSalary: 0,
      earnings: 0,
      grossSalary: 0,
      deductions: 0,
      netSalary: 0
    }
  }

  const employees = payroll.employees || []

  return {
    employees: employees.length,

    baseSalary: roundMoney(
      employees.reduce(
        (total, employee) => total + (Number(employee.baseSalary) || 0),
        0
      )
    ),

    earnings: calculateEarningsTotal(
      employees.flatMap((employee) => employee.earnings || [])
    ),

    grossSalary: roundMoney(
      employees.reduce(
        (total, employee) => total + (Number(employee.grossSalary) || 0),
        0
      )
    ),

    deductions: calculateDeductionsTotal(
      employees.flatMap((employee) => employee.deductions || [])
    ),

    netSalary: roundMoney(
      employees.reduce(
        (total, employee) => total + (Number(employee.netSalary) || 0),
        0
      )
    )
  }
}

/*
 * ============================================================
 * FORMATAÇÃO
 * ============================================================
 */

export function formatPayrollMoney(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

export function formatPayrollMinutes(value) {
  return formatMinutes(Number(value) || 0)
}
