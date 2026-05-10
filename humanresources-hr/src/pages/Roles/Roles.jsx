import { useState, useEffect } from 'react'
import './roles.css'

import RoleForm from '../../components/roles/RoleForm'
import RoleList from '../../components/roles/RoleList'

import { hasPermission } from '../../services/permissions'

export default function Roles() {
  const initialRole = {
    name: '',
    description: '',
    active: true,
    permissions: []
  }

  // 🔒 BLOQUEIA ACESSO À PÁGINA
  if (!hasPermission('roles_view')) {
    return <h2>Acesso negado</h2>
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

    // 🔒 BLOQUEIA CRIAÇÃO
    if (!editingId && !hasPermission('roles_create')) {
      alert('Você não tem permissão para criar cargos')

      return
    }

    // 🔒 BLOQUEIA EDIÇÃO
    if (editingId && !hasPermission('roles_edit')) {
      alert('Você não tem permissão para editar cargos')

      return
    }

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
    // 🔒 BLOQUEIA EDIÇÃO
    if (!hasPermission('roles_edit')) {
      alert('Você não tem permissão para editar cargos')

      return
    }

    setRole(r)

    setEditingId(r.id)
  }

  function handleDelete(id) {
    // 🔒 BLOQUEIA EXCLUSÃO
    if (!hasPermission('roles_delete')) {
      alert('Você não tem permissão para excluir cargos')

      return
    }

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
