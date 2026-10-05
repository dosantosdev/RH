import { getStoredArray, setStored } from './storage'

const STORAGE_KEY = 'monthlyClosings'

/*
 * ============================================================
 * STATUS DO FECHAMENTO
 * ============================================================
 */

export const MONTHLY_CLOSING_STATUSES = [
  {
    value: 'open',
    label: 'Aberto'
  },
  {
    value: 'review',
    label: 'Em conferência'
  },
  {
    value: 'closed',
    label: 'Fechado'
  }
]

/*
 * ============================================================
 * UTILITÁRIO
 * ============================================================
 */

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/*
 * ============================================================
 * COMPETÊNCIA
 * ============================================================
 *
 * A competência é armazenada no formato:
 *
 * YYYY-MM
 *
 * Exemplo:
 *
 * 2026-09
 */

export function getCurrentCompetence() {
  const date = new Date()

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function getCompetenceDates(competence) {
  if (!competence || !/^\d{4}-\d{2}$/.test(competence)) {
    return null
  }

  const [year, month] = competence.split('-').map(Number)

  const startDate = new Date(year, month - 1, 1)

  const endDate = new Date(year, month, 0)

  return {
    startDate,
    endDate
  }
}

/*
 * ============================================================
 * FORMATAÇÃO DA COMPETÊNCIA
 * ============================================================
 */

export function formatCompetence(competence) {
  if (!competence || !/^\d{4}-\d{2}$/.test(competence)) {
    return '—'
  }

  const [year, month] = competence.split('-').map(Number)

  const date = new Date(year, month - 1, 1)

  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
}

/*
 * ============================================================
 * STORAGE
 * ============================================================
 */

export function getMonthlyClosings() {
  return getStoredArray(STORAGE_KEY)
}

/*
 * ============================================================
 * BUSCAR COMPETÊNCIA
 * ============================================================
 */

export function getMonthlyClosing(competence) {
  return getMonthlyClosings().find(
    (item) => String(item.competence) === String(competence)
  )
}

/*
 * ============================================================
 * CRIAR / INICIALIZAR FECHAMENTO
 * ============================================================
 */

export function createMonthlyClosing(competence) {
  const closings = getMonthlyClosings()

  const existing = closings.find(
    (item) => String(item.competence) === String(competence)
  )

  if (existing) {
    return existing
  }

  const newClosing = {
    id: generateId(),
    competence,
    status: 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    closedAt: null,
    closedBy: null
  }

  const updated = [...closings, newClosing]

  setStored(STORAGE_KEY, updated)

  return newClosing
}

/*
 * ============================================================
 * ATUALIZAR STATUS
 * ============================================================
 */

export function updateMonthlyClosingStatus(
  competence,
  status,
  closedBy = null
) {
  const closings = getMonthlyClosings()

  const updated = closings.map((item) => {
    if (String(item.competence) !== String(competence)) {
      return item
    }

    return {
      ...item,
      status,
      updatedAt: new Date().toISOString(),
      closedAt: status === 'closed' ? new Date().toISOString() : null,
      closedBy: status === 'closed' ? closedBy : null
    }
  })

  setStored(STORAGE_KEY, updated)

  return updated.find((item) => String(item.competence) === String(competence))
}

/*
 * ============================================================
 * ABRIR COMPETÊNCIA
 * ============================================================
 */

export function openMonthlyClosing(competence) {
  return updateMonthlyClosingStatus(competence, 'open')
}

/*
 * ============================================================
 * INICIAR CONFERÊNCIA
 * ============================================================
 */

export function startMonthlyClosingReview(competence) {
  return updateMonthlyClosingStatus(competence, 'review')
}

/*
 * ============================================================
 * FECHAR COMPETÊNCIA
 * ============================================================
 */

export function closeMonthlyClosing(competence, closedBy = null) {
  return updateMonthlyClosingStatus(competence, 'closed', closedBy)
}

/*
 * ============================================================
 * REABRIR COMPETÊNCIA
 * ============================================================
 *
 * Mantemos esta função para permitir que o RH reabra uma
 * competência caso seja necessário corrigir alguma informação.
 */

export function reopenMonthlyClosing(competence) {
  return updateMonthlyClosingStatus(competence, 'open')
}

/*
 * ============================================================
 * VERIFICAR SE ESTÁ FECHADA
 * ============================================================
 */

export function isMonthlyClosingClosed(competence) {
  const closing = getMonthlyClosing(competence)

  return closing?.status === 'closed'
}

/*
 * ============================================================
 * EXCLUIR FECHAMENTO
 * ============================================================
 *
 * A exclusão remove apenas o registro do fechamento.
 *
 * Ela não remove os registros de ponto, funcionários,
 * atestados ou qualquer outro dado da competência.
 */

export function deleteMonthlyClosing(competence) {
  const closings = getMonthlyClosings()

  const updated = closings.filter(
    (item) => String(item.competence) !== String(competence)
  )

  setStored(STORAGE_KEY, updated)

  return updated
}
