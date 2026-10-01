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
   *
   * Os perfis de acesso agora são independentes dos cargos.
   *
   * Cargo:
   *   Vendedor
   *   Motorista
   *   Gerente
   *
   * Perfil de acesso:
   *   Administrador
   *   Gestão de RH
   *   Funcionário
   */
  initializeAccessRoles()

  const accessRoles = getAccessRoles()

  /*
   * ============================================================
   * CARGOS
   * ============================================================
   *
   * O sistema não cria mais admin, gestao_rh ou funcionario
   * como cargos novos.
   *
   * Os registros antigos são preservados para não quebrar
   * funcionários que ainda possam possuir roleId/roleName.
   *
   * A partir de agora, novos cargos são cadastrados pela tela
   * de Cargos.
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
   *
   * Usuários antigos utilizavam:
   *
   * roleId
   * roleName
   * role
   *
   * Agora o sistema utiliza:
   *
   * accessRoleId
   * accessRoleName
   *
   * Os campos antigos não são removidos para evitar quebrar
   * registros existentes.
   */

  users = users.map((user) => {
    /*
     * Se o usuário já possui perfil de acesso, não precisamos
     * descobrir novamente.
     */
    if (user.accessRoleId || user.accessRoleName) {
      return user
    }

    /*
     * Tenta descobrir o perfil antigo através do nome utilizado
     * anteriormente.
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
     * Caso não encontre pelo nome, tenta pelo roleId antigo.
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
     * Se encontrou um perfil correspondente, adiciona os novos
     * campos ao usuário.
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
     * O usuário admin sempre deve utilizar o perfil admin.
     */
    adminUser.accessRoleId = adminAccessRole?.id || 1

    adminUser.accessRoleName = adminAccessRole?.name || 'admin'

    /*
     * Mantemos os campos antigos apenas para compatibilidade.
     */
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
 *
 * Estas funções continuam existindo porque "roles" agora
 * representa CARGOS profissionais.
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
  return JSON.parse(localStorage.getItem('loggedUser'))
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
