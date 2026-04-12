import { useState, useEffect } from 'react'
import { register, getRoles } from '../services/auth'

function Users() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [roles, setRoles] = useState([])

  // 🔄 Carrega cargos existentes
  useEffect(() => {
    setRoles(getRoles())
  }, [])

  function handleCreateUser() {
    register({ username, password, role })

    alert('Usuário criado!')

    setUsername('')
    setPassword('')
    setRole('')
  }

  return (
    <div>
      <h2>Criar Usuário</h2>

      <input
        placeholder="Usuário"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {/* 🏢 Seleção de cargo */}
      <select onChange={(e) => setRole(e.target.value)}>
        <option>Selecione um cargo</option>

        {roles.map((r) => (
          <option key={r.name} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>

      <br /><br />

      <button onClick={handleCreateUser}>
        Criar Usuário
      </button>
    </div>
  )
}

export default Users