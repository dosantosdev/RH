import { useState, useEffect } from 'react'

import './users.css'

import UserForm from '../../components/users/UserForm'
import UserList from '../../components/users/UserList'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

import { hasPermission } from '../../services/permissions'
import { apiRequest } from '../../services/api'
import {
  fetchUsers,
  fetchUserAccessRoles,
  createApiUser,
  updateApiUser,
  deactivateApiUser
} from '../../services/usersApi'

const initialUser = {
  name: '',
  username: '',
  password: '',
  email: '',
  accessRoleId: '',
  accessRoleName: '',
  roleId: '',
  roleName: '',
  employeeId: '',
  active: true
}

export default function Users() {
  const [user, setUser] = useState(initialUser)
  const [users, setUsers] = useState([])
  const [accessRoles, setAccessRoles] = useState([])
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast, showToast } = useToast()

  async function loadData() {
    setLoading(true)

    try {
      const [usersResult, rolesResult, employeesResult] = await Promise.all([
        fetchUsers(),
        fetchUserAccessRoles(),
        apiRequest('/employees')
      ])

      setUsers(usersResult)
      setAccessRoles(rolesResult)
      setEmployees(employeesResult)
    } catch (error) {
      console.error('Erro ao carregar usuários da API:', error)
      showToast(
        error.status === 403
          ? 'Você não tem permissão para consultar usuários.'
          : error.message || 'Não foi possível carregar os dados do banco.',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (!hasPermission('users_view')) {
    return <h2>Acesso negado</h2>
  }

  const filteredUsers = users.filter((item) =>
    `${item.name || ''} ${item.username || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  function handleChange(event) {
    const { name, value, type, checked } = event.target
    setUser((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (saving) return

    if (!editingId && !hasPermission('users_create')) {
      showToast('Você não tem permissão para cadastrar usuários.', 'warning')
      return
    }

    if (editingId && !hasPermission('users_edit')) {
      showToast('Você não tem permissão para editar usuários.', 'warning')
      return
    }

    if (!user.accessRoleId) {
      showToast('Selecione um perfil de acesso.', 'warning')
      return
    }

    if (!editingId && !user.password) {
      showToast('Informe uma senha inicial para o usuário.', 'warning')
      return
    }

    const payload = {
      name: user.name.trim(),
      username: user.username.trim(),
      email: user.email?.trim() || '',
      accessRoleId: user.accessRoleId,
      employeeId: user.employeeId || '',
      active: Boolean(user.active)
    }

    if (user.password) {
      payload.password = user.password
    }

    setSaving(true)

    try {
      if (editingId) {
        await updateApiUser(editingId, payload)
        showToast('Usuário atualizado no banco de dados.', 'success')
      } else {
        await createApiUser(payload)
        showToast('Usuário cadastrado no banco de dados.', 'success')
      }

      setUser(initialUser)
      setEditingId(null)
      await loadData()
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
      showToast(error.message || 'Não foi possível salvar o usuário.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(item) {
    if (!hasPermission('users_edit')) {
      showToast('Você não tem permissão para editar usuários.', 'warning')
      return
    }

    setUser({
      ...initialUser,
      ...item,
      password: '',
      employeeId: item.employeeId || '',
      accessRoleId: item.accessRoleId || '',
      accessRoleName: item.accessRoleName || ''
    })
    setEditingId(item.id)
  }

  function handleDelete(id) {
    if (!hasPermission('users_delete')) {
      showToast('Você não tem permissão para desativar usuários.', 'warning')
      return
    }

    if (String(id) === String(JSON.parse(localStorage.getItem('loggedUser') || '{}').id)) {
      showToast('Não é permitido desativar o próprio usuário.', 'warning')
      return
    }

    setDeleteId(id)
  }

  async function confirmDeleteUser() {
    if (!deleteId) return

    try {
      await deactivateApiUser(deleteId)
      setDeleteId(null)
      showToast('Usuário desativado.', 'success')
      await loadData()
    } catch (error) {
      showToast(error.message || 'Não foi possível desativar o usuário.', 'error')
    }
  }

  return (
    <div className="users-page">
      {loading && <p>Carregando usuários do banco de dados...</p>}

      <UserForm
        user={user}
        search={search}
        setSearch={setSearch}
        accessRoles={accessRoles}
        employees={employees}
        editingId={editingId}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        setUser={setUser}
        saving={saving}
      />

      {editingId && (
        <button
          type="button"
          onClick={() => {
            setUser(initialUser)
            setEditingId(null)
          }}
        >
          Cancelar edição
        </button>
      )}

      <UserList
        users={filteredUsers}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
      />

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Desativar usuário"
        message="Tem certeza que deseja desativar este usuário? O registro será mantido no banco para preservar o histórico."
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteId(null)}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
