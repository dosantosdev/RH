import { useState, useEffect } from 'react'

import './users.css'

import UserForm from '../../components/users/UserForm'
import UserList from '../../components/users/UserList'
import ConfirmModal from '../../components/ui/ConfirmModal'

import { hasPermission } from '../../services/permissions'

export default function Users() {
  const initialUser = {
    name: '',
    username: '',
    password: '',
    roleId: '',
    roleName: '',
    active: true
  }

  // 🔒 BLOQUEIA ACESSO
  if (!hasPermission('users_view')) {
    return <h2>Acesso negado</h2>
  }

  const [user, setUser] = useState(initialUser)

  const [users, setUsers] = useState([])

  const [roles, setRoles] = useState([])

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users')) || []

    const storedRoles = JSON.parse(localStorage.getItem('roles')) || []

    setUsers(storedUsers)

    setRoles(storedRoles)
  }, [])

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setUser({
      ...user,

      [name]: type === 'checkbox' ? checked : value
    })
  }

  function handleSubmit(e) {
    e.preventDefault()

    // 🔒 BLOQUEIA CRIAÇÃO
    if (!editingId && !hasPermission('users_create')) {
      alert('Você não tem permissão para cadastrar usuários')

      return
    }

    // 🔒 BLOQUEIA EDIÇÃO
    if (editingId && !hasPermission('users_edit')) {
      alert('Você não tem permissão para editar usuários')

      return
    }

    let updated

    if (editingId) {
      updated = users.map((u) =>
        u.id === editingId
          ? {
              ...user,
              id: editingId
            }
          : u
      )
    } else {
      const newUser = {
        ...user,
        id: Date.now()
      }

      updated = [...users, newUser]
    }

    localStorage.setItem('users', JSON.stringify(updated))

    setUsers(updated)

    alert(editingId ? 'Usuário atualizado!' : 'Usuário cadastrado!')

    setUser(initialUser)

    setEditingId(null)
  }

  function handleEdit(u) {
    // 🔒 BLOQUEIA EDIÇÃO
    if (!hasPermission('users_edit')) {
      alert('Você não tem permissão para editar usuários')

      return
    }

    setUser(u)

    setEditingId(u.id)
  }

  function handleDelete(id) {
    // 🔒 BLOQUEIA EXCLUSÃO
    if (!hasPermission('users_delete')) {
      alert('Você não tem permissão para excluir usuários')

      return
    }

    setDeleteId(id)
  }

  function confirmDeleteUser() {
    const updated = users.filter((u) => u.id !== deleteId)

    localStorage.setItem('users', JSON.stringify(updated))

    setUsers(updated)

    setDeleteId(null)
  }

  return (
    <div className="users-page">
      <UserForm
        user={user}
        search={search}
        setSearch={setSearch}
        roles={roles}
        editingId={editingId}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        setUser={setUser}
      />

      <UserList
        users={filteredUsers}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir usuário"
        message="Tem certeza que deseja excluir este usuário?"
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
