import { useState, useEffect } from 'react'

import './users.css'

import UserForm from '../../components/users/UserForm'
import UserList from '../../components/users/UserList'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

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

  const { toast, showToast } = useToast()

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
      showToast('Você não tem permissão para cadastrar usuários', 'warning')

      return
    }

    // 🔒 BLOQUEIA EDIÇÃO
    if (editingId && !hasPermission('users_edit')) {
      showToast('Você não tem permissão para editar usuários', 'warning')

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

    showToast(
      editingId ? 'Usuário atualizado!' : 'Usuário cadastrado!',
      'success'
    )

    setUser(initialUser)

    setEditingId(null)
  }

  function handleEdit(u) {
    // 🔒 BLOQUEIA EDIÇÃO
    if (!hasPermission('users_edit')) {
      showToast('Você não tem permissão para editar usuários', 'warning')

      return
    }

    setUser(u)

    setEditingId(u.id)
  }

  function handleDelete(id) {
    // 🔒 BLOQUEIA EXCLUSÃO
    if (!hasPermission('users_delete')) {
      showToast('Você não tem permissão para excluir usuários', 'warning')

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

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
