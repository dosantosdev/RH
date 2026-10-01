import { useState, useEffect } from 'react'

import './cargos.css'

import RoleForm from '../../../components/roles/RoleForm'
import RoleList from '../../../components/roles/RoleList'
import ConfirmModal from '../../../components/ui/ConfirmModal'
import Toast from '../../../components/ui/Toast'
import useToast from '../../../hooks/useToast'

import { hasPermission } from '../../../services/permissions'
import { getStoredArray } from '../../../services/storage'
import { getAccessRoles } from '../../../services/accessRoles'

export default function Cargos() {
  const initialRole = {
    name: '',
    description: '',
    responsibilities: '',
    salaryMin: '',
    salaryMax: '',
    education: '',
    experience: '',
    skills: '',
    workRegime: '',
    workload: '',
    active: true,
    requiresCnh: false,
    requiredCnhCategories: [],
    requiredCertificates: []
  }

  const [role, setRole] = useState(initialRole)

  const [roles, setRoles] = useState([])

  const [accessRoles, setAccessRoles] = useState([])

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
    const storedRoles = getStoredArray('roles')

    const storedAccessRoles = getAccessRoles()

    setRoles(storedRoles)

    setAccessRoles(storedAccessRoles)
  }, [])

  /*
   * ============================================================
   * PERMISSÃO
   * ============================================================
   */

  if (!hasPermission('roles_view')) {
    return <h2>Acesso negado</h2>
  }

  /*
   * ============================================================
   * IDENTIFICA OS ANTIGOS REGISTROS DE ACESSO
   * ============================================================
   *
   * Antes da separação entre Cargo e Perfil de Acesso,
   * admin, gestao_rh e funcionario ficavam dentro de "roles".
   *
   * Agora eles existem em "accessRoles".
   *
   * Não vamos apagar os registros antigos ainda.
   * Apenas não os trataremos como cargos profissionais.
   */

  const legacyAccessRoleIds = accessRoles
    .filter((accessRole) =>
      ['admin', 'gestao_rh', 'funcionario'].includes(accessRole.name)
    )
    .map((accessRole) => Number(accessRole.id))

  const professionalRoles = roles.filter((roleItem) => {
    const roleId = Number(roleItem.id)

    const isLegacyAccessRole = legacyAccessRoleIds.includes(roleId)

    /*
     * Se o ID corresponde a um dos antigos perfis
     * migrados, ele não aparece como cargo.
     */
    if (isLegacyAccessRole) {
      return false
    }

    /*
     * Também verificamos pelo nome para proteger
     * instalações antigas onde os IDs podem ter sido
     * alterados.
     */
    const normalizedName = String(roleItem.name || '')
      .trim()
      .toLowerCase()

    const matchingAccessRole = accessRoles.find(
      (accessRole) =>
        accessRole.name === normalizedName &&
        ['admin', 'gestao_rh', 'funcionario'].includes(accessRole.name)
    )

    if (matchingAccessRole) {
      return false
    }

    return true
  })

  /*
   * ============================================================
   * BUSCA
   * ============================================================
   */

  const filteredRoles = professionalRoles.filter((roleItem) =>
    roleItem.name?.toLowerCase().includes(search.toLowerCase())
  )

  /*
   * ============================================================
   * ALTERAÇÃO DO FORMULÁRIO
   * ============================================================
   */

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setRole({
      ...role,
      [name]: type === 'checkbox' ? checked : value
    })
  }

  /*
   * ============================================================
   * SALVAR CARGO
   * ============================================================
   */

  function handleSubmit(e) {
    e.preventDefault()

    /*
     * CRIAÇÃO
     */

    if (!editingId && !hasPermission('roles_create')) {
      showToast('Você não tem permissão para criar cargos', 'warning')

      return
    }

    /*
     * EDIÇÃO
     */

    if (editingId && !hasPermission('roles_edit')) {
      showToast('Você não tem permissão para editar cargos', 'warning')

      return
    }

    let updated

    /*
     * ========================================================
     * EDIÇÃO
     * ========================================================
     */

    if (editingId) {
      updated = roles.map((existingRole) =>
        existingRole.id === editingId
          ? {
              ...role,
              id: editingId
            }
          : existingRole
      )
    } else {
      /*
       * ======================================================
       * NOVO CARGO
       * ======================================================
       */

      const newRole = {
        ...role,
        id: Date.now()
      }

      updated = [...roles, newRole]
    }

    localStorage.setItem('roles', JSON.stringify(updated))

    setRoles(updated)

    showToast(editingId ? 'Cargo atualizado!' : 'Cargo cadastrado!', 'success')

    setRole(initialRole)

    setEditingId(null)
  }

  /*
   * ============================================================
   * EDITAR
   * ============================================================
   */

  function handleEdit(selectedRole) {
    if (!hasPermission('roles_edit')) {
      showToast('Você não tem permissão para editar cargos', 'warning')

      return
    }

    /*
     * Segurança adicional:
     *
     * Caso algum registro antigo de perfil de acesso
     * ainda consiga chegar aqui, não permitimos sua edição
     * como cargo.
     */

    const isLegacyAccessRole = accessRoles.some(
      (accessRole) =>
        Number(accessRole.id) === Number(selectedRole.id) &&
        ['admin', 'gestao_rh', 'funcionario'].includes(accessRole.name)
    )

    if (isLegacyAccessRole) {
      showToast(
        'Este registro pertence aos perfis de acesso e não pode ser editado como cargo.',
        'warning'
      )

      return
    }

    setRole({
      ...initialRole,

      ...selectedRole,

      requiredCnhCategories: selectedRole.requiredCnhCategories || [],

      requiredCertificates: selectedRole.requiredCertificates || []
    })

    setEditingId(selectedRole.id)
  }

  /*
   * ============================================================
   * EXCLUIR
   * ============================================================
   */

  function handleDelete(id) {
    if (!hasPermission('roles_delete')) {
      showToast('Você não tem permissão para excluir cargos', 'warning')

      return
    }

    /*
     * Nunca permitimos excluir um antigo perfil de acesso
     * através da tela de cargos.
     */

    const isLegacyAccessRole = accessRoles.some(
      (accessRole) =>
        Number(accessRole.id) === Number(id) &&
        ['admin', 'gestao_rh', 'funcionario'].includes(accessRole.name)
    )

    if (isLegacyAccessRole) {
      showToast(
        'Este registro pertence aos perfis de acesso e não pode ser excluído como cargo.',
        'warning'
      )

      return
    }

    setDeleteId(id)
  }

  /*
   * ============================================================
   * CONFIRMAR EXCLUSÃO
   * ============================================================
   */

  function confirmDeleteRole() {
    const updated = roles.filter((existingRole) => existingRole.id !== deleteId)

    localStorage.setItem('roles', JSON.stringify(updated))

    setRoles(updated)

    setDeleteId(null)

    showToast('Cargo excluído!', 'success')
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

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

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir cargo"
        message="Tem certeza que deseja excluir este cargo?"
        onConfirm={confirmDeleteRole}
        onCancel={() => setDeleteId(null)}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
