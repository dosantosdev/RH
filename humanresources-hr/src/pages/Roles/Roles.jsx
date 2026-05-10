import { useState, useEffect } from 'react'
import './roles.css'

import RoleForm from '../../components/roles/RoleForm'
import RoleList from '../../components/roles/RoleList'

export default function Roles() {
  const initialRole = {
    name: '',
    description: '',
    active: true
  }

  const [role, setRole] = useState(initialRole)

  const [roles, setRoles] = useState([])

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('roles')) || []

    setRoles(stored)
  }, [])

  const filteredRoles = roles.filter((role) =>
    role.name?.toLowerCase().includes(search.toLowerCase())
  )

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setRole({
      ...role,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  function handleSubmit(e) {
    e.preventDefault()

    let updated

    if (editingId) {
      updated = roles.map((r) =>
        r.id === editingId
          ? {
              ...role,
              id: editingId
            }
          : r
      )
    } else {
      const newRole = {
        ...role,
        id: Date.now()
      }

      updated = [...roles, newRole]
    }

    localStorage.setItem('roles', JSON.stringify(updated))

    setRoles(updated)

    alert(editingId ? 'Cargo atualizado!' : 'Cargo cadastrado!')

    setRole(initialRole)
    setEditingId(null)
  }

  function handleEdit(r) {
    setRole(r)
    setEditingId(r.id)
  }

  function handleDelete(id) {
    const confirmDelete = confirm('Deseja excluir este cargo?')

    if (!confirmDelete) return

    const updated = roles.filter((r) => r.id !== id)

    localStorage.setItem('roles', JSON.stringify(updated))

    setRoles(updated)
  }

  return (
    <div className="roles-page">
      <RoleForm
        role={role}
        editingId={editingId}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />

      <div className="roles-search">
        <input
          type="text"
          placeholder="🔍 Buscar cargo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <RoleList
        roles={filteredRoles}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
      />
    </div>
  )
}
