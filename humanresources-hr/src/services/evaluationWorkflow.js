import { getStoredArray, setStored } from './storage'

import {
  getEvaluationModelById,
  getEvaluationModels,
  normalizePdiQuestions
} from './evaluationModels'

import {
  findResponsibleUser,
  resolveEvaluationPdiResponsible
} from './evaluationAccess'

const STORAGE_KEY = 'evaluationWorkflows'

/*
 * ============================================================
 * UTILITÁRIOS
 * ============================================================
 */

function generateId(prefix = 'evaluation') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getNow() {
  return new Date().toISOString()
}

function normalizeId(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function normalizeText(value) {
  return String(value || '').trim()
}

/*
 * ============================================================
 * CÁLCULO DE DURAÇÃO
 * ============================================================
 */

function toTimestamp(value) {
  if (!value) {
    return null
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return null
  }

  return timestamp
}

function calculateDuration(start, end) {
  const startTimestamp = toTimestamp(start)
  const endTimestamp = toTimestamp(end)

  if (startTimestamp === null || endTimestamp === null) {
    return 0
  }

  if (endTimestamp < startTimestamp) {
    return 0
  }

  return Math.round((endTimestamp - startTimestamp) / 60000)
}

/*
 * ============================================================
 * DURAÇÃO DA AVALIAÇÃO
 * ============================================================
 */

export function calculateEvaluationDuration(workflow) {
  if (!workflow) {
    return 0
  }

  const start = workflow.startDate || workflow.startedAt || workflow.createdAt

  const end = workflow.endDate || workflow.completedAt || workflow.updatedAt

  return calculateDuration(start, end)
}

/*
 * ============================================================
 * DURAÇÃO DA ETAPA
 * ============================================================
 */

export function calculateStageDuration(stage) {
  if (!stage) {
    return 0
  }

  return calculateDuration(stage.startedAt, stage.completedAt)
}

/*
 * ============================================================
 * PROGRESSO DA AVALIAÇÃO
 * ============================================================
 */

export function calculateEvaluationProgress(workflow) {
  if (!workflow) {
    return {
      completed: 0,
      total: 0,
      percentage: 0
    }
  }

  const stages = Array.isArray(workflow.stages) ? workflow.stages : []

  let total = stages.length
  let completed = stages.filter((stage) => stage.status === 'completed').length

  /*
   * O PDI faz parte do progresso da avaliação.
   */
  if (workflow.pdi) {
    total += 1

    if (workflow.pdi.status === 'completed') {
      completed += 1
    }
  }

  /*
   * A avaliação 180° só entra no cálculo quando estiver
   * habilitada no modelo.
   */
  if (workflow.evaluation180?.enabled === true) {
    total += 1

    if (workflow.evaluation180.status === 'completed') {
      completed += 1
    }
  }

  return {
    completed,
    total,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  }
}

/*
 * ============================================================
 * MÉTRICAS DO HISTÓRICO
 * ============================================================
 */

export function calculateEvaluationMetrics(workflows = []) {
  const list = Array.isArray(workflows) ? workflows : []

  const completedWorkflows = list.filter(
    (workflow) => workflow?.status === 'completed'
  )

  const totalCompleted = completedWorkflows.length

  const durations = completedWorkflows
    .map(calculateEvaluationDuration)
    .filter((duration) => duration > 0)

  const averageEvaluationMinutes =
    durations.length > 0
      ? Math.round(
          durations.reduce((total, duration) => total + duration, 0) /
            durations.length
        )
      : 0

  /*
   * ----------------------------------------------------------
   * MÉTRICAS POR RESPONSÁVEL
   * ----------------------------------------------------------
   */

  const responsibleMap = {}

  completedWorkflows.forEach((workflow) => {
    const stages = Array.isArray(workflow.stages) ? workflow.stages : []

    stages
      .filter((stage) => stage.status === 'completed')
      .forEach((stage) => {
        const key =
          stage.completedByUserId ||
          stage.responsibleUserId ||
          stage.responsibleType ||
          'unknown'

        if (!responsibleMap[key]) {
          responsibleMap[key] = {
            userId: stage.completedByUserId || stage.responsibleUserId || '',
            userName:
              stage.completedByUserName ||
              stage.responsibleUserName ||
              stage.responsibleType ||
              'Não informado',
            responsibleType: stage.responsibleType || '',
            stages: 0,
            totalMinutes: 0,
            averageMinutes: 0
          }
        }

        const duration = calculateStageDuration(stage)

        responsibleMap[key].stages += 1
        responsibleMap[key].totalMinutes += duration
      })
  })

  const byResponsible = Object.values(responsibleMap).map((item) => ({
    ...item,
    averageMinutes:
      item.stages > 0 ? Math.round(item.totalMinutes / item.stages) : 0
  }))

  /*
   * ----------------------------------------------------------
   * MÉTRICAS POR FILIAL
   * ----------------------------------------------------------
   */

  const branchMap = {}

  completedWorkflows.forEach((workflow) => {
    const key = workflow.branchId || workflow.branchName || 'unknown'

    if (!branchMap[key]) {
      branchMap[key] = {
        branchId: workflow.branchId || '',
        branchName: workflow.branchName || 'Não informado',
        count: 0,
        stages: 0,
        totalMinutes: 0,
        averageMinutes: 0
      }
    }

    branchMap[key].count += 1

    const stages = Array.isArray(workflow.stages) ? workflow.stages : []

    stages
      .filter((stage) => stage.status === 'completed')
      .forEach((stage) => {
        branchMap[key].stages += 1
        branchMap[key].totalMinutes += calculateStageDuration(stage)
      })
  })

  const byBranch = Object.values(branchMap).map((item) => ({
    ...item,
    averageMinutes:
      item.stages > 0 ? Math.round(item.totalMinutes / item.stages) : 0
  }))

  return {
    totalCompleted,
    completedEvaluations: totalCompleted,
    averageEvaluationMinutes,
    averageDurationMinutes: averageEvaluationMinutes,
    byResponsible,
    byBranch
  }
}

/*
 * ============================================================
 * BUSCAR WORKFLOWS
 * ============================================================
 */

export function getEvaluationWorkflows() {
  const workflows = getStoredArray(STORAGE_KEY)

  return workflows.map(normalizeWorkflow)
}

/*
 * ============================================================
 * BUSCAR WORKFLOW POR ID
 * ============================================================
 */

export function getEvaluationWorkflowById(workflowId) {
  const normalizedId = normalizeId(workflowId)

  if (!normalizedId) {
    return null
  }

  return (
    getEvaluationWorkflows().find(
      (workflow) => normalizeId(workflow.id) === normalizedId
    ) || null
  )
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

    required: question.required !== false,

    answer: question.answer ?? '',

    answeredAt: question.answeredAt || null
  }
}

/*
 * ============================================================
 * NORMALIZAR PDI
 * ============================================================
 */

function normalizePdi(pdi = {}) {
  const questions = normalizePdiQuestions(pdi.questions || pdi.pdiQuestions)

  return {
    id: pdi.id || generateId('pdi'),

    status: pdi.status || 'pending',

    responsibleType: pdi.responsibleType || 'manager_or_supervisor',

    responsibleUserId: pdi.responsibleUserId || '',

    responsibleUserName: pdi.responsibleUserName || '',

    responsibleEmployeeId: pdi.responsibleEmployeeId || '',

    responsiblePositionId: pdi.responsiblePositionId || '',

    responsiblePositionName: pdi.responsiblePositionName || '',

    questions: questions.map(normalizeQuestion),

    startedAt: pdi.startedAt || null,

    completedAt: pdi.completedAt || null,

    completedByUserId: pdi.completedByUserId || '',

    completedByUserName: pdi.completedByUserName || '',

    signature: pdi.signature || null
  }
}

/*
 * ============================================================
 * NORMALIZAR ETAPA
 * ============================================================
 */

function normalizeStage(stage = {}) {
  return {
    id: stage.id || generateId('stage'),

    name: stage.name || '',

    description: stage.description || '',

    status: stage.status || 'pending',

    responsibleType: stage.responsibleType || 'specific_user',

    responsibleUserId: stage.responsibleUserId || '',

    responsibleUserName: stage.responsibleUserName || '',

    questions: Array.isArray(stage.questions)
      ? stage.questions.map(normalizeQuestion)
      : [],

    startedAt: stage.startedAt || null,

    completedAt: stage.completedAt || null,

    completedByUserId: stage.completedByUserId || '',

    completedByUserName: stage.completedByUserName || '',

    signature: stage.signature || null
  }
}

/*
 * ============================================================
 * NORMALIZAR AVALIAÇÃO 180°
 * ============================================================
 */

function normalizeEvaluation180(evaluation180 = {}) {
  return {
    enabled: evaluation180.enabled === true,

    status: evaluation180.status || 'pending',

    questions: Array.isArray(evaluation180.questions)
      ? evaluation180.questions.map(normalizeQuestion)
      : [],

    startedAt: evaluation180.startedAt || null,

    completedAt: evaluation180.completedAt || null,

    completedByUserId: evaluation180.completedByUserId || '',

    completedByUserName: evaluation180.completedByUserName || '',

    signature: evaluation180.signature || null
  }
}

/*
 * ============================================================
 * NORMALIZAR WORKFLOW
 * ============================================================
 */

export function normalizeWorkflow(workflow = {}) {
  return {
    ...workflow,

    id: workflow.id || generateId('workflow'),

    modelId: workflow.modelId || '',

    modelName: workflow.modelName || '',

    employeeId: workflow.employeeId || '',

    employeeName: workflow.employeeName || '',

    employeeEmail: workflow.employeeEmail || '',

    branchId: workflow.branchId || '',

    branchName: workflow.branchName || '',

    departmentId: workflow.departmentId || '',

    departmentName: workflow.departmentName || '',

    positionId: workflow.positionId || '',

    positionName: workflow.positionName || '',

    status: workflow.status || 'pending',

    stages: Array.isArray(workflow.stages)
      ? workflow.stages.map(normalizeStage)
      : [],

    pdi: normalizePdi(workflow.pdi),

    evaluation180: normalizeEvaluation180(workflow.evaluation180),

    createdAt: workflow.createdAt || getNow(),

    updatedAt: workflow.updatedAt || getNow()
  }
}

/*
 * ============================================================
 * CONSTRUIR PERGUNTAS DO PDI
 * ============================================================
 *
 * As perguntas são COPIADAS do modelo para o workflow.
 *
 * Dessa forma:
 *
 * Modelo atual
 *       ↓
 * cria avaliação
 *       ↓
 * avaliação recebe uma cópia das perguntas
 *
 * Se o modelo for alterado posteriormente, a avaliação que já
 * existe não muda.
 * ============================================================
 */

function buildPdiQuestions(model) {
  const modelQuestions = normalizePdiQuestions(model?.pdiQuestions)

  return modelQuestions.map((question) => ({
    id: question.id || generateId('pdi'),

    text: normalizeText(question.text),

    type: question.type || 'text',

    required: question.required !== false,

    answer: '',

    answeredAt: null
  }))
}

/*
 * ============================================================
 * CONSTRUIR PERGUNTAS DA ETAPA
 * ============================================================
 */

function buildStageQuestions(stage) {
  if (!Array.isArray(stage?.questions)) {
    return []
  }

  return stage.questions.map((question) => ({
    id: question.id || generateId('question'),

    text: normalizeText(question.text),

    type: question.type || 'scale',

    required: question.required !== false,

    answer: '',

    answeredAt: null
  }))
}

/*
 * ============================================================
 * CONSTRUIR AVALIAÇÃO 180°
 * ============================================================
 */

function buildEvaluation180(model) {
  const enabled = model?.evaluation180Enabled === true

  if (!enabled) {
    return {
      enabled: false,

      status: 'disabled',

      questions: [],

      startedAt: null,

      completedAt: null,

      completedByUserId: '',

      completedByUserName: '',

      signature: null
    }
  }

  const questions = Array.isArray(model.evaluation180Questions)
    ? model.evaluation180Questions.map((question) => ({
        id: question.id || generateId('evaluation180'),

        text: normalizeText(question.text),

        type: question.type || 'scale',

        required: question.required !== false,

        answer: '',

        answeredAt: null
      }))
    : []

  return {
    enabled: true,

    status: 'pending',

    questions,

    startedAt: null,

    completedAt: null,

    completedByUserId: '',

    completedByUserName: '',

    signature: null
  }
}
/*
 * ============================================================
 * RESOLVER RESPONSÁVEL DA ETAPA
 * ============================================================
 */

function resolveStageResponsible(stage, employee) {
  const responsible = findResponsibleUser({
    responsibleType: stage.responsibleType,

    employee,

    responsibleUserId: stage.responsibleUserId,

    responsibleUserName: stage.responsibleUserName
  })

  return {
    ...stage,

    responsibleUserId: responsible.userId || stage.responsibleUserId || '',

    responsibleUserName: responsible.userName || stage.responsibleUserName || ''
  }
}

/*
 * ============================================================
 * RESOLVER RESPONSÁVEL DO PDI
 * ============================================================
 */

function resolvePdiResponsibleData(pdi, workflow) {
  const responsible = resolveEvaluationPdiResponsible(workflow)

  return {
    ...pdi,

    responsibleUserId: responsible.userId || pdi.responsibleUserId || '',

    responsibleUserName: responsible.userName || pdi.responsibleUserName || '',

    responsibleEmployeeId:
      responsible.employeeId || pdi.responsibleEmployeeId || '',

    responsiblePositionId:
      responsible.positionId || pdi.responsiblePositionId || '',

    responsiblePositionName:
      responsible.positionName || pdi.responsiblePositionName || ''
  }
}

/*
 * ============================================================
 * CRIAR WORKFLOW
 * ============================================================
 *
 * A função aceita tanto a estrutura antiga:
 *
 * {
 *   employee,
 *   branch,
 *   department,
 *   position
 * }
 *
 * quanto a estrutura utilizada atualmente pela tela
 * Avaliacoes.jsx:
 *
 * {
 *   employeeId,
 *   employeeName,
 *   branchId,
 *   branchName,
 *   modelId,
 *   startDate,
 *   endDate,
 *   createdBy,
 *   createdByName
 * }
 * ============================================================
 */

export function createEvaluationWorkflow({
  modelId,

  /*
   * Estrutura antiga.
   */
  employee = null,
  branch = null,
  department = null,
  position = null,

  /*
   * Estrutura utilizada pela tela atual.
   */
  employeeId = '',
  employeeName = '',
  employeeEmail = '',

  branchId = '',
  branchName = '',

  departmentId = '',
  departmentName = '',

  positionId = '',
  positionName = '',

  startDate = null,
  endDate = null,

  createdBy = '',
  createdByName = ''
}) {
  const model = getEvaluationModelById(modelId)

  if (!model) {
    throw new Error('Modelo de avaliação não encontrado.')
  }

  /*
   * ----------------------------------------------------------
   * MONTAR DADOS DO FUNCIONÁRIO
   * ----------------------------------------------------------
   *
   * Se a chamada antiga enviou o objeto employee,
   * utilizamos esse objeto.
   *
   * Caso contrário, utilizamos os campos individuais.
   */

  const employeeDataInput = employee || {
    id: employeeId,

    name: employeeName || '',

    email: employeeEmail || '',

    branchId: branchId || '',

    branchName: branchName || '',

    departmentId: departmentId || '',

    departmentName: departmentName || '',

    positionId: positionId || '',

    positionName: positionName || ''
  }

  if (!employeeDataInput?.id) {
    throw new Error('Funcionário não informado.')
  }

  /*
   * ----------------------------------------------------------
   * INFORMAÇÕES DO FUNCIONÁRIO
   * ----------------------------------------------------------
   */

  const employeeData = {
    ...employeeDataInput,

    id: employeeDataInput.id,

    name:
      employeeDataInput.name ||
      employeeDataInput.fullName ||
      employeeName ||
      '',

    email: employeeDataInput.email || employeeEmail || '',

    branchId: employeeDataInput.branchId || branch?.id || branchId || '',

    branchName:
      employeeDataInput.branchName || branch?.name || branchName || '',

    departmentId:
      employeeDataInput.departmentId || department?.id || departmentId || '',

    departmentName:
      employeeDataInput.departmentName ||
      department?.name ||
      departmentName ||
      '',

    positionId:
      employeeDataInput.positionId || position?.id || positionId || '',

    positionName:
      employeeDataInput.positionName || position?.name || positionName || ''
  }

  /*
   * ----------------------------------------------------------
   * ETAPAS
   * ----------------------------------------------------------
   */

  const stages = Array.isArray(model.stages)
    ? model.stages.map((stage) => {
        const baseStage = {
          id: stage.id || generateId('stage'),

          name: stage.name || '',

          description: stage.description || '',

          status: 'pending',

          responsibleType: stage.responsibleType || 'specific_user',

          responsibleUserId: stage.responsibleUserId || '',

          responsibleUserName: stage.responsibleUserName || '',

          questions: buildStageQuestions(stage),

          startedAt: null,

          completedAt: null,

          completedByUserId: '',

          completedByUserName: '',

          signature: null
        }

        return resolveStageResponsible(baseStage, employeeData)
      })
    : []

  /*
   * ----------------------------------------------------------
   * PDI
   * ----------------------------------------------------------
   */

  const pdi = {
    id: generateId('pdi'),

    status: 'pending',

    responsibleType: 'manager_or_supervisor',

    responsibleUserId: '',

    responsibleUserName: '',

    responsibleEmployeeId: '',

    responsiblePositionId: '',

    responsiblePositionName: '',

    questions: buildPdiQuestions(model),

    startedAt: null,

    completedAt: null,

    completedByUserId: '',

    completedByUserName: '',

    signature: null
  }

  /*
   * ----------------------------------------------------------
   * WORKFLOW BASE
   * ----------------------------------------------------------
   */

  const workflow = {
    id: generateId('evaluation'),

    modelId: model.id,

    modelName: model.name,

    employeeId: employeeData.id,

    employeeName: employeeData.name,

    employeeEmail: employeeData.email,

    branchId: employeeData.branchId,

    branchName: employeeData.branchName,

    departmentId: employeeData.departmentId,

    departmentName: employeeData.departmentName,

    positionId: employeeData.positionId,

    positionName: employeeData.positionName,

    /*
     * Mantemos as datas informadas pela tela quando
     * existirem.
     */
    startDate: startDate || null,

    endDate: endDate || null,

    /*
     * Informações de criação.
     */
    createdBy: createdBy || '',

    createdByName: createdByName || '',

    status: 'pending',

    stages,

    pdi,

    evaluation180: buildEvaluation180(model),

    createdAt: getNow(),

    updatedAt: getNow()
  }

  /*
   * ----------------------------------------------------------
   * RESOLVER RESPONSÁVEL DO PDI
   * ----------------------------------------------------------
   */

  workflow.pdi = resolvePdiResponsibleData(workflow.pdi, workflow)

  /*
   * ----------------------------------------------------------
   * SALVAR
   * ----------------------------------------------------------
   */

  const workflows = getEvaluationWorkflows()

  const updatedWorkflows = [...workflows, workflow]

  setStored(STORAGE_KEY, updatedWorkflows)

  return workflow
}

/*
 * ============================================================
 * ATUALIZAR WORKFLOW
 * ============================================================
 */

export function updateEvaluationWorkflow(workflow) {
  const workflows = getEvaluationWorkflows()

  const normalized = normalizeWorkflow(workflow)

  normalized.updatedAt = getNow()

  /*
   * Se o PDI ainda não possui responsável,
   * tentamos resolver novamente.
   */

  normalized.pdi = resolvePdiResponsibleData(normalized.pdi, normalized)

  /*
   * Também corrigimos etapas que ainda estejam
   * sem responsável.
   */

  normalized.stages = normalized.stages.map((stage) => {
    if (stage.responsibleUserId) {
      return stage
    }

    return resolveStageResponsible(stage, {
      id: normalized.employeeId,

      name: normalized.employeeName,

      branchId: normalized.branchId,

      branchName: normalized.branchName,

      departmentId: normalized.departmentId,

      departmentName: normalized.departmentName,

      positionId: normalized.positionId,

      positionName: normalized.positionName
    })
  })

  const index = workflows.findIndex(
    (item) => normalizeId(item.id) === normalizeId(normalized.id)
  )

  if (index === -1) {
    return null
  }

  const updatedWorkflows = [...workflows]

  updatedWorkflows[index] = normalized

  setStored(STORAGE_KEY, updatedWorkflows)

  return normalized
}

/*
 * ============================================================
 * ATUALIZAR PARCIALMENTE WORKFLOW
 * ============================================================
 */

export function patchEvaluationWorkflow(workflowId, updates = {}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  return updateEvaluationWorkflow({
    ...workflow,
    ...updates
  })
}

/*
 * ============================================================
 * INICIAR ETAPA
 * ============================================================
 */

export function startEvaluationStage(workflowId, stageId, user = null) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  const stages = workflow.stages.map((stage) => {
    if (normalizeId(stage.id) !== normalizeId(stageId)) {
      return stage
    }

    return {
      ...stage,

      status: stage.status === 'completed' ? 'completed' : 'in_progress',

      startedAt: stage.startedAt || getNow(),

      startedByUserId: user?.id || user?.userId || '',

      startedByUserName: user?.name || user?.username || ''
    }
  })

  return updateEvaluationWorkflow({
    ...workflow,

    status: workflow.status === 'completed' ? 'completed' : 'in_progress',

    stages
  })
}

/*
 * ============================================================
 * INICIAR PDI
 * ============================================================
 */

export function startEvaluationPdi(workflowId, user = null) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  const pdi = resolvePdiResponsibleData(workflow.pdi, workflow)

  /*
   * Mesmo que o usuário seja Admin/RH,
   * registramos quem iniciou a etapa.
   */

  return updateEvaluationWorkflow({
    ...workflow,

    pdi: {
      ...pdi,

      status: pdi.status === 'completed' ? pdi.status : 'in_progress',

      startedAt: pdi.startedAt || getNow(),

      startedByUserId: user?.id || user?.userId || '',

      startedByUserName: user?.name || user?.username || ''
    }
  })
}

/*
 * ============================================================
 * RESPONDER PERGUNTA DO PDI
 * ============================================================
 */

export function answerEvaluationPdiQuestion(workflowId, questionId, answer) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  const questions = workflow.pdi.questions.map((question) =>
    normalizeId(question.id) === normalizeId(questionId)
      ? {
          ...question,

          answer,

          answeredAt: getNow()
        }
      : question
  )

  return updateEvaluationWorkflow({
    ...workflow,

    pdi: {
      ...workflow.pdi,

      questions
    }
  })
}

/*
 * ============================================================
 * ATUALIZAR TODAS AS RESPOSTAS DO PDI
 * ============================================================
 */

export function updateEvaluationPdiAnswers(workflowId, answers) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  const questions = workflow.pdi.questions.map((question) => {
    const answer = answers?.[question.id]

    if (answer === undefined) {
      return question
    }

    return {
      ...question,

      answer,

      answeredAt: getNow()
    }
  })

  return updateEvaluationWorkflow({
    ...workflow,

    pdi: {
      ...workflow.pdi,

      questions
    }
  })
}

/*
 * ============================================================
 * VALIDAR PDI
 * ============================================================
 */

export function validateEvaluationPdi(workflow) {
  if (!workflow?.pdi) {
    return {
      valid: false,

      errors: ['PDI não encontrado.']
    }
  }

  const errors = []

  const questions = workflow.pdi.questions || []

  questions.forEach((question, index) => {
    if (question.required !== false) {
      const answer = String(question.answer || '').trim()

      if (!answer) {
        errors.push(`Responda a pergunta ${index + 1} do PDI.`)
      }
    }
  })

  return {
    valid: errors.length === 0,

    errors
  }
}

/*
 * ============================================================
 * CONCLUIR PDI
 * ============================================================
 */

export function completeEvaluationPdi(
  workflowId,
  user = null,
  signature = null
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  const validation = validateEvaluationPdi(workflow)

  if (!validation.valid) {
    return {
      success: false,

      errors: validation.errors,

      workflow
    }
  }

  const completedAt = getNow()

  const updated = updateEvaluationWorkflow({
    ...workflow,

    pdi: {
      ...workflow.pdi,

      status: 'completed',

      completedAt,

      completedByUserId: user?.id || user?.userId || '',

      completedByUserName: user?.name || user?.username || '',

      signature: signature || workflow.pdi.signature || null
    }
  })

  return {
    success: true,

    errors: [],

    workflow: updated
  }
}

/*
 * ============================================================
 * CONCLUIR ETAPA
 * ============================================================
 */

export function completeEvaluationStage(
  workflowId,
  stageId,
  user = null,
  signature = null
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  const stage = workflow.stages.find(
    (item) => normalizeId(item.id) === normalizeId(stageId)
  )

  if (!stage) {
    return {
      success: false,

      errors: ['Etapa não encontrada.'],

      workflow
    }
  }

  /*
   * ----------------------------------------------------------
   * VALIDAR PERGUNTAS OBRIGATÓRIAS
   * ----------------------------------------------------------
   */

  const requiredQuestions = stage.questions.filter(
    (question) => question.required !== false
  )

  const unanswered = requiredQuestions.filter(
    (question) => String(question.answer ?? '').trim() === ''
  )

  if (unanswered.length > 0) {
    return {
      success: false,

      errors: ['Existem perguntas obrigatórias sem resposta.'],

      workflow
    }
  }

  /*
   * ----------------------------------------------------------
   * ATUALIZAR ETAPA
   * ----------------------------------------------------------
   */

  const completedAt = getNow()

  const stages = workflow.stages.map((item) => {
    if (normalizeId(item.id) !== normalizeId(stageId)) {
      return item
    }

    return {
      ...item,

      status: 'completed',

      completedAt,

      completedByUserId: user?.id || user?.userId || '',

      completedByUserName: user?.name || user?.username || '',

      signature: signature || item.signature || null
    }
  })

  const updated = updateEvaluationWorkflow({
    ...workflow,

    stages
  })

  return {
    success: true,

    errors: [],

    workflow: updated
  }
}

/*
 * ============================================================
 * RESPONDER PERGUNTA DA ETAPA
 * ============================================================
 */

export function answerEvaluationStageQuestion(
  workflowId,
  stageId,
  questionId,
  answer
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  const stages = workflow.stages.map((stage) => {
    if (normalizeId(stage.id) !== normalizeId(stageId)) {
      return stage
    }

    const questions = stage.questions.map((question) =>
      normalizeId(question.id) === normalizeId(questionId)
        ? {
            ...question,

            answer,

            answeredAt: getNow()
          }
        : question
    )

    return {
      ...stage,

      questions
    }
  })

  return updateEvaluationWorkflow({
    ...workflow,

    stages
  })
}

/*
 * ============================================================
 * INICIAR AVALIAÇÃO 180°
 * ============================================================
 */

export function startEvaluation180(workflowId, user = null) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  if (workflow.evaluation180?.enabled !== true) {
    return {
      success: false,

      errors: ['A avaliação 180° não está habilitada.'],

      workflow
    }
  }

  return updateEvaluationWorkflow({
    ...workflow,

    evaluation180: {
      ...workflow.evaluation180,

      status:
        workflow.evaluation180.status === 'completed'
          ? 'completed'
          : 'in_progress',

      startedAt: workflow.evaluation180.startedAt || getNow(),

      startedByUserId: user?.id || user?.userId || '',

      startedByUserName: user?.name || user?.username || ''
    }
  })
}

/*
 * ============================================================
 * RESPONDER PERGUNTA DA AVALIAÇÃO 180°
 * ============================================================
 */

export function answerEvaluation180Question(workflowId, questionId, answer) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  if (workflow.evaluation180?.enabled !== true) {
    return null
  }

  const questions = workflow.evaluation180.questions.map((question) =>
    normalizeId(question.id) === normalizeId(questionId)
      ? {
          ...question,

          answer,

          answeredAt: getNow()
        }
      : question
  )

  return updateEvaluationWorkflow({
    ...workflow,

    evaluation180: {
      ...workflow.evaluation180,

      questions
    }
  })
}

/*
 * ============================================================
 * CONCLUIR AVALIAÇÃO 180°
 * ============================================================
 */

export function completeEvaluation180(
  workflowId,
  user = null,
  signature = null
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  if (workflow.evaluation180?.enabled !== true) {
    return {
      success: false,

      errors: ['A avaliação 180° não está habilitada.'],

      workflow
    }
  }

  const questions = workflow.evaluation180.questions || []

  const requiredQuestions = questions.filter(
    (question) => question.required !== false
  )

  const unanswered = requiredQuestions.filter(
    (question) => String(question.answer ?? '').trim() === ''
  )

  if (unanswered.length > 0) {
    return {
      success: false,

      errors: ['Existem perguntas obrigatórias sem resposta.'],

      workflow
    }
  }

  const updated = updateEvaluationWorkflow({
    ...workflow,

    evaluation180: {
      ...workflow.evaluation180,

      status: 'completed',

      completedAt: getNow(),

      completedByUserId: user?.id || user?.userId || '',

      completedByUserName: user?.name || user?.username || '',

      signature: signature || workflow.evaluation180.signature || null
    }
  })

  return {
    success: true,

    errors: [],

    workflow: updated
  }
}

/*
 * ============================================================
 * ATUALIZAR STATUS GERAL
 * ============================================================
 */

export function refreshEvaluationWorkflowStatus(workflowId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  /*
   * ----------------------------------------------------------
   * ETAPAS
   * ----------------------------------------------------------
   */

  const stagesCompleted =
    workflow.stages.length === 0 ||
    workflow.stages.every((stage) => stage.status === 'completed')

  /*
   * ----------------------------------------------------------
   * PDI
   * ----------------------------------------------------------
   */

  const pdiCompleted = workflow.pdi.status === 'completed'

  /*
   * ----------------------------------------------------------
   * AVALIAÇÃO 180°
   * ----------------------------------------------------------
   */

  const evaluation180Completed =
    workflow.evaluation180.enabled !== true ||
    workflow.evaluation180.status === 'completed'

  /*
   * ----------------------------------------------------------
   * DEFINIR STATUS
   * ----------------------------------------------------------
   */

  let status = 'in_progress'

  if (stagesCompleted && pdiCompleted && evaluation180Completed) {
    status = 'completed'
  }

  /*
   * Se ainda não iniciou nenhuma etapa,
   * mantemos como pendente.
   */

  if (workflow.status === 'pending') {
    const hasStarted =
      workflow.stages.some((stage) => stage.status !== 'pending') ||
      workflow.pdi.status !== 'pending' ||
      workflow.evaluation180.status !== 'pending'

    if (!hasStarted) {
      status = 'pending'
    }
  }

  return updateEvaluationWorkflow({
    ...workflow,

    status
  })
}

/*
 * ============================================================
 * CORRIGIR RESPONSÁVEIS DE AVALIAÇÕES EXISTENTES
 * ============================================================
 *
 * Esta função é importante para avaliações que foram criadas
 * antes das correções de responsáveis.
 *
 * A avaliação já existe.
 *
 * Ela é analisada novamente:
 *
 * avaliação
 *     ↓
 * funcionário
 *     ↓
 * estrutura organizacional
 *     ↓
 * responsável
 *
 * Não recriamos a avaliação.
 * ============================================================
 */

export function repairEvaluationWorkflowResponsible(workflow) {
  if (!workflow) {
    return null
  }

  const normalized = normalizeWorkflow(workflow)

  /*
   * ----------------------------------------------------------
   * CORRIGIR ETAPAS
   * ----------------------------------------------------------
   */

  const stages = normalized.stages.map((stage) => {
    /*
     * Se já possui responsável,
     * mantemos o responsável existente.
     */

    if (stage.responsibleUserId) {
      return stage
    }

    return resolveStageResponsible(stage, {
      id: normalized.employeeId,

      name: normalized.employeeName,

      branchId: normalized.branchId,

      branchName: normalized.branchName,

      departmentId: normalized.departmentId,

      departmentName: normalized.departmentName,

      positionId: normalized.positionId,

      positionName: normalized.positionName
    })
  })

  /*
   * ----------------------------------------------------------
   * CORRIGIR PDI
   * ----------------------------------------------------------
   */

  const pdi = resolvePdiResponsibleData(normalized.pdi, {
    ...normalized,

    stages
  })

  return {
    ...normalized,

    stages,

    pdi
  }
}

/*
 * ============================================================
 * CORRIGIR TODAS AS AVALIAÇÕES
 * ============================================================
 */

export function repairEvaluationWorkflows() {
  const workflows = getEvaluationWorkflows()

  const repaired = workflows.map((workflow) =>
    repairEvaluationWorkflowResponsible(workflow)
  )

  setStored(STORAGE_KEY, repaired)

  return repaired
}

/*
 * ============================================================
 * REPARAR PERGUNTAS DO PDI
 * ============================================================
 *
 * Utilizado para avaliações antigas que possam ter recebido
 * perguntas de uma versão anterior do modelo.
 * ============================================================
 */

export function repairEvaluationPdiQuestions(workflow) {
  if (!workflow) {
    return null
  }

  const normalized = normalizeWorkflow(workflow)

  const model = getEvaluationModelById(normalized.modelId)

  if (!model) {
    return normalized
  }

  /*
   * Se o workflow já possui perguntas,
   * não substituímos as respostas existentes.
   *
   * Apenas garantimos que a estrutura esteja normalizada.
   */

  const currentQuestions = Array.isArray(normalized.pdi?.questions)
    ? normalized.pdi.questions
    : []

  if (currentQuestions.length > 0) {
    return normalized
  }

  /*
   * Caso não existam perguntas no workflow,
   * copiamos as perguntas atuais do modelo.
   */

  return {
    ...normalized,

    pdi: {
      ...normalized.pdi,

      questions: buildPdiQuestions(model)
    }
  }
}

/*
 * ============================================================
 * REPARAR WORKFLOW COMPLETO
 * ============================================================
 */

export function repairEvaluationWorkflow(workflow) {
  if (!workflow) {
    return null
  }

  const withPdi = repairEvaluationPdiQuestions(workflow)

  return repairEvaluationWorkflowResponsible(withPdi)
}

/*
 * ============================================================
 * REPARAR TODAS AS AVALIAÇÕES
 * ============================================================
 */

export function repairAllEvaluationWorkflows() {
  const workflows = getStoredArray(STORAGE_KEY)

  const repaired = workflows.map((workflow) =>
    repairEvaluationWorkflow(workflow)
  )

  setStored(STORAGE_KEY, repaired)

  return repaired
}

/*
 * ============================================================
 * EXCLUIR WORKFLOW
 * ============================================================
 */

export function deleteEvaluationWorkflow(workflowId) {
  const workflows = getEvaluationWorkflows()

  const updated = workflows.filter(
    (workflow) => normalizeId(workflow.id) !== normalizeId(workflowId)
  )

  setStored(STORAGE_KEY, updated)

  return updated
}

/*
 * ============================================================
 * BUSCAR AVALIAÇÕES DO FUNCIONÁRIO
 * ============================================================
 */

export function getEmployeeEvaluationWorkflows(employeeId) {
  const normalizedId = normalizeId(employeeId)

  return getEvaluationWorkflows().filter(
    (workflow) => normalizeId(workflow.employeeId) === normalizedId
  )
}

/*
 * ============================================================
 * BUSCAR AVALIAÇÕES PENDENTES
 * ============================================================
 */

export function getPendingEvaluationWorkflows() {
  return getEvaluationWorkflows().filter(
    (workflow) => workflow.status !== 'completed'
  )
}

/*
 * ============================================================
 * BUSCAR AVALIAÇÕES CONCLUÍDAS
 * ============================================================
 */

export function getCompletedEvaluationWorkflows() {
  return getEvaluationWorkflows().filter(
    (workflow) => workflow.status === 'completed'
  )
}

/*
 * ============================================================
 * INICIALIZAÇÃO / MIGRAÇÃO
 * ============================================================
 *
 * Mantemos esta função exportada para que a aplicação possa
 * executá-la na inicialização.
 * ============================================================
 */

export function initializeEvaluationWorkflows() {
  /*
   * Primeiro garante que a estrutura atual esteja normalizada.
   */

  const workflows = getEvaluationWorkflows()

  /*
   * Depois corrige os responsáveis e PDI das avaliações antigas.
   */

  const repaired = workflows.map((workflow) =>
    repairEvaluationWorkflow(workflow)
  )

  setStored(STORAGE_KEY, repaired)

  return repaired
}

/*
 * ============================================================
 * ALIAS
 * ============================================================
 *
 * Mantido para componentes que possam utilizar o nome antigo.
 * ============================================================
 */

export const createWorkflow = createEvaluationWorkflow

export const updateWorkflow = updateEvaluationWorkflow

export const getWorkflows = getEvaluationWorkflows

export const getWorkflowById = getEvaluationWorkflowById
