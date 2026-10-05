import { useState, useEffect } from 'react'

import './users.css'

import UserForm from '../../components/users/UserForm'
import UserList from '../../components/users/UserList'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

import { hasPermission } from '../../services/permissions'
import { getAccessRoles } from '../../services/accessRoles'
import { updateUser } from '../../services/auth'

export default function Users() {
  const initialUser = {
    name: '',
    username: '',
    password: '',

    /*
     * ============================================================
     * PERFIL DE ACESSO
     * ============================================================
     */

    accessRoleId: '',
    accessRoleName: '',

    /*
     * Mantidos por compatibilidade com usuários antigos.
     */
    roleId: '',
    roleName: '',

    /*
     * Funcionário vinculado ao usuário.
     */
    employeeId: '',

    active: true
  }

  const [user, setUser] = useState(initialUser)

  const [users, setUsers] = useState([])

  const [accessRoles, setAccessRoles] = useState([])

  const [employees, setEmployees] = useState([])

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  const { toast, showToast } = useToast()

  /*
   * ============================================================
   * CARREGAMENTO
   * ============================================================
   */

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users')) || []

    const storedEmployees = JSON.parse(localStorage.getItem('employees')) || []

    const storedAccessRoles = getAccessRoles()

    setUsers(storedUsers)

    setAccessRoles(storedAccessRoles)

    setEmployees(storedEmployees)
  }, [])

  /*
   * ============================================================
   * PERMISSÃO
   * ============================================================
   */

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

    /*
     * 🔒 BLOQUEIA CRIAÇÃO
     */

    if (!editingId && !hasPermission('users_create')) {
      showToast('Você não tem permissão para cadastrar usuários', 'warning')

      return
    }

    /*
     * 🔒 BLOQUEIA EDIÇÃO
     */

    if (editingId && !hasPermission('users_edit')) {
      showToast('Você não tem permissão para editar usuários', 'warning')

      return
    }

    /*
     * PERFIL DE ACESSO É OBRIGATÓRIO.
     */

    if (!user.accessRoleId) {
      showToast('Selecione um perfil de acesso para o usuário', 'warning')

      return
    }

    let updated

    /*
     * ==========================================================
     * EDIÇÃO
     * ==========================================================
     */

    if (editingId) {
      const updatedUser = {
        ...user,

        id: editingId
      }

      /*
       * Usa o serviço centralizado.
       *
       * Além de atualizar "users", ele verifica se este é
       * o usuário atualmente logado e atualiza a sessão.
       */
      updated = updateUser(updatedUser)

      /*
       * Verifica se o usuário alterado é o usuário atualmente
       * logado.
       */
      const loggedUser = JSON.parse(localStorage.getItem('loggedUser'))

      if (loggedUser && Number(loggedUser.id) === Number(editingId)) {
        /*
         * O vínculo de funcionário agora já está disponível
         * imediatamente na sessão atual.
         */
        showToast(
          'Usuário atualizado! O vínculo foi aplicado imediatamente.',
          'success'
        )
      } else {
        showToast('Usuário atualizado!', 'success')
      }
    } else {
      /*
       * ========================================================
       * NOVO USUÁRIO
       * ========================================================
       */

      const newUser = {
        ...user,

        id: Date.now()
      }

      updated = [...users, newUser]

      localStorage.setItem('users', JSON.stringify(updated))

      showToast('Usuário cadastrado!', 'success')
    }

    /*
     * Atualiza a lista exibida na tela.
     */
    setUsers(updated)

    /*
     * Limpa o formulário.
     */
    setUser(initialUser)

    setEditingId(null)
  }

  /*
   * ============================================================
   * EDITAR USUÁRIO
   * ============================================================
   */

  function handleEdit(u) {
    /*
     * 🔒 BLOQUEIA EDIÇÃO
     */

    if (!hasPermission('users_edit')) {
      showToast('Você não tem permissão para editar usuários', 'warning')

      return
    }

    /*
     * Copiamos todos os dados do usuário para o formulário.
     *
     * O employeeId é preservado.
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
    /*
     * 🔒 BLOQUEIA EXCLUSÃO
     */

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

    /*
     * Se por algum motivo o usuário excluído estiver logado,
     * removemos também a sessão para evitar uma sessão inválida.
     */
    const loggedUser = JSON.parse(localStorage.getItem('loggedUser'))

    if (loggedUser && Number(loggedUser.id) === Number(deleteId)) {
      localStorage.removeItem('loggedUser')

      localStorage.removeItem('currentUser')
    }

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
