import { getStoredArray, setStored } from './storage'
import { getEmployees } from './employee'
import {
  getExpectedMinutesForDate,
  getEmployeeWorkScheduleName
} from './workSchedule'

const STORAGE_KEY = 'timeClockRecords'

/*
 * ============================================================
 * TIPOS DE BATIDA
 * ============================================================
 */

export const PUNCH_TYPES = {
  ENTRY: 'entry',
  BREAK_START: 'break_start',
  BREAK_END: 'break_end',
  EXIT: 'exit'
}

export const PUNCH_TYPE_LABELS = {
  [PUNCH_TYPES.ENTRY]: 'Entrada',
  [PUNCH_TYPES.BREAK_START]: 'Saída para intervalo',
  [PUNCH_TYPES.BREAK_END]: 'Retorno do intervalo',
  [PUNCH_TYPES.EXIT]: 'Saída'
}

/*
 * ============================================================
 * ACESSO AOS REGISTROS
 * ============================================================
 */

export function getTimeClockRecords() {
  return getStoredArray(STORAGE_KEY)
}

function saveTimeClockRecords(records) {
  setStored(STORAGE_KEY, records)

  return records
}

/*
 * ============================================================
 * DATA
 * ============================================================
 */

export function getLocalDate(date = new Date()) {
  const year = date.getFullYear()

  const month = String(date.getMonth() + 1).padStart(2, '0')

  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getCurrentTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0')

  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}

/*
 * ============================================================
 * REGISTRO DO DIA
 * ============================================================
 */

export function getTimeClockRecord(employeeId, date = getLocalDate()) {
  const records = getTimeClockRecords()

  return (
    records.find(
      (record) =>
        Number(record.employeeId) === Number(employeeId) && record.date === date
    ) || null
  )
}

export function getTodayTimeClockRecord(employeeId) {
  return getTimeClockRecord(employeeId, getLocalDate())
}

/*
 * ============================================================
 * SEQUÊNCIA DAS BATIDAS
 * ============================================================
 */

export function getNextPunchType(record) {
  if (!record || !record.punches || record.punches.length === 0) {
    return PUNCH_TYPES.ENTRY
  }

  const lastPunch = record.punches[record.punches.length - 1]

  switch (lastPunch.type) {
    case PUNCH_TYPES.ENTRY:
      return PUNCH_TYPES.BREAK_START

    case PUNCH_TYPES.BREAK_START:
      return PUNCH_TYPES.BREAK_END

    case PUNCH_TYPES.BREAK_END:
      return PUNCH_TYPES.EXIT

    case PUNCH_TYPES.EXIT:
      return null

    default:
      return PUNCH_TYPES.ENTRY
  }
}

export function canRegisterPunch(record) {
  return getNextPunchType(record) !== null
}

/*
 * ============================================================
 * REGISTRAR BATIDA
 * ============================================================
 */

export function registerPunch(employeeId, options = {}) {
  const numericEmployeeId = Number(employeeId)

  if (!numericEmployeeId) {
    return {
      success: false,
      message: 'Funcionário inválido.'
    }
  }

  const now = new Date()

  const date = options.date || getLocalDate(now)

  const time = options.time || getCurrentTime(now)

  const records = getTimeClockRecords()

  let record = records.find(
    (item) =>
      Number(item.employeeId) === numericEmployeeId && item.date === date
  )

  const nextPunchType = getNextPunchType(record)

  if (!nextPunchType) {
    return {
      success: false,
      message: 'Todas as batidas previstas para hoje já foram registradas.'
    }
  }

  if (!record) {
    record = {
      id: Date.now(),
      employeeId: numericEmployeeId,
      date,
      punches: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    }

    records.push(record)
  }

  const punch = {
    id: `${Date.now()}-${Math.random()}`,
    type: nextPunchType,
    time,
    registeredAt: now.toISOString(),

    source: options.source || 'remote',

    registrationMethod:
      options.registrationMethod || options.source || 'remote',

    location: options.location || null
  }

  record.punches.push(punch)

  record.updatedAt = now.toISOString()

  const updatedRecords = records.map((item) =>
    Number(item.id) === Number(record.id) ? record : item
  )

  saveTimeClockRecords(updatedRecords)

  return {
    success: true,
    record,
    punch,
    nextPunchType: getNextPunchType(record)
  }
}

/*
 * ============================================================
 * REMOVER REGISTRO
 * ============================================================
 */

export function deleteTimeClockRecord(id) {
  const records = getTimeClockRecords()

  const updated = records.filter((record) => Number(record.id) !== Number(id))

  saveTimeClockRecords(updated)

  return updated
}

/*
 * ============================================================
 * CÁLCULOS BÁSICOS
 * ============================================================
 */

export function timeToMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    return null
  }

  const [hours, minutes] = time.split(':').map(Number)

  if (hours > 23 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

export function calculateMinutesBetween(start, end) {
  const startMinutes = timeToMinutes(start)

  const endMinutes = timeToMinutes(end)

  if (startMinutes === null || endMinutes === null) {
    return 0
  }

  let difference = endMinutes - startMinutes

  if (difference < 0) {
    difference += 24 * 60
  }

  return difference
}

/*
 * ============================================================
 * HORAS TRABALHADAS
 * ============================================================
 */

export function calculateWorkedMinutes(record) {
  if (!record?.punches?.length) {
    return 0
  }

  const punches = record.punches

  let totalMinutes = 0

  /*
   * Entrada → Saída intervalo
   *
   * Retorno → Saída
   */

  for (let index = 0; index < punches.length - 1; index += 2) {
    const start = punches[index]

    const end = punches[index + 1]

    if (!start || !end) {
      continue
    }

    totalMinutes += calculateMinutesBetween(start.time, end.time)
  }

  return totalMinutes
}

/*
 * ============================================================
 * FORMATAÇÃO
 * ============================================================
 */

export function formatMinutes(totalMinutes = 0) {
  const minutes = Math.max(0, Math.round(Number(totalMinutes) || 0))

  const hours = Math.floor(minutes / 60)

  const remainingMinutes = minutes % 60

  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(
    2,
    '0'
  )}`
}

export function formatBalance(totalMinutes = 0) {
  const minutes = Math.round(Number(totalMinutes) || 0)

  if (minutes === 0) {
    return '00:00'
  }

  const absoluteMinutes = Math.abs(minutes)

  const formatted = formatMinutes(absoluteMinutes)

  return minutes > 0 ? `+${formatted}` : `-${formatted}`
}

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export function getTimeClockStatus(record) {
  if (!record?.punches?.length) {
    return 'not_started'
  }

  const lastPunch = record.punches[record.punches.length - 1]

  if (lastPunch.type === PUNCH_TYPES.EXIT) {
    return 'finished'
  }

  if (lastPunch.type === PUNCH_TYPES.BREAK_START) {
    return 'on_break'
  }

  return 'working'
}

export function getTimeClockStatusLabel(record) {
  const status = getTimeClockStatus(record)

  switch (status) {
    case 'not_started':
      return 'Ainda não iniciado'

    case 'working':
      return 'Em trabalho'

    case 'on_break':
      return 'Em intervalo'

    case 'finished':
      return 'Jornada encerrada'

    default:
      return '—'
  }
}

/*
 * ============================================================
 * FERIADOS
 * ============================================================
 */

function calculateEasterDate(year) {
  const a = year % 19

  const b = Math.floor(year / 100)

  const c = year % 100

  const d = Math.floor(b / 4)

  const e = b % 4

  const f = Math.floor((b + 8) / 25)

  const g = Math.floor((b - f + 1) / 3)

  const h = (19 * a + b - d - g + 15) % 30

  const i = Math.floor(c / 4)

  const k = c % 4

  const l = (32 + 2 * e + 2 * i - h - k) % 7

  const m = Math.floor((a + 11 * h + 22 * l) / 451)

  const month = Math.floor((h + l - 7 * m + 114) / 31)

  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

function addDays(date, amount) {
  const result = new Date(date)

  result.setDate(result.getDate() + amount)

  return result
}

export function getHolidays(year) {
  const holidays = []

  holidays.push({
    date: `${year}-01-01`,
    name: 'Confraternização Universal',
    type: 'national'
  })

  holidays.push({
    date: `${year}-04-21`,
    name: 'Tiradentes',
    type: 'national'
  })

  holidays.push({
    date: `${year}-05-01`,
    name: 'Dia Mundial do Trabalho',
    type: 'national'
  })

  holidays.push({
    date: `${year}-09-07`,
    name: 'Independência do Brasil',
    type: 'national'
  })

  holidays.push({
    date: `${year}-10-12`,
    name: 'Nossa Senhora Aparecida',
    type: 'national'
  })

  holidays.push({
    date: `${year}-11-02`,
    name: 'Finados',
    type: 'national'
  })

  holidays.push({
    date: `${year}-11-15`,
    name: 'Proclamação da República',
    type: 'national'
  })

  holidays.push({
    date: `${year}-11-20`,
    name: 'Dia Nacional de Zumbi e da Consciência Negra',
    type: 'national'
  })

  holidays.push({
    date: `${year}-12-25`,
    name: 'Natal',
    type: 'national'
  })

  /*
   * Rio Grande do Sul.
   */
  holidays.push({
    date: `${year}-09-20`,
    name: 'Revolução Farroupilha',
    type: 'state',
    state: 'RS'
  })

  const easter = calculateEasterDate(year)

  const carnival = addDays(easter, -47)

  holidays.push({
    date: getLocalDate(carnival),
    name: 'Carnaval',
    type: 'movable'
  })

  const ashWednesday = addDays(easter, -46)

  holidays.push({
    date: getLocalDate(ashWednesday),
    name: 'Quarta-feira de Cinzas',
    type: 'movable'
  })

  const goodFriday = addDays(easter, -2)

  holidays.push({
    date: getLocalDate(goodFriday),
    name: 'Sexta-feira Santa',
    type: 'movable'
  })

  const corpusChristi = addDays(easter, 60)

  holidays.push({
    date: getLocalDate(corpusChristi),
    name: 'Corpus Christi',
    type: 'movable'
  })

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

export function getHoliday(date) {
  if (!date) {
    return null
  }

  const dateObject = date instanceof Date ? date : new Date(`${date}T00:00:00`)

  if (Number.isNaN(dateObject.getTime())) {
    return null
  }

  const year = dateObject.getFullYear()

  const formattedDate = getLocalDate(dateObject)

  const holidays = getHolidays(year)

  return holidays.find((holiday) => holiday.date === formattedDate) || null
}

export function isHoliday(date) {
  return Boolean(getHoliday(date))
}

/*
 * ============================================================
 * DATA FUTURA
 * ============================================================
 */

function isFutureDate(date) {
  const today = new Date()

  today.setHours(0, 0, 0, 0)

  const comparisonDate = new Date(date)

  comparisonDate.setHours(0, 0, 0, 0)

  return comparisonDate > today
}

/*
 * ============================================================
 * DIFERENÇA ENTRE DATAS
 * ============================================================
 */

function calculateDateDifference(startDate, endDate) {
  const start = new Date(startDate)

  const end = new Date(endDate)

  start.setHours(0, 0, 0, 0)

  end.setHours(0, 0, 0, 0)

  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}

/*
 * ============================================================
 * FORMATA DATA
 * ============================================================
 */

function formatDate(date) {
  return getLocalDate(date)
}

/*
 * ============================================================
 * ESPELHO DE PONTO / APURAÇÃO
 * ============================================================
 */

export function calculateTimeClockPeriod(employeeId, startDate, endDate) {
  if (!employeeId) {
    return {
      employeeId: null,
      startDate: null,
      endDate: null,
      days: [],
      totals: createEmptyTotals()
    }
  }

  const start = new Date(startDate)

  const end = new Date(endDate)

  start.setHours(0, 0, 0, 0)

  end.setHours(0, 0, 0, 0)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return {
      employeeId: Number(employeeId),
      startDate: null,
      endDate: null,
      days: [],
      totals: createEmptyTotals()
    }
  }

  const employees = getEmployees()

  const employee =
    employees.find((item) => Number(item.id) === Number(employeeId)) || null

  const days = []

  const totals = createEmptyTotals()

  const totalDays = calculateDateDifference(start, end)

  /*
   * Identificação da jornada utilizada.
   */
  const scheduleName = getEmployeeWorkScheduleName(employee)

  for (let index = 0; index <= totalDays; index += 1) {
    const currentDate = new Date(start)

    currentDate.setDate(currentDate.getDate() + index)

    const date = formatDate(currentDate)

    const record = getTimeClockRecord(employeeId, date)

    const future = isFutureDate(currentDate)

    /*
     * ----------------------------------------------------------
     * FERIADO
     * ----------------------------------------------------------
     */

    const holiday = getHoliday(currentDate)

    const holidayDay = Boolean(holiday)

    /*
     * ----------------------------------------------------------
     * JORNADA PREVISTA
     * ----------------------------------------------------------
     *
     * Agora a jornada não é mais obrigatoriamente 8h
     * de segunda a sexta.
     *
     * Ela é obtida através da configuração do funcionário.
     */
    const scheduleMinutes = getExpectedMinutesForDate(employee, currentDate)

    /*
     * Feriado sempre possui prioridade.
     */
    const expectedMinutes = holidayDay ? 0 : scheduleMinutes

    const workedMinutes = calculateWorkedMinutes(record)

    let status

    let label

    /*
     * ----------------------------------------------------------
     * CLASSIFICAÇÃO DO DIA
     * ----------------------------------------------------------
     */

    if (holidayDay) {
      status = 'holiday'

      label = holiday.name

      totals.holidayDays += 1
    } else if (future) {
      status = 'pending'

      label = 'Pendente'

      totals.pendingDays += 1
    } else if (expectedMinutes === 0 && !record?.punches?.length) {
      /*
       * Folga da escala.
       *
       * Isso também funciona para:
       *
       * 12x36
       * 4x2
       * 5x1
       * sábados/domingo sem jornada
       */
      status = 'off'

      label = 'Folga'

      totals.offDays += 1
    } else if (!record?.punches?.length) {
      status = 'absence'

      label = 'Falta'

      totals.absenceDays += 1
    } else {
      const lastPunch = record.punches[record.punches.length - 1]

      if (lastPunch.type === PUNCH_TYPES.EXIT) {
        status = 'worked'

        label = 'Trabalhado'
      } else {
        status = 'pending'

        label = 'Em andamento'

        totals.pendingDays += 1
      }
    }

    /*
     * ----------------------------------------------------------
     * SALDO DIÁRIO
     * ----------------------------------------------------------
     */

    let differenceMinutes = 0

    /*
     * Feriados e dias futuros não geram saldo.
     *
     * Folgas da escala também não geram déficit.
     */
    if (!holidayDay && !future && expectedMinutes > 0) {
      differenceMinutes = workedMinutes - expectedMinutes
    }

    /*
     * ----------------------------------------------------------
     * TOTAIS
     * ----------------------------------------------------------
     */

    totals.expectedMinutes += expectedMinutes

    totals.workedMinutes += workedMinutes

    if (differenceMinutes > 0) {
      totals.overtimeMinutes += differenceMinutes
    }

    if (differenceMinutes < 0) {
      totals.deficitMinutes += Math.abs(differenceMinutes)
    }

    totals.balanceMinutes += differenceMinutes

    days.push({
      date,

      record,

      status,

      label,

      expectedMinutes,

      workedMinutes,

      differenceMinutes,

      isHoliday: holidayDay,

      holiday: holiday
        ? {
            name: holiday.name,
            type: holiday.type,
            state: holiday.state || null
          }
        : null,

      /*
       * Informação da jornada utilizada
       * naquele período.
       */
      scheduleName,

      scheduleExpectedMinutes: scheduleMinutes
    })
  }

  return {
    employeeId: Number(employeeId),

    startDate: formatDate(start),

    endDate: formatDate(end),

    scheduleName,

    days,

    totals
  }
}

/*
 * ============================================================
 * TOTAIS VAZIOS
 * ============================================================
 */

function createEmptyTotals() {
  return {
    expectedMinutes: 0,

    workedMinutes: 0,

    balanceMinutes: 0,

    overtimeMinutes: 0,

    deficitMinutes: 0,

    absenceDays: 0,

    courseDays: 0,

    offDays: 0,

    holidayDays: 0,

    pendingDays: 0
  }
}
