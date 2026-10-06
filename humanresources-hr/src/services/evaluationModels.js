import { getStoredArray, setStored } from './storage'

const STORAGE_KEY = 'evaluationModels'

/*
 * ============================================================
 * TIPOS DE MODELO
 * ============================================================
 */

export const EVALUATION_MODEL_TYPES = [
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
 * TIPOS DE PERGUNTA
 * ============================================================
 */

export const EVALUATION_QUESTION_TYPES = [
  {
    value: 'scale',
    label: 'Nota de 1 a 10'
  },
  {
    value: 'text',
    label: 'Texto'
  },
  {
    value: 'yes_no',
    label: 'Sim / Não'
  }
]

/*
 * ============================================================
 * RESPONSÁVEIS
 * ============================================================
 */

export const EVALUATION_RESPONSIBLE_TYPES = [
  {
    value: 'branch_manager',
    label: 'Gerente da filial'
  },
  {
    value: 'department_supervisor',
    label: 'Supervisor do setor'
  },
  {
    value: 'instructor',
    label: 'Instrutor'
  },
  {
    value: 'specific_user',
    label: 'Usuário específico'
  }
]

/*
 * ============================================================
 * PDI
 *
 * O PDI é obrigatório no final do fluxo.
 * As quatro perguntas são mantidas pelo sistema.
 * ============================================================
 */

export const DEFAULT_PDI_QUESTIONS = [
  {
    id: 'pdi-positive',
    text: 'Quais são os pontos positivos do funcionário?',
    type: 'text',
    required: true
  },
  {
    id: 'pdi-negative',
    text: 'Quais são os pontos negativos ou pontos a desenvolver?',
    type: 'text',
    required: true
  },
  {
    id: 'pdi-development',
    text: 'Quais pontos precisam ser desenvolvidos?',
    type: 'text',
    required: true
  },
  {
    id: 'pdi-actions',
    text: 'Quais ações serão realizadas para o desenvolvimento?',
    type: 'text',
    required: true
  }
]

/*
 * ============================================================
 * ID
 * ============================================================
 */

function generateId(prefix = 'evaluation') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/*
 * ============================================================
 * DATA ATUAL
 * ============================================================
 */

function getNow() {
  return new Date().toISOString()
}

/*
 * ============================================================
 * CRIAR PERGUNTA
 * ============================================================
 */

export function createEvaluationQuestion({
  text = '',
  type = 'scale',
  required = true
} = {}) {
  return {
    id: generateId('question'),
    text,
    type,
    required
  }
}

/*
 * ============================================================
 * CRIAR ETAPA
 * ============================================================
 */

export function createEvaluationStage({
  name = '',
  description = '',
  responsibleType = 'specific_user',
  responsibleUserId = '',
  responsibleUserName = '',
  questions = []
} = {}) {
  return {
    id: generateId('stage'),

    name,

    description,

    responsibleType,

    responsibleUserId,

    responsibleUserName,

    questions: questions.map((question) => ({
      id: question.id || generateId('question'),

      text: question.text || '',

      type: question.type || 'scale',

      required: question.required !== false
    }))
  }
}

/*
 * ============================================================
 * CRIAR MODELO
 * ============================================================
 */

export function createEvaluationModel({
  id = null,
  name = '',
  description = '',
  type = 'performance',
  active = true,
  stages = [],
  evaluation180Enabled = false,
  evaluation180Questions = [],
  createdAt = null,
  updatedAt = null
} = {}) {
  const now = getNow()

  return {
    id: id || generateId('model'),

    name,

    description,

    type,

    active,

    /*
     * O PDI é sempre obrigatório.
     */
    pdiRequired: true,

    /*
     * As perguntas padrão do PDI ficam dentro do modelo
     * para que a avaliação criada mantenha uma cópia delas.
     */
    pdiQuestions: DEFAULT_PDI_QUESTIONS.map((question) => ({
      ...question
    })),

    /*
     * Etapas configuráveis.
     */
    stages: stages.map((stage) => createEvaluationStage(stage)),

    /*
     * 180° é opcional.
     */
    evaluation180: {
      enabled: evaluation180Enabled === true,

      questions: evaluation180Questions.map((question) => ({
        id: question.id || generateId('180-question'),

        text: question.text || '',

        type: question.type || 'scale',

        required: question.required !== false
      }))
    },

    createdAt: createdAt || now,

    updatedAt: updatedAt || now
  }
}

/*
 * ============================================================
 * BUSCAR MODELOS
 * ============================================================
 */

export function getEvaluationModels() {
  return getStoredArray(STORAGE_KEY)
}

/*
 * ============================================================
 * BUSCAR MODELO
 * ============================================================
 */

export function getEvaluationModelById(modelId) {
  return getEvaluationModels().find(
    (model) => String(model.id) === String(modelId)
  )
}

/*
 * ============================================================
 * MODELOS ATIVOS
 * ============================================================
 */

export function getActiveEvaluationModels() {
  return getEvaluationModels().filter((model) => model.active !== false)
}

/*
 * ============================================================
 * ADICIONAR MODELO
 * ============================================================
 */

export function addEvaluationModel(model) {
  const normalized = createEvaluationModel(model)

  const models = getEvaluationModels()

  const updatedModels = [...models, normalized]

  setStored(STORAGE_KEY, updatedModels)

  return normalized
}

/*
 * ============================================================
 * ATUALIZAR MODELO
 * ============================================================
 */

export function updateEvaluationModel(model) {
  const models = getEvaluationModels()

  const existing = models.find((item) => String(item.id) === String(model.id))

  if (!existing) {
    return null
  }

  /*
   * Preserva a data original de criação.
   */
  const normalized = createEvaluationModel({
    ...model,

    createdAt: existing.createdAt,

    updatedAt: getNow()
  })

  const updatedModels = models.map((item) =>
    String(item.id) === String(model.id) ? normalized : item
  )

  setStored(STORAGE_KEY, updatedModels)

  return normalized
}

/*
 * ============================================================
 * ATIVAR / DESATIVAR
 * ============================================================
 */

export function setEvaluationModelActive(modelId, active) {
  const models = getEvaluationModels()

  const updatedModels = models.map((model) =>
    String(model.id) === String(modelId)
      ? {
          ...model,

          active: active === true,

          updatedAt: getNow()
        }
      : model
  )

  setStored(STORAGE_KEY, updatedModels)

  return updatedModels.find((model) => String(model.id) === String(modelId))
}

/*
 * ============================================================
 * EXCLUIR
 * ============================================================
 */

export function deleteEvaluationModel(modelId) {
  const models = getEvaluationModels()

  const updatedModels = models.filter(
    (model) => String(model.id) !== String(modelId)
  )

  setStored(STORAGE_KEY, updatedModels)

  return updatedModels
}

/*
 * ============================================================
 * DUPLICAR MODELO
 * ============================================================
 */

export function duplicateEvaluationModel(modelId) {
  const model = getEvaluationModelById(modelId)

  if (!model) {
    return null
  }

  const duplicated = createEvaluationModel({
    name: `${model.name} - Cópia`,
    description: model.description,
    type: model.type,
    active: false,

    stages: model.stages.map((stage) => ({
      ...stage,

      id: undefined,

      questions: stage.questions.map((question) => ({
        ...question,
        id: undefined
      }))
    })),

    evaluation180Enabled: model.evaluation180?.enabled === true,

    evaluation180Questions: (model.evaluation180?.questions || []).map(
      (question) => ({
        ...question,
        id: undefined
      })
    )
  })

  const models = getEvaluationModels()

  setStored(STORAGE_KEY, [...models, duplicated])

  return duplicated
}

/*
 * ============================================================
 * LABELS
 * ============================================================
 */

export function getEvaluationModelTypeLabel(type) {
  return (
    EVALUATION_MODEL_TYPES.find((item) => item.value === type)?.label ||
    type ||
    ''
  )
}

export function getEvaluationQuestionTypeLabel(type) {
  return (
    EVALUATION_QUESTION_TYPES.find((item) => item.value === type)?.label ||
    type ||
    ''
  )
}

export function getResponsibleTypeLabel(type) {
  return (
    EVALUATION_RESPONSIBLE_TYPES.find((item) => item.value === type)?.label ||
    type ||
    ''
  )
}

/*
 * ============================================================
 * VALIDAR MODELO
 * ============================================================
 */

export function validateEvaluationModel(model) {
  const errors = []

  if (!String(model?.name || '').trim()) {
    errors.push('Informe o nome do modelo.')
  }

  if (!Array.isArray(model?.stages) || model.stages.length === 0) {
    errors.push('Adicione pelo menos uma etapa.')
  }

  ;(model?.stages || []).forEach((stage, index) => {
    if (!String(stage.name || '').trim()) {
      errors.push(`Informe o nome da etapa ${index + 1}.`)
    }

    if (!Array.isArray(stage.questions) || stage.questions.length === 0) {
      errors.push(`A etapa ${index + 1} precisa ter pelo menos uma pergunta.`)
    }

    ;(stage.questions || []).forEach((question, questionIndex) => {
      if (!String(question.text || '').trim()) {
        errors.push(
          `Informe o texto da pergunta ${questionIndex + 1} da etapa ${index + 1}.`
        )
      }
    })
  })

  if (model?.evaluation180?.enabled) {
    if (
      !Array.isArray(model.evaluation180.questions) ||
      model.evaluation180.questions.length === 0
    ) {
      errors.push(
        'A avaliação 180° está ativada e precisa ter pelo menos uma pergunta.'
      )
    }
  }

  return {
    valid: errors.length === 0,

    errors
  }
}
