const STORAGE_KEY = 'evaluations'

/*
 * ============================================================
 * TIPOS DE AVALIAÇÃO
 * ============================================================
 */

export const EVALUATION_TYPES = [
  {
    value: 'performance',
    label: 'Avaliação de desempenho'
  },
  {
    value: 'periodic',
    label: 'Avaliação periódica'
  },
  {
    value: 'probationary',
    label: 'Avaliação de experiência'
  },
  {
    value: 'feedback',
    label: 'Feedback'
  },
  {
    value: 'other',
    label: 'Outra'
  }
]

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export const EVALUATION_STATUSES = [
  {
    value: 'draft',
    label: 'Rascunho'
  },
  {
    value: 'pending',
    label: 'Pendente'
  },
  {
    value: 'in_progress',
    label: 'Em andamento'
  },
  {
    value: 'completed',
    label: 'Concluída'
  },
  {
    value: 'cancelled',
    label: 'Cancelada'
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

/*
 * ============================================================
 * STORAGE
 * ============================================================
 */

export function getEvaluations() {
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
 * BUSCAR POR ID
 * ============================================================
 */

export function getEvaluationById(evaluationId) {
  return (
    getEvaluations().find((item) => String(item.id) === String(evaluationId)) ||
    null
  )
}

/*
 * ============================================================
 * BUSCAR POR FUNCIONÁRIO
 * ============================================================
 */

export function getEmployeeEvaluations(employeeId) {
  return getEvaluations().filter(
    (item) => Number(item.employeeId) === Number(employeeId)
  )
}

/*
 * ============================================================
 * ADICIONAR
 * ============================================================
 */

export function addEvaluation(evaluation) {
  const evaluations = getEvaluations()

  const newEvaluation = {
    ...evaluation,

    id: evaluation.id || generateId(),

    createdAt: evaluation.createdAt || new Date().toISOString(),

    updatedAt: new Date().toISOString()
  }

  const updated = [...evaluations, newEvaluation]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return newEvaluation
}

/*
 * ============================================================
 * ATUALIZAR
 * ============================================================
 */

export function updateEvaluation(evaluation) {
  const evaluations = getEvaluations()

  const updated = evaluations.map((item) =>
    String(item.id) === String(evaluation.id)
      ? {
          ...item,
          ...evaluation,
          updatedAt: new Date().toISOString()
        }
      : item
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * EXCLUIR
 * ============================================================
 */

export function deleteEvaluation(evaluationId) {
  const evaluations = getEvaluations()

  const updated = evaluations.filter(
    (item) => String(item.id) !== String(evaluationId)
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * UTILITÁRIOS DE EXIBIÇÃO
 * ============================================================
 */

export function getEvaluationTypeLabel(type) {
  return (
    EVALUATION_TYPES.find((item) => item.value === type)?.label ||
    type ||
    'Não informado'
  )
}

export function getEvaluationStatusLabel(status) {
  return (
    EVALUATION_STATUSES.find((item) => item.value === status)?.label ||
    status ||
    'Não informado'
  )
}
