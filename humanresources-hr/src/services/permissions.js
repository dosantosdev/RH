import {
  getAccessRoleById,
  getAccessRoleByName
} from './accessRoles'

import { getStoredArray } from './storage'

export function hasPermission(permission) {
  let currentUser = null

  try {
    currentUser = JSON.parse(localStorage.getItem('loggedUser') || 'null')
  } catch {
    return false
  }

  if (!currentUser) {
    return false
  }

  // Usuários autenticados pela API recebem as permissões efetivas
  // na resposta do backend. Isso evita depender de IDs de perfis locais.
  if (currentUser.isAdmin === true) {
    return true
  }

  if (Array.isArray(currentUser.permissions)) {
    return currentUser.permissions.includes(permission)
  }

  // Compatibilidade com usuários antigos durante a migração gradual.
  let accessRole = null

  if (currentUser.accessRoleId) {
    accessRole = getAccessRoleById(currentUser.accessRoleId)
  }

  if (!accessRole && currentUser.accessRoleName) {
    accessRole = getAccessRoleByName(currentUser.accessRoleName)
  }

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

  if (accessRole.active === false) {
    return false
  }

  if (accessRole.name === 'admin' || accessRole.permissions?.includes('all')) {
    return true
  }

  return accessRole.permissions?.includes(permission) || false
}
