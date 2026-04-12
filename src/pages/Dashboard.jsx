import { useState } from 'react'
import { logout, register } from '../services/auth'

function Dashboard({ user, setUser }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('rh')

  function handleLogout() {
    logout()
    setUser(null)
  }

  // 🧑‍💼 Cadastro de usuário (APENAS ADMIN)
  function handleRegisterUser() {
    register({ email, password, role })
    alert('Usuário criado com sucesso!')
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <p>Email: {user.email}</p>
      <p>Permissão: {user.role}</p>

      {/* 🔒 Só ADMIN vê isso */}
      {user.role === 'admin' && (
        <div>
          <h2>Cadastrar novo usuário</h2>

          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <select onChange={(e) => setRole(e.target.value)}>
            <option value="rh">RH</option>
            <option value="admin">Admin</option>
          </select>

          <br /><br />

          <button onClick={handleRegisterUser}>
            Criar usuário
          </button>
        </div>
      )}

      <button onClick={handleLogout}>Sair</button>
    </div>
  )
}

export default Dashboard