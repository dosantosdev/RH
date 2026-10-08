import { getEmployees } from './employee'
import { getCurrentSalary } from './salary'
import { getPayrolls, formatPayrollMoney } from './payroll'
import { calculateTimeClockPeriod } from './timeClock'
import {
  calculateManualBankHoursBalance,
  getEmployeeBankHoursEntries
} from './bankHours'
import { calculateHourlyRate } from './overtime'
import { getStoredArray, setStored } from './storage'

const VACATION_KEY = 'financialVacations'
const THIRTEENTH_KEY = 'financialThirteenths'
const TERMINATION_KEY = 'financialTerminations'

export const FINANCIAL_ADVANCED_STATUS = {
  DRAFT: 'draft',
  CLOSED: 'closed'
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function formatMoney(value) {
  return formatPayrollMoney(roundMoney(value))
}

export function formatMinutes(value) {
  const minutes = Math.round(Number(value) || 0)

  const sign = minutes < 0 ? '-' : ''

  const absolute = Math.abs(minutes)

  const hours = Math.floor(absolute / 60)

  const rest = absolute % 60

  return `${sign}${String(hours).padStart(2, '0')}:${String(rest).padStart(
    2,
    '0'
  )}`
}

export function parseDate(value) {
  if (!value) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)

    return new Date(year, month - 1, day)
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatDate(value) {
  const date = parseDate(value)

  if (!date) {
    return '-'
  }

  return date.toLocaleDateString('pt-BR')
}

export function monthsBetween(startDate, endDate) {
  const start = parseDate(startDate)

  const end = parseDate(endDate)

  if (!start || !end || end < start) {
    return 0
  }

  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      (end.getDate() >= start.getDate() ? 0 : -1)
  )
}

/*
 * ============================================================
 * BANCO DE HORAS
 * ============================================================
 */

export function calculateBankHoursSummary(employeeId, startDate, endDate) {
  const period = calculateTimeClockPeriod(employeeId, startDate, endDate)

  const manual = calculateManualBankHoursBalance(employeeId, startDate, endDate)

  const expected = Number(period?.totals?.expectedMinutes || 0)

  const worked = Number(period?.totals?.workedMinutes || 0)

  const overtime = Number(period?.totals?.overtimeMinutes || 0)

  const deficit = Number(period?.totals?.deficitMinutes || 0)

  const automaticBalance = Number(period?.totals?.balanceMinutes || 0)

  const accumulated = automaticBalance + manual

  return {
    expectedMinutes: expected,

    workedMinutes: worked,

    overtimeMinutes: overtime,

    deficitMinutes: deficit,

    manualMinutes: manual,

    balanceMinutes: accumulated,

    entries: getEmployeeBankHoursEntries(employeeId).filter((entry) => {
      if (startDate && entry.date < startDate) {
        return false
      }

      if (endDate && entry.date > endDate) {
        return false
      }

      return true
    })
  }
}

/*
 * ============================================================
 * FÉRIAS
 * ============================================================
 */

export function getVacations() {
  return getStoredArray(VACATION_KEY)
}

export function saveVacation(record) {
  const records = getVacations()

  const saved = {
    ...record,

    id: record.id || generateId(),

    updatedAt: new Date().toISOString()
  }

  const updated = record.id
    ? records.map((item) => (item.id === record.id ? saved : item))
    : [...records, saved]

  setStored(VACATION_KEY, updated)

  return saved
}

export function deleteVacation(recordId) {
  const updated = getVacations().filter((item) => item.id !== recordId)

  setStored(VACATION_KEY, updated)

  return updated
}

export function calculateVacation(
  employeeId,
  startDate,
  days = 30,
  options = {}
) {
  const employee = getEmployees().find(
    (item) => Number(item.id) === Number(employeeId)
  )

  const salaryRecord = getCurrentSalary(employeeId, startDate)

  const salary = Number(salaryRecord?.salary || 0)

  const vacationDays = Math.max(1, Math.min(30, Number(days) || 30))

  const vacationValue = roundMoney((salary / 30) * vacationDays)

  const constitutionalAdditional = roundMoney(vacationValue / 3)

  const abonoDays = Math.max(0, Math.min(10, Number(options.abonoDays) || 0))

  const abonoValue = roundMoney((salary / 30) * abonoDays)

  return {
    employee,

    salary,

    vacationDays,

    abonoDays,

    vacationValue,

    constitutionalAdditional,

    abonoValue,

    grossValue: roundMoney(
      vacationValue + constitutionalAdditional + abonoValue
    ),

    salaryRecordId: salaryRecord?.id || null
  }
}

/*
 * ============================================================
 * 13º SALÁRIO
 * ============================================================
 */

export function getThirteenths() {
  return getStoredArray(THIRTEENTH_KEY)
}

export function saveThirteenth(record) {
  const records = getThirteenths()

  const saved = {
    ...record,

    id: record.id || generateId(),

    updatedAt: new Date().toISOString()
  }

  const updated = record.id
    ? records.map((item) => (item.id === record.id ? saved : item))
    : [...records, saved]

  setStored(THIRTEENTH_KEY, updated)

  return saved
}

export function calculateThirteenth(
  employeeId,
  year,
  referenceDate = `${year}-12-31`
) {
  const employee = getEmployees().find(
    (item) => Number(item.id) === Number(employeeId)
  )

  const salaryRecord = getCurrentSalary(employeeId, referenceDate)

  const salary = Number(salaryRecord?.salary || 0)

  const admission = parseDate(employee?.admissionDate)

  const reference = parseDate(referenceDate)

  let months = 12

  /*
   * Funcionário admitido durante o ano.
   *
   * O mês de admissão somente entra quando há pelo menos
   * 15 dias considerados no mês.
   *
   * Esta é uma simulação gerencial e deverá ser validada
   * quando implementarmos os encargos oficiais.
   */

  if (
    admission &&
    reference &&
    admission.getFullYear() === reference.getFullYear()
  ) {
    const month = admission.getMonth() + 1

    const daysInAdmissionMonth = new Date(
      admission.getFullYear(),
      admission.getMonth() + 1,
      0
    ).getDate()

    months =
      daysInAdmissionMonth - admission.getDate() + 1 >= 15
        ? 13 - month
        : 12 - month
  }

  months = Math.max(0, Math.min(12, months))

  const grossValue = roundMoney((salary / 12) * months)

  const firstInstallment = roundMoney(grossValue / 2)

  const secondInstallment = roundMoney(grossValue - firstInstallment)

  return {
    employee,

    year,

    salary,

    months,

    grossValue,

    firstInstallment,

    secondInstallment,

    salaryRecordId: salaryRecord?.id || null
  }
}

/*
 * ============================================================
 * RESCISÃO
 * ============================================================
 */

export function getTerminations() {
  return getStoredArray(TERMINATION_KEY)
}

export function saveTermination(record) {
  const records = getTerminations()

  const saved = {
    ...record,

    id: record.id || generateId(),

    updatedAt: new Date().toISOString()
  }

  const updated = record.id
    ? records.map((item) => (item.id === record.id ? saved : item))
    : [...records, saved]

  setStored(TERMINATION_KEY, updated)

  return saved
}

export function calculateTermination(employeeId, dismissalDate, options = {}) {
  const employee = getEmployees().find(
    (item) => Number(item.id) === Number(employeeId)
  )

  const salaryRecord = getCurrentSalary(employeeId, dismissalDate)

  const salary = Number(salaryRecord?.salary || 0)

  const dismissal = parseDate(dismissalDate)

  const admission = parseDate(employee?.admissionDate)

  const reason = options.reason || 'sem_justa_causa'

  const noticeDays = Math.max(0, Number(options.noticeDays) || 0)

  const vacationDays = Math.max(0, Number(options.vacationDays) || 0)

  const unpaidDeductions = Math.max(0, Number(options.unpaidDeductions) || 0)

  const workedDays = dismissal?.getDate() || 0

  const saldoSalario = roundMoney((salary / 30) * workedDays)

  const aviso = roundMoney((salary / 30) * noticeDays)

  const ferias = roundMoney((salary / 30) * vacationDays)

  const feriasAdicional = roundMoney(ferias / 3)

  let years = 0

  if (admission && dismissal) {
    years = dismissal.getFullYear() - admission.getFullYear()

    if (
      dismissal.getMonth() < admission.getMonth() ||
      (dismissal.getMonth() === admission.getMonth() &&
        dismissal.getDate() < admission.getDate())
    ) {
      years -= 1
    }

    years = Math.max(0, years)
  }

  const thirteenth = calculateThirteenth(
    employeeId,
    dismissalDate.slice(0, 4),
    dismissalDate
  )

  const proportional13 = roundMoney(
    (salary / 12) * Math.max(0, Math.min(12, dismissal.getMonth() + 1))
  )

  const gross = roundMoney(
    saldoSalario +
      (reason === 'sem_justa_causa' ? aviso : 0) +
      ferias +
      feriasAdicional +
      proportional13
  )

  const net = roundMoney(Math.max(0, gross - unpaidDeductions))

  return {
    employee,

    reason,

    salary,

    years,

    workedDays,

    noticeDays,

    vacationDays,

    saldoSalario,

    aviso,

    ferias,

    feriasAdicional,

    proporcional13: proportional13,

    gross,

    unpaidDeductions,

    net,

    salaryRecordId: salaryRecord?.id || null,

    thirteenthReference: thirteenth
  }
}

/*
 * ============================================================
 * RELATÓRIOS
 * ============================================================
 */

export function calculateFinancialReports(startCompetence, endCompetence) {
  const payrolls = getPayrolls().filter((payroll) => {
    if (startCompetence && payroll.competence < startCompetence) {
      return false
    }

    if (endCompetence && payroll.competence > endCompetence) {
      return false
    }

    return true
  })

  const rows = payrolls.flatMap((payroll) =>
    (payroll.employees || []).map((employee) => ({
      payroll,
      employee
    }))
  )

  const totals = rows.reduce(
    (acc, row) => {
      acc.baseSalary += Number(row.employee.baseSalary) || 0

      acc.earnings += (row.employee.earnings || []).reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0
      )

      acc.gross += Number(row.employee.grossSalary) || 0

      acc.deductions += Number(row.employee.totalDeductions) || 0

      acc.inss += Number(row.employee.taxes?.inss?.amount) || 0

      acc.irrf += Number(row.employee.taxes?.irrf?.amount) || 0

      acc.fgts += Number(row.employee.taxes?.fgts?.amount) || 0

      acc.net += Number(row.employee.netSalary) || 0

      acc.overtimeMinutes += Number(row.employee.timeData?.overtimeMinutes) || 0

      acc.overtimeAmount +=
        Number(row.employee.overtimeCalculation?.overtimeAmount) || 0

      return acc
    },
    {
      baseSalary: 0,
      earnings: 0,
      gross: 0,
      deductions: 0,
      inss: 0,
      irrf: 0,
      fgts: 0,
      net: 0,
      overtimeMinutes: 0,
      overtimeAmount: 0
    }
  )

  const byCompetence = payrolls.map((payroll) => {
    const employees = payroll.employees || []

    return {
      competence: payroll.competence,

      status: payroll.status,

      employees: employees.length,

      gross: roundMoney(
        employees.reduce(
          (sum, item) => sum + (Number(item.grossSalary) || 0),
          0
        )
      ),

      deductions: roundMoney(
        employees.reduce(
          (sum, item) => sum + (Number(item.totalDeductions) || 0),
          0
        )
      ),

      inss: roundMoney(
        employees.reduce(
          (sum, item) => sum + (Number(item.taxes?.inss?.amount) || 0),
          0
        )
      ),

      irrf: roundMoney(
        employees.reduce(
          (sum, item) => sum + (Number(item.taxes?.irrf?.amount) || 0),
          0
        )
      ),

      fgts: roundMoney(
        employees.reduce(
          (sum, item) => sum + (Number(item.taxes?.fgts?.amount) || 0),
          0
        )
      ),

      net: roundMoney(
        employees.reduce((sum, item) => sum + (Number(item.netSalary) || 0), 0)
      ),

      overtimeMinutes: employees.reduce(
        (sum, item) => sum + (Number(item.timeData?.overtimeMinutes) || 0),
        0
      )
    }
  })

  const byEmployee = Object.values(
    rows.reduce((acc, row) => {
      const key = String(row.employee.employeeId)

      if (!acc[key]) {
        acc[key] = {
          employeeId: row.employee.employeeId,

          employeeName: row.employee.employeeName,

          department: row.employee.department || '',

          gross: 0,

          net: 0,

          inss: 0,

          irrf: 0,

          fgts: 0,

          overtimeMinutes: 0,

          overtimeAmount: 0
        }
      }

      acc[key].gross += Number(row.employee.grossSalary) || 0

      acc[key].net += Number(row.employee.netSalary) || 0

      acc[key].overtimeMinutes +=
        Number(row.employee.timeData?.overtimeMinutes) || 0

      return acc
    }, {})
  ).sort((a, b) => b.gross - a.gross)

  const byDepartment = Object.values(
    rows.reduce((acc, row) => {
      const key = row.employee.department || 'Sem departamento'

      if (!acc[key]) {
        acc[key] = {
          department: key,
          employees: 0,
          gross: 0,
          deductions: 0,
          net: 0,
          fgts: 0
        }
      }

      acc[key].employees += 1
      acc[key].gross += Number(row.employee.grossSalary) || 0
      acc[key].deductions += Number(row.employee.totalDeductions) || 0
      acc[key].net += Number(row.employee.netSalary) || 0
      acc[key].fgts += Number(row.employee.taxes?.fgts?.amount) || 0

      return acc
    }, {})
  ).map((item) => ({
    ...item,
    gross: roundMoney(item.gross),
    deductions: roundMoney(item.deductions),
    net: roundMoney(item.net),
    fgts: roundMoney(item.fgts)
  })).sort((a, b) => b.gross - a.gross)

  return {
    payrolls,

    totals: Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [
        key,
        key === 'overtimeMinutes' ? value : roundMoney(value)
      ])
    ),

    byCompetence,

    byEmployee,

    byDepartment
  }
}

/*
 * ============================================================
 * DEMONSTRATIVO
 * ============================================================
 */

export function createPayslipHtml(employee, competence) {
  const earnings = employee.earnings || []

  const deductions = employee.deductions || []

  const rows = [
    ...earnings.map(
      (item) =>
        `<tr><td>${item.eventName || item.description || 'Provento'}</td><td>${formatMoney(item.amount)}</td></tr>`
    ),

    ...deductions.map(
      (item) =>
        `<tr><td>${item.eventName || item.description || 'Desconto'}</td><td>- ${formatMoney(item.amount)}</td></tr>`
    )
  ].join('')

  return `
<!doctype html>

<html lang="pt-BR">

<head>

<meta charset="utf-8">

<title>Demonstrativo - ${employee.employeeName}</title>

<style>

body {
  font-family: Arial, sans-serif;
  padding: 32px;
  color: #222;
}

h1 {
  margin-bottom: 4px;
}

p {
  margin: 4px 0;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 24px;
}

th,
td {
  padding: 10px;
  border-bottom: 1px solid #ddd;
  text-align: left;
}

td:last-child,
th:last-child {
  text-align: right;
}

.total {
  margin-top: 24px;
  font-size: 18px;
}

.net {
  font-size: 24px;
  font-weight: 700;
  margin-top: 12px;
}

</style>

</head>

<body>

<h1>Demonstrativo de Pagamento</h1>

<p>
<strong>Competência:</strong>
${competence}
</p>

<p>
<strong>Funcionário:</strong>
${employee.employeeName}
</p>

<p>
<strong>CPF:</strong>
${employee.employeeCpf || '-'}
</p>

<p>
<strong>Matrícula:</strong>
${employee.employeeRegistration || '-'}
</p>

<table>

<thead>

<tr>
<th>Descrição</th>
<th>Valor</th>
</tr>

</thead>

<tbody>

<tr>
<td>Salário base</td>
<td>${formatMoney(employee.baseSalary)}</td>
</tr>

${rows}

<tr><td>INSS</td><td>- ${formatMoney(employee.taxes?.inss?.amount || 0)}</td></tr>

<tr><td>IRRF</td><td>- ${formatMoney(employee.taxes?.irrf?.amount || 0)}</td></tr>

<tr><td>FGTS (empresa)</td><td>${formatMoney(employee.taxes?.fgts?.amount || 0)}</td></tr>

</tbody>

</table>

<div class="total">
Bruto:
${formatMoney(employee.grossSalary)}
</div>

<div class="total">
Descontos:
${formatMoney(employee.totalDeductions)}
</div>

<div class="net">
Líquido:
${formatMoney(employee.netSalary)}
</div>

<script>

window.onload = () => window.print()

</script>

</body>

</html>
`
}

export function printPayslip(employee, competence) {
  const popup = window.open('', '_blank', 'width=900,height=700')

  if (!popup) {
    return false
  }

  popup.document.write(createPayslipHtml(employee, competence))

  popup.document.close()

  return true
}

export function getHourlyRatesForSalary(salary) {
  const normal = calculateHourlyRate(Number(salary) || 0)

  return {
    normal,

    fifty: roundMoney(normal * 1.5),

    hundred: roundMoney(normal * 2)
  }
}
