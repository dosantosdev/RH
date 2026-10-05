import { getStoredArray, setStored } from './storage'

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

/*
 * Nome amigável de cada tipo de batida.
 */

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

/*
 * Retorna a data local no formato YYYY-MM-DD.
 */

export function getLocalDate(date = new Date()) {
  const year = date.getFullYear()

  const month = String(date.getMonth() + 1).padStart(2, '0')

  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/*
 * Retorna o horário local no formato HH:mm.
 */

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

/*
 * ============================================================
 * VALIDAÇÃO
 * ============================================================
 */

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

    /*
     * Informações adicionais da forma de registro.
     */

    source: options.source || 'remote',

    registrationMethod:
      options.registrationMethod || options.source || 'remote',

    /*
     * Localização.
     *
     * Quando não for fornecida, permanece null.
     */

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

/*
 * Calcula a diferença entre dois horários.
 *
 * Também permite jornadas que atravessam a meia-noite.
 */

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
   * Trabalhamos sempre em pares:
   *
   * Entrada → Saída intervalo
   *
   * Retorno intervalo → Saída
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

/*
 * Formata saldo positivo ou negativo.
 */

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
 * STATUS DO REGISTRO
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

  if (lastPunch.type === PUNCH_TYPES.BREAK_END) {
    return 'working'
  }

  return 'working'
}

/*
 * Texto amigável do status.
 */

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
 *
 * O sistema considera:
 *
 * 1. Feriados nacionais.
 * 2. Feriado estadual do Rio Grande do Sul.
 * 3. Feriados móveis normalmente utilizados no calendário
 *    brasileiro.
 *
 * A estrutura foi criada para que futuramente possamos
 * adicionar feriados municipais ou específicos da empresa.
 * ============================================================
 */

/*
 * Calcula a data da Páscoa pelo algoritmo de Meeus/Jones/Butcher.
 *
 * Retorna um objeto Date.
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

/*
 * Adiciona ou remove dias de uma data.
 */

function addDays(date, amount) {
  const result = new Date(date)

  result.setDate(result.getDate() + amount)

  return result
}

/*
 * Retorna todos os feriados conhecidos para determinado ano.
 *
 * Neste momento o estado considerado é Rio Grande do Sul.
 */

export function getHolidays(year) {
  const holidays = []

  /*
   * ==========================================================
   * FERIADOS NACIONAIS
   * ==========================================================
   */

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

  /*
   * 20 de novembro passou a ser feriado nacional.
   */

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
   * ==========================================================
   * FERIADO ESTADUAL - RIO GRANDE DO SUL
   * ==========================================================
   */

  holidays.push({
    date: `${year}-09-20`,
    name: 'Revolução Farroupilha',
    type: 'state',
    state: 'RS'
  })

  /*
   * ==========================================================
   * FERIADOS MÓVEIS
   * ==========================================================
   */

  const easter = calculateEasterDate(year)

  /*
   * Carnaval.
   *
   * Terça-feira de Carnaval não é feriado nacional em todos
   * os contextos trabalhistas, mas é incluída no calendário
   * para permitir o tratamento no sistema.
   */

  const carnival = addDays(easter, -47)

  holidays.push({
    date: getLocalDate(carnival),
    name: 'Carnaval',
    type: 'movable'
  })

  /*
   * Quarta-feira de Cinzas.
   *
   * Mantemos o registro até meio-dia através do calendário,
   * mas neste momento o espelho trata o dia inteiro como
   * uma data especial.
   */

  const ashWednesday = addDays(easter, -46)

  holidays.push({
    date: getLocalDate(ashWednesday),
    name: 'Quarta-feira de Cinzas',
    type: 'movable'
  })

  /*
   * Sexta-feira Santa.
   */

  const goodFriday = addDays(easter, -2)

  holidays.push({
    date: getLocalDate(goodFriday),
    name: 'Sexta-feira Santa',
    type: 'movable'
  })

  /*
   * Corpus Christi.
   */

  const corpusChristi = addDays(easter, 60)

  holidays.push({
    date: getLocalDate(corpusChristi),
    name: 'Corpus Christi',
    type: 'movable'
  })

  return holidays.sort((a, b) => a.date.localeCompare(b.date))
}

/*
 * ============================================================
 * FERIADO DE UMA DATA
 * ============================================================
 */

/*
 * Retorna o feriado correspondente à data.
 *
 * Se não houver feriado, retorna null.
 */

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

/*
 * ============================================================
 * VERIFICAÇÃO DE FERIADO
 * ============================================================
 */

export function isHoliday(date) {
  return Boolean(getHoliday(date))
}

/*
 * ============================================================
 * JORNADA
 * ============================================================
 *
 * Enquanto ainda não temos a jornada configurável por
 * funcionário, utilizamos 8 horas de segunda a sexta.
 *
 * Sábado e domingo:
 *
 * 0 horas previstas.
 *
 * Feriados:
 *
 * 0 horas previstas.
 * ============================================================
 */

const DEFAULT_WORKDAY_MINUTES = 8 * 60

function isWeekend(date) {
  const day = date.getDay()

  return day === 0 || day === 6
}

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
  const year = date.getFullYear()

  const month = String(date.getMonth() + 1).padStart(2, '0')

  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/*
 * ============================================================
 * ESPELHO DE PONTO
 * ============================================================
 *
 * Calcula todos os dias entre uma data inicial e uma data
 * final.
 *
 * A data inicial e a data final são INCLUSIVAS.
 *
 * Exemplo:
 *
 * 20/09/2026 → 20/10/2026
 *
 * O dia 20/09 e o dia 20/10 fazem parte do período.
 * ============================================================
 */

export function calculateTimeClockPeriod(employeeId, startDate, endDate) {
  if (!employeeId) {
    return {
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
      startDate: null,
      endDate: null,
      days: [],
      totals: createEmptyTotals()
    }
  }

  const days = []

  const totals = createEmptyTotals()

  const totalDays = calculateDateDifference(start, end)

  for (let index = 0; index <= totalDays; index += 1) {
    const currentDate = new Date(start)

    currentDate.setDate(currentDate.getDate() + index)

    const date = formatDate(currentDate)

    const record = getTimeClockRecord(employeeId, date)

    const weekend = isWeekend(currentDate)

    const future = isFutureDate(currentDate)

    /*
     * ========================================================
     * FERIADO
     * ========================================================
     */

    const holiday = getHoliday(currentDate)

    const holidayDay = Boolean(holiday)

    /*
     * ========================================================
     * JORNADA PREVISTA
     * ========================================================
     *
     * Segunda a sexta = 8h
     *
     * Sábado/domingo = folga
     *
     * Feriado = 0h
     */

    const expectedMinutes = weekend || holidayDay ? 0 : DEFAULT_WORKDAY_MINUTES

    const workedMinutes = calculateWorkedMinutes(record)

    let status

    let label

    /*
     * ========================================================
     * FERIADO
     * ========================================================
     *
     * O feriado tem prioridade sobre falta ou pendência.
     */

    if (holidayDay) {
      status = 'holiday'

      label = holiday.name

      totals.holidayDays += 1
    } else if (weekend) {

    /*
     * ========================================================
     * FOLGA
     * ========================================================
     */
      status = 'off'

      label = 'Folga'

      totals.offDays += 1
    } else if (future) {

    /*
     * ========================================================
     * FUTURO
     * ========================================================
     */
      status = 'pending'

      label = 'Pendente'

      totals.pendingDays += 1
    } else if (!record?.punches?.length) {

    /*
     * ========================================================
     * SEM BATIDA
     * ========================================================
     */
      status = 'absence'

      label = 'Falta'

      totals.absenceDays += 1
    } else {

    /*
     * ========================================================
     * COM BATIDA
     * ========================================================
     */
      const lastPunch = record.punches[record.punches.length - 1]

      /*
       * Se a jornada terminou com a saída,
       * consideramos o dia concluído.
       */

      if (lastPunch.type === PUNCH_TYPES.EXIT) {
        status = 'worked'

        label = 'Trabalhado'
      } else {
        /*
         * Existe uma batida, mas a jornada
         * ainda não foi encerrada.
         */

        status = 'pending'

        label = 'Em andamento'

        totals.pendingDays += 1
      }
    }

    /*
     * ========================================================
     * SALDO DIÁRIO
     * ========================================================
     *
     * Feriados, folgas e dias futuros não geram déficit.
     */

    let differenceMinutes = 0

    if (!weekend && !holidayDay && !future) {
      differenceMinutes = workedMinutes - expectedMinutes
    }

    /*
     * ========================================================
     * TOTAIS
     * ========================================================
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

    /*
     * ========================================================
     * DIA
     * ========================================================
     *
     * Mantemos as informações do feriado dentro do próprio
     * objeto do dia para que o MeuEspelho possa apresentar
     * o nome do feriado.
     */

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
        : null
    })
  }

  return {
    employeeId: Number(employeeId),

    startDate: formatDate(start),

    endDate: formatDate(end),

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
