const STORAGE_KEY = 'workSchedules'

const ASSIGNMENTS_STORAGE_KEY = 'employeeWorkSchedules'

/*
 * ============================================================
 * DIAS DA SEMANA
 * ============================================================
 */

export const WEEK_DAYS = [
  {
    value: 1,
    key: 'monday',
    label: 'Segunda-feira',
    short: 'Seg'
  },
  {
    value: 2,
    key: 'tuesday',
    label: 'Terça-feira',
    short: 'Ter'
  },
  {
    value: 3,
    key: 'wednesday',
    label: 'Quarta-feira',
    short: 'Qua'
  },
  {
    value: 4,
    key: 'thursday',
    label: 'Quinta-feira',
    short: 'Qui'
  },
  {
    value: 5,
    key: 'friday',
    label: 'Sexta-feira',
    short: 'Sex'
  },
  {
    value: 6,
    key: 'saturday',
    label: 'Sábado',
    short: 'Sáb'
  },
  {
    value: 0,
    key: 'sunday',
    label: 'Domingo',
    short: 'Dom'
  }
]

/*
 * ============================================================
 * TIPOS DE DIA
 * ============================================================
 */

export const DAY_TYPES = [
  {
    value: 'work',
    label: 'Trabalho'
  },
  {
    value: 'course',
    label: 'Curso / Abono'
  },
  {
    value: 'off',
    label: 'Folga'
  }
]

/*
 * ============================================================
 * TIPOS DE JORNADA
 * ============================================================
 */

export const WORK_SCHEDULE_TYPES = [
  {
    value: 'weekly',
    label: 'Jornada semanal'
  },
  {
    value: '12x36',
    label: 'Escala 12x36'
  },
  {
    value: '4x2',
    label: 'Escala 4x2'
  },
  {
    value: 'custom',
    label: 'Escala personalizada'
  }
]

/*
 * ============================================================
 * UTILITÁRIOS
 * ============================================================
 */

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

/*
 * ============================================================
 * PERÍODO
 * ============================================================
 */

function createPeriod(start = '08:00', end = '17:00') {
  return {
    id: generateId(),
    start,
    end
  }
}

/*
 * ============================================================
 * DIA SEMANAL
 * ============================================================
 */

function createWeeklyDay(dayOfWeek, type = 'off') {
  return {
    id: generateId(),
    dayOfWeek,
    type,
    periods: type === 'work' ? [createPeriod()] : [],
    creditedHours: type === 'course' ? '0' : ''
  }
}

/*
 * ============================================================
 * CRIA JORNADA SEMANAL
 * ============================================================
 *
 * Segunda a sexta começam como dias trabalhados.
 */

export function createWeeklyDays() {
  return WEEK_DAYS.map((day) =>
    createWeeklyDay(
      day.value,
      day.value >= 1 && day.value <= 5 ? 'work' : 'off'
    )
  )
}

/*
 * ============================================================
 * CRIA CICLO
 * ============================================================
 */

export function createCycleDays(length = 2) {
  const totalDays = Math.max(1, Math.min(31, Number(length) || 1))

  return Array.from({ length: totalDays }, (_, index) => ({
    id: generateId(),
    cycleDay: index + 1,
    type: index === 0 ? 'work' : 'off',
    periods: index === 0 ? [createPeriod()] : [],
    creditedHours: ''
  }))
}

/*
 * ============================================================
 * JORNADA PADRÃO
 * ============================================================
 */

export const DEFAULT_WORK_SCHEDULE = {
  type: 'weekly',

  weeklyHours: '',

  shiftHours: '',

  workDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],

  schedule: {
    monday: {
      enabled: true,
      start: '08:00',
      end: '17:00',
      breakMinutes: 60
    },

    tuesday: {
      enabled: true,
      start: '08:00',
      end: '17:00',
      breakMinutes: 60
    },

    wednesday: {
      enabled: true,
      start: '08:00',
      end: '17:00',
      breakMinutes: 60
    },

    thursday: {
      enabled: true,
      start: '08:00',
      end: '17:00',
      breakMinutes: 60
    },

    friday: {
      enabled: true,
      start: '08:00',
      end: '17:00',
      breakMinutes: 60
    },

    saturday: {
      enabled: false,
      start: '',
      end: '',
      breakMinutes: 0
    },

    sunday: {
      enabled: false,
      start: '',
      end: '',
      breakMinutes: 0
    }
  }
}

/*
 * ============================================================
 * NORMALIZA JORNADA LEGADA
 * ============================================================
 */

export function normalizeWorkSchedule(schedule = {}) {
  const base = clone(DEFAULT_WORK_SCHEDULE)

  const normalized = {
    ...base,
    ...schedule,

    schedule: {
      ...base.schedule,
      ...(schedule.schedule || {})
    }
  }

  WEEK_DAYS.forEach(({ key }) => {
    normalized.schedule[key] = {
      ...base.schedule[key],
      ...(schedule.schedule?.[key] || {})
    }
  })

  normalized.workDays = Array.isArray(schedule.workDays)
    ? schedule.workDays
    : base.workDays

  return normalized
}

/*
 * ============================================================
 * HORÁRIO → MINUTOS
 * ============================================================
 */

export function timeToMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) {
    return null
  }

  const [hours, minutes] = value.split(':').map(Number)

  if (hours > 23 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

/*
 * ============================================================
 * DURAÇÃO DE UM PERÍODO
 * ============================================================
 */

export function calculateIntervalMinutes(start, end) {
  const startMinutes = timeToMinutes(start)
  const endMinutes = timeToMinutes(end)

  if (startMinutes === null || endMinutes === null) {
    return 0
  }

  let total = endMinutes - startMinutes

  /*
   * Permite jornadas que atravessam a meia-noite.
   *
   * Exemplo:
   * 18:00 → 06:00
   */

  if (total < 0) {
    total += 24 * 60
  }

  return Math.max(total, 0)
}

/*
 * ============================================================
 * HORAS DE INTERVALO
 * ============================================================
 */

export function calculateIntervalHours(start, end, breakMinutes = 0) {
  const minutes = calculateIntervalMinutes(start, end)

  const result = minutes - (Number(breakMinutes) || 0)

  return Math.max(result, 0) / 60
}

/*
 * ============================================================
 * MINUTOS PLANEJADOS DE UM DIA
 * ============================================================
 */

export function calculateDayPlannedMinutes(day) {
  if (!day) {
    return 0
  }

  /*
   * Folga não gera horas.
   */

  if (day.type === 'off') {
    return 0
  }

  /*
   * Curso/abono contabiliza as horas informadas
   * como horas cumpridas.
   */

  if (day.type === 'course') {
    return Math.round((Number(day.creditedHours) || 0) * 60)
  }

  /*
   * Dia trabalhado.
   */

  if (day.type === 'work') {
    return (day.periods || []).reduce(
      (total, period) =>
        total + calculateIntervalMinutes(period.start, period.end),
      0
    )
  }

  return 0
}

/*
 * ============================================================
 * FORMATA MINUTOS
 * ============================================================
 */

export function formatMinutes(minutes = 0) {
  const totalMinutes = Math.round(Number(minutes) || 0)

  const sign = totalMinutes < 0 ? '-' : ''

  const absolute = Math.abs(totalMinutes)

  const hours = Math.floor(absolute / 60)

  const remainingMinutes = absolute % 60

  return `${sign}${String(hours).padStart(
    2,
    '0'
  )}:${String(remainingMinutes).padStart(2, '0')}`
}

/*
 * ============================================================
 * FORMATA HORAS DECIMAIS
 * ============================================================
 */

export function formatHours(decimalHours = 0) {
  return formatMinutes(Number(decimalHours || 0) * 60)
}

/*
 * ============================================================
 * CALCULA TOTAL DA SEMANA
 * ============================================================
 */

export function calculateScheduleWeeklyMinutes(schedule) {
  if (!schedule) {
    return 0
  }

  /*
   * Jornada por ciclo.
   *
   * Calculamos a média semanal proporcional ao ciclo.
   */

  if (schedule.mode === 'cycle') {
    const cycleDays = schedule.days || []

    const cycleMinutes = cycleDays.reduce(
      (total, day) => total + calculateDayPlannedMinutes(day),
      0
    )

    const cycleLength = Number(schedule.cycleLength) || cycleDays.length || 1

    return Math.round((cycleMinutes / cycleLength) * 7)
  }

  /*
   * Jornada semanal.
   */

  return (schedule.days || []).reduce(
    (total, day) => total + calculateDayPlannedMinutes(day),
    0
  )
}

/*
 * ============================================================
 * CALCULA TOTAL SEMANAL EM HORAS
 * ============================================================
 */

export function calculateScheduleWeeklyHours(schedule) {
  return calculateScheduleWeeklyMinutes(schedule) / 60
}

/*
 * ============================================================
 * VALIDA JORNADA
 * ============================================================
 */

export function validateWorkSchedule(schedule) {
  const errors = []

  if (!schedule?.name?.trim()) {
    errors.push('Informe o nome da jornada.')
  }

  const weeklyHours = Number(schedule?.weeklyHours) || 0

  /*
   * Para jornada semanal, a carga de referência
   * é obrigatória.
   */

  if (schedule?.mode === 'weekly' && weeklyHours <= 0) {
    errors.push('Informe uma carga horária semanal maior que zero.')
  }

  /*
   * Validação dos dias.
   */

  ;(schedule?.days || []).forEach((day, index) => {
    if (day.type === 'work') {
      if (!day.periods?.length) {
        errors.push(`O dia ${index + 1} não possui período de trabalho.`)

        return
      }

      day.periods.forEach((period) => {
        const start = timeToMinutes(period.start)

        const end = timeToMinutes(period.end)

        if (start === null || end === null) {
          errors.push(
            `Existe um período com horário inválido no dia ${index + 1}.`
          )
        }

        if (
          start !== null &&
          end !== null &&
          calculateIntervalMinutes(period.start, period.end) <= 0
        ) {
          errors.push(
            `Existe um período sem duração válida no dia ${index + 1}.`
          )
        }
      })
    }

    if (day.type === 'course') {
      if (Number(day.creditedHours) <= 0) {
        errors.push(`Informe as horas abonadas do curso no dia ${index + 1}.`)
      }
    }
  })

  const calculatedMinutes = calculateScheduleWeeklyMinutes(schedule)

  const calculatedHours = calculatedMinutes / 60

  /*
   * Trava de carga horária.
   */

  if (schedule?.mode === 'weekly' && calculatedHours > weeklyHours + 0.001) {
    errors.push(
      `A jornada configurada totaliza ${formatHours(
        calculatedHours
      )}, ultrapassando a carga semanal de ${formatHours(weeklyHours)}.`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
    calculatedWeeklyHours: calculatedHours,
    calculatedWeeklyMinutes: calculatedMinutes
  }
}

/*
 * ============================================================
 * EXPECTATIVA DE HORAS PARA UMA DATA
 * ============================================================
 */

export function calculateExpectedHoursForDate(schedule, date = new Date()) {
  if (!schedule) {
    return 0
  }

  /*
   * Jornada semanal.
   */

  if (schedule.mode === 'weekly') {
    const dayOfWeek = date.getDay()

    const day = (schedule.days || []).find(
      (item) => Number(item.dayOfWeek) === Number(dayOfWeek)
    )

    return day ? calculateDayPlannedMinutes(day) / 60 : 0
  }

  /*
   * Jornada por ciclo.
   */

  if (schedule.mode === 'cycle') {
    const days = schedule.days || []

    if (!days.length) {
      return 0
    }

    const startDate = schedule.cycleStartDate
      ? new Date(`${schedule.cycleStartDate}T00:00:00`)
      : null

    if (!startDate || Number.isNaN(startDate.getTime())) {
      return 0
    }

    const currentDate = new Date(date)

    const difference = Math.floor(
      (currentDate - startDate) / (24 * 60 * 60 * 1000)
    )

    if (difference < 0) {
      return 0
    }

    const cycleLength = Number(schedule.cycleLength) || days.length

    const cycleIndex = difference % cycleLength

    const day = days[cycleIndex]

    return day ? calculateDayPlannedMinutes(day) / 60 : 0
  }

  return 0
}

/*
 * ============================================================
 * COMPARA HORAS TRABALHADAS
 * ============================================================
 */

export function compareWorkedHours(expectedHours, workedHours) {
  const expected = Number(expectedHours) || 0

  const worked = Number(workedHours) || 0

  const difference = worked - expected

  return {
    expected,
    worked,
    difference,

    status:
      difference > 0.001
        ? 'overtime'
        : difference < -0.001
          ? 'deficit'
          : 'normal'
  }
}

/*
 * ============================================================
 * STORAGE — JORNADAS
 * ============================================================
 */

export function getWorkSchedules() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/*
 * ============================================================
 * ADICIONAR JORNADA
 * ============================================================
 */

export function addWorkSchedule(schedule) {
  const schedules = getWorkSchedules()

  const newSchedule = {
    ...schedule,

    id: schedule.id || generateId(),

    createdAt: schedule.createdAt || new Date().toISOString(),

    updatedAt: schedule.updatedAt || new Date().toISOString()
  }

  const updated = [...schedules, newSchedule]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * ATUALIZAR JORNADA
 * ============================================================
 */

export function updateWorkSchedule(schedule) {
  const schedules = getWorkSchedules()

  const updated = schedules.map((item) =>
    Number(item.id) === Number(schedule.id)
      ? {
          ...item,
          ...schedule,
          updatedAt: new Date().toISOString()
        }
      : item
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * EXCLUIR JORNADA
 * ============================================================
 */

export function deleteWorkSchedule(scheduleId) {
  const schedules = getWorkSchedules()

  const updated = schedules.filter(
    (item) => Number(item.id) !== Number(scheduleId)
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * STORAGE — VÍNCULOS
 * ============================================================
 */

export function getEmployeeWorkSchedules() {
  try {
    const stored = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY)

    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/*
 * ============================================================
 * VINCULAR JORNADA
 * ============================================================
 */

export function assignWorkSchedule({
  employeeId,
  scheduleId,
  effectiveFrom,
  effectiveTo = '',
  notes = ''
}) {
  const assignments = getEmployeeWorkSchedules()

  /*
   * Não removemos vínculos anteriores.
   *
   * Dessa forma o sistema consegue manter
   * o histórico.
   */

  const assignment = {
    id: generateId(),

    employeeId,

    scheduleId,

    effectiveFrom,

    effectiveTo,

    notes,

    createdAt: new Date().toISOString()
  }

  const updated = [...assignments, assignment]

  localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * BUSCA A JORNADA VIGENTE DO FUNCIONÁRIO
 * ============================================================
 */

export function getEmployeeCurrentWorkSchedule(employeeId, date = new Date()) {
  const assignments = getEmployeeWorkSchedules()

  const schedules = getWorkSchedules()

  const targetDate = date instanceof Date ? date : new Date(date)

  const target = targetDate.toISOString().slice(0, 10)

  const employeeAssignments = assignments
    .filter((item) => Number(item.employeeId) === Number(employeeId))
    .filter((item) => {
      if (item.effectiveFrom && item.effectiveFrom > target) {
        return false
      }

      if (item.effectiveTo && item.effectiveTo < target) {
        return false
      }

      return true
    })
    .sort((a, b) =>
      String(b.effectiveFrom || '').localeCompare(String(a.effectiveFrom || ''))
    )

  const assignment = employeeAssignments[0]

  if (!assignment) {
    return null
  }

  return (
    schedules.find(
      (schedule) => Number(schedule.id) === Number(assignment.scheduleId)
    ) || null
  )
}

/*
 * ============================================================
 * NOME DA JORNADA DO FUNCIONÁRIO
 * ============================================================
 *
 * Utilizado pelo módulo de Ponto.
 *
 * O parâmetro pode ser:
 * - funcionário
 * - ID do funcionário
 *
 * Primeiro tenta localizar a jornada vigente.
 */

export function getEmployeeWorkScheduleName(employee, date = new Date()) {
  if (!employee) {
    return ''
  }

  const employeeId = typeof employee === 'object' ? employee.id : employee

  if (!employeeId) {
    return ''
  }

  const schedule = getEmployeeCurrentWorkSchedule(employeeId, date)

  return schedule?.name || ''
}

/*
 * ============================================================
 * MINUTOS ESPERADOS PARA UMA DATA
 * ============================================================
 *
 * Utilizado pelo módulo de Ponto.
 *
 * Esta função centraliza a descoberta da jornada
 * que o funcionário deveria cumprir naquele dia.
 */

export function getExpectedMinutesForDate(employee, date = new Date()) {
  if (!employee) {
    return 0
  }

  const employeeId = typeof employee === 'object' ? employee.id : employee

  if (!employeeId) {
    return 0
  }

  const schedule = getEmployeeCurrentWorkSchedule(employeeId, date)

  if (!schedule) {
    return 0
  }

  /*
   * Jornada no formato novo.
   */

  if (schedule.mode === 'weekly' || schedule.mode === 'cycle') {
    return Math.round(calculateExpectedHoursForDate(schedule, date) * 60)
  }

  /*
   * Compatibilidade com jornadas antigas
   * utilizadas pelo módulo de Cargos.
   */

  if (schedule.type === 'weekly') {
    const dayOfWeek = date.getDay()

    const dayKey = WEEK_DAYS.find((item) => item.value === dayOfWeek)?.key

    const day = dayKey && schedule.schedule?.[dayKey]

    if (!day?.enabled) {
      return 0
    }

    return Math.round(
      calculateIntervalHours(day.start, day.end, day.breakMinutes) * 60
    )
  }

  /*
   * Escala 12x36.
   *
   * Se existir uma configuração diária,
   * usamos ela. Caso contrário, utilizamos
   * 12 horas como padrão.
   */

  if (schedule.type === '12x36') {
    return Math.round(
      Number(schedule.dailyHours || schedule.shiftHours || 12) * 60
    )
  }

  /*
   * Escala 4x2 e demais jornadas antigas.
   *
   * Caso possuam days em formato de array,
   * tentamos encontrar o dia correspondente.
   */

  if (Array.isArray(schedule.days)) {
    const dayOfWeek = date.getDay()

    const day = schedule.days.find(
      (item) => Number(item.dayOfWeek) === Number(dayOfWeek)
    )

    return day ? calculateDayPlannedMinutes(day) : 0
  }

  return 0
}

/*
 * ============================================================
 * COMPATIBILIDADE COM CARGOS
 * ============================================================
 *
 * O módulo de Cargos utiliza o formato antigo
 * de jornada.
 *
 * Estas funções devem permanecer disponíveis
 * para não quebrar o cadastro e a edição de cargos.
 */

/*
 * ============================================================
 * CALCULA HORAS SEMANAIS — FORMATO LEGADO
 * ============================================================
 */

export function calculateWeeklyScheduleHours(schedule) {
  if (!schedule) {
    return 0
  }

  /*
   * Escala 12x36:
   *
   * 12 horas trabalhadas a cada 36 horas.
   *
   * Média semanal aproximada:
   * 12 × 3,5 = 42 horas.
   */

  if (schedule.type === '12x36') {
    return Number(schedule.dailyHours || schedule.shiftHours || 12) * 3.5
  }

  /*
   * Escala 4x2:
   *
   * 4 dias trabalhados a cada 6 dias.
   *
   * Cálculo proporcional para 28 dias.
   */

  if (schedule.type === '4x2') {
    const dailyHours = Number(schedule.dailyHours || schedule.shiftHours) || 0

    return (dailyHours * 28) / 6
  }

  /*
   * Jornada semanal no formato antigo.
   */

  if (schedule.type === 'weekly') {
    if (schedule.days && !Array.isArray(schedule.days)) {
      return Object.values(schedule.days).reduce((total, day) => {
        if (!day?.enabled) {
          return total
        }

        return (
          total + calculateIntervalHours(day.start, day.end, day.breakMinutes)
        )
      }, 0)
    }
  }

  return 0
}

/*
 * ============================================================
 * VALIDAÇÃO LEGADA DE CARGOS
 * ============================================================
 */

export function getScheduleValidation(schedule, workload) {
  const target = Number(workload) || 0

  if (!target) {
    return {
      valid: false,
      message: 'Informe a carga horária semanal antes de configurar a jornada.'
    }
  }

  if (!schedule?.type) {
    return {
      valid: false,
      message: 'Selecione o tipo de jornada.'
    }
  }

  const total = calculateWeeklyScheduleHours(schedule)

  if (total > target + 0.001) {
    return {
      valid: false,

      total,

      remaining: target - total,

      message: `A jornada configurada soma ${formatHours(
        total
      )} por semana, mas a carga permitida é de ${formatHours(target)}.`
    }
  }

  /*
   * A escala 12x36 precisa possuir
   * exatamente 12 horas por plantão.
   */

  if (
    schedule.type === '12x36' &&
    Number(schedule.dailyHours || schedule.shiftHours || 0) !== 12
  ) {
    return {
      valid: false,

      message:
        'Na escala 12x36, a jornada deve possuir exatamente 12 horas por plantão.'
    }
  }

  return {
    valid: true,

    total,

    remaining: target - total
  }
}
