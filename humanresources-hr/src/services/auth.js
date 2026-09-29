// 🔐 Inicializa o sistema com os dados mínimos necessários para o login.
export function initializeSystem() {
  let roles = JSON.parse(localStorage.getItem('roles')) || []
  let users = JSON.parse(localStorage.getItem('users')) || []

  // Cargos padrão do sistema.
  // Os IDs são fixos para que usuários possam manter uma referência estável.
  const defaultRoles = [
    {
      id: 1,
      name: 'admin',
      description: 'Administrador do sistema',
      active: true,
      requiresCnh: false,
      requiredCnhCategories: [],
      requiredCertificates: [],
      permissions: ['all']
    },
    {
      id: 2,
      name: 'gestao_rh',
      description: 'Gestão de Recursos Humanos',
      active: true,
      requiresCnh: false,
      requiredCnhCategories: [],
      requiredCertificates: [],
      permissions: ['employees_view', 'employees_create', 'employees_edit']
    },
    {
      id: 3,
      name: 'funcionario',
      description: 'Funcionário',
      active: true,
      requiresCnh: false,
      requiredCnhCategories: [],
      requiredCertificates: [],
      permissions: ['employees_view']
    }
  ]

  // Se não existem cargos, cria os cargos padrão.
  if (roles.length === 0) {
    roles = defaultRoles
  } else {
    // Garante que o cargo admin exista mesmo em uma instalação antiga.
    const adminRole = roles.find(
      (role) => role.id === 1 || role.name === 'admin'
    )

    if (!adminRole) {
      roles.unshift(defaultRoles[0])
    } else {
      // Corrige instalações antigas que tinham admin sem ID/permissões adequadas.
      adminRole.id = 1
      adminRole.name = 'admin'
      adminRole.active = true
      adminRole.permissions = ['all']
    }
  }

  localStorage.setItem('roles', JSON.stringify(roles))

  // Cria o administrador padrão quando não existe nenhum usuário.
  if (users.length === 0) {
    users = [
      {
        id: 1,
        name: 'Administrador do sistema',
        username: 'admin',
        password: '123',
        roleId: 1,
        roleName: 'admin',
        active: true
      }
    ]
  }

  // Migra usuários antigos que usavam role: 'admin' ou que ainda não tinham roleId.
  users = users.map((user) => {
    if (user.roleId) return user

    const roleName = user.role || user.roleName
    const role = roles.find((item) => item.name === roleName)

    if (role) {
      return {
        ...user,
        roleId: role.id,
        roleName: role.name
      }
    }

    return user
  })

  // Garante que exista um usuário admin funcional.
  const adminUser = users.find((user) => user.username === 'admin')

  if (!adminUser) {
    users.unshift({
      id: 1,
      name: 'Administrador do sistema',
      username: 'admin',
      password: '123',
      roleId: 1,
      roleName: 'admin',
      active: true
    })
  } else {
    adminUser.roleId = 1
    adminUser.roleName = 'admin'
    adminUser.role = 'admin'

    if (adminUser.active === undefined) {
      adminUser.active = true
    }
  }

  localStorage.setItem('users', JSON.stringify(users))
}

export function getRoles() {
  return JSON.parse(localStorage.getItem('roles')) || []
}

export function addRole(role) {
  const roles = getRoles()
  roles.push(role)
  localStorage.setItem('roles', JSON.stringify(roles))
}

export function register(user) {
  const users = JSON.parse(localStorage.getItem('users')) || []
  users.push(user)
  localStorage.setItem('users', JSON.stringify(users))
}

export function login(username, password) {
  const users = JSON.parse(localStorage.getItem('users')) || []

  const user = users.find(
    (item) =>
      item.username === username &&
      item.password === password &&
      item.active !== false
  )

  if (!user) return null

  localStorage.setItem('loggedUser', JSON.stringify(user))
  localStorage.setItem('currentUser', JSON.stringify(user))

  return user
}

export function getCurrentUser() {
  return JSON.parse(localStorage.getItem('loggedUser'))
}

export function logout() {
  localStorage.removeItem('loggedUser')
  localStorage.removeItem('currentUser')
}
