import { getStoredArray, setStored } from './storage'

/*
 * ============================================================
 * PERFIS DE ACESSO PADRÃO
 * ============================================================
 *
 * IMPORTANTE:
 *
 * Esses perfis representam permissões dentro do sistema.
 *
 * Eles não representam cargos profissionais.
 *
 * Cargo:
 *   Motorista
 *   Gerente
 *   Mecânico
 *
 * Perfil de acesso:
 *   Administrador
 *   Gestão de RH
 *   Funcionário
 * ============================================================
 */

export const defaultAccessRoles = [
  /*
   * ==========================================================
   * ADMINISTRADOR
   * ==========================================================
   */

  {
    id: 1,

    name: 'admin',

    displayName: 'Administrador',

    description: 'Administrador do sistema',

    active: true,

    permissions: ['all']
  },

  /*
   * ==========================================================
   * GESTÃO DE RH
   * ==========================================================
   */

  {
    id: 2,

    name: 'gestao_rh',

    displayName: 'Gestão de RH',

    description: 'Gestão de Recursos Humanos',

    active: true,

    permissions: [
      /*
       * Funcionários
       */
      'employees_view',
      'employees_create',
      'employees_edit',

      /*
       * Financeiro
       */
      'finance_salary_view',
      'finance_salary_manage',

      /*
       * Treinamentos
       */
      'trainings_view',
      'trainings_create',
      'trainings_edit',
      'trainings_delete',

      /*
       * Jornadas
       */
      'work_schedules_view',
      'work_schedules_create',
      'work_schedules_edit',
      'work_schedules_delete',

      /*
       * Avaliações
       */
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

  /*
   * ==========================================================
   * FUNCIONÁRIO
   * ==========================================================
   */

  {
    id: 3,

    name: 'funcionario',

    displayName: 'Funcionário',

    description: 'Usuário funcionário',

    active: true,

    permissions: [
      'employees_view',

      'my_trainings_view',

      /*
       * Avaliações próprias.
       *
       * O serviço evaluationAccess.js ainda faz a segunda
       * validação verificando se a avaliação realmente
       * pertence ao funcionário.
       */
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
   * Se os perfis já foram criados anteriormente, não podemos
   * simplesmente substituí-los.
   *
   * Porém, precisamos garantir que o perfil padrão de Gestão
   * de RH receba as novas permissões do Financeiro.
   *
   * Perfis personalizados não são sobrescritos.
   */

  if (storedAccessRoles.length > 0) {
    const financePermissions = ['finance_salary_view', 'finance_salary_manage']

    let changed = false

    const updatedAccessRoles = storedAccessRoles.map((role) => {
      if (role.name !== 'gestao_rh') {
        return role
      }

      const currentPermissions = Array.isArray(role.permissions)
        ? role.permissions
        : []

      const missingPermissions = financePermissions.filter(
        (permission) => !currentPermissions.includes(permission)
      )

      if (missingPermissions.length === 0) {
        return role
      }

      changed = true

      return {
        ...role,
        permissions: [...currentPermissions, ...missingPermissions]
      }
    })

    if (changed) {
      setStored('accessRoles', updatedAccessRoles)

      return updatedAccessRoles
    }

    return storedAccessRoles
  }

  /*
   * ==========================================================
   * COMPATIBILIDADE COM ESTRUTURA ANTIGA
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

      /*
       * Mantém o ID antigo.
       *
       * Porém, caso o perfil antigo não possua permissões,
       * utiliza as permissões atuais do perfil padrão.
       */
      return {
        ...defaultRole,

        id: legacyRole.id,

        permissions:
          Array.isArray(legacyRole.permissions) &&
          legacyRole.permissions.length > 0
            ? [
                ...legacyRole.permissions,
                ...defaultRole.permissions.filter(
                  (permission) => !legacyRole.permissions.includes(permission)
                )
              ]
            : defaultRole.permissions
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
 * BUSCAR POR ID
 * ============================================================
 */

export function getAccessRoleById(id) {
  const accessRoles = getAccessRoles()

  return accessRoles.find((role) => Number(role.id) === Number(id))
}

/*
 * ============================================================
 * BUSCAR POR NOME
 * ============================================================
 */

export function getAccessRoleByName(name) {
  const accessRoles = getAccessRoles()

  return accessRoles.find((role) => role.name === name)
}

/*
 * ============================================================
 * ADICIONAR
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
 * ATUALIZAR
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
 * EXCLUIR
 * ============================================================
 */

export function deleteAccessRole(id) {
  const accessRoles = getAccessRoles()

  const updated = accessRoles.filter((role) => role.id !== id)

  setStored('accessRoles', updated)

  return updated
}
