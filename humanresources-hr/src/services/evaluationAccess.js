import { getStoredArray } from './storage'

/*
 * ============================================================
 * NORMALIZAÇÃO
 * ============================================================
 */

function normalizeId(value) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function getUserId(user) {
  return normalizeId(user?.id || user?.userId)
}

function getEmployeeId(user) {
  return normalizeId(user?.employeeId)
}

function getUserName(user) {
  return user?.name || user?.username || user?.userName || ''
}

/*
 * ============================================================
 * USUÁRIOS
 * ============================================================
 */

function getUsers() {
  return getStoredArray('users')
}

function findUserById(userId) {
  const normalizedId = normalizeId(userId)

  if (!normalizedId) {
    return null
  }

  return (
    getUsers().find(
      (user) => normalizeId(user.id || user.userId) === normalizedId
    ) || null
  )
}

function findUserByName(userName) {
  const normalizedName = normalizeText(userName)

  if (!normalizedName) {
    return null
  }

  return (
    getUsers().find(
      (user) =>
        normalizeText(user.name || user.username || user.userName) ===
        normalizedName
    ) || null
  )
}

/*
 * ============================================================
 * PERFIL DE ACESSO
 * ============================================================
 */

function getUserRole(user) {
  if (!user) {
    return ''
  }

  return (
    user.accessRole ||
    user.accessRoleName ||
    user.role ||
    user.roleName ||
    user.permissionRole ||
    ''
  )
}

function getUserRoleNormalized(user) {
  return normalizeText(getUserRole(user))
}

/*
 * ============================================================
 * ADMIN / RH
 * ============================================================
 */

export function isAdmin(user) {
  const role = getUserRoleNormalized(user)

  return (
    role === 'admin' || role === 'administrador' || role === 'administrator'
  )
}

export function isRhManager(user) {
  const role = getUserRoleNormalized(user)

  return (
    role === 'gestao_rh' ||
    role === 'gestão rh' ||
    role === 'gestao de rh' ||
    role === 'gestão de rh' ||
    role === 'gestao de pessoas' ||
    role === 'gestão de pessoas' ||
    role === 'rh' ||
    role === 'recursos humanos'
  )
}

export function canManageEvaluations(user) {
  return isAdmin(user) || isRhManager(user)
}

/*
 * ============================================================
 * FUNCIONÁRIO AVALIADO
 * ============================================================
 *
 * ATENÇÃO:
 *
 * O workflow guarda o ID do FUNCIONÁRIO.
 *
 * O usuário logado possui:
 *
 * user.id
 * user.employeeId
 *
 * Portanto:
 *
 * workflow.employeeId === user.employeeId
 *
 * e NÃO:
 *
 * workflow.employeeId === user.id
 */

export function isEvaluationEmployee(workflow, user) {
  if (!workflow || !user) {
    return false
  }

  const workflowEmployeeId = normalizeId(workflow.employeeId)

  const userEmployeeId = getEmployeeId(user)

  return (
    workflowEmployeeId !== '' &&
    userEmployeeId !== '' &&
    workflowEmployeeId === userEmployeeId
  )
}

/*
 * ============================================================
 * RESPONSÁVEL POR ETAPA
 * ============================================================
 */

export function findResponsibleUser({
  responsibleType,
  employee,
  responsibleUserId = '',
  responsibleUserName = ''
}) {
  const users = getUsers()

  /*
   * Usuário específico.
   */
  if (responsibleType === 'specific_user') {
    let user = findUserById(responsibleUserId)

    if (!user) {
      user = findUserByName(responsibleUserName)
    }

    return {
      userId: user ? getUserId(user) : normalizeId(responsibleUserId),

      userName: user
        ? getUserName(user)
        : responsibleUserName || 'Responsável não encontrado',

      resolved: Boolean(user)
    }
  }

  /*
   * Gerente da filial.
   */
  if (responsibleType === 'branch_manager') {
    const branchId = normalizeId(employee?.branchId)

    const user = users.find((item) => {
      const role = normalizeText(getUserRole(item))

      const sameBranch =
        branchId === '' ||
        normalizeId(item.branchId || item.branch?.id) === branchId

      const managerRole =
        role.includes('gerente') ||
        role.includes('manager') ||
        role.includes('gestor')

      return sameBranch && managerRole
    })

    return {
      userId: user ? getUserId(user) : '',

      userName: user ? getUserName(user) : '',

      resolved: Boolean(user)
    }
  }

  /*
   * Supervisor do departamento.
   */
  if (responsibleType === 'department_supervisor') {
    const departmentId = normalizeId(employee?.departmentId)

    const user = users.find((item) => {
      const role = normalizeText(getUserRole(item))

      const sameDepartment =
        departmentId === '' ||
        normalizeId(item.departmentId || item.department?.id) === departmentId

      const supervisorRole =
        role.includes('supervisor') ||
        role.includes('supervisora') ||
        role.includes('supervisor de departamento')

      return sameDepartment && supervisorRole
    })

    return {
      userId: user ? getUserId(user) : '',

      userName: user ? getUserName(user) : '',

      resolved: Boolean(user)
    }
  }

  /*
   * Instrutor.
   */
  if (responsibleType === 'instructor') {
    const user = users.find((item) => {
      const role = normalizeText(getUserRole(item))

      return role.includes('instrutor') || role.includes('instrutora')
    })

    return {
      userId: user ? getUserId(user) : '',

      userName: user ? getUserName(user) : '',

      resolved: Boolean(user)
    }
  }

  return {
    userId: '',
    userName: '',
    resolved: false
  }
}

/*
 * ============================================================
 * RESPONSÁVEL POR ETAPA
 * ============================================================
 */

export function isEvaluationStageResponsible(workflow, stage, user) {
  if (!workflow || !stage || !user) {
    return false
  }

  const userId = getUserId(user)

  if (!userId) {
    return false
  }

  if (
    stage.responsibleUserId &&
    normalizeId(stage.responsibleUserId) === userId
  ) {
    return true
  }

  const responsible = findResponsibleUser({
    responsibleType: stage.responsibleType,

    employee: {
      id: workflow.employeeId,
      name: workflow.employeeName,
      branchId: workflow.branchId,
      branchName: workflow.branchName,
      departmentId: workflow.departmentId,
      departmentName: workflow.departmentName
    },

    responsibleUserId: stage.responsibleUserId,

    responsibleUserName: stage.responsibleUserName
  })

  return responsible.resolved && normalizeId(responsible.userId) === userId
}

/*
 * ============================================================
 * PDI
 * ============================================================
 */

export function canRespondToPdi(pdi, user) {
  if (!pdi || !user) {
    return false
  }

  const userId = getUserId(user)

  if (!userId) {
    return false
  }

  if (pdi.responsibleUserId && normalizeId(pdi.responsibleUserId) === userId) {
    return true
  }

  const role = getUserRoleNormalized(user)

  return (
    role.includes('gerente') ||
    role.includes('manager') ||
    role.includes('gestor') ||
    role.includes('supervisor') ||
    role.includes('supervisora')
  )
}

/*
 * ============================================================
 * 180°
 * ============================================================
 */

export function canRespondTo180(workflow, user) {
  if (!workflow || !user) {
    return false
  }

  if (workflow.evaluation180?.enabled !== true) {
    return false
  }

  return isEvaluationEmployee(workflow, user)
}

/*
 * ============================================================
 * VISUALIZAÇÃO DO 180°
 * ============================================================
 */

export function canViewEvaluation180(workflow, user) {
  if (!workflow || !user) {
    return false
  }

  if (canManageEvaluations(user)) {
    return true
  }

  return false
}

/*
 * ============================================================
 * VISUALIZAÇÃO DAS ETAPAS
 * ============================================================
 */

export function canViewEvaluationStage(workflow, stage, user) {
  if (!workflow || !stage || !user) {
    return false
  }

  if (canManageEvaluations(user)) {
    return true
  }

  if (isEvaluationEmployee(workflow, user)) {
    return true
  }

  return isEvaluationStageResponsible(workflow, stage, user)
}

/*
 * ============================================================
 * VISUALIZAÇÃO DO PDI
 * ============================================================
 */

export function canViewEvaluationPdi(workflow, user) {
  if (!workflow || !user) {
    return false
  }

  if (canManageEvaluations(user)) {
    return true
  }

  if (isEvaluationEmployee(workflow, user)) {
    return true
  }

  return canRespondToPdi(workflow.pdi, user)
}

/*
 * ============================================================
 * RESULTADOS NORMAIS
 * ============================================================
 */

export function canViewRegularEvaluationResults(workflow, user) {
  if (!workflow || !user) {
    return false
  }

  if (canManageEvaluations(user)) {
    return true
  }

  if (isEvaluationEmployee(workflow, user)) {
    return true
  }

  return workflow.stages?.some((stage) =>
    isEvaluationStageResponsible(workflow, stage, user)
  )
}

/*
 * ============================================================
 * ASSINATURAS
 * ============================================================
 */

export function canSignEvaluationStage(workflow, stage, user) {
  return canRespondToStage(stage, user)
}

export function canSignEvaluationPdi(workflow, user) {
  return canRespondToPdi(workflow?.pdi, user)
}

export function canSignEvaluation180(workflow, user) {
  return canRespondTo180(workflow, user)
}

/*
 * ============================================================
 * FUNÇÃO CENTRAL PARA ETAPAS
 * ============================================================
 */

export function canRespondToStage(stage, user) {
  if (!stage || !user) {
    return false
  }

  const userId = getUserId(user)

  if (!userId) {
    return false
  }

  if (
    stage.responsibleUserId &&
    normalizeId(stage.responsibleUserId) === userId
  ) {
    return true
  }

  if (stage.responsibleUserName) {
    const responsibleUser = findUserByName(stage.responsibleUserName)

    if (responsibleUser && getUserId(responsibleUser) === userId) {
      return true
    }
  }

  return false
}

/*
 * ============================================================
 * ALIASES
 * ============================================================
 */

export function canAnswerEvaluationStage(workflow, stage) {
  return isEvaluationStageResponsible(workflow, stage, getCurrentUserFallback())
}

export function canAnswerEvaluationPdi(workflow) {
  return canRespondToPdi(workflow?.pdi, getCurrentUserFallback())
}

export function canAnswerEvaluation180(workflow) {
  return canRespondTo180(workflow, getCurrentUserFallback())
}

export function isEvaluation180Respondent(workflow, user) {
  return canRespondTo180(workflow, user)
}

/*
 * ============================================================
 * USUÁRIO ATUAL
 * ============================================================
 */

function getCurrentUserFallback() {
  try {
    const stored =
      localStorage.getItem('currentUser') ||
      localStorage.getItem('current_user') ||
      localStorage.getItem('loggedUser') ||
      localStorage.getItem('logged_user')

    if (!stored) {
      return null
    }

    return JSON.parse(stored)
  } catch {
    return null
  }
}

/*
 * ============================================================
 * VISIBILIDADE DE WORKFLOW
 * ============================================================
 */

export function getVisibleWorkflow(workflow, user) {
  if (!workflow || !user) {
    return null
  }

  if (canManageEvaluations(user)) {
    return workflow
  }

  if (isEvaluationEmployee(workflow, user)) {
    return workflow
  }

  if (
    workflow.stages?.some((stage) =>
      isEvaluationStageResponsible(workflow, stage, user)
    )
  ) {
    return workflow
  }

  if (canRespondToPdi(workflow.pdi, user)) {
    return workflow
  }

  return null
}

export function getVisibleWorkflows(workflows = [], user) {
  return workflows
    .map((workflow) => getVisibleWorkflow(workflow, user))
    .filter(Boolean)
}

/*
 * ============================================================
 * ACESSO COMPLETO
 * ============================================================
 */

export function getEvaluationAccess(workflow, user) {
  return {
    canManage: canManageEvaluations(user),

    isEmployee: isEvaluationEmployee(workflow, user),

    canAnswer180: canRespondTo180(workflow, user),

    canView180: canViewEvaluation180(workflow, user),

    canViewRegularResults: canViewRegularEvaluationResults(workflow, user),

    canViewPdi: canViewEvaluationPdi(workflow, user),

    canAnswerPdi: canRespondToPdi(workflow?.pdi, user),

    stages: (workflow?.stages || []).map((stage) => ({
      stageId: stage.id,

      canAnswer: isEvaluationStageResponsible(workflow, stage, user),

      canView: canViewEvaluationStage(workflow, stage, user)
    }))
  }
}
