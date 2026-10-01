import { useState, useEffect } from 'react'

import './users.css'

import UserForm from '../../components/users/UserForm'
import UserList from '../../components/users/UserList'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

import { hasPermission } from '../../services/permissions'
import { getAccessRoles } from '../../services/accessRoles'

export default function Users() {
  const initialUser = {
    name: '',
    username: '',
    password: '',

    /*
     * ============================================================
     * PERFIL DE ACESSO
     * ============================================================
     *
     * O usuário agora recebe um PERFIL DE ACESSO.
     *
     * O perfil define o que ele pode fazer dentro do sistema.
     */
    accessRoleId: '',
    accessRoleName: '',

    /*
     * Mantemos roleId e roleName por compatibilidade com usuários
     * antigos que ainda possam possuir esses campos.
     *
     * Eles não serão mais utilizados para definir permissões.
     */
    roleId: '',
    roleName: '',

    employeeId: '',
    active: true
  }

  const [user, setUser] = useState(initialUser)

  const [users, setUsers] = useState([])

  /*
   * Perfis de acesso disponíveis para associação ao usuário.
   */
  const [accessRoles, setAccessRoles] = useState([])

  const [employees, setEmployees] = useState([])

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  const { toast, showToast } = useToast()

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users')) || []

    const storedEmployees = JSON.parse(localStorage.getItem('employees')) || []

    /*
     * Carrega os perfis de acesso através do serviço responsável
     * por eles.
     */
    const storedAccessRoles = getAccessRoles()

    setUsers(storedUsers)

    setAccessRoles(storedAccessRoles)

    setEmployees(storedEmployees)
  }, [])

  // 🔒 BLOQUEIA ACESSO À PÁGINA
  if (!hasPermission('users_view')) {
    return <h2>Acesso negado</h2>
  }

  /*
   * ============================================================
   * BUSCA DE USUÁRIOS
   * ============================================================
   */

  const filteredUsers = users.filter((u) =>
    u.name?.toLowerCase().includes(search.toLowerCase())
  )

  /*
   * ============================================================
   * ALTERAÇÃO DOS CAMPOS
   * ============================================================
   */

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setUser({
      ...user,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  /*
   * ============================================================
   * SALVAR / ATUALIZAR USUÁRIO
   * ============================================================
   */

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

    /*
     * Não permitimos salvar um usuário sem perfil de acesso.
     *
     * O administrador do sistema também deve possuir um perfil.
     */
    if (!user.accessRoleId) {
      showToast('Selecione um perfil de acesso para o usuário', 'warning')

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

  /*
   * ============================================================
   * EDITAR USUÁRIO
   * ============================================================
   */

  function handleEdit(u) {
    // 🔒 BLOQUEIA EDIÇÃO
    if (!hasPermission('users_edit')) {
      showToast('Você não tem permissão para editar usuários', 'warning')

      return
    }

    /*
     * Copiamos os dados do usuário para o formulário.
     *
     * Os campos antigos roleId/roleName continuam sendo
     * preservados para compatibilidade.
     */
    setUser({
      ...initialUser,
      ...u,

      employeeId: u.employeeId || '',

      accessRoleId: u.accessRoleId || '',
      accessRoleName: u.accessRoleName || '',

      roleId: u.roleId || '',
      roleName: u.roleName || ''
    })

    setEditingId(u.id)
  }

  /*
   * ============================================================
   * SOLICITAR EXCLUSÃO
   * ============================================================
   */

  function handleDelete(id) {
    // 🔒 BLOQUEIA EXCLUSÃO
    if (!hasPermission('users_delete')) {
      showToast('Você não tem permissão para excluir usuários', 'warning')

      return
    }

    setDeleteId(id)
  }

  /*
   * ============================================================
   * CONFIRMAR EXCLUSÃO
   * ============================================================
   */

  function confirmDeleteUser() {
    const updated = users.filter((u) => u.id !== deleteId)

    localStorage.setItem('users', JSON.stringify(updated))

    setUsers(updated)

    setDeleteId(null)

    showToast('Usuário excluído!', 'success')
  }

  return (
    <div className="users-page">
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
