import { getStoredArray, setStored } from './storage'

/*
 * ============================================================
 * PERFIS DE ACESSO PADRÃO
 * ============================================================
 */

export const defaultAccessRoles = [
  {
    id: 1,
    name: 'admin',
    displayName: 'Administrador',
    description: 'Administrador do sistema',
    active: true,
    permissions: ['all']
  },
  {
    id: 2,
    name: 'gestao_rh',
    displayName: 'Gestão de RH',
    description: 'Gestão de Recursos Humanos',
    active: true,
    permissions: [
      // Funcionários
      'employees_view',
      'employees_create',
      'employees_edit',

      // Financeiro
      'finance_salary_view',
      'finance_salary_manage',
      'finance_events_view',
      'finance_events_manage',
      'finance_payroll_view',
      'finance_payroll_manage',
      'finance_advanced_view',
      'finance_advanced_manage',

      // Recrutamento
      'recruitment_view',
      'recruitment_create',
      'recruitment_edit',
      'recruitment_delete',
      'recruitment_convert',

      // Relatórios e documentos
      'reports_view',
      'documents_view',
      'documents_upload',
      'documents_edit',
      'documents_delete',

      // Treinamentos
      'trainings_view',
      'trainings_create',
      'trainings_edit',
      'trainings_delete',

      // Jornadas e escalas — permissões oficiais
      'ponto_jornadas_view',
      'ponto_jornadas_create',
      'ponto_jornadas_edit',
      'ponto_jornadas_delete',

      // Avaliações
      'evaluations_view',
      'evaluations_create',
      'evaluations_edit',
      'evaluations_delete',

      'evaluation_models_view',
      'evaluation_models_create',
      'evaluation_models_edit',
      'evaluation_models_delete',

      'evaluations_history_view',
      'evaluations_results_view',
      'evaluations_180_view',

      'my_evaluations_view',
      'my_evaluations_answer'
    ]
  },
  {
    id: 3,
    name: 'funcionario',
    displayName: 'Funcionário',
    description: 'Usuário funcionário',
    active: true,
    permissions: [
      'employees_view',
      'my_trainings_view',
      'my_evaluations_view',
      'my_evaluations_answer'
    ]
  }
]

/*
 * ============================================================
 * BUSCAR PERFIS
 * ============================================================
 */

export function getAccessRoles() {
  return getStoredArray('accessRoles')
}

/*
 * ============================================================
 * INICIALIZAR PERFIS
 * ============================================================
 */

export function initializeAccessRoles() {
  const storedAccessRoles = getAccessRoles()

  /*
   * ==========================================================
   * PERFIS JÁ EXISTENTES
   * ==========================================================
   *
   * Não substituímos perfis personalizados.
   * Corrigimos as permissões antigas de jornadas e escalas
   * e garantimos as permissões financeiras e de relatórios
   * esperadas para Gestão de RH.
   */

  if (storedAccessRoles.length > 0) {
    const reportsPermissions = [
      'reports_view',
      'documents_view',
      'documents_upload',
      'documents_edit',
      'documents_delete',
      'recruitment_view',
      'recruitment_create',
      'recruitment_edit',
      'recruitment_delete',
      'recruitment_convert'
    ]

    const financePermissions = [
      'finance_salary_view',
      'finance_salary_manage',
      'finance_events_view',
      'finance_events_manage',
      'finance_payroll_view',
      'finance_payroll_manage',
      'finance_advanced_view',
      'finance_advanced_manage'
    ]

    /*
     * Compatibilidade com as chaves antigas.
     * Os nomes oficiais são os que começam com ponto_jornadas_.
     */

    const legacyPermissionAliases = {
      work_schedules_view: 'ponto_jornadas_view',
      work_schedules_create: 'ponto_jornadas_create',
      work_schedules_edit: 'ponto_jornadas_edit',
      work_schedules_delete: 'ponto_jornadas_delete'
    }

    let changed = false

    const updatedAccessRoles = storedAccessRoles.map((role) => {
      const originalPermissions = Array.isArray(role.permissions)
        ? role.permissions
        : []

      // Converte chaves antigas e elimina permissões duplicadas.
      const normalizedPermissions = [
        ...new Set(
          originalPermissions.map(
            (permission) => legacyPermissionAliases[permission] || permission
          )
        )
      ]

      // Mantém as permissões necessárias de Gestão de RH.
      const requiredPermissions =
        role.name === 'gestao_rh'
          ? [...financePermissions, ...reportsPermissions]
          : []

      const nextPermissions = [...normalizedPermissions]

      for (const permission of requiredPermissions) {
        if (!nextPermissions.includes(permission)) {
          nextPermissions.push(permission)
        }
      }

      const permissionsChanged =
        nextPermissions.length !== originalPermissions.length ||
        nextPermissions.some(
          (permission, index) => permission !== originalPermissions[index]
        )

      if (permissionsChanged) {
        changed = true

        return {
          ...role,
          permissions: nextPermissions
        }
      }

      return role
    })

    if (changed) {
      setStored('accessRoles', updatedAccessRoles)
      return updatedAccessRoles
    }

    return storedAccessRoles
  }

  /*
   * ==========================================================
   * COMPATIBILIDADE COM A ESTRUTURA ANTIGA
   * ==========================================================
   */

  const oldRoles = getStoredArray('roles')

  const legacyAccessRoles = oldRoles.filter((role) =>
    ['admin', 'gestao_rh', 'funcionario'].includes(role.name)
  )

  let accessRoles = []

  if (legacyAccessRoles.length > 0) {
    accessRoles = defaultAccessRoles.map((defaultRole) => {
      const legacyRole = legacyAccessRoles.find(
        (role) => role.name === defaultRole.name
      )

      if (!legacyRole) {
        return defaultRole
      }

      const legacyPermissions = Array.isArray(legacyRole.permissions)
        ? legacyRole.permissions
        : []

      const legacyPermissionAliases = {
        work_schedules_view: 'ponto_jornadas_view',
        work_schedules_create: 'ponto_jornadas_create',
        work_schedules_edit: 'ponto_jornadas_edit',
        work_schedules_delete: 'ponto_jornadas_delete'
      }

      const normalizedLegacyPermissions = [
        ...new Set(
          legacyPermissions.map(
            (permission) => legacyPermissionAliases[permission] || permission
          )
        )
      ]

      return {
        ...defaultRole,
        id: legacyRole.id,
        permissions: [
          ...normalizedLegacyPermissions,
          ...defaultRole.permissions.filter(
            (permission) => !normalizedLegacyPermissions.includes(permission)
          )
        ]
      }
    })
  } else {
    accessRoles = defaultAccessRoles
  }

  setStored('accessRoles', accessRoles)

  return accessRoles
}

/*
 * ============================================================
 * BUSCAR PERFIL POR ID
 * ============================================================
 */

export function getAccessRoleById(id) {
  const accessRoles = getAccessRoles()

  return accessRoles.find(
    (role) => String(role.id) === String(id) || Number(role.id) === Number(id)
  )
}

/*
 * ============================================================
 * BUSCAR PERFIL POR NOME
 * ============================================================
 */

export function getAccessRoleByName(name) {
  const accessRoles = getAccessRoles()

  return accessRoles.find((role) => role.name === name)
}

/*
 * ============================================================
 * ADICIONAR PERFIL
 * ============================================================
 */

export function addAccessRole(accessRole) {
  const accessRoles = getAccessRoles()

  const updated = [...accessRoles, accessRole]

  setStored('accessRoles', updated)

  return updated
}

/*
 * ============================================================
 * ATUALIZAR PERFIL
 * ============================================================
 */

export function updateAccessRole(updatedAccessRole) {
  const accessRoles = getAccessRoles()

  const updated = accessRoles.map((role) =>
    role.id === updatedAccessRole.id ? updatedAccessRole : role
  )

  setStored('accessRoles', updated)

  return updated
}

/*
 * ============================================================
 * EXCLUIR PERFIL
 * ============================================================
 */

export function deleteAccessRole(id) {
  const accessRoles = getAccessRoles()

  const updated = accessRoles.filter((role) => role.id !== id)

  setStored('accessRoles', updated)

  return updated
}
