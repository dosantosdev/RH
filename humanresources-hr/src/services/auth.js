// 🔐 Inicializa sistema (admin + cargos padrão)
export function initializeSystem() {
  const users = JSON.parse(localStorage.getItem('users'))
  const roles = JSON.parse(localStorage.getItem('roles'))

  // 🏢 Cria cargos padrão se não existirem
  if (!roles) {
    const defaultRoles = [
      {
        name: 'admin',
        permissions: ['all']
      },
      {
        name: 'gestao_rh',
        permissions: ['create_user', 'view_employees']
      },
      {
        name: 'funcionario',
        permissions: ['view_employees']
      }
    ]

    localStorage.setItem('roles', JSON.stringify(defaultRoles))
  }

  // 👑 Cria admin padrão se não existir
  if (!users || users.length === 0) {
    const defaultAdmin = [
      {
        username: 'admin',
        password: '123',
        role: 'admin'
      }
    ]

    localStorage.setItem('users', JSON.stringify(defaultAdmin))
  }
}

// 🔐 Buscar cargos
export function getRoles() {
  return JSON.parse(localStorage.getItem('roles')) || []
}

// 🔐 Criar novo cargo (SÓ ADMIN deve usar)
export function addRole(role) {
  const roles = getRoles()
  roles.push(role)
  localStorage.setItem('roles', JSON.stringify(roles))
}

// 🔐 Registrar usuário
export function register(user) {
  const users = JSON.parse(localStorage.getItem('users')) || []
  users.push(user)
  localStorage.setItem('users', JSON.stringify(users))
}

// 🔐 Login com username (não email mais)
export function login(username, password) {
  const users = JSON.parse(localStorage.getItem('users')) || []

  const user = users.find(
    (u) => u.username === username && u.password === password
  )

  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user))
    return user
  }

  return null
}

// 🔐 Usuário atual
export function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'))
}

// 🔐 Logout
export function logout() {
  localStorage.removeItem('currentUser')
}