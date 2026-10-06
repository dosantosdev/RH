import { getStoredArray, setStored } from './storage'

const STORAGE_KEY = 'evaluations'

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

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/*
 * ============================================================
 * CRITÉRIOS ANTIGOS
 *
 * Mantemos estas funções para compatibilidade com avaliações
 * criadas anteriormente.
 * ============================================================
 */

export const DEFAULT_EVALUATION_CRITERIA = [
  'Qualidade do trabalho',
  'Produtividade',
  'Trabalho em equipe',
  'Pontualidade e assiduidade',
  'Comunicação'
]

export function createEvaluationCriteria(name = '') {
  return {
    id: generateId(),

    name,

    score: '',

    comment: ''
  }
}

export function calculateEvaluationResult(criteria = []) {
  const scores = criteria
    .map((item) => Number(item.score))
    .filter((score) => Number.isFinite(score) && score >= 1 && score <= 10)

  if (scores.length === 0) {
    return {
      average: null,
      total: 0,
      count: 0
    }
  }

  const total = scores.reduce((sum, score) => sum + score, 0)

  return {
    average: Math.round((total / scores.length) * 100) / 100,

    total,

    count: scores.length
  }
}

/*
 * ============================================================
 * BUSCAR
 * ============================================================
 */

export function getEvaluations() {
  return getStoredArray(STORAGE_KEY)
}

export function getEvaluationById(evaluationId) {
  return getEvaluations().find(
    (evaluation) => String(evaluation.id) === String(evaluationId)
  )
}

export function getEmployeeEvaluations(employeeId) {
  return getEvaluations().filter(
    (evaluation) => Number(evaluation.employeeId) === Number(employeeId)
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
    id: evaluation.id || generateId(),

    ...evaluation,

    createdAt: evaluation.createdAt || new Date().toISOString(),

    updatedAt: new Date().toISOString()
  }

  const updated = [...evaluations, newEvaluation]

  setStored(STORAGE_KEY, updated)

  return newEvaluation
}

/*
 * ============================================================
 * ATUALIZAR
 * ============================================================
 */

export function updateEvaluation(evaluation) {
  const evaluations = getEvaluations()

  const existing = evaluations.find(
    (item) => String(item.id) === String(evaluation.id)
  )

  if (!existing) {
    return null
  }

  const updatedEvaluation = {
    ...existing,

    ...evaluation,

    createdAt: existing.createdAt,

    updatedAt: new Date().toISOString()
  }

  const updated = evaluations.map((item) =>
    String(item.id) === String(evaluation.id) ? updatedEvaluation : item
  )

  setStored(STORAGE_KEY, updated)

  return updatedEvaluation
}

/*
 * ============================================================
 * EXCLUIR
 * ============================================================
 */

export function deleteEvaluation(evaluationId) {
  const evaluations = getEvaluations()

  const updated = evaluations.filter(
    (evaluation) => String(evaluation.id) !== String(evaluationId)
  )

  setStored(STORAGE_KEY, updated)

  return updated
}

/*
 * ============================================================
 * LABELS
 * ============================================================
 */

export function getEvaluationTypeLabel(type) {
  return (
    EVALUATION_TYPES.find((item) => item.value === type)?.label || type || ''
  )
}

export function getEvaluationStatusLabel(status) {
  return (
    EVALUATION_STATUSES.find((item) => item.value === status)?.label ||
    status ||
    ''
  )
}

/*
 * ============================================================
 * NOTA
 * ============================================================
 */

export function formatEvaluationScore(score) {
  if (score === null || score === undefined || score === '') {
    return '-'
  }

  const value = Number(score)

  if (!Number.isFinite(value)) {
    return '-'
  }

  return value.toFixed(2).replace('.', ',')
}
