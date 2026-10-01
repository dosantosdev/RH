import { useEffect, useState } from 'react'

import './accessRoles.css'

import { permissions } from '../../data/permissions'

import {
  getAccessRoles,
  addAccessRole,
  updateAccessRole,
  deleteAccessRole
} from '../../services/accessRoles'

import { hasPermission } from '../../services/permissions'

import ConfirmModal from '../../components/ui/ConfirmModal'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

export default function AccessRoles() {
  const initialAccessRole = {
    name: '',
    displayName: '',
    description: '',
    active: true,
    permissions: []
  }

  const [accessRole, setAccessRole] = useState(initialAccessRole)

  const [accessRoles, setAccessRoles] = useState([])

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  const { toast, showToast } = useToast()

  useEffect(() => {
    setAccessRoles(getAccessRoles())
  }, [])

  if (!hasPermission('access_roles_view')) {
    return <h2>Acesso negado</h2>
  }

  const filteredAccessRoles = accessRoles.filter((role) => {
    const searchValue = search.toLowerCase()

    return (
      role.displayName?.toLowerCase().includes(searchValue) ||
      role.name?.toLowerCase().includes(searchValue)
    )
  })

  /*
   * Verifica se o perfil que está sendo editado é o administrador.
   *
   * O perfil admin possui privilégios especiais e não deve ter
   * suas permissões ou status alterados.
   */
  const isEditingAdmin = editingId !== null && accessRole.name === 'admin'

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    /*
     * O perfil admin deve permanecer sempre ativo.
     */
    if (isEditingAdmin && name === 'active') {
      return
    }

    /*
     * O nome interno do admin também não pode ser alterado.
     */
    if (isEditingAdmin && name === 'name') {
      return
    }

    setAccessRole((prev) => ({
      ...prev,

      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handlePermissionChange(permissionKey) {
    /*
     * O admin possui acesso total e suas permissões não devem
     * ser alteradas individualmente.
     */
    if (isEditingAdmin) {
      return
    }

    setAccessRole((prev) => {
      const exists = prev.permissions.includes(permissionKey)

      return {
        ...prev,

        permissions: exists
          ? prev.permissions.filter((item) => item !== permissionKey)
          : [...prev.permissions, permissionKey]
      }
    })
  }

  const allPermissions = permissions.flatMap((group) =>
    group.items.map((permission) => permission.key)
  )

  /*
   * Para o admin, consideramos que todas as permissões estão
   * disponíveis porque ele possui a permissão especial "all".
   */
  const allSelected =
    isEditingAdmin || accessRole.permissions.length === allPermissions.length

  function handleSelectAll() {
    /*
     * O admin não precisa utilizar o "Selecionar tudo".
     * Suas permissões são controladas pela permissão especial "all".
     */
    if (isEditingAdmin) {
      return
    }

    setAccessRole((prev) => ({
      ...prev,

      permissions: allSelected ? [] : allPermissions
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!editingId && !hasPermission('access_roles_create')) {
      showToast(
        'Você não tem permissão para criar perfis de acesso.',
        'warning'
      )

      return
    }

    if (editingId && !hasPermission('access_roles_edit')) {
      showToast(
        'Você não tem permissão para editar perfis de acesso.',
        'warning'
      )

      return
    }

    if (!accessRole.name.trim()) {
      showToast('Informe o nome interno do perfil.', 'warning')

      return
    }

    if (!accessRole.displayName.trim()) {
      showToast('Informe o nome do perfil.', 'warning')

      return
    }

    /*
     * Proteção adicional do admin.
     *
     * Mesmo que algum estado seja alterado de forma inesperada,
     * garantimos que o admin continue sendo admin, ativo e com
     * acesso total.
     */
    const dataToSave = isEditingAdmin
      ? {
          ...accessRole,
          name: 'admin',
          active: true,
          permissions: ['all']
        }
      : accessRole

    if (editingId) {
      const updated = updateAccessRole({
        ...dataToSave,
        id: editingId
      })

      setAccessRoles(updated)

      showToast('Perfil de acesso atualizado!', 'success')
    } else {
      const newAccessRole = {
        ...dataToSave,
        id: Date.now()
      }

      const updated = addAccessRole(newAccessRole)

      setAccessRoles(updated)

      showToast('Perfil de acesso cadastrado!', 'success')
    }

    setAccessRole(initialAccessRole)

    setEditingId(null)
  }

  function handleEdit(role) {
    if (!hasPermission('access_roles_edit')) {
      showToast(
        'Você não tem permissão para editar perfis de acesso.',
        'warning'
      )

      return
    }

    /*
     * Ao abrir o admin para edição, garantimos que o formulário
     * reflita imediatamente suas regras especiais.
     */
    const roleToEdit =
      role.name === 'admin'
        ? {
            ...role,
            name: 'admin',
            active: true,
            permissions: ['all']
          }
        : {
            ...role,
            permissions: role.permissions || []
          }

    setAccessRole({
      ...initialAccessRole,
      ...roleToEdit
    })

    setEditingId(role.id)
  }

  function getUsersLinkedToRole(role) {
    const users = JSON.parse(localStorage.getItem('users')) || []

    return users.filter((user) => {
      const sameId =
        user.accessRoleId && Number(user.accessRoleId) === Number(role.id)

      const sameName = user.accessRoleName && user.accessRoleName === role.name

      return sameId || sameName
    })
  }

  function handleDelete(id) {
    if (!hasPermission('access_roles_delete')) {
      showToast(
        'Você não tem permissão para excluir perfis de acesso.',
        'warning'
      )

      return
    }

    const role = accessRoles.find((item) => Number(item.id) === Number(id))

    if (!role) {
      showToast('Perfil de acesso não encontrado.', 'warning')

      return
    }

    /*
     * O perfil admin é estrutural para o sistema e nunca
     * deve ser excluído.
     */
    if (role.name === 'admin') {
      showToast('O perfil Administrador não pode ser excluído.', 'warning')

      return
    }

    /*
     * Um perfil utilizado por usuários não pode ser excluído,
     * pois isso deixaria esses usuários sem um perfil de acesso.
     */
    const linkedUsers = getUsersLinkedToRole(role)

    if (linkedUsers.length > 0) {
      const userNames = linkedUsers
        .map((user) => user.name || user.username)
        .filter(Boolean)

      const namesText = userNames.length
        ? ` Usuários vinculados: ${userNames.join(', ')}.`
        : ''

      showToast(
        `Este perfil está vinculado a ${linkedUsers.length} usuário(s) e não pode ser excluído.${namesText}`,
        'warning'
      )

      return
    }

    setDeleteId(id)
  }

  function confirmDelete() {
    if (deleteId === null) {
      return
    }

    const role = accessRoles.find(
      (item) => Number(item.id) === Number(deleteId)
    )

    /*
     * Proteção adicional caso alguém tente confirmar a exclusão
     * do admin.
     */
    if (role?.name === 'admin') {
      setDeleteId(null)

      showToast('O perfil Administrador não pode ser excluído.', 'warning')

      return
    }

    /*
     * Verificamos novamente os usuários vinculados no momento
     * da confirmação.
     */
    if (role) {
      const linkedUsers = getUsersLinkedToRole(role)

      if (linkedUsers.length > 0) {
        const userNames = linkedUsers
          .map((user) => user.name || user.username)
          .filter(Boolean)

        const namesText = userNames.length
          ? ` Usuários vinculados: ${userNames.join(', ')}.`
          : ''

        setDeleteId(null)

        showToast(
          `Este perfil não pode ser excluído porque está vinculado a ${linkedUsers.length} usuário(s).${namesText}`,
          'warning'
        )

        return
      }
    }

    const updated = deleteAccessRole(deleteId)

    setAccessRoles(updated)

    setDeleteId(null)

    showToast('Perfil de acesso excluído com sucesso!', 'success')
  }

  return (
    <div className="access-roles-page">
      <div className="access-roles-form-card">
        <div className="access-roles-header">
          <div>
            <h1>Perfis de Acesso</h1>

            <p>Defina quais funcionalidades cada perfil pode acessar.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="access-roles-form">
          <div className="access-roles-basic-grid">
            <input
              name="displayName"
              value={accessRole.displayName}
              placeholder="Nome do perfil"
              onChange={handleChange}
            />

            <input
              name="name"
              value={accessRole.name}
              placeholder="Nome interno"
              onChange={handleChange}
              disabled={accessRole.name === 'admin'}
            />

            <input
              className="field-full"
              name="description"
              value={accessRole.description}
              placeholder="Descrição"
              onChange={handleChange}
            />
          </div>

          <div className="access-roles-status">
            <label>
              <input
                type="checkbox"
                name="active"
                checked={accessRole.active}
                onChange={handleChange}
                disabled={isEditingAdmin}
              />
              Perfil ativo
            </label>
          </div>

          <div className="access-roles-permissions">
            <div className="permissions-header">
              <div>
                <h2>Permissões</h2>

                <p>Selecione as ações permitidas para este perfil.</p>
              </div>

              <label className="select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleSelectAll}
                  disabled={isEditingAdmin}
                />
                Selecionar tudo
              </label>
            </div>

            <div className="permissions-container">
              {permissions.map((group) => (
                <div key={group.category} className="permission-group">
                  <h3>{group.category}</h3>

                  <div className="permissions-grid">
                    {group.items.map((permission) => (
                      <label key={permission.key} className="permission-item">
                        <input
                          type="checkbox"
                          checked={
                            isEditingAdmin
                              ? true
                              : accessRole.permissions.includes(permission.key)
                          }
                          onChange={() =>
                            handlePermissionChange(permission.key)
                          }
                          disabled={isEditingAdmin}
                        />

                        {permission.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(hasPermission('access_roles_create') ||
            hasPermission('access_roles_edit')) && (
            <div className="access-roles-actions">
              <button type="submit" className="save-btn">
                {editingId ? 'Atualizar perfil' : 'Salvar perfil'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setAccessRole(initialAccessRole)

                    setEditingId(null)
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="access-roles-search">
        <input
          type="text"
          placeholder="🔍 Buscar perfil..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="access-roles-list">
        {filteredAccessRoles.length === 0 && (
          <p>Nenhum perfil de acesso cadastrado.</p>
        )}

        {filteredAccessRoles.map((role) => (
          <div key={role.id} className="access-role-card">
            <div>
              <h3>{role.displayName || role.name}</h3>

              <p>{role.description || '-'}</p>

              <span>{role.active ? '🟢 Ativo' : '🔴 Inativo'}</span>

              <small>
                {role.permissions?.includes('all')
                  ? 'Acesso total'
                  : `${role.permissions?.length || 0} permissão(ões)`}
              </small>
            </div>

            <div className="access-role-actions">
              {hasPermission('access_roles_edit') && (
                <button
                  type="button"
                  onClick={() => handleEdit(role)}
                  title="Editar perfil"
                >
                  ✏️
                </button>
              )}

              {hasPermission('access_roles_delete') && (
                <button
                  type="button"
                  onClick={() => handleDelete(role.id)}
                  title="Excluir perfil"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir perfil de acesso"
        message="Tem certeza que deseja excluir este perfil de acesso?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
