import { getStoredArray } from './storage'
import { getEmployees } from './employee'
import { getDepartments } from './department'
import { getPositions } from './position'
import { calculateTimeClockPeriod, formatMinutes } from './timeClock'
import { getBankHoursEntries } from './bankHours'
import { getTrainings } from './training'
import { getTrainingParticipants } from './trainingParticipant'
import { getTrainingCertificates } from './trainingCertificate'
import { getMedicalCertificates } from './medicalCertificates'
import { getEvaluations } from './evaluations'
import { getPayrolls } from './payroll'
import {
  getVacations,
  getThirteenths,
  getTerminations
} from './financialAdvanced'

export const REPORT_TYPES = [
  { key: 'employees', label: 'Funcionários' },
  { key: 'birthdays', label: 'Aniversariantes' },
  { key: 'admissions', label: 'Admissões' },
  { key: 'dismissals', label: 'Demissões' },
  { key: 'turnover', label: 'Turnover' },
  { key: 'branches', label: 'Por filial' },
  { key: 'departments', label: 'Por departamento' },
  { key: 'positions', label: 'Por cargo' },
  { key: 'trainings', label: 'Treinamentos' },
  { key: 'certificates', label: 'Certificados e vencimentos' },
  { key: 'timeclock', label: 'Ponto' },
  { key: 'vacations', label: 'Férias' },
  { key: 'payroll', label: 'Folha' },
  { key: 'bankhours', label: 'Banco de horas' },
  { key: 'thirteenth', label: '13º salário' },
  { key: 'terminations', label: 'Rescisões' },
  { key: 'medical', label: 'Atestados' },
  { key: 'evaluations', label: 'Avaliações' }
]

export const REPORT_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'inactive', label: 'Inativos' }
]

function parseDate(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const text = String(value).trim()

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split('/').map(Number)
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [year, month, day] = text.slice(0, 10).split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateKey(value) {
  const date = parseDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

function formatDate(value) {
  const date = parseDate(value)
  return date ? date.toLocaleDateString('pt-BR') : '-'
}

function inDateRange(value, startDate = '', endDate = '') {
  const key = dateKey(value)
  if (!key) return false
  if (startDate && key < startDate) return false
  if (endDate && key > endDate) return false
  return true
}

function getEmployeeStatus(employee) {
  return employee?.active === false || employee?.dismissalDate
    ? 'inactive'
    : 'active'
}

function getOrganizationName(employee, type) {
  if (type === 'branch') {
    return employee.branchName || employee.branch || 'Sem filial'
  }

  if (type === 'department') {
    return employee.departmentName || employee.department || 'Sem departamento'
  }

  return employee.positionName || employee.position || employee.roleName || 'Sem cargo'
}

function normalizeEmployee(employee) {
  return {
    ...employee,
    status: getEmployeeStatus(employee),
    statusLabel: getEmployeeStatus(employee) === 'active' ? 'Ativo' : 'Inativo',
    branchLabel: getOrganizationName(employee, 'branch'),
    departmentLabel: getOrganizationName(employee, 'department'),
    positionLabel: getOrganizationName(employee, 'position')
  }
}

export function getReportEmployees(filters = {}) {
  const status = filters.status || 'all'
  const branchId = String(filters.branchId || '')
  const departmentId = String(filters.departmentId || '')
  const positionId = String(filters.positionId || '')

  return getEmployees()
    .map(normalizeEmployee)
    .filter((employee) => {
      if (status !== 'all' && employee.status !== status) return false
      if (branchId && String(employee.branchId || '') !== branchId) return false
      if (departmentId && String(employee.departmentId || '') !== departmentId) return false
      if (positionId && String(employee.positionId || '') !== positionId) return false
      return true
    })
}

export function getReportFilters() {
  return {
    branches: getStoredArray('branches').length
      ? getStoredArray('branches')
      : getReportEmployees().reduce((items, employee) => {
          if (
            employee.branchId &&
            !items.some((item) => String(item.id) === String(employee.branchId))
          ) {
            items.push({
              id: employee.branchId,
              name: employee.branchLabel
            })
          }
          return items
        }, []),
    departments: getDepartments(),
    positions: getPositions()
  }
}

export function getEmployeeReport(filters = {}) {
  const employees = getReportEmployees(filters)

  return {
    rows: employees.map((employee) => ({
      id: employee.id,
      name: employee.name || '-',
      cpf: employee.cpf || '-',
      status: employee.statusLabel,
      branch: employee.branchLabel,
      department: employee.departmentLabel,
      position: employee.positionLabel,
      admissionDate: formatDate(employee.admissionDate),
      dismissalDate: formatDate(employee.dismissalDate),
      phone: employee.phone || '-',
      email: employee.email || '-'
    })),
    summary: {
      total: employees.length,
      active: employees.filter((item) => item.status === 'active').length,
      inactive: employees.filter((item) => item.status === 'inactive').length
    }
  }
}

export function getBirthdayReport(filters = {}) {
  const referenceDate = parseDate(filters.referenceDate) || new Date()
  const month = referenceDate.getMonth()
  const employees = getReportEmployees(filters)

  const rows = employees
    .filter((employee) => {
      const birthDate = parseDate(employee.birthDate)
      return birthDate && birthDate.getMonth() === month
    })
    .map((employee) => {
      const birthDate = parseDate(employee.birthDate)
      return {
        id: employee.id,
        name: employee.name || '-',
        date: formatDate(employee.birthDate),
        day: birthDate.getDate(),
        branch: employee.branchLabel,
        department: employee.departmentLabel,
        position: employee.positionLabel
      }
    })
    .sort((a, b) => a.day - b.day)

  return {
    rows,
    summary: { total: rows.length, month: referenceDate.toLocaleDateString('pt-BR', { month: 'long' }) }
  }
}

function getMovementReport(filters, field, label) {
  const employees = getReportEmployees(filters)
    .filter((employee) => inDateRange(employee[field], filters.startDate, filters.endDate))
    .sort((a, b) => dateKey(a[field]).localeCompare(dateKey(b[field])))

  return {
    rows: employees.map((employee) => ({
      id: employee.id,
      name: employee.name || '-',
      date: formatDate(employee[field]),
      branch: employee.branchLabel,
      department: employee.departmentLabel,
      position: employee.positionLabel,
      status: employee.statusLabel
    })),
    summary: { total: employees.length, label }
  }
}

export function getAdmissionReport(filters = {}) {
  return getMovementReport(filters, 'admissionDate', 'Admissões')
}

export function getDismissalReport(filters = {}) {
  return getMovementReport(filters, 'dismissalDate', 'Demissões')
}

function getMonthKey(date) {
  const parsed = parseDate(date)
  if (!parsed) return ''
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(key) {
  if (!key) return '-'
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
}

export function getTurnoverReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const months = new Map()

  employees.forEach((employee) => {
    const admissionKey = getMonthKey(employee.admissionDate)
    const dismissalKey = getMonthKey(employee.dismissalDate)

    if (inDateRange(employee.admissionDate, filters.startDate, filters.endDate) && admissionKey) {
      if (!months.has(admissionKey)) months.set(admissionKey, { admissions: 0, dismissals: 0 })
      months.get(admissionKey).admissions += 1
    }

    if (inDateRange(employee.dismissalDate, filters.startDate, filters.endDate) && dismissalKey) {
      if (!months.has(dismissalKey)) months.set(dismissalKey, { admissions: 0, dismissals: 0 })
      months.get(dismissalKey).dismissals += 1
    }
  })

  const rows = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, item]) => {
      const admissions = item.admissions
      const dismissals = item.dismissals
      const averageMovement = (admissions + dismissals) / 2

      const populationAtPeriodEnd = employees.filter((employee) => {
        const admission = parseDate(employee.admissionDate)
        const dismissal = parseDate(employee.dismissalDate)
        const periodEnd = new Date(
          Number(month.slice(0, 4)),
          Number(month.slice(5, 7)),
          0
        )

        return (
          admission &&
          admission <= periodEnd &&
          (!dismissal || dismissal > periodEnd)
        )
      }).length

      const turnoverRate =
        populationAtPeriodEnd > 0
          ? (averageMovement / populationAtPeriodEnd) * 100
          : 0

      return {
        month: getMonthLabel(month),
        admissions,
        dismissals,
        averageMovement,
        headcount: populationAtPeriodEnd,
        turnoverRate: Math.round(turnoverRate * 100) / 100
      }
    })

  const totals = rows.reduce(
    (acc, row) => ({
      admissions: acc.admissions + row.admissions,
      dismissals: acc.dismissals + row.dismissals,
      averageMovement: acc.averageMovement + row.averageMovement
    }),
    { admissions: 0, dismissals: 0, averageMovement: 0 }
  )

  return { rows, summary: totals }
}

function groupEmployees(employees, field, label) {
  const groups = Object.values(
    employees.reduce((acc, employee) => {
      const value = employee[field] || `Sem ${label.toLowerCase()}`
      if (!acc[value]) {
        acc[value] = {
          name: value,
          employees: 0,
          active: 0,
          inactive: 0
        }
      }
      acc[value].employees += 1
      if (employee.status === 'active') acc[value].active += 1
      else acc[value].inactive += 1
      return acc
    }, {})
  ).sort((a, b) => b.employees - a.employees)

  return {
    rows: groups,
    summary: {
      groups: groups.length,
      employees: employees.length
    }
  }
}

export function getBranchReport(filters = {}) {
  return groupEmployees(getReportEmployees(filters), 'branchLabel', 'filial')
}

export function getDepartmentReport(filters = {}) {
  return groupEmployees(getReportEmployees(filters), 'departmentLabel', 'departamento')
}

export function getPositionReport(filters = {}) {
  return groupEmployees(getReportEmployees(filters), 'positionLabel', 'cargo')
}

export function getTrainingReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const employeeIds = new Set(employees.map((employee) => Number(employee.id)))
  const trainings = getTrainings()
  const participants = getTrainingParticipants().filter((participant) =>
    employeeIds.has(Number(participant.employeeId))
  )

  const statusLabels = {
    pending: 'Pendente',
    in_progress: 'Em andamento',
    completed: 'Concluído',
    failed: 'Reprovado'
  }

  const rows = trainings.map((training) => {
    const trainingParticipants = participants.filter(
      (participant) => Number(participant.trainingId) === Number(training.id)
    )

    const completed = trainingParticipants.filter(
      (participant) => participant.status === 'completed'
    ).length

    const approved = trainingParticipants.filter(
      (participant) => participant.assessmentStatus === 'approved'
    ).length

    const averageProgress =
      trainingParticipants.length > 0
        ? trainingParticipants.reduce(
            (sum, participant) => sum + (Number(participant.progress) || 0),
            0
          ) / trainingParticipants.length
        : 0

    return {
      id: training.id,
      training: training.name || '-',
      category: training.category || training.type || '-',
      duration: Number(training.duration) || 0,
      participants: trainingParticipants.length,
      completed,
      approved,
      averageProgress: Math.round(averageProgress)
    }
  })

  return {
    rows,
    summary: {
      trainings: trainings.length,
      participants: participants.length,
      completed: participants.filter((item) => item.status === 'completed').length,
      approved: participants.filter((item) => item.assessmentStatus === 'approved').length,
      statusLabels
    }
  }
}

export function getCertificateReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const employeeIds = new Set(employees.map((employee) => Number(employee.id)))
  const certificates = getTrainingCertificates().filter((certificate) =>
    employeeIds.has(Number(certificate.employeeId))
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const warningDays = Number(filters.warningDays) || 30

  const rows = []

  certificates.forEach((certificate) => {
    const expiration =
      certificate.expirationDate ||
      certificate.expiresAt ||
      certificate.validUntil ||
      certificate.validityDate

    const expirationDate = parseDate(expiration)

    rows.push({
      type: 'Treinamento',
      employee: certificate.employeeName || '-',
      training: certificate.trainingName || '-',
      certificateNumber: certificate.certificateNumber || '-',
      issuedAt: formatDate(certificate.issuedAt),
      expirationDate: expirationDate ? formatDate(expirationDate) : 'Sem vencimento cadastrado',
      status: expirationDate
        ? expirationDate < today
          ? 'Vencido'
          : expirationDate <= new Date(today.getTime() + warningDays * 86400000)
            ? 'Vencendo'
            : 'Válido'
        : 'Sem data de vencimento'
    })
  })

  employees.forEach((employee) => {
    if (employee.cnhValidity) {
      const expirationDate = parseDate(employee.cnhValidity)
      if (expirationDate) {
        rows.push({
          type: 'CNH',
          employee: employee.name || '-',
          training: 'CNH',
          certificateNumber: employee.cnhNumber || '-',
          issuedAt: formatDate(employee.cnhDate),
          expirationDate: formatDate(expirationDate),
          status:
            expirationDate < today
              ? 'Vencido'
              : expirationDate <= new Date(today.getTime() + warningDays * 86400000)
                ? 'Vencendo'
                : 'Válido'
        })
      }
    }
  })

  const filteredRows = rows
    .filter((row) => {
      if (filters.certificateStatus === 'all' || !filters.certificateStatus) return true
      return row.status === filters.certificateStatus
    })
    .sort((a, b) => {
      const da = parseDate(a.expirationDate)
      const db = parseDate(b.expirationDate)
      if (!da) return 1
      if (!db) return -1
      return da - db
    })

  return {
    rows: filteredRows,
    summary: {
      total: filteredRows.length,
      expired: filteredRows.filter((item) => item.status === 'Vencido').length,
      expiring: filteredRows.filter((item) => item.status === 'Vencendo').length,
      valid: filteredRows.filter((item) => item.status === 'Válido').length
    }
  }
}

export function getTimeClockReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const startDate = filters.startDate || dateKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const endDate = filters.endDate || dateKey(new Date())

  const rows = employees.map((employee) => {
    const period = calculateTimeClockPeriod(employee.id, startDate, endDate)
    return {
      id: employee.id,
      employee: employee.name || '-',
      branch: employee.branchLabel,
      department: employee.departmentLabel,
      expected: formatMinutes(period.totals.expectedMinutes),
      worked: formatMinutes(period.totals.workedMinutes),
      overtime: formatMinutes(period.totals.overtimeMinutes),
      deficit: formatMinutes(period.totals.deficitMinutes),
      absences: period.totals.absenceDays,
      pending: period.totals.pendingDays
    }
  })

  const totals = employees.reduce(
    (acc, employee) => {
      const period = calculateTimeClockPeriod(employee.id, startDate, endDate)
      acc.expected += period.totals.expectedMinutes
      acc.worked += period.totals.workedMinutes
      acc.overtime += period.totals.overtimeMinutes
      acc.deficit += period.totals.deficitMinutes
      acc.absences += period.totals.absenceDays
      acc.pending += period.totals.pendingDays
      return acc
    },
    { expected: 0, worked: 0, overtime: 0, deficit: 0, absences: 0, pending: 0 }
  )

  return { rows, totals: { ...totals, expectedLabel: formatMinutes(totals.expected), workedLabel: formatMinutes(totals.worked), overtimeLabel: formatMinutes(totals.overtime), deficitLabel: formatMinutes(totals.deficit) }, period: { startDate, endDate } }
}

export function getVacationReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const employeeMap = new Map(employees.map((employee) => [Number(employee.id), employee]))
  const rows = getVacations()
    .filter((item) => employeeMap.has(Number(item.employeeId)))
    .filter((item) => inDateRange(item.startDate, filters.startDate, filters.endDate))
    .map((item) => {
      const employee = employeeMap.get(Number(item.employeeId))
      return {
        employee: employee?.name || '-',
        startDate: formatDate(item.startDate),
        days: Number(item.days) || 0,
        abonoDays: Number(item.abonoDays) || 0,
        status: item.status || '-',
        gross: Number(item.calculation?.grossValue) || 0
      }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  return { rows, summary: { total: rows.length, scheduled: rows.filter((item) => item.status === 'scheduled').length } }
}

export function getPayrollReport(filters = {}) {
  const start = filters.startCompetence || ''
  const end = filters.endCompetence || ''
  const payrolls = getPayrolls().filter((payroll) => {
    if (start && payroll.competence < start) return false
    if (end && payroll.competence > end) return false
    return true
  })

  const employeeFilter = getReportEmployees(filters)
  const employeeIds = new Set(employeeFilter.map((employee) => Number(employee.id)))

  const rows = payrolls.flatMap((payroll) =>
    (payroll.employees || [])
      .filter((employee) => employeeIds.has(Number(employee.employeeId)))
      .map((employee) => ({
        competence: payroll.competence,
        status: payroll.status === 'closed' ? 'Fechada' : 'Em aberto',
        employee: employee.employeeName || '-',
        baseSalary: Number(employee.baseSalary) || 0,
        earnings: (employee.earnings || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
        gross: Number(employee.grossSalary) || 0,
        deductions: Number(employee.totalDeductions) || 0,
        inss: Number(employee.taxes?.inss?.amount) || 0,
        irrf: Number(employee.taxes?.irrf?.amount) || 0,
        fgts: Number(employee.taxes?.fgts?.amount) || 0,
        net: Number(employee.netSalary) || 0,
        overtime: Number(employee.timeData?.overtimeMinutes) || 0
      }))
  )

  const totals = rows.reduce(
    (acc, row) => {
      Object.keys(acc).forEach((key) => {
        acc[key] += Number(row[key]) || 0
      })
      return acc
    },
    { baseSalary: 0, earnings: 0, gross: 0, deductions: 0, inss: 0, irrf: 0, fgts: 0, net: 0, overtime: 0 }
  )

  return { rows, totals, payrolls: payrolls.map((item) => ({ competence: item.competence, status: item.status })) }
}


export function getBankHoursReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const employeeMap = new Map(
    employees.map((employee) => [Number(employee.id), employee])
  )

  const rows = getBankHoursEntries()
    .filter((entry) => employeeMap.has(Number(entry.employeeId)))
    .filter((entry) => inDateRange(entry.date, filters.startDate, filters.endDate))
    .map((entry) => {
      const employee = employeeMap.get(Number(entry.employeeId))
      const signedMinutes =
        entry.type === 'debit'
          ? -(Number(entry.minutes) || 0)
          : Number(entry.minutes) || 0

      return {
        employee: employee?.name || '-',
        date: formatDate(entry.date),
        type: entry.type === 'debit' ? 'Débito' : 'Crédito',
        category: entry.category || '-',
        minutes: Math.abs(signedMinutes),
        balance: signedMinutes,
        description: entry.description || '-'
      }
    })

  const balance = rows.reduce((sum, row) => sum + row.balance, 0)

  return {
    rows,
    summary: {
      total: rows.length,
      credits: rows.filter((row) => row.type === 'Crédito').length,
      debits: rows.filter((row) => row.type === 'Débito').length,
      balance: formatMinutes(Math.abs(balance))
    }
  }
}

export function getThirteenthReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const employeeMap = new Map(
    employees.map((employee) => [Number(employee.id), employee])
  )

  const rows = getThirteenths()
    .filter((item) => employeeMap.has(Number(item.employeeId)))
    .filter((item) => {
      const year = Number(filters.year)
      return !year || Number(item.year) === year
    })
    .map((item) => {
      const employee = employeeMap.get(Number(item.employeeId))
      const calculation = item.calculation || {}

      return {
        employee: employee?.name || '-',
        year: item.year || '-',
        months: Number(calculation.months) || 0,
        gross: Number(calculation.grossValue) || 0,
        firstInstallment: Number(calculation.firstInstallment) || 0,
        secondInstallment: Number(calculation.secondInstallment) || 0,
        status: item.status || '-'
      }
    })

  return {
    rows,
    summary: {
      total: rows.length,
      gross: rows.reduce((sum, row) => sum + row.gross, 0)
    }
  }
}

export function getTerminationReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const employeeMap = new Map(
    employees.map((employee) => [Number(employee.id), employee])
  )

  const rows = getTerminations()
    .filter((item) => employeeMap.has(Number(item.employeeId)))
    .filter((item) =>
      inDateRange(item.dismissalDate, filters.startDate, filters.endDate)
    )
    .map((item) => {
      const employee = employeeMap.get(Number(item.employeeId))
      const calculation = item.calculation || {}

      return {
        employee: employee?.name || '-',
        dismissalDate: formatDate(item.dismissalDate),
        status: item.status || '-',
        balanceSalary: Number(calculation.balanceSalary) || 0,
        notice: Number(calculation.noticeValue) || 0,
        vacation: Number(calculation.vacationGrossValue) || 0,
        thirteenth: Number(calculation.proportional13) || 0,
        gross: Number(calculation.grossValue) || 0,
        net: Number(calculation.netValue) || 0
      }
    })

  return {
    rows,
    summary: {
      total: rows.length,
      gross: rows.reduce((sum, row) => sum + row.gross, 0),
      net: rows.reduce((sum, row) => sum + row.net, 0)
    }
  }
}

export function getMedicalReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const employeeIds = new Set(employees.map((employee) => Number(employee.id)))
  const rows = getMedicalCertificates()
    .filter((item) => employeeIds.has(Number(item.employeeId)))
    .filter((item) => {
      const date = item.startDate || item.date
      return inDateRange(date, filters.startDate, filters.endDate)
    })
    .map((item) => ({
      employee: employees.find((employee) => Number(employee.id) === Number(item.employeeId))?.name || '-',
      type: item.type || '-',
      startDate: formatDate(item.startDate || item.date),
      endDate: formatDate(item.endDate),
      days: Number(item.days) || 0,
      status: item.status || '-',
      cid: item.cid || '-'
    }))

  return { rows, summary: { total: rows.length } }
}

export function getEvaluationReport(filters = {}) {
  const employees = getReportEmployees(filters)
  const employeeIds = new Set(employees.map((employee) => Number(employee.id)))
  const rows = getEvaluations()
    .filter((item) => employeeIds.has(Number(item.employeeId)))
    .filter((item) => inDateRange(item.createdAt || item.date, filters.startDate, filters.endDate))
    .map((item) => ({
      employee: employees.find((employee) => Number(employee.id) === Number(item.employeeId))?.name || '-',
      type: item.type || '-',
      status: item.status || '-',
      result: item.result?.average ?? item.average ?? '-',
      date: formatDate(item.createdAt || item.date)
    }))

  return { rows, summary: { total: rows.length } }
}

export function getReportData(type, filters = {}) {
  switch (type) {
    case 'employees': return getEmployeeReport(filters)
    case 'birthdays': return getBirthdayReport(filters)
    case 'admissions': return getAdmissionReport(filters)
    case 'dismissals': return getDismissalReport(filters)
    case 'turnover': return getTurnoverReport(filters)
    case 'branches': return getBranchReport(filters)
    case 'departments': return getDepartmentReport(filters)
    case 'positions': return getPositionReport(filters)
    case 'trainings': return getTrainingReport(filters)
    case 'certificates': return getCertificateReport(filters)
    case 'timeclock': return getTimeClockReport(filters)
    case 'vacations': return getVacationReport(filters)
    case 'payroll': return getPayrollReport(filters)
    case 'bankhours': return getBankHoursReport(filters)
    case 'thirteenth': return getThirteenthReport(filters)
    case 'terminations': return getTerminationReport(filters)
    case 'medical': return getMedicalReport(filters)
    case 'evaluations': return getEvaluationReport(filters)
    default: return { rows: [], summary: {} }
  }
}
