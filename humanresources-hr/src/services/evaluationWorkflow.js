import { getStoredArray, setStored } from './storage'
import { getEvaluationModelById } from './evaluationModels'

const STORAGE_KEY = 'evaluationWorkflows'

export const EVALUATION_WORKFLOW_STATUSES = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluída' },
  { value: 'cancelled', label: 'Cancelada' }
]

export const EVALUATION_STAGE_STATUSES = [
  { value: 'locked', label: 'Bloqueada' },
  { value: 'pending', label: 'Pendente' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluída' }
]

function generateId(prefix = 'evaluation') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getNow() {
  return new Date().toISOString()
}

function normalizeUser(userId, userName) {
  return {
    id: userId || '',
    name: userName || ''
  }
}

export function getEvaluationWorkflows() {
  return getStoredArray(STORAGE_KEY)
}

export function getEvaluationWorkflowById(workflowId) {
  return getEvaluationWorkflows().find((workflow) => workflow.id === workflowId)
}

export function getEmployeeEvaluationWorkflows(employeeId) {
  return getEvaluationWorkflows().filter(
    (workflow) => String(workflow.employeeId) === String(employeeId)
  )
}

function createQuestionAnswer(question) {
  return {
    questionId: question.id,
    questionText: question.text,
    questionType: question.type,
    required: question.required !== false,
    answer: '',
    comment: '',
    answeredAt: null
  }
}

function createWorkflowStage(modelStage, index) {
  return {
    id: generateId('stage'),
    modelStageId: modelStage.id,
    order: index + 1,
    name: modelStage.name,
    description: modelStage.description || '',
    responsibleType: modelStage.responsibleType || '',
    responsibleUserId: modelStage.responsibleUserId || '',
    responsibleUserName: modelStage.responsibleUserName || '',
    status: index === 0 ? 'pending' : 'locked',
    startedAt: null,
    completedAt: null,
    startedById: '',
    startedByName: '',
    completedById: '',
    completedByName: '',

    /*
     * Resultado da etapa.
     */
    totalScore: 0,
    answeredQuestions: 0,
    averageScore: 0,

    /*
     * Assinatura digital da etapa.
     */
    signature: '',
    signedById: '',
    signedByName: '',
    signedAt: null,

    questions: Array.isArray(modelStage.questions)
      ? modelStage.questions.map(createQuestionAnswer)
      : []
  }
}

function createWorkflowPdi(model) {
  return {
    status: 'locked',
    startedAt: null,
    completedAt: null,
    startedById: '',
    startedByName: '',
    completedById: '',
    completedByName: '',
    responsibleType: 'manager_or_supervisor',
    responsibleUserId: '',
    responsibleUserName: '',

    /*
     * Assinatura digital do responsável pelo PDI.
     */
    signature: '',
    signedById: '',
    signedByName: '',
    signedAt: null,

    questions: Array.isArray(model.pdiQuestions)
      ? model.pdiQuestions.map(createQuestionAnswer)
      : [],

    employeeFeedback: {
      positivePoints: '',
      negativePoints: '',
      sent: false,
      sentAt: null
    }
  }
}

function createWorkflow180(model) {
  const enabled = model.evaluation180?.enabled === true

  return {
    enabled,
    status: enabled ? 'locked' : 'disabled',
    startedAt: null,
    completedAt: null,
    startedById: '',
    startedByName: '',
    completedById: '',
    completedByName: '',
    responsibleType: 'employee',

    /*
     * Resultado do 180°.
     *
     * Fica separado do resultado das etapas normais,
     * pois o 180° é confidencial.
     */
    totalScore: 0,
    answeredQuestions: 0,
    averageScore: 0,

    /*
     * Assinatura digital do funcionário.
     */
    signature: '',
    signedById: '',
    signedByName: '',
    signedAt: null,

    questions: Array.isArray(model.evaluation180?.questions)
      ? model.evaluation180.questions.map(createQuestionAnswer)
      : []
  }
}

/*
 * ============================================================
 * CALCULAR RESULTADO DAS PERGUNTAS
 * ============================================================
 *
 * Somente perguntas do tipo "scale" entram no cálculo.
 *
 * A escala utilizada pelo módulo é de 1 a 10.
 * ============================================================
 */

function calculateScoreResult(questions = []) {
  const scoredQuestions = questions.filter((question) => {
    if (question.questionType !== 'scale') {
      return false
    }

    const score = Number(question.answer)

    return Number.isFinite(score) && score >= 1 && score <= 10
  })

  const totalScore = scoredQuestions.reduce(
    (total, question) => total + Number(question.answer),
    0
  )

  const answeredQuestions = scoredQuestions.length

  const averageScore =
    answeredQuestions > 0
      ? Number((totalScore / answeredQuestions).toFixed(2))
      : 0

  return {
    totalScore,
    answeredQuestions,
    averageScore
  }
}

export function createEvaluationWorkflow({
  employeeId,
  employeeName,
  branchId,
  branchName,
  modelId,
  startDate,
  endDate,
  createdBy,
  createdByName
}) {
  const model = getEvaluationModelById(modelId)

  if (!model) {
    return {
      success: false,
      message: 'Modelo de avaliação não encontrado.'
    }
  }

  if (!employeeId) {
    return {
      success: false,
      message: 'Funcionário não informado.'
    }
  }

  if (!modelId) {
    return {
      success: false,
      message: 'Modelo de avaliação não informado.'
    }
  }

  if (!Array.isArray(model.stages) || model.stages.length === 0) {
    return {
      success: false,
      message: 'O modelo precisa possuir pelo menos uma etapa.'
    }
  }

  const now = getNow()

  const workflow = {
    id: generateId('workflow'),
    modelId: model.id,
    modelName: model.name,
    modelType: model.type,

    employeeId,
    employeeName,

    branchId: branchId || '',
    branchName: branchName || '',

    startDate: startDate || '',
    endDate: endDate || '',

    status: 'in_progress',
    currentStageOrder: 1,

    stages: model.stages.map(createWorkflowStage),

    pdi: createWorkflowPdi(model),

    evaluation180: createWorkflow180(model),

    createdBy: createdBy || '',
    createdByName: createdByName || '',
    createdAt: now,
    updatedAt: now,
    completedAt: null
  }

  const workflows = getEvaluationWorkflows()

  setStored(STORAGE_KEY, [...workflows, workflow])

  return {
    success: true,
    workflow
  }
}

export function getCurrentEvaluationStage(workflow) {
  if (!workflow || !Array.isArray(workflow.stages)) {
    return null
  }

  return (
    workflow.stages.find(
      (stage) => stage.status === 'pending' || stage.status === 'in_progress'
    ) || null
  )
}

export function isEvaluationStageUnlocked(workflow, stageId) {
  if (!workflow || !Array.isArray(workflow.stages)) {
    return false
  }

  const stageIndex = workflow.stages.findIndex((stage) => stage.id === stageId)

  if (stageIndex === -1) {
    return false
  }

  if (stageIndex === 0) {
    return true
  }

  const previousStage = workflow.stages[stageIndex - 1]

  return previousStage?.status === 'completed'
}

export function startEvaluationStage(
  workflowId,
  stageId,
  startedById = '',
  startedByName = ''
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (!isEvaluationStageUnlocked(workflow, stageId)) {
    return {
      success: false,
      message: 'Esta etapa ainda está bloqueada.'
    }
  }

  const stageIndex = workflow.stages.findIndex((stage) => stage.id === stageId)

  if (stageIndex === -1) {
    return {
      success: false,
      message: 'Etapa não encontrada.'
    }
  }

  const stage = workflow.stages[stageIndex]

  if (stage.status === 'completed') {
    return {
      success: false,
      message: 'Esta etapa já foi concluída.'
    }
  }

  const user = normalizeUser(
    startedById || stage.responsibleUserId,
    startedByName || stage.responsibleUserName
  )

  const now = getNow()

  const updatedStage = {
    ...stage,
    status: 'in_progress',
    startedAt: stage.startedAt || now,
    startedById: stage.startedById || user.id,
    startedByName: stage.startedByName || user.name
  }

  const updatedStages = workflow.stages.map((item) =>
    item.id === stageId ? updatedStage : item
  )

  const updatedWorkflow = {
    ...workflow,
    status: 'in_progress',
    currentStageOrder: stage.order,
    stages: updatedStages,
    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    stage: updatedStage
  }
}

export function saveEvaluationAnswer({
  workflowId,
  stageId,
  questionId,
  answer,
  comment = ''
}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  const stage = workflow.stages.find((item) => item.id === stageId)

  if (!stage) {
    return {
      success: false,
      message: 'Etapa não encontrada.'
    }
  }

  if (stage.status === 'locked') {
    return {
      success: false,
      message: 'Esta etapa ainda está bloqueada.'
    }
  }

  if (stage.status === 'completed') {
    return {
      success: false,
      message: 'Esta etapa já foi concluída.'
    }
  }

  const question = stage.questions.find(
    (item) => item.questionId === questionId
  )

  if (!question) {
    return {
      success: false,
      message: 'Pergunta não encontrada.'
    }
  }

  const updatedQuestions = stage.questions.map((item) =>
    item.questionId === questionId
      ? {
          ...item,
          answer,
          comment,
          answeredAt: getNow()
        }
      : item
  )

  const updatedStage = {
    ...stage,
    questions: updatedQuestions
  }

  const updatedWorkflow = {
    ...workflow,
    stages: workflow.stages.map((item) =>
      item.id === stageId ? updatedStage : item
    ),
    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    stage: updatedStage
  }
}

export function validateEvaluationStage(stage) {
  if (!stage) {
    return {
      valid: false,
      unanswered: []
    }
  }

  const unanswered = stage.questions.filter(
    (question) =>
      question.required &&
      (question.answer === '' ||
        question.answer === null ||
        question.answer === undefined)
  )

  return {
    valid: unanswered.length === 0,
    unanswered
  }
}

export function completeEvaluationStage(
  workflowId,
  stageId,
  completedById = '',
  completedByName = ''
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  const stage = workflow.stages.find((item) => item.id === stageId)

  if (!stage) {
    return {
      success: false,
      message: 'Etapa não encontrada.'
    }
  }

  if (stage.status !== 'in_progress') {
    return {
      success: false,
      message: 'A etapa precisa estar em andamento para ser concluída.'
    }
  }

  const validation = validateEvaluationStage(stage)

  if (!validation.valid) {
    return {
      success: false,
      message: 'Existem perguntas obrigatórias sem resposta.',
      unanswered: validation.unanswered
    }
  }

  /*
   * A etapa não pode ser concluída sem assinatura.
   */
  if (!stage.signature) {
    return {
      success: false,
      message: 'A assinatura digital é obrigatória antes de concluir a etapa.'
    }
  }

  /*
   * Calcula o resultado da etapa no momento da conclusão.
   */
  const scoreResult = calculateScoreResult(stage.questions)

  const user = normalizeUser(
    completedById || stage.startedById || stage.responsibleUserId,
    completedByName || stage.startedByName || stage.responsibleUserName
  )

  const now = getNow()

  const updatedStage = {
    ...stage,
    status: 'completed',
    completedAt: now,
    completedById: user.id,
    completedByName: user.name,

    totalScore: scoreResult.totalScore,
    answeredQuestions: scoreResult.answeredQuestions,
    averageScore: scoreResult.averageScore
  }

  const updatedStages = workflow.stages.map((item) =>
    item.id === stageId ? updatedStage : item
  )

  const nextStage = updatedStages.find((item) => item.status === 'locked')

  let finalStages = updatedStages

  if (nextStage) {
    finalStages = updatedStages.map((item) =>
      item.id === nextStage.id
        ? {
            ...item,
            status: 'pending'
          }
        : item
    )
  }

  const allStagesCompleted = finalStages.every(
    (item) => item.status === 'completed'
  )

  /*
   * Calcula a média geral das etapas normais.
   *
   * O 180° não participa deste cálculo.
   */
  const regularResult = calculateRegularEvaluationResult({
    ...workflow,
    stages: finalStages
  })

  const updatedWorkflow = {
    ...workflow,

    stages: finalStages,

    currentStageOrder: nextStage ? nextStage.order : workflow.currentStageOrder,

    totalScore: regularResult.totalScore,

    answeredQuestions: regularResult.answeredQuestions,

    averageScore: regularResult.averageScore,

    updatedAt: now,

    pdi: allStagesCompleted
      ? {
          ...workflow.pdi,
          status:
            workflow.pdi.status === 'locked' ? 'pending' : workflow.pdi.status
        }
      : workflow.pdi
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    nextStage: nextStage || null,
    pdiUnlocked: allStagesCompleted
  }
}

export function isPdiUnlocked(workflow) {
  if (!workflow?.pdi) {
    return false
  }

  return (
    workflow.pdi.status === 'pending' ||
    workflow.pdi.status === 'in_progress' ||
    workflow.pdi.status === 'completed'
  )
}

export function startEvaluationPdi(
  workflowId,
  startedById = '',
  startedByName = ''
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (!isPdiUnlocked(workflow)) {
    return {
      success: false,
      message: 'O PDI ainda está bloqueado.'
    }
  }

  if (workflow.pdi.status === 'completed') {
    return {
      success: false,
      message: 'O PDI já foi concluído.'
    }
  }

  const now = getNow()

  const user = normalizeUser(
    startedById || workflow.pdi.responsibleUserId,
    startedByName || workflow.pdi.responsibleUserName
  )

  const updatedPdi = {
    ...workflow.pdi,
    status: 'in_progress',
    startedAt: workflow.pdi.startedAt || now,
    startedById: workflow.pdi.startedById || user.id,
    startedByName: workflow.pdi.startedByName || user.name
  }

  const updatedWorkflow = {
    ...workflow,
    pdi: updatedPdi,
    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    pdi: updatedPdi
  }
}

export function saveEvaluationPdiAnswer({
  workflowId,
  questionId,
  answer,
  comment = ''
}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (!isPdiUnlocked(workflow)) {
    return {
      success: false,
      message: 'O PDI ainda está bloqueado.'
    }
  }

  if (workflow.pdi.status === 'completed') {
    return {
      success: false,
      message: 'O PDI já foi concluído.'
    }
  }

  const question = workflow.pdi.questions.find(
    (item) => item.questionId === questionId
  )

  if (!question) {
    return {
      success: false,
      message: 'Pergunta do PDI não encontrada.'
    }
  }

  const updatedQuestions = workflow.pdi.questions.map((item) =>
    item.questionId === questionId
      ? {
          ...item,
          answer,
          comment,
          answeredAt: getNow()
        }
      : item
  )

  const updatedPdi = {
    ...workflow.pdi,
    questions: updatedQuestions,
    status:
      workflow.pdi.status === 'pending' ? 'in_progress' : workflow.pdi.status
  }

  const updatedWorkflow = {
    ...workflow,
    pdi: updatedPdi,
    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    pdi: updatedPdi
  }
}

export function validateEvaluationPdi(pdi) {
  if (!pdi) {
    return {
      valid: false,
      unanswered: []
    }
  }

  const unanswered = pdi.questions.filter(
    (question) =>
      question.required &&
      (question.answer === '' ||
        question.answer === null ||
        question.answer === undefined)
  )

  return {
    valid: unanswered.length === 0,
    unanswered
  }
}

export function completeEvaluationPdi(
  workflowId,
  completedById = '',
  completedByName = ''
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (!isPdiUnlocked(workflow)) {
    return {
      success: false,
      message: 'O PDI ainda está bloqueado.'
    }
  }

  if (workflow.pdi.status !== 'in_progress') {
    return {
      success: false,
      message: 'O PDI precisa estar em andamento para ser concluído.'
    }
  }

  const validation = validateEvaluationPdi(workflow.pdi)

  if (!validation.valid) {
    return {
      success: false,
      message: 'Existem perguntas obrigatórias do PDI sem resposta.',
      unanswered: validation.unanswered
    }
  }

  /*
   * O PDI faz parte do documento formal da avaliação.
   * Portanto, a assinatura é obrigatória.
   */
  if (!workflow.pdi.signature) {
    return {
      success: false,
      message: 'A assinatura digital do PDI é obrigatória antes de concluir.'
    }
  }

  const now = getNow()

  const user = normalizeUser(
    completedById || workflow.pdi.startedById || workflow.pdi.responsibleUserId,

    completedByName ||
      workflow.pdi.startedByName ||
      workflow.pdi.responsibleUserName
  )

  const updatedPdi = {
    ...workflow.pdi,
    status: 'completed',
    completedAt: now,
    completedById: user.id,
    completedByName: user.name
  }

  let updated180 = workflow.evaluation180
  let workflowStatus = workflow.status
  let completedAt = workflow.completedAt

  if (workflow.evaluation180?.enabled) {
    updated180 = {
      ...workflow.evaluation180,
      status: 'pending'
    }
  } else {
    workflowStatus = 'completed'
    completedAt = now
  }

  const updatedWorkflow = {
    ...workflow,
    status: workflowStatus,
    completedAt,
    pdi: updatedPdi,
    evaluation180: updated180,
    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    evaluation180Unlocked: workflow.evaluation180?.enabled === true
  }
}

export function isEvaluation180Unlocked(workflow) {
  return (
    workflow?.evaluation180?.enabled === true &&
    (workflow.evaluation180.status === 'pending' ||
      workflow.evaluation180.status === 'in_progress' ||
      workflow.evaluation180.status === 'completed')
  )
}

export function startEvaluation180(
  workflowId,
  startedById = '',
  startedByName = ''
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (!workflow.evaluation180?.enabled) {
    return {
      success: false,
      message: 'A avaliação 180° não está habilitada.'
    }
  }

  if (!isEvaluation180Unlocked(workflow)) {
    return {
      success: false,
      message: 'A avaliação 180° ainda está bloqueada.'
    }
  }

  if (workflow.evaluation180.status === 'completed') {
    return {
      success: false,
      message: 'A avaliação 180° já foi concluída.'
    }
  }

  const now = getNow()

  const updated180 = {
    ...workflow.evaluation180,

    status: 'in_progress',

    startedAt: workflow.evaluation180.startedAt || now,

    startedById:
      workflow.evaluation180.startedById || startedById || workflow.employeeId,

    startedByName:
      workflow.evaluation180.startedByName ||
      startedByName ||
      workflow.employeeName
  }

  const updatedWorkflow = {
    ...workflow,
    evaluation180: updated180,
    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    evaluation180: updated180
  }
}

export function saveEvaluation180Answer({
  workflowId,
  questionId,
  answer,
  comment = ''
}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (!isEvaluation180Unlocked(workflow)) {
    return {
      success: false,
      message: 'A avaliação 180° ainda está bloqueada.'
    }
  }

  if (workflow.evaluation180.status === 'completed') {
    return {
      success: false,
      message: 'A avaliação 180° já foi concluída.'
    }
  }

  const question = workflow.evaluation180.questions.find(
    (item) => item.questionId === questionId
  )

  if (!question) {
    return {
      success: false,
      message: 'Pergunta da avaliação 180° não encontrada.'
    }
  }

  const updatedQuestions = workflow.evaluation180.questions.map((item) =>
    item.questionId === questionId
      ? {
          ...item,
          answer,
          comment,
          answeredAt: getNow()
        }
      : item
  )

  const updated180 = {
    ...workflow.evaluation180,

    questions: updatedQuestions,

    status:
      workflow.evaluation180.status === 'pending'
        ? 'in_progress'
        : workflow.evaluation180.status,

    startedAt: workflow.evaluation180.startedAt || getNow(),

    startedById: workflow.evaluation180.startedById || workflow.employeeId,

    startedByName: workflow.evaluation180.startedByName || workflow.employeeName
  }

  const updatedWorkflow = {
    ...workflow,
    evaluation180: updated180,
    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    evaluation180: updated180
  }
}

export function validateEvaluation180(evaluation180) {
  if (!evaluation180) {
    return {
      valid: false,
      unanswered: []
    }
  }

  const unanswered = evaluation180.questions.filter(
    (question) =>
      question.required &&
      (question.answer === '' ||
        question.answer === null ||
        question.answer === undefined)
  )

  return {
    valid: unanswered.length === 0,
    unanswered
  }
}

export function completeEvaluation180(
  workflowId,
  completedById = '',
  completedByName = ''
) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (!workflow.evaluation180?.enabled) {
    return {
      success: false,
      message: 'A avaliação 180° não está habilitada.'
    }
  }

  if (!isEvaluation180Unlocked(workflow)) {
    return {
      success: false,
      message: 'A avaliação 180° ainda está bloqueada.'
    }
  }

  if (workflow.evaluation180.status !== 'in_progress') {
    return {
      success: false,
      message: 'A avaliação 180° precisa estar em andamento para ser concluída.'
    }
  }

  const validation = validateEvaluation180(workflow.evaluation180)

  if (!validation.valid) {
    return {
      success: false,
      message: 'Existem perguntas obrigatórias da avaliação 180° sem resposta.',
      unanswered: validation.unanswered
    }
  }

  /*
   * O funcionário precisa assinar o 180°
   * antes da conclusão.
   */
  if (!workflow.evaluation180.signature) {
    return {
      success: false,
      message:
        'A assinatura digital é obrigatória antes de concluir a avaliação 180°.'
    }
  }

  const scoreResult = calculateScoreResult(workflow.evaluation180.questions)

  const now = getNow()

  const updated180 = {
    ...workflow.evaluation180,

    status: 'completed',

    completedAt: now,

    completedById:
      completedById ||
      workflow.evaluation180.startedById ||
      workflow.employeeId,

    completedByName:
      completedByName ||
      workflow.evaluation180.startedByName ||
      workflow.employeeName,

    totalScore: scoreResult.totalScore,

    answeredQuestions: scoreResult.answeredQuestions,

    averageScore: scoreResult.averageScore
  }

  const updatedWorkflow = {
    ...workflow,

    status: 'completed',

    completedAt: now,

    evaluation180: updated180,

    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    evaluation180: updated180
  }
}

/*
 * ============================================================
 * ASSINATURA DA ETAPA
 * ============================================================
 */

export function saveEvaluationStageSignature({
  workflowId,
  stageId,
  signature,
  signedById = '',
  signedByName = ''
}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  const stage = workflow.stages.find((item) => item.id === stageId)

  if (!stage) {
    return {
      success: false,
      message: 'Etapa não encontrada.'
    }
  }

  if (stage.status !== 'in_progress') {
    return {
      success: false,
      message: 'A etapa precisa estar em andamento.'
    }
  }

  if (!signature) {
    return {
      success: false,
      message: 'A assinatura é obrigatória.'
    }
  }

  const now = getNow()

  const updatedStage = {
    ...stage,

    signature,

    signedById: signedById || stage.startedById || stage.responsibleUserId,

    signedByName:
      signedByName || stage.startedByName || stage.responsibleUserName,

    signedAt: now
  }

  const updatedWorkflow = {
    ...workflow,

    stages: workflow.stages.map((item) =>
      item.id === stageId ? updatedStage : item
    ),

    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    stage: updatedStage
  }
}

/*
 * ============================================================
 * ASSINATURA DO PDI
 * ============================================================
 */

export function saveEvaluationPdiSignature({
  workflowId,
  signature,
  signedById = '',
  signedByName = ''
}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (workflow.pdi?.status !== 'in_progress') {
    return {
      success: false,
      message: 'O PDI precisa estar em andamento.'
    }
  }

  if (!signature) {
    return {
      success: false,
      message: 'A assinatura do PDI é obrigatória.'
    }
  }

  const now = getNow()

  const updatedPdi = {
    ...workflow.pdi,

    signature,

    signedById:
      signedById || workflow.pdi.startedById || workflow.pdi.responsibleUserId,

    signedByName:
      signedByName ||
      workflow.pdi.startedByName ||
      workflow.pdi.responsibleUserName,

    signedAt: now
  }

  const updatedWorkflow = {
    ...workflow,

    pdi: updatedPdi,

    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    pdi: updatedPdi
  }
}

/*
 * ============================================================
 * ASSINATURA DO 180°
 * ============================================================
 */

export function saveEvaluation180Signature({
  workflowId,
  signature,
  signedById = '',
  signedByName = ''
}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (!workflow.evaluation180?.enabled) {
    return {
      success: false,
      message: 'A avaliação 180° não está habilitada.'
    }
  }

  if (workflow.evaluation180.status !== 'in_progress') {
    return {
      success: false,
      message: 'A avaliação 180° precisa estar em andamento.'
    }
  }

  if (!signature) {
    return {
      success: false,
      message: 'A assinatura é obrigatória.'
    }
  }

  const now = getNow()

  const updated180 = {
    ...workflow.evaluation180,

    signature,

    signedById:
      signedById || workflow.evaluation180.startedById || workflow.employeeId,

    signedByName:
      signedByName ||
      workflow.evaluation180.startedByName ||
      workflow.employeeName,

    signedAt: now
  }

  const updatedWorkflow = {
    ...workflow,

    evaluation180: updated180,

    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    evaluation180: updated180
  }
}

/*
 * ============================================================
 * RESULTADO DAS ETAPAS NORMAIS
 * ============================================================
 *
 * O 180° não entra aqui.
 *
 * Esta média é a que poderá ser visualizada pelos responsáveis
 * da avaliação e utilizada nas conversas de feedback.
 * ============================================================
 */

export function calculateRegularEvaluationResult(workflow) {
  if (!workflow || !Array.isArray(workflow.stages)) {
    return {
      totalScore: 0,
      answeredQuestions: 0,
      averageScore: 0
    }
  }

  const result = workflow.stages.reduce(
    (accumulator, stage) => {
      accumulator.totalScore += Number(stage.totalScore || 0)

      accumulator.answeredQuestions += Number(stage.answeredQuestions || 0)

      return accumulator
    },
    {
      totalScore: 0,
      answeredQuestions: 0
    }
  )

  return {
    ...result,

    averageScore:
      result.answeredQuestions > 0
        ? Number((result.totalScore / result.answeredQuestions).toFixed(2))
        : 0
  }
}

/*
 * ============================================================
 * RESULTADO DO 180°
 * ============================================================
 *
 * Deve ser utilizado somente por telas que possuem permissão
 * para visualizar os dados confidenciais do 180°.
 * ============================================================
 */

export function calculateEvaluation180Result(workflow) {
  if (!workflow?.evaluation180) {
    return {
      totalScore: 0,
      answeredQuestions: 0,
      averageScore: 0
    }
  }

  return calculateScoreResult(workflow.evaluation180.questions || [])
}

/*
 * ============================================================
 * ENVIO DO FEEDBACK DO PDI PARA O FUNCIONÁRIO
 * ============================================================
 */

export function sendPdiEmployeeFeedback(workflowId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (workflow.pdi?.status !== 'completed') {
    return {
      success: false,
      message: 'O PDI precisa estar concluído antes do envio.'
    }
  }

  const positiveQuestion = workflow.pdi.questions.find(
    (question) => question.questionId === 'pdi-positive'
  )

  const negativeQuestion = workflow.pdi.questions.find(
    (question) => question.questionId === 'pdi-negative'
  )

  const employeeFeedback = {
    positivePoints: positiveQuestion?.answer || '',

    negativePoints: negativeQuestion?.answer || '',

    sent: true,

    sentAt: getNow()
  }

  const updatedWorkflow = {
    ...workflow,

    pdi: {
      ...workflow.pdi,
      employeeFeedback
    },

    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow,
    employeeFeedback
  }
}

/*
 * ============================================================
 * CANCELAR AVALIAÇÃO
 * ============================================================
 */

export function cancelEvaluationWorkflow(workflowId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      message: 'Avaliação não encontrada.'
    }
  }

  if (workflow.status === 'completed') {
    return {
      success: false,
      message: 'Uma avaliação concluída não pode ser cancelada.'
    }
  }

  const updatedWorkflow = {
    ...workflow,

    status: 'cancelled',

    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,
    workflow: updatedWorkflow
  }
}

/*
 * ============================================================
 * PROGRESSO DA AVALIAÇÃO
 * ============================================================
 */

export function calculateEvaluationProgress(workflow) {
  if (!workflow || !Array.isArray(workflow.stages)) {
    return {
      completedStages: 0,
      totalStages: 0,
      percentage: 0
    }
  }

  const totalStages = workflow.stages.length

  const completedStages = workflow.stages.filter(
    (stage) => stage.status === 'completed'
  ).length

  const percentage =
    totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0

  return {
    completedStages,
    totalStages,
    percentage
  }
}

/*
 * ============================================================
 * DURAÇÃO DE UMA ETAPA
 * ============================================================
 */

export function calculateStageDuration(stage) {
  if (!stage?.startedAt) {
    return {
      minutes: 0,
      hours: 0,
      days: 0
    }
  }

  const start = new Date(stage.startedAt).getTime()

  const end = stage.completedAt
    ? new Date(stage.completedAt).getTime()
    : Date.now()

  const milliseconds = Math.max(0, end - start)

  const minutes = Math.floor(milliseconds / 60000)

  return {
    minutes,

    hours: Number((minutes / 60).toFixed(2)),

    days: Number((minutes / 1440).toFixed(2))
  }
}

/*
 * ============================================================
 * DURAÇÃO TOTAL DA AVALIAÇÃO
 * ============================================================
 */

export function calculateEvaluationDuration(workflow) {
  if (!workflow?.createdAt) {
    return {
      minutes: 0,
      hours: 0,
      days: 0
    }
  }

  const start = new Date(workflow.createdAt).getTime()

  const end = workflow.completedAt
    ? new Date(workflow.completedAt).getTime()
    : Date.now()

  const milliseconds = Math.max(0, end - start)

  const minutes = Math.floor(milliseconds / 60000)

  return {
    minutes,

    hours: Number((minutes / 60).toFixed(2)),

    days: Number((minutes / 1440).toFixed(2))
  }
}

/*
 * ============================================================
 * MÉTRICAS DAS AVALIAÇÕES
 * ============================================================
 */

export function calculateEvaluationMetrics(workflows = []) {
  const completedWorkflows = workflows.filter(
    (workflow) => workflow.status === 'completed'
  )

  const totalEvaluations = workflows.length

  const completedEvaluations = completedWorkflows.length

  let totalDurationMinutes = 0

  completedWorkflows.forEach((workflow) => {
    totalDurationMinutes += calculateEvaluationDuration(workflow).minutes
  })

  const averageDurationMinutes =
    completedEvaluations > 0 ? totalDurationMinutes / completedEvaluations : 0

  const responsibleMap = {}
  const branchMap = {}

  workflows.forEach((workflow) => {
    const branchKey =
      workflow.branchId || workflow.branchName || 'without-branch'

    if (!branchMap[branchKey]) {
      branchMap[branchKey] = {
        branchId: workflow.branchId || '',

        branchName: workflow.branchName || 'Sem filial',

        stages: 0,

        completedStages: 0,

        totalMinutes: 0
      }
    }

    workflow.stages?.forEach((stage) => {
      const responsibleKey =
        stage.responsibleUserId ||
        stage.responsibleUserName ||
        stage.responsibleType ||
        'without-responsible'

      const responsibleName =
        stage.responsibleUserName ||
        stage.responsibleType ||
        'Responsável não informado'

      if (!responsibleMap[responsibleKey]) {
        responsibleMap[responsibleKey] = {
          responsibleId: stage.responsibleUserId || '',

          responsibleName,

          stages: 0,

          completedStages: 0,

          totalMinutes: 0
        }
      }

      responsibleMap[responsibleKey].stages += 1

      branchMap[branchKey].stages += 1

      if (stage.status === 'completed') {
        const duration = calculateStageDuration(stage)

        responsibleMap[responsibleKey].completedStages += 1

        responsibleMap[responsibleKey].totalMinutes += duration.minutes

        branchMap[branchKey].completedStages += 1

        branchMap[branchKey].totalMinutes += duration.minutes
      }
    })
  })

  const byResponsible = Object.values(responsibleMap).map((item) => ({
    ...item,

    averageMinutes:
      item.completedStages > 0
        ? Number((item.totalMinutes / item.completedStages).toFixed(2))
        : 0
  }))

  const byBranch = Object.values(branchMap).map((item) => ({
    ...item,

    averageMinutes:
      item.completedStages > 0
        ? Number((item.totalMinutes / item.completedStages).toFixed(2))
        : 0
  }))

  /*
   * Resultado geral das avaliações normais.
   *
   * O 180° fica separado e não é incluído.
   */
  const regularResults = workflows
    .map((workflow) => calculateRegularEvaluationResult(workflow))
    .filter((result) => result.answeredQuestions > 0)

  const totalRegularScore = regularResults.reduce(
    (total, result) => total + result.totalScore,
    0
  )

  const totalRegularAnswers = regularResults.reduce(
    (total, result) => total + result.answeredQuestions,
    0
  )

  const averageRegularScore =
    totalRegularAnswers > 0
      ? Number((totalRegularScore / totalRegularAnswers).toFixed(2))
      : 0

  return {
    totalEvaluations,

    completedEvaluations,

    averageDurationMinutes: Number(averageDurationMinutes.toFixed(2)),

    averageRegularScore,

    byResponsible,

    byBranch
  }
}

/*
 * ============================================================
 * SALVAR WORKFLOW
 * ============================================================
 */

export function saveWorkflow(workflow) {
  const workflows = getEvaluationWorkflows()

  const existingIndex = workflows.findIndex((item) => item.id === workflow.id)

  if (existingIndex === -1) {
    setStored(STORAGE_KEY, [...workflows, workflow])

    return workflow
  }

  const updatedWorkflows = [...workflows]

  updatedWorkflows[existingIndex] = {
    ...workflow,

    updatedAt: getNow()
  }

  setStored(STORAGE_KEY, updatedWorkflows)

  return updatedWorkflows[existingIndex]
}
