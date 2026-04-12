// 🔐 Função para registrar um usuário
export function register(user) {
  // Busca usuários já salvos no localStorage
  const users = JSON.parse(localStorage.getItem('users')) || []

  // Adiciona o novo usuário na lista
  users.push(user)

  // Salva novamente no localStorage
  localStorage.setItem('users', JSON.stringify(users))
}

// 🔐 Função de login
export function login(email, password) {
  // Busca todos os usuários
  const users = JSON.parse(localStorage.getItem('users')) || []

  // Procura um usuário com email e senha iguais
  const user = users.find(
    (u) => u.email === email && u.password === password
  )

  // Se encontrou, salva como usuário logado
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user))
    return user
  }

  // Se não encontrou, retorna null
  return null
}

// 🔐 Pega usuário logado
export function getCurrentUser() {
  return JSON.parse(localStorage.getItem('currentUser'))
}

// 🔐 Logout
export function logout() {
  localStorage.removeItem('currentUser')
}

// Inicializa sistema com admin padrão (se não existir)
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