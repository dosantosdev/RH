import { useState } from 'react'
import { logout } from '../services/auth'

// Importa a nova página
import Employees from './Employees'

function Dashboard({ user, setUser }) {
  // 🧠 Controle de navegação interna
  const [page, setPage] = useState('home')

  function handleLogout() {
    logout()
    setUser(null)
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <p>Email: {user.email}</p>
      <p>Permissão: {user.role}</p>

      {/* 🧭 Navegação */}
      <button onClick={() => setPage('home')}>Início</button>
      <button onClick={() => setPage('employees')}>
        Funcionários
      </button>

      <hr />

      {/* 📄 Renderização de páginas */}
      {page === 'home' && <h2>Bem-vindo ao sistema de RH</h2>}

      {page === 'employees' && <Employees />}

      <br />

      <button onClick={handleLogout}>Sair</button>
    </div>
  )
}

export default Dashboard