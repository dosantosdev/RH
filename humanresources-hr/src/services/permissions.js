import {
  getAccessRoles,
  getAccessRoleById,
  getAccessRoleByName
} from './accessRoles'

import { getStoredArray } from './storage'

export function hasPermission(permission) {
  const currentUser = JSON.parse(localStorage.getItem('loggedUser'))

  if (!currentUser) {
    return false
  }

  /*
   * ============================================================
   * PERFIL DE ACESSO
   * ============================================================
   *
   * O sistema passa a procurar primeiro o perfil de acesso
   * associado ao usuário.
   */

  let accessRole = null

  if (currentUser.accessRoleId) {
    accessRole = getAccessRoleById(currentUser.accessRoleId)
  }

  /*
   * Caso o usuário tenha sido criado antes da nova estrutura,
   * tenta localizar pelo nome.
   */
  if (!accessRole && currentUser.accessRoleName) {
    accessRole = getAccessRoleByName(currentUser.accessRoleName)
  }

  /*
   * ============================================================
   * COMPATIBILIDADE COM USUÁRIOS ANTIGOS
   * ============================================================
   *
   * Isso evita que usuários existentes percam acesso durante
   * a transição da estrutura antiga para a nova.
   */

  if (!accessRole) {
    const roles = getStoredArray('roles')

    const legacyRole = roles.find(
      (role) =>
        role.id === currentUser.roleId ||
        role.id === Number(currentUser.roleId) ||
        role.name === currentUser.role ||
        role.name === currentUser.roleName
    )

    if (legacyRole) {
      /*
       * Cargo antigo com "permissions" ainda pode ser encontrado
       * aqui somente como mecanismo de compatibilidade.
       */
      if (legacyRole.active === false) {
        return false
      }

      if (
        legacyRole.name === 'admin' ||
        legacyRole.permissions?.includes('all')
      ) {
        return true
      }

      return legacyRole.permissions?.includes(permission) || false
    }

    return false
  }

  /*
   * Perfil de acesso inativo não concede permissões.
   */
  if (accessRole.active === false) {
    return false
  }

  /*
   * Administrador possui acesso total.
   */
  if (accessRole.name === 'admin' || accessRole.permissions?.includes('all')) {
    return true
  }

  /*
   * Verifica a permissão específica.
   */
  return accessRole.permissions?.includes(permission) || false
}
