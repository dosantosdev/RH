import { useState, useEffect } from 'react'

export default function Users() {
  const [users, setUsers] = useState([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [roles, setRoles] = useState([])

  // carregar usuários
  useEffect(() => {
    const savedUsers = JSON.parse(localStorage.getItem('users')) || []
    setUsers(savedUsers)

    const savedRoles = JSON.parse(localStorage.getItem('roles')) || []
    setRoles(savedRoles)
  }, [])

  function handleAddUser() {
    if (!username || !password) return

    const newUser = {
      id: Date.now(),
      username,
      password,
      role
    }

    const updatedUsers = [...users, newUser]

    setUsers(updatedUsers)
    localStorage.setItem('users', JSON.stringify(updatedUsers))

    setUsername('')
    setPassword('')
    setRole('')
  }

  function handleDeleteUser(id) {
    const updated = users.filter((u) => u.id !== id)
    setUsers(updated)
    localStorage.setItem('users', JSON.stringify(updated))
  }

  return (
    <div className="container">
      <h2>Cadastrar Usuários</h2>

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

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="">Selecione o cargo</option>

        {roles.map((r) => (
          <option key={r.id} value={r.name}>
            {r.name}
          </option>
        ))}
      </select>

      <button onClick={handleAddUser}>Cadastrar</button>

      <ul>
        {users.map((user) => (
          <li key={user.id}>
            {user.username} ({user.role})
            <button onClick={() => handleDeleteUser(user.id)}>Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
