import { getStoredArray, setStored } from './storage'

/*
 * Perfis de acesso padrão do sistema.
 *
 * IMPORTANTE:
 * Esses perfis NÃO representam cargos profissionais.
 *
 * Cargo profissional:
 *   Vendedor
 *   Motorista
 *   Gerente
 *
 * Perfil de acesso:
 *   Administrador
 *   Gestão de RH
 *   Funcionário
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
      'employees_view',
      'employees_create',
      'employees_edit',
      'trainings_view',
      'trainings_create',
      'trainings_edit',
      'trainings_delete'
    ]
  },

  {
    id: 3,
    name: 'funcionario',
    displayName: 'Funcionário',
    description: 'Usuário funcionário',
    active: true,
    permissions: ['employees_view', 'my_trainings_view']
  }
]

/*
 * Recupera os perfis de acesso armazenados.
 */
export function getAccessRoles() {
  return getStoredArray('accessRoles')
}

/*
 * Inicializa os perfis de acesso.
 *
 * Se já existirem, não sobrescreve os dados.
 */
export function initializeAccessRoles() {
  const storedAccessRoles = getAccessRoles()

  if (storedAccessRoles.length > 0) {
    return storedAccessRoles
  }

  /*
   * Tenta aproveitar os antigos perfis que estavam
   * armazenados junto com "roles".
   *
   * Isso evita perder os dados da estrutura anterior.
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

      return {
        ...defaultRole,
        id: legacyRole.id,
        permissions:
          Array.isArray(legacyRole.permissions) &&
          legacyRole.permissions.length > 0
            ? legacyRole.permissions
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
 * Busca um perfil de acesso pelo ID.
 */
export function getAccessRoleById(id) {
  const accessRoles = getAccessRoles()

  return accessRoles.find((role) => Number(role.id) === Number(id))
}

/*
 * Busca um perfil de acesso pelo nome interno.
 */
export function getAccessRoleByName(name) {
  const accessRoles = getAccessRoles()

  return accessRoles.find((role) => role.name === name)
}

/*
 * Adiciona um novo perfil de acesso.
 */
export function addAccessRole(accessRole) {
  const accessRoles = getAccessRoles()

  const updated = [...accessRoles, accessRole]

  setStored('accessRoles', updated)

  return updated
}

/*
 * Atualiza um perfil de acesso.
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
 * Remove um perfil de acesso.
 */
export function deleteAccessRole(id) {
  const accessRoles = getAccessRoles()

  const updated = accessRoles.filter((role) => role.id !== id)

  setStored('accessRoles', updated)

  return updated
}
