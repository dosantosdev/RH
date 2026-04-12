import { useState } from 'react'
import { logout } from '../services/auth'

import Employees from './Employees'
import Users from './Users'
import Roles from './Roles'

function Dashboard({ user, setUser }) {
  const [page, setPage] = useState('home')

  function handleLogout() {
    logout()
    setUser(null)
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <p>Usuário: {user.username}</p>
      <p>Cargo: {user.role}</p>

      {/* 🧭 Navegação */}
      <button onClick={() => setPage('home')}>Início</button>
      <button onClick={() => setPage('employees')}>
        Funcionários
      </button>

      {/* 🔐 Só admin vê */}
      {user.role === 'admin' && (
        <>
          <button onClick={() => setPage('users')}>
            Usuários
          </button>

          <button onClick={() => setPage('roles')}>
            Cargos
          </button>
        </>
      )}

      <hr />

      {page === 'home' && <h2>Bem-vindo</h2>}
      {page === 'employees' && <Employees />}
      {page === 'users' && <Users />}
      {page === 'roles' && <Roles />}

      <br />

      <button onClick={handleLogout}>Sair</button>
    </div>
  )
}

export default Dashboard