import { getStoredArray, setStored } from './storage'

import { getCurrentSalary } from './salary'

import { calculateTimeClockPeriod, formatMinutes } from './timeClock'

import { getEmployees } from './employee'

import {
  calculateFinancialEventAmount,
  getActiveFinancialEvents
} from './financialEvents'

import { calculateOvertime, DEFAULT_MONTHLY_DIVISOR } from './overtime'

import {
  calculatePayrollTaxes,
  createTaxPayrollItems
} from './payrollTaxes'

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
 *   horas extras
 *   total bruto
 *   total de descontos
 *   valor líquido
 *
 * A folha também possui dois estados:
 *
 *   draft
 *   closed
 *
 * Folhas fechadas ficam protegidas contra alterações.
 *
 * ============================================================
 *
 * IMPORTANTE
 *
 * Este serviço ainda NÃO realiza cálculos legais oficiais de:
 *
 *   INSS
 *   IRRF
 *   FGTS
 *
 * Esses cálculos serão adicionados posteriormente com regras
 * e tabelas próprias.
 *
 * ============================================================
 */

const STORAGE_KEY = 'payrolls'

/*
 * ============================================================
 * CONFIGURAÇÕES
 * ============================================================
 */

/*
 * Divisor padrão utilizado para cálculo da hora.
 *
 * Exemplo:
 *
 * R$ 2.200 / 220 = R$ 10,00
 */
export const PAYROLL_DEFAULT_MONTHLY_DIVISOR = DEFAULT_MONTHLY_DIVISOR

/*
 * Como o Ponto ainda não informa se a hora extra é 50% ou
 * 100%, a folha utiliza temporariamente 50% como estimativa.
 *
 * Isso fica registrado no próprio item para que futuramente
 * possamos trocar pela classificação real.
 */
export const PAYROLL_DEFAULT_OVERTIME_ADDITIONAL = 0.5

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
 */

export function getPayrollCompetenceInfo(competence) {
  if (!competence || !/^\d{4}-\d{2}$/.test(competence)) {
    return null
  }

  const [year, month] = competence.split('-').map(Number)

  if (month < 1 || month > 12) {
    return null
  }

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
 * CALCULAR HORAS EXTRAS
 * ============================================================
 *
 * Como o Ponto atual fornece somente o total de horas extras,
 * ainda não temos a classificação individual entre:
 *
 *   50%
 *   100%
 *
 * Por isso, neste momento utilizamos 50% como estimativa.
 *
 * Quando o Ponto passar a armazenar a classificação, esta
 * função poderá receber os minutos reais de cada adicional.
 * ============================================================
 */

export function calculatePayrollOvertime(baseSalary, overtimeMinutes) {
  const minutes = Math.max(0, Number(overtimeMinutes) || 0)

  if (minutes <= 0 || Number(baseSalary) <= 0) {
    return {
      monthlyDivisor: PAYROLL_DEFAULT_MONTHLY_DIVISOR,

      hourlyRate: 0,

      overtimeMinutes: minutes,

      overtimeHours: minutes / 60,

      additionalPercentage: PAYROLL_DEFAULT_OVERTIME_ADDITIONAL,

      overtimeHourlyRate: 0,

      overtimeAmount: 0,

      classification: 'not_classified'
    }
  }

  const calculation = calculateOvertime({
    salary: baseSalary,

    monthlyDivisor: PAYROLL_DEFAULT_MONTHLY_DIVISOR,

    overtime50Minutes: minutes,

    overtime100Minutes: 0
  })

  return {
    monthlyDivisor: calculation.monthlyDivisor,

    hourlyRate: calculation.hourlyRate,

    overtimeMinutes: minutes,

    overtimeHours: calculation.totalOvertimeHours,

    additionalPercentage: PAYROLL_DEFAULT_OVERTIME_ADDITIONAL,

    overtimeHourlyRate: calculation.overtime50HourlyRate,

    overtimeAmount: calculation.overtime50Amount,

    classification: 'not_classified'
  }
}

/*
 * ============================================================
 * CRIAR ITEM DE HORA EXTRA
 * ============================================================
 */

export function createOvertimePayrollEarning(overtimeCalculation) {
  if (!overtimeCalculation || Number(overtimeCalculation.overtimeAmount) <= 0) {
    return null
  }

  return {
    id: generateId(),

    financialEventId: null,

    eventCode: 'HE',

    eventName: 'Horas extras',

    description:
      'Horas extras apuradas no ponto. Classificação de adicional ainda não definida.',

    amount: roundMoney(overtimeCalculation.overtimeAmount),

    automatic: true,

    source: 'time_clock',

    overtime: true,

    overtimeMinutes: overtimeCalculation.overtimeMinutes,

    overtimeHours: overtimeCalculation.overtimeHours,

    additionalPercentage: overtimeCalculation.additionalPercentage,

    hourlyRate: overtimeCalculation.hourlyRate,

    overtimeHourlyRate: overtimeCalculation.overtimeHourlyRate,

    classification: overtimeCalculation.classification
  }
}

/*
 * ============================================================
 * EVENTOS AUTOMÁTICOS
 * ============================================================
 *
 * Um evento financeiro só será incluído automaticamente se
 * possuir:
 *
 *   automatic === true
 *
 * ou
 *
 *   recurring === true
 *
 * Isso evita que todos os eventos cadastrados no sistema sejam
 * lançados automaticamente na folha sem autorização.
 * ============================================================
 */

function isEventAutomatic(event) {
  return event?.automatic === true || event?.recurring === true
}

/*
 * ============================================================
 * VERIFICAR VIGÊNCIA DO EVENTO
 * ============================================================
 */

function isEventValidForCompetence(event, competence) {
  const info = getPayrollCompetenceInfo(competence)

  if (!info) {
    return false
  }

  const startDate = event.validFrom || event.startDate || null

  const endDate = event.validUntil || event.endDate || null

  if (startDate && String(info.endDate) < String(startDate)) {
    return false
  }

  if (endDate && String(info.startDate) > String(endDate)) {
    return false
  }

  return true
}

/*
 * ============================================================
 * VERIFICAR FUNCIONÁRIO DO EVENTO
 * ============================================================
 *
 * Se employeeId estiver preenchido, o evento pertence somente
 * àquele funcionário.
 *
 * Se estiver vazio, pode ser aplicado a todos os funcionários.
 * ============================================================
 */

function isEventForEmployee(event, employeeId) {
  if (
    event.employeeId === undefined ||
    event.employeeId === null ||
    event.employeeId === ''
  ) {
    return true
  }

  return Number(event.employeeId) === Number(employeeId)
}

/*
 * ============================================================
 * CALCULAR EVENTOS AUTOMÁTICOS
 * ============================================================
 */

export function calculateAutomaticFinancialEvents(
  employee,
  competence,
  options = {}
) {
  const events = getActiveFinancialEvents()

  const baseSalary = Number(options.baseSalary) || 0

  const hourlyRate = Number(options.hourlyRate) || 0

  const overtimeMinutes = Number(options.overtimeMinutes) || 0

  const deficitMinutes = Number(options.deficitMinutes) || 0

  const earnings = []

  const deductions = []

  events
    .filter((event) => isEventAutomatic(event))
    .filter((event) => isEventValidForCompetence(event, competence))
    .filter((event) => isEventForEmployee(event, employee.id))
    .forEach((event) => {
      /*
       * Eventos por hora podem utilizar:
       *
       * provento → horas extras
       * desconto → déficit
       */

      const minutes =
        event.type === 'provento' ? overtimeMinutes : deficitMinutes

      const amount = calculateFinancialEventAmount(event, {
        baseSalary,
        hourlyRate,
        minutes
      })

      /*
       * Evento manual não entra automaticamente quando
       * não possui valor padrão.
       */

      if (Number(amount) <= 0 && event.calculationType === 'manual') {
        return
      }

      if (Number(amount) <= 0) {
        return
      }

      const item = {
        id: generateId(),

        financialEventId: event.id,

        eventCode: event.code || '',

        eventName: event.name || 'Evento financeiro',

        description: event.description || event.name || 'Evento automático',

        amount: roundMoney(amount),

        automatic: true,

        recurring: event.recurring === true,

        source: 'financial_event'
      }

      if (event.type === 'provento') {
        earnings.push(item)
      } else {
        deductions.push(item)
      }
    })

  return {
    earnings,
    deductions
  }
}

/*
 * ============================================================
 * CRIAR ITEM DE FOLHA
 * ============================================================
 */

export function createPayrollEmployee(employee, competence, options = {}) {
  const info = getPayrollCompetenceInfo(competence)

  const salaryRecord = getCurrentSalary(employee.id, info?.endDate)

  const baseSalary = Number(salaryRecord?.salary) || 0

  const timeData = getPayrollTimeData(employee.id, competence)

  /*
   * ========================================================
   * HORA EXTRA
   * ========================================================
   */

  const overtimeCalculation = calculatePayrollOvertime(
    baseSalary,
    timeData.overtimeMinutes
  )

  /*
   * ========================================================
   * PROVENTOS
   * ========================================================
   */

  const earnings = []

  /*
   * Horas extras entram como provento automaticamente.
   *
   * Isso somente acontece quando existe quantidade de horas
   * extras apurada pelo Ponto.
   */

  if (
    options.includeOvertime !== false &&
    overtimeCalculation.overtimeAmount > 0
  ) {
    const overtimeItem = createOvertimePayrollEarning(overtimeCalculation)

    if (overtimeItem) {
      earnings.push(overtimeItem)
    }
  }

  /*
   * ========================================================
   * EVENTOS FINANCEIROS AUTOMÁTICOS
   * ========================================================
   */

  const automaticEvents = calculateAutomaticFinancialEvents(
    employee,
    competence,
    {
      baseSalary,

      hourlyRate: overtimeCalculation.hourlyRate,

      overtimeMinutes: timeData.overtimeMinutes,

      deficitMinutes: timeData.deficitMinutes
    }
  )

  earnings.push(...automaticEvents.earnings)

  const deductions = [...automaticEvents.deductions]

  /*
   * ========================================================
   * DÉFICIT
   * ========================================================
   *
   * O déficit não é descontado automaticamente.
   *
   * Para isso, o chamador precisa informar:
   *
   * includeDeficitDiscount: true
   *
   * Isso evita gerar desconto sem uma regra definida pela
   * empresa.
   * ========================================================
   */

  if (
    options.includeDeficitDiscount === true &&
    timeData.deficitMinutes > 0 &&
    baseSalary > 0
  ) {
    const deficitHours = timeData.deficitMinutes / 60

    const deficitAmount = roundMoney(
      overtimeCalculation.hourlyRate * deficitHours
    )

    if (deficitAmount > 0) {
      deductions.push({
        id: generateId(),

        financialEventId: null,

        eventCode: 'DEFICIT',

        eventName: 'Déficit de horas',

        description:
          'Desconto calculado a partir do déficit de horas apurado no ponto.',

        amount: deficitAmount,

        automatic: true,

        source: 'time_clock',

        deficitMinutes: timeData.deficitMinutes,

        deficitHours
      })
    }
  }

  /*
   * ========================================================
   * TOTAIS ANTES DOS ENCARGOS
   * ========================================================
   *
   * INSS e IRRF são calculados sobre o bruto da folha.
   */

  const grossSalary = calculateGrossSalary(baseSalary, earnings)

  /*
   * ========================================================
   * ENCARGOS E RETENÇÕES LEGAIS
   * ========================================================
   */

  const dependents =
    Number(employee.dependentsCount) ||
    (Array.isArray(employee.dependents)
      ? employee.dependents.length
      : 0)

  const taxCalculation =
    calculatePayrollTaxes({
      grossSalary,

      dependents,

      isApprentice:
        employee.isApprentice === true ||
        employee.contractType === 'aprendiz'
    })

  const taxItems =
    createTaxPayrollItems(
      taxCalculation
    )

  deductions.push(
    ...taxItems.map((item) => ({
      ...item,

      id: generateId(),

      eventCode: item.code,

      eventName: item.name
    }))
  )

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

    overtimeCalculation,

    grossSalary,

    totalDeductions,

    netSalary,

    taxes: taxCalculation,

    status: PAYROLL_STATUS.DRAFT
  }
}

/*
 * ============================================================
 * CRIAR FOLHA DA COMPETÊNCIA
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
    createPayrollEmployee(employee, competence, options)
  )

  const now = new Date().toISOString()

  const payroll = {
    id: generateId(),

    competence,

    status: PAYROLL_STATUS.DRAFT,

    employees: employeeRows,

    settings: {
      includeOvertime: options.includeOvertime !== false,

      includeDeficitDiscount: options.includeDeficitDiscount === true,

      monthlyDivisor: PAYROLL_DEFAULT_MONTHLY_DIVISOR,

      overtimeAdditional: PAYROLL_DEFAULT_OVERTIME_ADDITIONAL
    },

    createdAt: now,

    createdBy: options.createdBy || 'Usuário',

    updatedAt: now,

    history: [
      {
        action: 'created',
        date: now,
        user: options.createdBy || 'Usuário'
      }
    ]
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
 * VERIFICAR SE A FOLHA ESTÁ FECHADA
 * ============================================================
 */

export function isPayrollClosed(payroll) {
  return payroll?.status === PAYROLL_STATUS.CLOSED
}

/*
 * ============================================================
 * ATUALIZAR FOLHA
 * ============================================================
 */

export function updatePayroll(updatedPayroll) {
  const payrolls = getPayrolls()

  const current = payrolls.find(
    (payroll) => String(payroll.id) === String(updatedPayroll.id)
  )

  if (!current) {
    return null
  }

  /*
   * Folha fechada não pode ser alterada por esta função.
   *
   * A única exceção é quando a própria operação está mudando
   * o status para DRAFT através de reopenPayroll().
   */

  const isReopening =
    current.status === PAYROLL_STATUS.CLOSED &&
    updatedPayroll.status === PAYROLL_STATUS.DRAFT

  if (current.status === PAYROLL_STATUS.CLOSED && !isReopening) {
    return current
  }

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

  if (isPayrollClosed(payroll)) {
    return payroll
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
 * RECALCULAR FUNCIONÁRIO
 * ============================================================
 */

export function recalculatePayrollEmployee(payroll, employeeRow, options = {}) {
  if (!payroll || !employeeRow) {
    return employeeRow
  }

  const employee = getEmployees().find(
    (item) => Number(item.id) === Number(employeeRow.employeeId)
  )

  if (!employee) {
    return employeeRow
  }

  const settings = payroll.settings || {}

  const mergedOptions = {
    includeOvertime:
      options.includeOvertime !== undefined
        ? options.includeOvertime
        : settings.includeOvertime !== false,

    includeDeficitDiscount:
      options.includeDeficitDiscount !== undefined
        ? options.includeDeficitDiscount
        : settings.includeDeficitDiscount === true
  }

  return createPayrollEmployee(employee, payroll.competence, mergedOptions)
}

/*
 * ============================================================
 * RECALCULAR TODA A FOLHA
 * ============================================================
 *
 * Importante:
 *
 * O recálculo preserva os lançamentos MANUAIS.
 *
 * Itens automáticos originados do Ponto ou de eventos
 * recorrentes são recriados.
 * ============================================================
 */

export function recalculatePayroll(payrollId, options = {}) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  if (isPayrollClosed(payroll)) {
    return payroll
  }

  const settings = payroll.settings || {}

  const includeOvertime =
    options.includeOvertime !== undefined
      ? options.includeOvertime
      : settings.includeOvertime !== false

  const includeDeficitDiscount =
    options.includeDeficitDiscount !== undefined
      ? options.includeDeficitDiscount
      : settings.includeDeficitDiscount === true

  const recalculatedEmployees = (payroll.employees || []).map((oldEmployee) => {
    const freshEmployee = recalculatePayrollEmployee(payroll, oldEmployee, {
      includeOvertime,
      includeDeficitDiscount
    })

    /*
     * Preservamos somente itens que não são automáticos.
     *
     * Isso impede duplicação de horas extras e eventos
     * recorrentes.
     */

    const manualEarnings = (oldEmployee.earnings || []).filter(
      (item) => item.automatic !== true
    )

    const manualDeductions = (oldEmployee.deductions || []).filter(
      (item) => item.automatic !== true
    )

    const earnings = [...freshEmployee.earnings, ...manualEarnings]

    const deductions = [...freshEmployee.deductions, ...manualDeductions]

    const grossSalary = calculateGrossSalary(freshEmployee.baseSalary, earnings)

    const totalDeductions = calculateDeductionsTotal(deductions)

    const netSalary = calculateNetSalary(grossSalary, deductions)

    return {
      ...freshEmployee,

      id: oldEmployee.id,

      earnings,

      deductions,

      grossSalary,

      totalDeductions,

      netSalary
    }
  })

  return updatePayroll({
    ...payroll,

    employees: recalculatedEmployees,

    settings: {
      ...settings,

      includeOvertime,

      includeDeficitDiscount
    }
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

  if (isPayrollClosed(payroll)) {
    return payroll
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

        amount: roundMoney(earning.amount),

        automatic: earning.automatic === true
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

  if (isPayrollClosed(payroll)) {
    return payroll
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

        amount: roundMoney(deduction.amount),

        automatic: deduction.automatic === true
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

  if (isPayrollClosed(payroll)) {
    return payroll
  }

  const updatedEmployees = payroll.employees.map((employee) => {
    if (Number(employee.employeeId) !== Number(employeeId)) {
      return employee
    }

    const earnings = employee.earnings || []

    const deductions = employee.deductions || []

    const itemList = itemType === 'earning' ? earnings : deductions

    const target = itemList.find((item) => String(item.id) === String(itemId))

    /*
     * Se o item for automático, também permitimos remover.
     *
     * Porém, ao recalcular a folha ele será recriado caso
     * a origem ainda exista.
     */

    if (!target) {
      return employee
    }

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
 * EXCLUIR FOLHA
 * ============================================================
 *
 * Somente folhas em aberto podem ser excluídas.
 * ============================================================
 */

export function deletePayroll(payrollId) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  if (isPayrollClosed(payroll)) {
    return payroll
  }

  const payrolls = getPayrolls()

  const updated = payrolls.filter(
    (item) => String(item.id) !== String(payrollId)
  )

  savePayrolls(updated)

  return null
}

/*
 * ============================================================
 * FECHAR FOLHA
 * ============================================================
 */

export function closePayroll(payrollId, options = {}) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  if (isPayrollClosed(payroll)) {
    return payroll
  }

  /*
   * Antes de fechar, garantimos que os valores estejam
   * recalculados.
   */

  const recalculated = recalculatePayroll(payrollId, {
    includeOvertime: options.includeOvertime !== false,

    includeDeficitDiscount: options.includeDeficitDiscount === true
  })

  if (!recalculated) {
    return null
  }

  const now = new Date().toISOString()

  return updatePayroll({
    ...recalculated,

    status: PAYROLL_STATUS.CLOSED,

    closedAt: now,

    closedBy: options.closedBy || 'Usuário',

    history: [
      ...(recalculated.history || []),
      {
        action: 'closed',
        date: now,
        user: options.closedBy || 'Usuário'
      }
    ]
  })
}

/*
 * ============================================================
 * REABRIR FOLHA
 * ============================================================
 */

export function reopenPayroll(payrollId, options = {}) {
  const payroll = getPayrollById(payrollId)

  if (!payroll) {
    return null
  }

  if (payroll.status !== PAYROLL_STATUS.CLOSED) {
    return payroll
  }

  const now = new Date().toISOString()

  return updatePayroll({
    ...payroll,

    status: PAYROLL_STATUS.DRAFT,

    closedAt: null,

    reopenedAt: now,

    reopenedBy: options.reopenedBy || 'Usuário',

    history: [
      ...(payroll.history || []),
      {
        action: 'reopened',
        date: now,
        user: options.reopenedBy || 'Usuário'
      }
    ]
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

      overtimeMinutes: 0,

      overtimeAmount: 0,

      grossSalary: 0,

      deductions: 0,

      inss: 0,

      irrf: 0,

      fgts: 0,

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

    overtimeMinutes: employees.reduce(
      (total, employee) =>
        total + (Number(employee.timeData?.overtimeMinutes) || 0),
      0
    ),

    overtimeAmount: roundMoney(
      employees.reduce(
        (total, employee) =>
          total + (Number(employee.overtimeCalculation?.overtimeAmount) || 0),
        0
      )
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

    inss: roundMoney(
      employees.reduce(
        (total, employee) =>
          total +
          (Number(employee.taxes?.inss?.amount) || 0),
        0
      )
    ),

    irrf: roundMoney(
      employees.reduce(
        (total, employee) =>
          total +
          (Number(employee.taxes?.irrf?.amount) || 0),
        0
      )
    ),

    fgts: roundMoney(
      employees.reduce(
        (total, employee) =>
          total +
          (Number(employee.taxes?.fgts?.amount) || 0),
        0
      )
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
