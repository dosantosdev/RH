// 🔐 Inicializa sistema com admin padrão
export function initializeSystem() {
  const users = JSON.parse(localStorage.getItem('users'))

  if (!users || users.length === 0) {
    const defaultAdmin = [
      {
        email: 'admin@admin.com',
        password: '123',
        role: 'admin'
      }
    ]

    localStorage.setItem('users', JSON.stringify(defaultAdmin))
  }
}

// 🔐 Registrar usuário
export function register(user) {
  const users = JSON.parse(localStorage.getItem('users')) || []
  users.push(user)
  localStorage.setItem('users', JSON.stringify(users))
}

// 🔐 Login
export function login(email, password) {
  const users = JSON.parse(localStorage.getItem('users')) || []

  const user = users.find(
    (u) => u.email === email && u.password === password
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