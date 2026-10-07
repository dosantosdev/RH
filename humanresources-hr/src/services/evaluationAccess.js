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
 * DADOS DO SISTEMA
 * ============================================================
 */

function getUsers() {
  return getStoredArray('users')
}

function getEmployees() {
  return getStoredArray('employees')
}

function getPositions() {
  return getStoredArray('positions')
}

function getAccessRoles() {
  return getStoredArray('accessRoles')
}

/*
 * ============================================================
 * BUSCAR USUÁRIO
 * ============================================================
 */

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
 * BUSCAR FUNCIONÁRIO
 * ============================================================
 */

function findEmployeeById(employeeId) {
  const normalizedId = normalizeId(employeeId)

  if (!normalizedId) {
    return null
  }

  return (
    getEmployees().find(
      (employee) => normalizeId(employee.id) === normalizedId
    ) || null
  )
}

/*
 * ============================================================
 * BUSCAR USUÁRIO VINCULADO AO FUNCIONÁRIO
 * ============================================================
 */

function findUserByEmployeeId(employeeId) {
  const normalizedEmployeeId = normalizeId(employeeId)

  if (!normalizedEmployeeId) {
    return null
  }

  return (
    getUsers().find(
      (user) => normalizeId(user.employeeId) === normalizedEmployeeId
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

  /*
   * Mantemos compatibilidade com todas as estruturas
   * utilizadas nas versões anteriores do sistema.
   */
  return (
    user.accessRoleName ||
    user.accessRole ||
    user.roleName ||
    user.role ||
    user.permissionRole ||
    ''
  )
}

function getUserRoleNormalized(user) {
  return normalizeText(getUserRole(user))
}

/*
 * ============================================================
 * IDENTIFICAR PERFIL DE ACESSO PELO ID
 * ============================================================
 *
 * Alguns usuários possuem apenas accessRoleId.
 *
 * Nesse caso buscamos o nome do perfil na estrutura
 * accessRoles.
 * ============================================================
 */

function getUserAccessRoleName(user) {
  if (!user) {
    return ''
  }

  if (user.accessRoleName || user.accessRole) {
    return getUserRole(user)
  }

  const accessRoleId = normalizeId(user.accessRoleId)

  if (!accessRoleId) {
    return ''
  }

  const roles = getAccessRoles()

  const role = roles.find((item) => normalizeId(item.id) === accessRoleId)

  return role?.name || role?.displayName || ''
}

function getNormalizedAccessRole(user) {
  return normalizeText(getUserAccessRoleName(user))
}

/*
 * ============================================================
 * ADMIN
 * ============================================================
 */

export function isAdmin(user) {
  const role = getNormalizedAccessRole(user)

  return (
    role === 'admin' || role === 'administrador' || role === 'administrator'
  )
}

/*
 * ============================================================
 * GESTÃO DE RH
 * ============================================================
 */

export function isRhManager(user) {
  const role = getNormalizedAccessRole(user)

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

/*
 * ============================================================
 * GERENCIAMENTO DAS AVALIAÇÕES
 * ============================================================
 */

export function canManageEvaluations(user) {
  return isAdmin(user) || isRhManager(user)
}

/*
 * ============================================================
 * FUNCIONÁRIO AVALIADO
 * ============================================================
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
 * POSIÇÃO DO FUNCIONÁRIO
 * ============================================================
 */

function getEmployeePosition(employee) {
  if (!employee) {
    return null
  }

  const positionId = normalizeId(employee.positionId || employee.position?.id)

  if (!positionId) {
    return null
  }

  return (
    getPositions().find(
      (position) => normalizeId(position.id) === positionId
    ) || null
  )
}

/*
 * ============================================================
 * ENCONTRAR FUNCIONÁRIO DE UMA POSIÇÃO
 * ============================================================
 *
 * Uma posição pode ter um funcionário vinculado através do
 * cadastro do funcionário.
 *
 * Não dependemos de um campo employeeId na posição.
 * ============================================================
 */

function findEmployeeByPositionId(positionId) {
  const normalizedPositionId = normalizeId(positionId)

  if (!normalizedPositionId) {
    return null
  }

  return (
    getEmployees().find(
      (employee) => normalizeId(employee.positionId) === normalizedPositionId
    ) || null
  )
}

/*
 * ============================================================
 * ENCONTRAR USUÁRIO DE UMA POSIÇÃO
 * ============================================================
 */

function findUserByPositionId(positionId) {
  const employee = findEmployeeByPositionId(positionId)

  if (!employee) {
    return null
  }

  return findUserByEmployeeId(employee.id)
}

/*
 * ============================================================
 * HIERARQUIA
 * ============================================================
 *
 * Percorre a estrutura:
 *
 * funcionário
 *      ↓
 * posição atual
 *      ↓
 * parentPositionId
 *      ↓
 * posição superior
 *      ↓
 * parentPositionId
 *      ↓
 * próxima posição superior
 *
 * Isso permite encontrar um responsável sem depender do nome
 * do cargo.
 * ============================================================
 */

function getPositionHierarchy(employee) {
  const positions = getPositions()

  const currentPosition = getEmployeePosition(employee)

  if (!currentPosition) {
    return []
  }

  const hierarchy = []

  const visited = new Set()

  let current = currentPosition

  while (current && current.parentPositionId) {
    const currentId = normalizeId(current.id)

    if (visited.has(currentId)) {
      break
    }

    visited.add(currentId)

    const parentId = normalizeId(current.parentPositionId)

    if (!parentId) {
      break
    }

    const parent = positions.find(
      (position) => normalizeId(position.id) === parentId
    )

    if (!parent) {
      break
    }

    hierarchy.push(parent)

    current = parent
  }

  return hierarchy
}

/*
 * ============================================================
 * RESPONSÁVEL HIERÁRQUICO
 * ============================================================
 *
 * O primeiro superior ocupado é o responsável.
 *
 * Exemplo:
 *
 * Funcionário
 *   ↓
 * Supervisor (posição ocupada)
 *   ↓
 * Gerente
 *
 * Retorna o Supervisor.
 *
 * Se a posição imediatamente superior estiver vazia:
 *
 * Funcionário
 *   ↓
 * Supervisor (vazio)
 *   ↓
 * Gerente (ocupado)
 *
 * Retorna o Gerente.
 * ============================================================
 */

function findHierarchyResponsible(employee) {
  const hierarchy = getPositionHierarchy(employee)

  for (const position of hierarchy) {
    const superiorEmployee = findEmployeeByPositionId(position.id)

    if (!superiorEmployee) {
      continue
    }

    const user = findUserByEmployeeId(superiorEmployee.id)

    if (!user) {
      continue
    }

    return {
      userId: getUserId(user),

      userName: getUserName(user),

      employeeId: normalizeId(superiorEmployee.id),

      positionId: normalizeId(position.id),

      positionName: position.cargoName || superiorEmployee.positionName || '',

      resolved: true
    }
  }

  return {
    userId: '',
    userName: '',
    employeeId: '',
    positionId: '',
    positionName: '',
    resolved: false
  }
}

/*
 * ============================================================
 * RESPONSÁVEL HIERÁRQUICO POR TIPO
 * ============================================================
 */

function findHierarchyResponsibleByType(employee, responsibleType) {
  const hierarchy = getPositionHierarchy(employee)

  if (hierarchy.length === 0) {
    return {
      userId: '',
      userName: '',
      employeeId: '',
      positionId: '',
      positionName: '',
      resolved: false
    }
  }

  /*
   * ----------------------------------------------------------
   * RESPONSÁVEL DO PDI
   * ----------------------------------------------------------
   *
   * Para manager_or_supervisor, utilizamos o primeiro superior
   * ocupado da hierarquia.
   *
   * Não importa o nome do cargo.
   * ----------------------------------------------------------
   */

  if (
    responsibleType === 'manager_or_supervisor' ||
    responsibleType === 'department_supervisor'
  ) {
    /*
     * Para supervisor do setor, priorizamos um superior que
     * esteja no mesmo departamento.
     */

    const employeeDepartmentId = normalizeId(employee?.departmentId)

    if (responsibleType === 'department_supervisor' && employeeDepartmentId) {
      for (const position of hierarchy) {
        if (normalizeId(position.departmentId) !== employeeDepartmentId) {
          continue
        }

        const superiorEmployee = findEmployeeByPositionId(position.id)

        if (!superiorEmployee) {
          continue
        }

        const user = findUserByEmployeeId(superiorEmployee.id)

        if (!user) {
          continue
        }

        return {
          userId: getUserId(user),

          userName: getUserName(user),

          employeeId: normalizeId(superiorEmployee.id),

          positionId: normalizeId(position.id),

          positionName: position.cargoName || '',

          resolved: true
        }
      }
    }

    /*
     * Se não encontrou um superior do mesmo departamento,
     * utiliza o primeiro superior ocupado.
     */
    return findHierarchyResponsible(employee)
  }

  /*
   * ----------------------------------------------------------
   * GERENTE DA FILIAL
   * ----------------------------------------------------------
   *
   * Aqui percorremos toda a hierarquia e utilizamos o superior
   * mais alto que esteja ocupado.
   *
   * Isso evita depender do nome do cargo.
   * ----------------------------------------------------------
   */

  if (responsibleType === 'branch_manager') {
    let highestResponsible = null

    for (const position of hierarchy) {
      const employeeAtPosition = findEmployeeByPositionId(position.id)

      if (!employeeAtPosition) {
        continue
      }

      /*
       * O responsável deve estar na mesma filial.
       */
      const employeeBranchId = normalizeId(employee?.branchId)

      const superiorBranchId = normalizeId(employeeAtPosition.branchId)

      if (
        employeeBranchId &&
        superiorBranchId &&
        employeeBranchId !== superiorBranchId
      ) {
        continue
      }

      const user = findUserByEmployeeId(employeeAtPosition.id)

      if (!user) {
        continue
      }

      highestResponsible = {
        userId: getUserId(user),

        userName: getUserName(user),

        employeeId: normalizeId(employeeAtPosition.id),

        positionId: normalizeId(position.id),

        positionName: position.cargoName || '',

        resolved: true
      }
    }

    return (
      highestResponsible || {
        userId: '',
        userName: '',
        employeeId: '',
        positionId: '',
        positionName: '',
        resolved: false
      }
    )
  }

  return findHierarchyResponsible(employee)
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
  /*
   * ----------------------------------------------------------
   * USUÁRIO ESPECÍFICO
   * ----------------------------------------------------------
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
   * ----------------------------------------------------------
   * HIERARQUIA
   * ----------------------------------------------------------
   */

  const employeeRecord = employee?.id ? findEmployeeById(employee.id) : employee

  if (employeeRecord) {
    const hierarchyResponsible = findHierarchyResponsibleByType(
      employeeRecord,
      responsibleType
    )

    if (hierarchyResponsible.resolved) {
      return hierarchyResponsible
    }
  }

  /*
   * ----------------------------------------------------------
   * FALLBACK LEGADO
   * ----------------------------------------------------------
   *
   * Mantemos compatibilidade com registros antigos que ainda
   * podem não estar vinculados ao Organograma.
   */

  const users = getUsers()

  const employeeBranchId = normalizeId(employee?.branchId)

  const employeeDepartmentId = normalizeId(employee?.departmentId)

  if (responsibleType === 'branch_manager') {
    const user = users.find((item) => {
      const role = normalizeText(getUserRole(item))

      const sameBranch =
        !employeeBranchId ||
        normalizeId(item.branchId || item.branch?.id) === employeeBranchId

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

  if (responsibleType === 'department_supervisor') {
    const user = users.find((item) => {
      const role = normalizeText(getUserRole(item))

      const sameDepartment =
        !employeeDepartmentId ||
        normalizeId(item.departmentId || item.department?.id) ===
          employeeDepartmentId

      const supervisorRole =
        role.includes('supervisor') ||
        role.includes('supervisora') ||
        role.includes('lider') ||
        role.includes('líder') ||
        role.includes('coordenador') ||
        role.includes('coordenadora')

      return sameDepartment && supervisorRole
    })

    return {
      userId: user ? getUserId(user) : '',

      userName: user ? getUserName(user) : '',

      resolved: Boolean(user)
    }
  }

  /*
   * ----------------------------------------------------------
   * INSTRUTOR
   * ----------------------------------------------------------
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

  /*
   * ----------------------------------------------------------
   * GERENTE OU SUPERVISOR
   * ----------------------------------------------------------
   */

  if (responsibleType === 'manager_or_supervisor') {
    const employeeRecord = employee?.id
      ? findEmployeeById(employee.id)
      : employee

    if (employeeRecord) {
      return findHierarchyResponsible(employeeRecord)
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
 * RESPONSÁVEL PELA ETAPA
 * ============================================================
 */

export function isEvaluationStageResponsible(workflow, stage, user) {
  if (!workflow || !stage || !user) {
    return false
  }

  /*
   * Admin e Gestão de RH podem administrar as avaliações.
   */
  if (canManageEvaluations(user)) {
    return true
  }

  const userId = getUserId(user)

  if (!userId) {
    return false
  }

  /*
   * Primeiro verifica o responsável salvo no workflow.
   */
  if (
    stage.responsibleUserId &&
    normalizeId(stage.responsibleUserId) === userId
  ) {
    return true
  }

  /*
   * Se não houver responsável salvo, tenta descobrir pela
   * estrutura organizacional.
   */
  const responsible = findResponsibleUser({
    responsibleType: stage.responsibleType,

    employee: {
      id: workflow.employeeId,

      name: workflow.employeeName,

      branchId: workflow.branchId,

      branchName: workflow.branchName,

      departmentId: workflow.departmentId,

      departmentName: workflow.departmentName,

      positionId: workflow.positionId
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

/*
 * Resolve o responsável do PDI diretamente a partir do
 * funcionário avaliado.
 */
function resolvePdiResponsible(pdi, workflow) {
  if (!workflow) {
    return {
      userId: '',
      userName: '',
      resolved: false
    }
  }

  /*
   * Primeiro respeitamos o responsável já salvo.
   */
  if (pdi?.responsibleUserId) {
    const savedUser = findUserById(pdi.responsibleUserId)

    if (savedUser) {
      return {
        userId: getUserId(savedUser),

        userName: getUserName(savedUser),

        resolved: true
      }
    }
  }

  /*
   * Busca o funcionário real.
   */
  const employee = findEmployeeById(workflow.employeeId)

  if (!employee) {
    return {
      userId: '',
      userName: '',
      resolved: false
    }
  }

  /*
   * O PDI utiliza o superior hierárquico imediato ocupado.
   */
  return findResponsibleUser({
    responsibleType: pdi?.responsibleType || 'manager_or_supervisor',

    employee
  })
}

/*
 * ============================================================
 * PODE RESPONDER AO PDI
 * ============================================================
 */

export function canRespondToPdi(pdi, user, workflow = null) {
  if (!pdi || !user) {
    return false
  }

  /*
   * Admin e Gestão de RH podem responder/gerenciar o PDI.
   *
   * Isso resolve o caso em que o Admin não possui uma posição
   * no Organograma.
   */
  if (canManageEvaluations(user)) {
    return true
  }

  const userId = getUserId(user)

  if (!userId) {
    return false
  }

  /*
   * Responsável salvo.
   */
  if (pdi.responsibleUserId && normalizeId(pdi.responsibleUserId) === userId) {
    return true
  }

  /*
   * Responsável ainda não salvo.
   *
   * Tenta descobrir pela hierarquia.
   */
  if (workflow) {
    const responsible = resolvePdiResponsible(pdi, workflow)

    if (responsible.resolved && normalizeId(responsible.userId) === userId) {
      return true
    }
  }

  /*
   * NÃO utilizamos mais:
   *
   * role.includes('supervisor')
   * role.includes('gerente')
   *
   * como regra de autorização.
   *
   * O cargo profissional e o perfil de acesso são coisas
   * diferentes.
   */

  return false
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

  /*
   * O 180° é respondido pelo próprio funcionário avaliado.
   */
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

  /*
   * O funcionário pode visualizar a própria etapa.
   */
  return canRespondTo180(workflow, user)
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

  /*
   * O funcionário avaliado pode visualizar o PDI,
   * mas não necessariamente responder.
   */
  if (isEvaluationEmployee(workflow, user)) {
    return true
  }

  return canRespondToPdi(workflow.pdi, user, workflow)
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

  return (
    workflow.stages?.some((stage) =>
      isEvaluationStageResponsible(workflow, stage, user)
    ) || false
  )
}

/*
 * ============================================================
 * ASSINATURAS
 * ============================================================
 */

export function canSignEvaluationStage(workflow, stage, user) {
  if (canManageEvaluations(user)) {
    return true
  }

  return canRespondToStage(stage, user)
}

export function canSignEvaluationPdi(workflow, user) {
  return canRespondToPdi(workflow?.pdi, user, workflow)
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

  /*
   * Admin e Gestão de RH possuem acesso administrativo.
   */
  if (canManageEvaluations(user)) {
    return true
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
 *
 * Mantidos para compatibilidade com componentes que utilizam
 * essas funções sem passar explicitamente o usuário.
 * ============================================================
 */

export function canAnswerEvaluationStage(workflow, stage) {
  return isEvaluationStageResponsible(workflow, stage, getCurrentUserFallback())
}

export function canAnswerEvaluationPdi(workflow) {
  return canRespondToPdi(workflow?.pdi, getCurrentUserFallback(), workflow)
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

  /*
   * Administração vê tudo.
   */
  if (canManageEvaluations(user)) {
    return workflow
  }

  /*
   * Funcionário vê a própria avaliação.
   */
  if (isEvaluationEmployee(workflow, user)) {
    return workflow
  }

  /*
   * Responsável de alguma etapa.
   */
  if (
    workflow.stages?.some((stage) =>
      isEvaluationStageResponsible(workflow, stage, user)
    )
  ) {
    return workflow
  }

  /*
   * Responsável pelo PDI.
   */
  if (canRespondToPdi(workflow.pdi, user, workflow)) {
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

    canAnswerPdi: canRespondToPdi(workflow?.pdi, user, workflow),

    stages: (workflow?.stages || []).map((stage) => ({
      stageId: stage.id,

      canAnswer: isEvaluationStageResponsible(workflow, stage, user),

      canView: canViewEvaluationStage(workflow, stage, user)
    }))
  }
}

/*
 * ============================================================
 * RESOLVER PÚBLICO DO RESPONSÁVEL PELO PDI
 * ============================================================
 *
 * Esta função poderá ser utilizada pelo workflow para preencher
 * automaticamente o responsável de avaliações antigas que foram
 * criadas antes da correção.
 * ============================================================
 */

export function getPdiResponsible(workflow) {
  if (!workflow) {
    return {
      userId: '',
      userName: '',
      resolved: false
    }
  }

  return resolvePdiResponsible(workflow.pdi, workflow)
}

/*
 * ============================================================
 * ATUALIZAR RESPONSÁVEL DO PDI
 * ============================================================
 *
 * Retorna os dados sem alterar o workflow.
 *
 * A persistência será responsabilidade do
 * evaluationWorkflow.js.
 * ============================================================
 */

export function resolveEvaluationPdiResponsible(workflow) {
  return getPdiResponsible(workflow)
}
