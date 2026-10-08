import { getStoredArray, setStored } from './storage'

/*
 * ============================================================
 * EVENTOS FINANCEIROS
 * ============================================================
 *
 * Este serviço controla os itens que poderão fazer parte da
 * folha de pagamento.
 *
 * Existem dois tipos:
 *
 * PROVENTO
 *   → aumenta o valor recebido pelo funcionário.
 *
 * DESCONTO
 *   → reduz o valor recebido pelo funcionário.
 *
 * Os eventos também possuem tipos de cálculo:
 *
 *   valor_fixo
 *   percentual_salario
 *   hora
 *   manual
 *
 * O serviço é responsável pelo cadastro e também pelo cálculo
 * do valor sugerido para utilização na folha.
 * ============================================================
 */

const STORAGE_KEY = 'financialEvents'

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

export const FINANCIAL_EVENT_TYPES = {
  EARNING: 'provento',
  DEDUCTION: 'desconto'
}

/*
 * ============================================================
 * TIPOS DE CÁLCULO
 * ============================================================
 */

export const FINANCIAL_CALCULATION_TYPES = {
  FIXED: 'valor_fixo',
  SALARY_PERCENTAGE: 'percentual_salario',
  HOUR: 'hora',
  MANUAL: 'manual'
}

/*
 * ============================================================
 * RÓTULOS
 * ============================================================
 */

export const financialEventTypeLabels = {
  provento: 'Provento',
  desconto: 'Desconto'
}

export const financialCalculationTypeLabels = {
  valor_fixo: 'Valor fixo',
  percentual_salario: 'Percentual do salário',
  hora: 'Por hora',
  manual: 'Lançamento manual'
}

/*
 * ============================================================
 * CALCULAR VALOR DO EVENTO
 * ============================================================
 *
 * Calcula o valor sugerido de um evento para a folha.
 *
 * Regras:
 *
 * valor_fixo
 *   → utiliza o valor padrão cadastrado.
 *
 * percentual_salario
 *   → aplica o percentual sobre o salário-base.
 *
 * hora
 *   → multiplica a quantidade de horas pelo valor da hora.
 *
 * manual
 *   → não realiza cálculo automático.
 *     Caso exista valor padrão, ele será utilizado como
 *     sugestão inicial.
 *
 * IMPORTANTE:
 *
 * Esta função não grava nada no localStorage.
 *
 * Ela apenas calcula e devolve um valor.
 * ============================================================
 */

export function calculateFinancialEventAmount(
  event,
  { baseSalary = 0, hourlyRate = 0, hours = 0, minutes = 0 } = {}
) {
  if (!event) {
    return 0
  }

  const defaultValue = Number(event.defaultValue)

  const hasDefaultValue =
    event.defaultValue !== '' &&
    event.defaultValue !== null &&
    event.defaultValue !== undefined &&
    Number.isFinite(defaultValue)

  switch (event.calculationType) {
    /*
     * ========================================================
     * VALOR FIXO
     * ========================================================
     */

    case FINANCIAL_CALCULATION_TYPES.FIXED:
      return hasDefaultValue ? Math.round(defaultValue * 100) / 100 : 0

    /*
     * ========================================================
     * PERCENTUAL DO SALÁRIO
     * ========================================================
     *
     * Exemplo:
     *
     * Salário = R$ 3.000,00
     * Percentual = 10
     *
     * Resultado = R$ 300,00
     */

    case FINANCIAL_CALCULATION_TYPES.SALARY_PERCENTAGE: {
      if (!Number.isFinite(Number(baseSalary)) || Number(baseSalary) < 0) {
        return 0
      }

      if (!hasDefaultValue || defaultValue < 0) {
        return 0
      }

      return Math.round(((Number(baseSalary) * defaultValue) / 100) * 100) / 100
    }

    /*
     * ========================================================
     * POR HORA
     * ========================================================
     *
     * Se o evento possuir um valor padrão, ele representa
     * o valor de uma hora.
     *
     * Caso contrário, utilizamos o valor da hora do funcionário.
     *
     * Exemplo:
     *
     * Valor da hora = R$ 15,00
     * Horas = 2
     *
     * Resultado = R$ 30,00
     */

    case FINANCIAL_CALCULATION_TYPES.HOUR: {
      const normalizedHourlyRate = hasDefaultValue
        ? defaultValue
        : Number(hourlyRate) || 0

      const normalizedHours =
        Number(hours) > 0
          ? Number(hours)
          : Math.max(0, Number(minutes) || 0) / 60

      if (normalizedHourlyRate < 0 || normalizedHours <= 0) {
        return 0
      }

      return Math.round(normalizedHourlyRate * normalizedHours * 100) / 100
    }

    /*
     * ========================================================
     * MANUAL
     * ========================================================
     */

    case FINANCIAL_CALCULATION_TYPES.MANUAL:
    default:
      return hasDefaultValue ? Math.round(defaultValue * 100) / 100 : 0
  }
}

/*
 * ============================================================
 * BUSCAR TODOS
 * ============================================================
 */

export function getFinancialEvents() {
  return getStoredArray(STORAGE_KEY)
}

/*
 * ============================================================
 * BUSCAR ATIVOS
 * ============================================================
 */

export function getActiveFinancialEvents() {
  return getFinancialEvents().filter((event) => event.active !== false)
}

/*
 * ============================================================
 * BUSCAR POR ID
 * ============================================================
 */

export function getFinancialEventById(id) {
  return getFinancialEvents().find((event) => Number(event.id) === Number(id))
}

/*
 * ============================================================
 * BUSCAR POR TIPO
 * ============================================================
 */

export function getFinancialEventsByType(type) {
  return getFinancialEvents()
    .filter((event) => event.type === type)
    .sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
    )
}

/*
 * ============================================================
 * ADICIONAR
 * ============================================================
 */

export function addFinancialEvent(event) {
  const events = getFinancialEvents()

  const newEvent = {
    ...event,

    id: event.id || Date.now(),

    active: event.active !== undefined ? event.active : true,

    createdAt: event.createdAt || new Date().toISOString()
  }

  const updated = [...events, newEvent]

  setStored(STORAGE_KEY, updated)

  return newEvent
}

/*
 * ============================================================
 * ATUALIZAR
 * ============================================================
 */

export function updateFinancialEvent(updatedEvent) {
  const events = getFinancialEvents()

  const updated = events.map((event) =>
    Number(event.id) === Number(updatedEvent.id) ? updatedEvent : event
  )

  setStored(STORAGE_KEY, updated)

  return updatedEvent
}

/*
 * ============================================================
 * EXCLUIR
 * ============================================================
 */

export function deleteFinancialEvent(id) {
  const events = getFinancialEvents()

  const updated = events.filter((event) => Number(event.id) !== Number(id))

  setStored(STORAGE_KEY, updated)

  return updated
}

/*
 * ============================================================
 * ATIVAR / INATIVAR
 * ============================================================
 */

export function toggleFinancialEvent(id) {
  const events = getFinancialEvents()

  const updated = events.map((event) => {
    if (Number(event.id) !== Number(id)) {
      return event
    }

    return {
      ...event,

      active: event.active === false
    }
  })

  setStored(STORAGE_KEY, updated)

  return updated
}
