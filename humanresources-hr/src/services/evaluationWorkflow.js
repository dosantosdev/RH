import { getStoredArray, setStored } from './storage'

import { getEvaluationModelById } from './evaluationModels'

const STORAGE_KEY = 'evaluationWorkflows'

export const EVALUATION_WORKFLOW_STATUSES = [
  {
    value: 'draft',
    label: 'Rascunho'
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

export const EVALUATION_STAGE_STATUSES = [
  {
    value: 'locked',
    label: 'Bloqueada'
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
  }
]

function generateId(prefix = 'evaluation') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getNow() {
  return new Date().toISOString()
}

/*
 * ============================================================
 * BUSCAR
 * ============================================================
 */

export function getEvaluationWorkflows() {
  return getStoredArray(STORAGE_KEY)
}

export function getEvaluationWorkflowById(workflowId) {
  return getEvaluationWorkflows().find(
    (workflow) => String(workflow.id) === String(workflowId)
  )
}

export function getEmployeeEvaluationWorkflows(employeeId) {
  return getEvaluationWorkflows().filter(
    (workflow) => Number(workflow.employeeId) === Number(employeeId)
  )
}

/*
 * ============================================================
 * CRIAR RESPOSTA
 * ============================================================
 */

function createQuestionAnswer(question) {
  return {
    questionId: question.id,

    questionText: question.text || '',

    questionType: question.type || 'scale',

    required: question.required !== false,

    answer: '',

    comment: '',

    answeredAt: null
  }
}

/*
 * ============================================================
 * CRIAR ETAPA
 * ============================================================
 */

function createWorkflowStage(modelStage, index) {
  return {
    id: generateId('workflow-stage'),

    modelStageId: modelStage.id,

    order: index + 1,

    name: modelStage.name || `Etapa ${index + 1}`,

    description: modelStage.description || '',

    responsibleType: modelStage.responsibleType || 'specific_user',

    responsibleUserId: modelStage.responsibleUserId || '',

    responsibleUserName: modelStage.responsibleUserName || '',

    status: index === 0 ? 'pending' : 'locked',

    startedAt: null,

    completedAt: null,

    questions: (modelStage.questions || []).map(createQuestionAnswer)
  }
}

/*
 * ============================================================
 * CRIAR PDI
 * ============================================================
 */

function createWorkflowPdi(model) {
  return {
    status: 'locked',

    startedAt: null,

    completedAt: null,

    /*
     * O sistema restringe o PDI a:
     * gerente da filial OU supervisor do setor.
     */
    responsibleType: 'manager_or_supervisor',

    responsibleUserId: '',

    responsibleUserName: '',

    questions: (model.pdiQuestions || []).map((question) => ({
      questionId: question.id,

      questionText: question.text || '',

      required: question.required !== false,

      answer: '',

      answeredAt: null
    })),

    employeeFeedback: {
      positivePoints: '',
      negativePoints: '',
      sent: false,
      sentAt: null
    }
  }
}

/*
 * ============================================================
 * CRIAR 180°
 * ============================================================
 */

function createWorkflow180(model) {
  const enabled = model.evaluation180?.enabled === true

  return {
    enabled,

    status: enabled ? 'locked' : 'disabled',

    startedAt: null,

    completedAt: null,

    responsibleType: 'employee',

    questions: (model.evaluation180?.questions || []).map(createQuestionAnswer)
  }
}

/*
 * ============================================================
 * CRIAR WORKFLOW
 * ============================================================
 */

export function createEvaluationWorkflow({
  employeeId,
  employeeName = '',
  branchId = '',
  branchName = '',
  modelId,
  startDate = '',
  endDate = '',
  createdBy = '',
  createdByName = ''
} = {}) {
  const model = getEvaluationModelById(modelId)

  if (!model) {
    throw new Error('Modelo de avaliação não encontrado.')
  }

  if (!employeeId) {
    throw new Error('Selecione um funcionário.')
  }

  if (!modelId) {
    throw new Error('Selecione um modelo de avaliação.')
  }

  if (!Array.isArray(model.stages) || model.stages.length === 0) {
    throw new Error('O modelo não possui etapas configuradas.')
  }

  const now = getNow()

  const workflow = {
    id: generateId('evaluation'),

    modelId: model.id,

    modelName: model.name,

    modelType: model.type,

    employeeId,

    employeeName,

    branchId,

    branchName,

    startDate,

    endDate,

    status: 'in_progress',

    currentStageOrder: 1,

    stages: model.stages.map(createWorkflowStage),

    pdi: createWorkflowPdi(model),

    evaluation180: createWorkflow180(model),

    createdBy,

    createdByName,

    createdAt: now,

    updatedAt: now,

    completedAt: null
  }

  const workflows = getEvaluationWorkflows()

  setStored(STORAGE_KEY, [...workflows, workflow])

  return workflow
}

/*
 * ============================================================
 * ETAPA ATUAL
 * ============================================================
 */

export function getCurrentEvaluationStage(workflow) {
  if (!workflow) {
    return null
  }

  return (
    workflow.stages?.find(
      (stage) => stage.status === 'pending' || stage.status === 'in_progress'
    ) || null
  )
}

/*
 * ============================================================
 * VERIFICAR ETAPA
 * ============================================================
 */

export function isEvaluationStageUnlocked(workflow, stageId) {
  if (!workflow) {
    return false
  }

  const stageIndex = workflow.stages?.findIndex(
    (stage) => String(stage.id) === String(stageId)
  )

  if (stageIndex === undefined || stageIndex < 0) {
    return false
  }

  if (stageIndex === 0) {
    return true
  }

  const previousStage = workflow.stages[stageIndex - 1]

  return previousStage?.status === 'completed'
}

/*
 * ============================================================
 * INICIAR ETAPA
 * ============================================================
 */

export function startEvaluationStage(workflowId, stageId) {
  const workflows = getEvaluationWorkflows()

  const workflow = workflows.find(
    (item) => String(item.id) === String(workflowId)
  )

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  if (!isEvaluationStageUnlocked(workflow, stageId)) {
    return {
      success: false,
      error:
        'Esta etapa está bloqueada. A etapa anterior precisa ser concluída primeiro.'
    }
  }

  const stage = workflow.stages.find(
    (item) => String(item.id) === String(stageId)
  )

  if (!stage) {
    return {
      success: false,
      error: 'Etapa não encontrada.'
    }
  }

  if (stage.status === 'completed') {
    return {
      success: false,
      error: 'Esta etapa já foi concluída.'
    }
  }

  const now = getNow()

  const updatedStage = {
    ...stage,

    status: 'in_progress',

    startedAt: stage.startedAt || now
  }

  const updatedWorkflow = {
    ...workflow,

    status: 'in_progress',

    stages: workflow.stages.map((item) =>
      String(item.id) === String(stageId) ? updatedStage : item
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
 * SALVAR RESPOSTA
 * ============================================================
 */

export function saveEvaluationAnswer({
  workflowId,
  stageId,
  questionId,
  answer,
  comment = ''
} = {}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  const stage = workflow.stages?.find(
    (item) => String(item.id) === String(stageId)
  )

  if (!stage) {
    return {
      success: false,
      error: 'Etapa não encontrada.'
    }
  }

  if (stage.status === 'locked') {
    return {
      success: false,
      error: 'Esta etapa ainda está bloqueada.'
    }
  }

  if (stage.status === 'completed') {
    return {
      success: false,
      error: 'Esta etapa já foi concluída.'
    }
  }

  const now = getNow()

  const updatedStage = {
    ...stage,

    questions: stage.questions.map((question) =>
      String(question.questionId) === String(questionId)
        ? {
            ...question,

            answer,

            comment,

            answeredAt: now
          }
        : question
    )
  }

  const updatedWorkflow = {
    ...workflow,

    stages: workflow.stages.map((item) =>
      String(item.id) === String(stageId) ? updatedStage : item
    ),

    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,

    workflow: updatedWorkflow
  }
}

/*
 * ============================================================
 * VALIDAR ETAPA
 * ============================================================
 */

export function validateEvaluationStage(stage) {
  const unanswered = (stage?.questions || []).filter(
    (question) =>
      question.required !== false &&
      (question.answer === '' ||
        question.answer === null ||
        question.answer === undefined)
  )

  return {
    valid: unanswered.length === 0,

    unanswered
  }
}

/*
 * ============================================================
 * CONCLUIR ETAPA
 * ============================================================
 */

export function completeEvaluationStage(workflowId, stageId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  const stageIndex = workflow.stages.findIndex(
    (stage) => String(stage.id) === String(stageId)
  )

  if (stageIndex < 0) {
    return {
      success: false,
      error: 'Etapa não encontrada.'
    }
  }

  const stage = workflow.stages[stageIndex]

  if (stage.status !== 'in_progress') {
    return {
      success: false,
      error: 'A etapa precisa estar em andamento para ser concluída.'
    }
  }

  const validation = validateEvaluationStage(stage)

  if (!validation.valid) {
    return {
      success: false,

      error: 'Existem perguntas obrigatórias sem resposta.',

      unanswered: validation.unanswered
    }
  }

  const now = getNow()

  const updatedStages = workflow.stages.map((item, index) => {
    if (index === stageIndex) {
      return {
        ...item,

        status: 'completed',

        completedAt: now
      }
    }

    if (index === stageIndex + 1 && item.status === 'locked') {
      return {
        ...item,

        status: 'pending'
      }
    }

    return item
  })

  const allStagesCompleted = updatedStages.every(
    (item) => item.status === 'completed'
  )

  const nextStage = updatedStages[stageIndex + 1]

  const updatedWorkflow = {
    ...workflow,

    stages: updatedStages,

    currentStageOrder: nextStage ? nextStage.order : workflow.currentStageOrder,

    updatedAt: now
  }

  if (allStagesCompleted) {
    updatedWorkflow.pdi = {
      ...updatedWorkflow.pdi,

      status: 'pending'
    }
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,

    workflow: updatedWorkflow,

    nextStage: nextStage || null,

    pdiUnlocked: allStagesCompleted
  }
}

/*
 * ============================================================
 * PDI
 * ============================================================
 */

export function isPdiUnlocked(workflow) {
  return (
    workflow?.pdi?.status === 'pending' || workflow?.pdi?.status === 'completed'
  )
}

export function startEvaluationPdi(workflowId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  if (!isPdiUnlocked(workflow)) {
    return {
      success: false,
      error: 'O PDI ainda está bloqueado.'
    }
  }

  const updatedWorkflow = {
    ...workflow,

    pdi: {
      ...workflow.pdi,

      startedAt: workflow.pdi.startedAt || getNow()
    },

    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,

    workflow: updatedWorkflow
  }
}

export function saveEvaluationPdiAnswer({
  workflowId,
  questionId,
  answer
} = {}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  if (!isPdiUnlocked(workflow)) {
    return {
      success: false,
      error: 'O PDI ainda está bloqueado.'
    }
  }

  const updatedWorkflow = {
    ...workflow,

    pdi: {
      ...workflow.pdi,

      questions: workflow.pdi.questions.map((question) =>
        String(question.questionId) === String(questionId)
          ? {
              ...question,

              answer,

              answeredAt: getNow()
            }
          : question
      )
    },

    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,

    workflow: updatedWorkflow
  }
}

export function completeEvaluationPdi(workflowId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  if (!isPdiUnlocked(workflow)) {
    return {
      success: false,
      error: 'O PDI ainda está bloqueado.'
    }
  }

  const unanswered = (workflow.pdi?.questions || []).filter(
    (question) =>
      question.required !== false && !String(question.answer || '').trim()
  )

  if (unanswered.length > 0) {
    return {
      success: false,

      error: 'Existem perguntas do PDI sem resposta.',

      unanswered
    }
  }

  const now = getNow()

  const updatedWorkflow = {
    ...workflow,

    pdi: {
      ...workflow.pdi,

      status: 'completed',

      completedAt: now
    },

    updatedAt: now
  }

  /*
   * Depois do PDI, libera o 180° caso esteja ativado.
   */
  if (updatedWorkflow.evaluation180?.enabled) {
    updatedWorkflow.evaluation180 = {
      ...updatedWorkflow.evaluation180,

      status: 'pending'
    }
  } else {
    updatedWorkflow.status = 'completed'

    updatedWorkflow.completedAt = now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,

    workflow: updatedWorkflow
  }
}

/*
 * ============================================================
 * 180°
 * ============================================================
 */

export function isEvaluation180Unlocked(workflow) {
  return (
    workflow?.evaluation180?.enabled === true &&
    workflow?.evaluation180?.status === 'pending'
  )
}

export function saveEvaluation180Answer({
  workflowId,
  questionId,
  answer,
  comment = ''
} = {}) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  if (!isEvaluation180Unlocked(workflow)) {
    return {
      success: false,
      error: 'A avaliação 180° ainda está bloqueada.'
    }
  }

  const updatedWorkflow = {
    ...workflow,

    evaluation180: {
      ...workflow.evaluation180,

      questions: workflow.evaluation180.questions.map((question) =>
        String(question.questionId) === String(questionId)
          ? {
              ...question,

              answer,

              comment,

              answeredAt: getNow()
            }
          : question
      )
    },

    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,

    workflow: updatedWorkflow
  }
}

export function completeEvaluation180(workflowId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  if (!isEvaluation180Unlocked(workflow)) {
    return {
      success: false,
      error: 'A avaliação 180° ainda está bloqueada.'
    }
  }

  const unanswered = (workflow.evaluation180?.questions || []).filter(
    (question) =>
      question.required !== false &&
      (question.answer === '' ||
        question.answer === null ||
        question.answer === undefined)
  )

  if (unanswered.length > 0) {
    return {
      success: false,

      error: 'Existem perguntas obrigatórias sem resposta.',

      unanswered
    }
  }

  const now = getNow()

  const updatedWorkflow = {
    ...workflow,

    evaluation180: {
      ...workflow.evaluation180,

      status: 'completed',

      completedAt: now
    },

    status: 'completed',

    completedAt: now,

    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,

    workflow: updatedWorkflow
  }
}

/*
 * ============================================================
 * FEEDBACK DO PDI
 * ============================================================
 */

export function sendPdiEmployeeFeedback(workflowId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return {
      success: false,
      error: 'Avaliação não encontrada.'
    }
  }

  if (workflow.pdi?.status !== 'completed') {
    return {
      success: false,
      error: 'O PDI ainda não foi concluído.'
    }
  }

  const positiveQuestion = workflow.pdi.questions.find(
    (question) => question.questionId === 'pdi-positive'
  )

  const negativeQuestion = workflow.pdi.questions.find(
    (question) => question.questionId === 'pdi-negative'
  )

  const now = getNow()

  const updatedWorkflow = {
    ...workflow,

    pdi: {
      ...workflow.pdi,

      employeeFeedback: {
        positivePoints: positiveQuestion?.answer || '',

        negativePoints: negativeQuestion?.answer || '',

        sent: true,

        sentAt: now
      }
    },

    updatedAt: now
  }

  saveWorkflow(updatedWorkflow)

  return {
    success: true,

    workflow: updatedWorkflow
  }
}

/*
 * ============================================================
 * CANCELAR
 * ============================================================
 */

export function cancelEvaluationWorkflow(workflowId) {
  const workflow = getEvaluationWorkflowById(workflowId)

  if (!workflow) {
    return null
  }

  const updatedWorkflow = {
    ...workflow,

    status: 'cancelled',

    updatedAt: getNow()
  }

  saveWorkflow(updatedWorkflow)

  return updatedWorkflow
}

/*
 * ============================================================
 * PROGRESSO
 * ============================================================
 */

export function calculateEvaluationProgress(workflow) {
  const totalStages = workflow?.stages?.length || 0

  const completedStages =
    workflow?.stages?.filter((stage) => stage.status === 'completed').length ||
    0

  return {
    completedStages,

    totalStages,

    percentage:
      totalStages === 0 ? 0 : Math.round((completedStages / totalStages) * 100)
  }
}

/*
 * ============================================================
 * DURAÇÃO DA ETAPA
 * ============================================================
 */

export function calculateStageDuration(stage) {
  if (!stage?.startedAt || !stage?.completedAt) {
    return null
  }

  const start = new Date(stage.startedAt).getTime()

  const end = new Date(stage.completedAt).getTime()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null
  }

  const minutes = (end - start) / (1000 * 60)

  return {
    minutes,

    hours: minutes / 60,

    days: minutes / 1440
  }
}

/*
 * ============================================================
 * DURAÇÃO TOTAL
 * ============================================================
 */

export function calculateEvaluationDuration(workflow) {
  if (!workflow?.createdAt) {
    return null
  }

  const start = new Date(workflow.createdAt).getTime()

  const end = workflow.completedAt
    ? new Date(workflow.completedAt).getTime()
    : Date.now()

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null
  }

  const minutes = (end - start) / (1000 * 60)

  return {
    minutes,

    hours: minutes / 60,

    days: minutes / 1440
  }
}

/*
 * ============================================================
 * SALVAR
 * ============================================================
 */

function saveWorkflow(workflow) {
  const workflows = getEvaluationWorkflows()

  const exists = workflows.some(
    (item) => String(item.id) === String(workflow.id)
  )

  const updatedWorkflows = exists
    ? workflows.map((item) =>
        String(item.id) === String(workflow.id) ? workflow : item
      )
    : [...workflows, workflow]

  setStored(STORAGE_KEY, updatedWorkflows)

  return workflow
}
