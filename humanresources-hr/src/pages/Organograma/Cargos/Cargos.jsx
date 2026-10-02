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

    /*
     * ============================================================
     * JORNADA DE TRABALHO
     * ============================================================
     *
     * weekly:
     * Jornada semanal tradicional.
     *
     * 12x36:
     * Trabalha 12 horas e descansa 36 horas.
     *
     * 4x2:
     * Trabalha 4 dias e descansa 2.
     *
     * 5x2:
     * Trabalha 5 dias e descansa 2.
     *
     * 6x1:
     * Trabalha 6 dias e descansa 1.
     *
     * custom:
     * Permite configurar uma jornada específica.
     */

    workload: '',
    scheduleType: 'weekly',
    dailyHours: '',
    workDaysPerWeek: '',
    cycleWorkDays: '',
    cycleRestDays: '',

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
   * IDENTIFICA PERFIS DE ACESSO ANTIGOS
   * ============================================================
   */

  const legacyAccessRoleIds = accessRoles
    .filter((accessRole) =>
      ['admin', 'gestao_rh', 'funcionario'].includes(accessRole.name)
    )
    .map((accessRole) => Number(accessRole.id))

  const professionalRoles = roles.filter((roleItem) => {
    const roleId = Number(roleItem.id)

    const isLegacyAccessRole = legacyAccessRoleIds.includes(roleId)

    if (isLegacyAccessRole) {
      return false
    }

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

    setRole((previousRole) => ({
      ...previousRole,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  /*
   * ============================================================
   * VALIDAÇÃO DA JORNADA
   * ============================================================
   */

  function validateWorkSchedule() {
    const workload = Number(role.workload)
    const dailyHours = Number(role.dailyHours)
    const workDaysPerWeek = Number(role.workDaysPerWeek)

    /*
     * A carga semanal é obrigatória para qualquer jornada.
     */
    if (!role.workload || Number.isNaN(workload) || workload <= 0) {
      return 'Informe uma carga horária semanal válida.'
    }

    /*
     * A carga horária não precisa ser 44h.
     *
     * O sistema aceita, por exemplo:
     * 30h
     * 40h
     * 44h
     * 36h
     * etc.
     */

    if (role.scheduleType === 'weekly') {
      if (!role.dailyHours || Number.isNaN(dailyHours) || dailyHours <= 0) {
        return 'Informe a quantidade de horas trabalhadas por dia.'
      }

      if (
        !role.workDaysPerWeek ||
        Number.isNaN(workDaysPerWeek) ||
        workDaysPerWeek <= 0 ||
        workDaysPerWeek > 7
      ) {
        return 'Informe uma quantidade válida de dias trabalhados por semana.'
      }

      const calculatedWeeklyHours = dailyHours * workDaysPerWeek

      /*
       * A soma dos dias não pode ultrapassar
       * a carga semanal configurada.
       */
      if (calculatedWeeklyHours > workload) {
        return (
          `A jornada configurada soma ${calculatedWeeklyHours}h por semana, ` +
          `mas a carga horária definida é de ${workload}h. ` +
          'Ajuste as horas diárias, os dias trabalhados ou a carga semanal.'
        )
      }
    }

    /*
     * ==========================================================
     * ESCALAS CICLICAS
     * ==========================================================
     *
     * Para 12x36, 4x2, 5x2 e 6x1,
     * armazenamos o ciclo.
     *
     * Não usamos simplesmente:
     *
     * horas x 7 dias
     *
     * porque isso não representa corretamente
     * uma escala cíclica.
     */

    if (['12x36', '4x2', '5x2', '6x1'].includes(role.scheduleType)) {
      if (!role.dailyHours || Number.isNaN(dailyHours) || dailyHours <= 0) {
        return 'Informe a quantidade de horas trabalhadas por dia.'
      }
    }

    if (role.scheduleType === '12x36') {
      if (dailyHours !== 12) {
        return 'Na escala 12x36, a jornada diária deve ser de 12 horas.'
      }
    }

    if (role.scheduleType === '4x2') {
      if (role.cycleWorkDays && Number(role.cycleWorkDays) !== 4) {
        return 'Na escala 4x2, devem ser configurados 4 dias trabalhados.'
      }

      if (role.cycleRestDays && Number(role.cycleRestDays) !== 2) {
        return 'Na escala 4x2, devem ser configurados 2 dias de descanso.'
      }
    }

    if (role.scheduleType === '5x2') {
      if (role.cycleWorkDays && Number(role.cycleWorkDays) !== 5) {
        return 'Na escala 5x2, devem ser configurados 5 dias trabalhados.'
      }

      if (role.cycleRestDays && Number(role.cycleRestDays) !== 2) {
        return 'Na escala 5x2, devem ser configurados 2 dias de descanso.'
      }
    }

    if (role.scheduleType === '6x1') {
      if (role.cycleWorkDays && Number(role.cycleWorkDays) !== 6) {
        return 'Na escala 6x1, devem ser configurados 6 dias trabalhados.'
      }

      if (role.cycleRestDays && Number(role.cycleRestDays) !== 1) {
        return 'Na escala 6x1, deve ser configurado 1 dia de descanso.'
      }
    }

    /*
     * Jornada personalizada.
     *
     * Aqui não fazemos uma regra rígida porque futuramente
     * poderemos configurar jornadas ainda mais específicas.
     */
    if (role.scheduleType === 'custom') {
      if (role.dailyHours && (Number.isNaN(dailyHours) || dailyHours <= 0)) {
        return 'Informe uma quantidade válida de horas por dia.'
      }
    }

    return null
  }

  /*
   * ============================================================
   * SALVAR CARGO
   * ============================================================
   */

  function handleSubmit(e) {
    e.preventDefault()

    if (!editingId && !hasPermission('roles_create')) {
      showToast('Você não tem permissão para criar cargos', 'warning')

      return
    }

    if (editingId && !hasPermission('roles_edit')) {
      showToast('Você não tem permissão para editar cargos', 'warning')

      return
    }

    const scheduleError = validateWorkSchedule()

    if (scheduleError) {
      showToast(scheduleError, 'warning')

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

      scheduleType: selectedRole.scheduleType || 'weekly',

      dailyHours: selectedRole.dailyHours || '',

      workDaysPerWeek: selectedRole.workDaysPerWeek || '',

      cycleWorkDays: selectedRole.cycleWorkDays || '',

      cycleRestDays: selectedRole.cycleRestDays || '',

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
