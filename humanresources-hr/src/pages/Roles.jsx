import { useState, useEffect } from 'react'
import { getRoles, addRole } from '../services/auth'

function Roles() {
  const [roles, setRoles] = useState([])
  const [roleName, setRoleName] = useState('')

  useEffect(() => {
    setRoles(getRoles())
  }, [])

  function handleAddRole() {
    const newRole = {
      name: roleName,
      permissions: []
    }

    addRole(newRole)
    setRoles(getRoles())
    setRoleName('')
  }

  return (
    <div>
      <h2>Cargos</h2>

      <input
        placeholder="Nome do cargo"
        value={roleName}
        onChange={(e) => setRoleName(e.target.value)}
      />

      <button onClick={handleAddRole}>
        Criar Cargo
      </button>

      <ul>
        {roles.map((r) => (
          <li key={r.name}>{r.name}</li>
        ))}
      </ul>
    </div>
  )
}

export default Roles