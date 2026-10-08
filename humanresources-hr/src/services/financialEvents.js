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
 * IMPORTANTE:
 *
 * Nesta etapa NÃO fazemos o cálculo da folha.
 *
 * Estamos apenas cadastrando a estrutura que futuramente será
 * utilizada pela Folha de Pagamento.
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
