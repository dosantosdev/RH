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
 * Estas perguntas são utilizadas somente como modelo inicial.
 *
 * A empresa pode:
 *
 * - editar as perguntas;
 * - excluir perguntas;
 * - adicionar novas perguntas;
 * - definir perguntas obrigatórias;
 * - definir a quantidade de perguntas.
 *
 * Portanto, elas NÃO são mais consideradas perguntas fixas
 * do sistema.
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
 * NORMALIZAR PERGUNTA
 * ============================================================
 */

function normalizeQuestion(question = {}) {
  return {
    id: question.id || generateId('question'),

    text: question.text || question.question || '',

    type: question.type || 'text',

    required: question.required !== false
  }
}

/*
 * ============================================================
 * NORMALIZAR PERGUNTAS DO PDI
 * ============================================================
 *
 * Esta função também mantém compatibilidade com modelos antigos.
 *
 * Se um modelo antigo não possuir pdiQuestions, usamos as
 * perguntas padrão como ponto de partida.
 * ============================================================
 */

export function normalizePdiQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return DEFAULT_PDI_QUESTIONS.map((question) => ({
      ...question
    }))
  }

  return questions.map(normalizeQuestion)
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
 * CRIAR PERGUNTA DO PDI
 * ============================================================
 */

export function createPdiQuestion({ text = '', required = true } = {}) {
  return {
    id: generateId('pdi'),

    text,

    type: 'text',

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
  pdiQuestions = DEFAULT_PDI_QUESTIONS,
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
     * O PDI continua sendo uma etapa obrigatória
     * do processo de avaliação.
     */
    pdiRequired: true,

    /*
     * Agora as perguntas pertencem ao modelo.
     *
     * Quando uma avaliação for criada, ela receberá uma cópia
     * dessas perguntas.
     */
    pdiQuestions: normalizePdiQuestions(pdiQuestions),

    /*
     * Etapas configuráveis.
     */
    stages: stages.map((stage) => createEvaluationStage(stage)),

    /*
     * Avaliação 180°.
     */
    evaluation180Enabled: evaluation180Enabled === true,

    evaluation180Questions: evaluation180Questions.map(normalizeQuestion),

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
  const models = getStoredArray(STORAGE_KEY)

  return models.map(normalizeEvaluationModel)
}

/*
 * ============================================================
 * BUSCAR MODELOS ATIVOS
 * ============================================================
 *
 * Esta função é utilizada pela tela de Avaliações para mostrar
 * somente modelos que estão disponíveis para criação de uma
 * nova avaliação.
 * ============================================================
 */

export function getActiveEvaluationModels() {
  return getEvaluationModels().filter((model) => model.active !== false)
}

/*
 * ============================================================
 * BUSCAR NOME DO TIPO DO MODELO
 * ============================================================
 *
 * Recebe o valor salvo no modelo e devolve o texto amigável
 * para exibição na interface.
 *
 * Exemplo:
 *
 * performance
 *       ↓
 * Avaliação de desempenho
 * ============================================================
 */

export function getEvaluationModelTypeLabel(type) {
  const normalizedType = String(type || '').trim()

  const found = EVALUATION_MODEL_TYPES.find(
    (item) => item.value === normalizedType
  )

  return found?.label || normalizedType || 'Não informado'
}

/*
 * ============================================================
 * NORMALIZAR MODELO
 * ============================================================
 *
 * Mantém compatibilidade com modelos que foram criados
 * antes da configuração personalizada do PDI.
 * ============================================================
 */

export function normalizeEvaluationModel(model = {}) {
  return {
    ...model,

    id: model.id || generateId('model'),

    name: model.name || '',

    description: model.description || '',

    type: model.type || 'performance',

    active: model.active !== false,

    pdiRequired: model.pdiRequired !== false,

    pdiQuestions: normalizePdiQuestions(model.pdiQuestions),

    stages: Array.isArray(model.stages)
      ? model.stages.map((stage) => createEvaluationStage(stage))
      : [],

    evaluation180Enabled: model.evaluation180Enabled === true,

    evaluation180Questions: Array.isArray(model.evaluation180Questions)
      ? model.evaluation180Questions.map(normalizeQuestion)
      : [],

    createdAt: model.createdAt || getNow(),

    updatedAt: model.updatedAt || getNow()
  }
}

/*
 * ============================================================
 * BUSCAR MODELO POR ID
 * ============================================================
 */

export function getEvaluationModelById(modelId) {
  const normalizedId = String(modelId || '')

  if (!normalizedId) {
    return null
  }

  return (
    getEvaluationModels().find((model) => String(model.id) === normalizedId) ||
    null
  )
}

/*
 * ============================================================
 * ADICIONAR MODELO
 * ============================================================
 */

export function addEvaluationModel(model) {
  const models = getEvaluationModels()

  const newModel = createEvaluationModel(model)

  const updatedModels = [...models, newModel]

  setStored(STORAGE_KEY, updatedModels)

  return updatedModels
}

/*
 * ============================================================
 * ATUALIZAR MODELO
 * ============================================================
 */

export function updateEvaluationModel(model) {
  const models = getEvaluationModels()

  const normalizedModel = normalizeEvaluationModel(model)

  normalizedModel.updatedAt = getNow()

  const updatedModels = models.map((item) =>
    String(item.id) === String(normalizedModel.id) ? normalizedModel : item
  )

  setStored(STORAGE_KEY, updatedModels)

  return updatedModels
}

/*
 * ============================================================
 * EXCLUIR MODELO
 * ============================================================
 */

export function deleteEvaluationModel(modelId) {
  const models = getEvaluationModels()

  const updatedModels = models.filter(
    (item) => String(item.id) !== String(modelId)
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
    return getEvaluationModels()
  }

  const duplicated = createEvaluationModel({
    ...model,

    id: null,

    name: `${model.name} - Cópia`,

    createdAt: null,

    updatedAt: null,

    stages: model.stages.map((stage) => ({
      ...stage,

      id: null,

      questions: stage.questions.map((question) => ({
        ...question,

        id: null
      }))
    })),

    pdiQuestions: normalizePdiQuestions(model.pdiQuestions).map((question) => ({
      ...question,

      id: null
    })),

    evaluation180Questions: model.evaluation180Questions.map((question) => ({
      ...question,

      id: null
    }))
  })

  const models = getEvaluationModels()

  const updatedModels = [...models, duplicated]

  setStored(STORAGE_KEY, updatedModels)

  return updatedModels
}

/*
 * ============================================================
 * ATUALIZAR PERGUNTAS DO PDI
 * ============================================================
 */

export function updatePdiQuestions(modelId, questions) {
  const model = getEvaluationModelById(modelId)

  if (!model) {
    return getEvaluationModels()
  }

  const normalizedQuestions = normalizePdiQuestions(questions)

  const updatedModel = {
    ...model,

    pdiQuestions: normalizedQuestions,

    pdiRequired: true,

    updatedAt: getNow()
  }

  return updateEvaluationModel(updatedModel)
}

/*
 * ============================================================
 * ADICIONAR PERGUNTA AO PDI
 * ============================================================
 */

export function addPdiQuestion(modelId, question = {}) {
  const model = getEvaluationModelById(modelId)

  if (!model) {
    return getEvaluationModels()
  }

  const currentQuestions = normalizePdiQuestions(model.pdiQuestions)

  const newQuestion = createPdiQuestion(question)

  return updatePdiQuestions(modelId, [...currentQuestions, newQuestion])
}

/*
 * ============================================================
 * EDITAR PERGUNTA DO PDI
 * ============================================================
 */

export function updatePdiQuestion(modelId, questionId, questionData) {
  const model = getEvaluationModelById(modelId)

  if (!model) {
    return getEvaluationModels()
  }

  const questions = normalizePdiQuestions(model.pdiQuestions)

  const updatedQuestions = questions.map((question) =>
    String(question.id) === String(questionId)
      ? {
          ...question,

          text:
            questionData.text !== undefined ? questionData.text : question.text,

          required:
            questionData.required !== undefined
              ? questionData.required
              : question.required,

          type: questionData.type || question.type || 'text'
        }
      : question
  )

  return updatePdiQuestions(modelId, updatedQuestions)
}

/*
 * ============================================================
 * EXCLUIR PERGUNTA DO PDI
 * ============================================================
 */

export function deletePdiQuestion(modelId, questionId) {
  const model = getEvaluationModelById(modelId)

  if (!model) {
    return getEvaluationModels()
  }

  const questions = normalizePdiQuestions(model.pdiQuestions)

  /*
   * Não permitimos que o modelo fique sem nenhuma pergunta.
   *
   * Se a empresa tentar excluir a última pergunta,
   * mantemos a estrutura e deixamos a interface informar
   * o usuário.
   */

  if (questions.length <= 1) {
    return getEvaluationModels()
  }

  const updatedQuestions = questions.filter(
    (question) => String(question.id) !== String(questionId)
  )

  return updatePdiQuestions(modelId, updatedQuestions)
}

/*
 * ============================================================
 * REORDENAR PERGUNTAS DO PDI
 * ============================================================
 */

export function reorderPdiQuestions(modelId, questions) {
  return updatePdiQuestions(modelId, questions)
}

/*
 * ============================================================
 * VALIDAR MODELO
 * ============================================================
 */

export function validateEvaluationModel(model) {
  const errors = []

  if (!model || !String(model.name || '').trim()) {
    errors.push('Informe o nome do modelo.')
  }

  const pdiQuestions = normalizePdiQuestions(model?.pdiQuestions)

  if (pdiQuestions.length === 0) {
    errors.push('Cadastre pelo menos uma pergunta para o PDI.')
  }

  pdiQuestions.forEach((question, index) => {
    if (!String(question.text || '').trim()) {
      errors.push(`Informe o texto da pergunta ${index + 1} do PDI.`)
    }
  })

  if (
    model?.evaluation180Enabled &&
    (!Array.isArray(model.evaluation180Questions) ||
      model.evaluation180Questions.length === 0)
  ) {
    errors.push('Cadastre pelo menos uma pergunta para a avaliação 180°.')
  }

  return {
    valid: errors.length === 0,

    errors
  }
}

/*
 * ============================================================
 * GARANTIR COMPATIBILIDADE DOS MODELOS EXISTENTES
 * ============================================================
 *
 * Essa função deve ser chamada quando necessário para migrar
 * modelos antigos para a nova estrutura.
 *
 * Ela NÃO altera as perguntas existentes que já foram
 * personalizadas.
 * ============================================================
 */

export function migrateEvaluationModels() {
  const models = getStoredArray(STORAGE_KEY)

  if (!Array.isArray(models)) {
    return []
  }

  const migratedModels = models.map((model) => {
    const normalized = normalizeEvaluationModel(model)

    /*
     * Só adicionamos as perguntas padrão quando o modelo
     * antigo realmente não possuía nenhuma configuração.
     */

    if (!Array.isArray(model.pdiQuestions)) {
      normalized.pdiQuestions = DEFAULT_PDI_QUESTIONS.map((question) => ({
        ...question
      }))
    }

    return normalized
  })

  setStored(STORAGE_KEY, migratedModels)

  return migratedModels
}

/*
 * ============================================================
 * EXPORTAÇÃO DE COMPATIBILIDADE
 * ============================================================
 */

export function getDefaultPdiQuestions() {
  return DEFAULT_PDI_QUESTIONS.map((question) => ({
    ...question
  }))
}
