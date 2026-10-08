/*
 * ============================================================
 * SERVIÇO DE HORAS EXTRAS
 * ============================================================
 *
 * Este serviço concentra somente os cálculos financeiros das
 * horas extras.
 *
 * A responsabilidade dele é transformar:
 *
 *     salário + quantidade de horas/minutos + adicional
 *
 * em valores financeiros que poderão ser utilizados
 * posteriormente pela Folha de Pagamento.
 *
 * Regras iniciais:
 *
 * - Divisor padrão: 220 horas mensais
 * - Hora extra de 50%
 * - Hora extra de 100%
 * - Valores monetários arredondados para 2 casas
 *
 * Importante:
 *
 * Este arquivo NÃO altera registros do Ponto e NÃO grava dados
 * no localStorage. Ele apenas realiza cálculos.
 * ============================================================
 */

/*
 * ============================================================
 * CONSTANTES
 * ============================================================
 */

/*
 * Divisor mensal utilizado para encontrar o valor da hora
 * normal a partir do salário-base.
 *
 * Exemplo:
 *
 * R$ 2.200,00 ÷ 220 = R$ 10,00 por hora
 */
export const DEFAULT_MONTHLY_DIVISOR = 220

/*
 * Percentuais dos adicionais de horas extras.
 */
export const OVERTIME_ADDITIONALS = {
  FIFTY_PERCENT: 0.5,
  ONE_HUNDRED_PERCENT: 1
}

/*
 * Multiplicadores finais aplicados sobre a hora normal.
 *
 * 50%:
 * R$ 10,00 × 1,5 = R$ 15,00
 *
 * 100%:
 * R$ 10,00 × 2 = R$ 20,00
 */
export const OVERTIME_MULTIPLIERS = {
  FIFTY_PERCENT: 1.5,
  ONE_HUNDRED_PERCENT: 2
}

/*
 * ============================================================
 * ARREDONDAMENTO
 * ============================================================
 */

/*
 * Arredonda um valor monetário para duas casas decimais.
 *
 * Também evita problemas comuns de ponto flutuante do
 * JavaScript em cálculos financeiros.
 */
export function roundMoney(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return 0
  }

  return Math.round((number + Number.EPSILON) * 100) / 100
}

/*
 * ============================================================
 * CONVERSÃO DE MINUTOS
 * ============================================================
 */

/*
 * Converte minutos para horas decimais.
 *
 * Exemplos:
 *
 * 60 minutos  -> 1 hora
 * 90 minutos  -> 1,5 hora
 * 150 minutos -> 2,5 horas
 */
export function minutesToHours(minutes) {
  const value = Number(minutes)

  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  return value / 60
}

/*
 * Converte horas decimais para minutos.
 *
 * Exemplos:
 *
 * 1 hora    -> 60 minutos
 * 1,5 hora  -> 90 minutos
 * 2,5 horas -> 150 minutos
 */
export function hoursToMinutes(hours) {
  const value = Number(hours)

  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }

  return Math.round(value * 60)
}

/*
 * ============================================================
 * VALOR DA HORA NORMAL
 * ============================================================
 */

/*
 * Calcula o valor de uma hora normal.
 *
 * Fórmula:
 *
 * salário ÷ divisor mensal
 *
 * Exemplo:
 *
 * salário = R$ 2.200,00
 * divisor = 220
 *
 * resultado = R$ 10,00
 */
export function calculateHourlyRate(
  salary,
  monthlyDivisor = DEFAULT_MONTHLY_DIVISOR
) {
  const salaryValue = Number(salary)
  const divisor = Number(monthlyDivisor)

  if (!Number.isFinite(salaryValue) || salaryValue < 0) {
    return 0
  }

  if (!Number.isFinite(divisor) || divisor <= 0) {
    return 0
  }

  return roundMoney(salaryValue / divisor)
}

/*
 * ============================================================
 * VALOR DA HORA EXTRA
 * ============================================================
 */

/*
 * Calcula o valor de uma hora extra utilizando um percentual
 * de adicional.
 *
 * Exemplo:
 *
 * hora normal = R$ 10,00
 * adicional = 50%
 *
 * R$ 10,00 × 1,50 = R$ 15,00
 */
export function calculateOvertimeHourlyRate(hourlyRate, additionalPercentage) {
  const rate = Number(hourlyRate)
  const additional = Number(additionalPercentage)

  if (!Number.isFinite(rate) || rate < 0) {
    return 0
  }

  if (!Number.isFinite(additional) || additional < 0) {
    return 0
  }

  return roundMoney(rate * (1 + additional))
}

/*
 * ============================================================
 * HORA EXTRA 50%
 * ============================================================
 */

/*
 * Calcula o valor de uma hora extra com adicional de 50%.
 */
export function calculateOvertime50HourlyRate(hourlyRate) {
  return calculateOvertimeHourlyRate(
    hourlyRate,
    OVERTIME_ADDITIONALS.FIFTY_PERCENT
  )
}

/*
 * ============================================================
 * HORA EXTRA 100%
 * ============================================================
 */

/*
 * Calcula o valor de uma hora extra com adicional de 100%.
 */
export function calculateOvertime100HourlyRate(hourlyRate) {
  return calculateOvertimeHourlyRate(
    hourlyRate,
    OVERTIME_ADDITIONALS.ONE_HUNDRED_PERCENT
  )
}

/*
 * ============================================================
 * VALOR TOTAL DAS HORAS EXTRAS
 * ============================================================
 */

/*
 * Calcula o valor total de horas extras.
 *
 * Recebe:
 *
 * - quantidade de minutos
 * - valor da hora extra
 *
 * Exemplo:
 *
 * 120 minutos = 2 horas
 *
 * 2 × R$ 15,00 = R$ 30,00
 */
export function calculateOvertimeAmount(minutes, overtimeHourlyRate) {
  const overtimeMinutes = Number(minutes)
  const hourlyRate = Number(overtimeHourlyRate)

  if (!Number.isFinite(overtimeMinutes) || overtimeMinutes <= 0) {
    return 0
  }

  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return 0
  }

  const hours = minutesToHours(overtimeMinutes)

  return roundMoney(hours * hourlyRate)
}

/*
 * ============================================================
 * CÁLCULO COMPLETO DAS HORAS EXTRAS
 * ============================================================
 */

/*
 * Realiza o cálculo completo das horas extras de um funcionário.
 *
 * Exemplo de utilização:
 *
 * calculateOvertime({
 *   salary: 2200,
 *   overtime50Minutes: 120,
 *   overtime100Minutes: 60
 * })
 *
 * Resultado:
 *
 * {
 *   salary,
 *   monthlyDivisor,
 *   hourlyRate,
 *   overtime50Minutes,
 *   overtime50Hours,
 *   overtime50HourlyRate,
 *   overtime50Amount,
 *   overtime100Minutes,
 *   overtime100Hours,
 *   overtime100HourlyRate,
 *   overtime100Amount,
 *   totalOvertimeMinutes,
 *   totalOvertimeHours,
 *   totalOvertimeAmount
 * }
 */
export function calculateOvertime({
  salary = 0,
  monthlyDivisor = DEFAULT_MONTHLY_DIVISOR,
  overtime50Minutes = 0,
  overtime100Minutes = 0
} = {}) {
  const salaryValue = Number(salary)

  const overtime50MinutesValue = Math.max(0, Number(overtime50Minutes) || 0)

  const overtime100MinutesValue = Math.max(0, Number(overtime100Minutes) || 0)

  const hourlyRate = calculateHourlyRate(salaryValue, monthlyDivisor)

  const overtime50HourlyRate = calculateOvertime50HourlyRate(hourlyRate)

  const overtime100HourlyRate = calculateOvertime100HourlyRate(hourlyRate)

  const overtime50Amount = calculateOvertimeAmount(
    overtime50MinutesValue,
    overtime50HourlyRate
  )

  const overtime100Amount = calculateOvertimeAmount(
    overtime100MinutesValue,
    overtime100HourlyRate
  )

  const totalOvertimeMinutes = overtime50MinutesValue + overtime100MinutesValue

  const totalOvertimeHours = minutesToHours(totalOvertimeMinutes)

  const totalOvertimeAmount = roundMoney(overtime50Amount + overtime100Amount)

  return {
    salary: roundMoney(salaryValue),

    monthlyDivisor: Number(monthlyDivisor),

    hourlyRate,

    overtime50Minutes: overtime50MinutesValue,

    overtime50Hours: minutesToHours(overtime50MinutesValue),

    overtime50HourlyRate,

    overtime50Amount,

    overtime100Minutes: overtime100MinutesValue,

    overtime100Hours: minutesToHours(overtime100MinutesValue),

    overtime100HourlyRate,

    overtime100Amount,

    totalOvertimeMinutes,

    totalOvertimeHours,

    totalOvertimeAmount
  }
}

/*
 * ============================================================
 * FORMATAÇÃO
 * ============================================================
 */

/*
 * Formata minutos de horas extras para uma apresentação
 * amigável na interface.
 *
 * Exemplos:
 *
 * 90  -> "1h 30min"
 * 120 -> "2h"
 * 30  -> "30min"
 */
export function formatOvertimeMinutes(minutes) {
  const value = Math.max(0, Math.round(Number(minutes) || 0))

  const hours = Math.floor(value / 60)

  const remainingMinutes = value % 60

  if (hours === 0 && remainingMinutes === 0) {
    return '0h'
  }

  if (hours === 0) {
    return `${remainingMinutes}min`
  }

  if (remainingMinutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remainingMinutes}min`
}

/*
 * Formata um valor monetário em Real brasileiro.
 */
export function formatCurrency(value) {
  return roundMoney(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}
