import {
  getAccessRoles,
  initializeAccessRoles,
  getAccessRoleById,
  getAccessRoleByName
} from './accessRoles'

import { getStoredArray, setStored } from './storage'

// 🔐 Inicializa o sistema com os dados mínimos necessários para o login.
export function initializeSystem() {
  let roles = getStoredArray('roles')
  let users = getStoredArray('users')

  /*
   * ============================================================
   * PERFIS DE ACESSO
   * ============================================================
   */

  initializeAccessRoles()

  const accessRoles = getAccessRoles()

  /*
   * ============================================================
   * CARGOS
   * ============================================================
   */

  if (roles.length > 0) {
    setStored('roles', roles)
  }

  /*
   * ============================================================
   * USUÁRIO ADMINISTRADOR
   * ============================================================
   */

  if (users.length === 0) {
    const adminAccessRole = getAccessRoleByName('admin')

    users = [
      {
        id: 1,
        name: 'Administrador do sistema',
        username: 'admin',
        password: '123',

        accessRoleId: adminAccessRole?.id || 1,
        accessRoleName: adminAccessRole?.name || 'admin',

        // Mantidos por compatibilidade com dados antigos.
        roleId: '',
        roleName: '',

        active: true
      }
    ]
  }

  /*
   * ============================================================
   * MIGRAÇÃO DE USUÁRIOS ANTIGOS
   * ============================================================
   */

  users = users.map((user) => {
    /*
     * Se o usuário já possui perfil de acesso,
     * não precisamos descobrir novamente.
     */
    if (user.accessRoleId || user.accessRoleName) {
      return user
    }

    /*
     * Tenta descobrir o perfil antigo através
     * do nome utilizado anteriormente.
     */
    const legacyRoleName = user.roleName || user.role || ''

    let accessRole = null

    /*
     * Primeiro tenta pelo nome.
     */
    if (legacyRoleName) {
      accessRole = getAccessRoleByName(legacyRoleName)
    }

    /*
     * Caso não encontre pelo nome,
     * tenta pelo roleId antigo.
     */
    if (!accessRole && user.roleId) {
      const legacyRole = roles.find(
        (role) => Number(role.id) === Number(user.roleId)
      )

      if (legacyRole) {
        accessRole = getAccessRoleByName(legacyRole.name)
      }
    }

    /*
     * Se encontrou um perfil correspondente,
     * adiciona os novos campos ao usuário.
     */
    if (accessRole) {
      return {
        ...user,
        accessRoleId: accessRole.id,
        accessRoleName: accessRole.name
      }
    }

    return user
  })

  /*
   * ============================================================
   * GARANTE QUE O ADMIN EXISTA
   * ============================================================
   */

  const adminAccessRole =
    getAccessRoleByName('admin') ||
    accessRoles.find((role) => Number(role.id) === 1)

  const adminUser = users.find((user) => user.username === 'admin')

  if (!adminUser) {
    users.unshift({
      id: 1,
      name: 'Administrador do sistema',
      username: 'admin',
      password: '123',

      accessRoleId: adminAccessRole?.id || 1,
      accessRoleName: adminAccessRole?.name || 'admin',

      roleId: '',
      roleName: '',

      active: true
    })
  } else {
    /*
     * O usuário admin sempre deve utilizar
     * o perfil admin.
     */
    adminUser.accessRoleId = adminAccessRole?.id || 1

    adminUser.accessRoleName = adminAccessRole?.name || 'admin'

    if (adminUser.active === undefined) {
      adminUser.active = true
    }
  }

  setStored('users', users)
}

/*
 * ============================================================
 * CARGOS
 * ============================================================
 */

export function getRoles() {
  return getStoredArray('roles')
}

export function addRole(role) {
  const roles = getRoles()

  const updatedRoles = [...roles, role]

  setStored('roles', updatedRoles)

  return updatedRoles
}

/*
 * ============================================================
 * USUÁRIOS
 * ============================================================
 */

export function register(user) {
  const users = getStoredArray('users')

  const updatedUsers = [...users, user]

  setStored('users', updatedUsers)

  return updatedUsers
}

/*
 * ============================================================
 * ATUALIZAÇÃO DO USUÁRIO
 * ============================================================
 *
 * Atualiza o cadastro do usuário e, caso ele seja o usuário
 * atualmente logado, atualiza também a sessão imediatamente.
 *
 * Isso evita a necessidade de logout/login quando, por exemplo,
 * vinculamos um funcionário ao usuário.
 */

export function updateUser(updatedUser) {
  const users = getStoredArray('users')

  const updatedUsers = users.map((user) =>
    Number(user.id) === Number(updatedUser.id) ? updatedUser : user
  )

  /*
   * Salva a lista completa de usuários.
   */
  setStored('users', updatedUsers)

  /*
   * Verifica quem está logado neste momento.
   */
  const loggedUser = getCurrentUser()

  /*
   * Se o usuário alterado é justamente o usuário logado,
   * atualizamos imediatamente a sessão.
   */
  if (loggedUser && Number(loggedUser.id) === Number(updatedUser.id)) {
    localStorage.setItem('loggedUser', JSON.stringify(updatedUser))

    localStorage.setItem('currentUser', JSON.stringify(updatedUser))
  }

  return updatedUsers
}

/*
 * ============================================================
 * SINCRONIZAÇÃO DO USUÁRIO LOGADO
 * ============================================================
 *
 * Esta função pode ser utilizada quando alguma outra parte
 * do sistema alterar dados de um usuário.
 *
 * Exemplo:
 *
 * - vínculo funcionário;
 * - perfil de acesso;
 * - status;
 * - permissões;
 * - outros dados do usuário.
 */

export function syncLoggedUser(updatedUser) {
  const loggedUser = getCurrentUser()

  if (!loggedUser || Number(loggedUser.id) !== Number(updatedUser.id)) {
    return false
  }

  localStorage.setItem('loggedUser', JSON.stringify(updatedUser))

  localStorage.setItem('currentUser', JSON.stringify(updatedUser))

  return true
}

/*
 * ============================================================
 * LOGIN
 * ============================================================
 */

export function login(username, password) {
  const users = getStoredArray('users')

  const user = users.find(
    (item) =>
      item.username === username &&
      item.password === password &&
      item.active !== false
  )

  if (!user) {
    return null
  }

  localStorage.setItem('loggedUser', JSON.stringify(user))

  localStorage.setItem('currentUser', JSON.stringify(user))

  return user
}

/*
 * ============================================================
 * USUÁRIO ATUAL
 * ============================================================
 */

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('loggedUser'))
  } catch {
    return null
  }
}

/*
 * ============================================================
 * LOGOUT
 * ============================================================
 */

export function logout() {
  localStorage.removeItem('loggedUser')

  localStorage.removeItem('currentUser')
}
