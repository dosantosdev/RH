import { useState, useEffect } from 'react'

export default function Roles() {
  const [roles, setRoles] = useState([])
  const [newRole, setNewRole] = useState('')

  // carregar cargos salvos
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('roles')) || []
    setRoles(saved)
  }, [])

  // salvar novo cargo
  function handleAddRole() {
    if (!newRole.trim()) return

    const updatedRoles = [
      ...roles,
      {
        id: Date.now(),
        name: newRole
      }
    ]

    setRoles(updatedRoles)
    localStorage.setItem('roles', JSON.stringify(updatedRoles))

    setNewRole('')
  }

  // excluir cargo
  function handleDeleteRole(id) {
    const updated = roles.filter((role) => role.id !== id)
    setRoles(updated)
    localStorage.setItem('roles', JSON.stringify(updated))
  }

  return (
    <div className="container">
      <h2>Cadastrar Cargos</h2>

      <input
        placeholder="Nome do cargo"
        value={newRole}
        onChange={(e) => setNewRole(e.target.value)}
      />

      <button onClick={handleAddRole}>Adicionar</button>

      <ul>
        {roles.map((role) => (
          <li key={role.id}>
            {role.name}

            <button onClick={() => handleDeleteRole(role.id)}>Excluir</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
