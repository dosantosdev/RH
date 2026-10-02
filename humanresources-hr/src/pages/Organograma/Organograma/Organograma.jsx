import { useEffect, useState } from 'react'

import './organograma.css'

import { hasPermission } from '../../../services/permissions'
import { getStoredArray } from '../../../services/storage'

import {
  getPositions,
  addPosition,
  updatePosition,
  deletePosition
} from '../../../services/position'

import ConfirmModal from '../../../components/ui/ConfirmModal'
import Toast from '../../../components/ui/Toast'
import useToast from '../../../hooks/useToast'

export default function Organograma() {
  const initialPosition = {
    cargoId: '',
    branchId: '',
    departmentId: '',
    parentPositionId: '',
    active: true,

    /*
     * ============================================================
     * JORNADA DA POSIÇÃO
     * ============================================================
     *
     * Por padrão, a posição recebe a jornada definida no cargo.
     *
     * Mantemos os dados na posição porque futuramente poderemos
     * permitir uma exceção específica para determinada posição.
     */

    scheduleType: '',
    workload: '',
    dailyHours: '',
    workDaysPerWeek: '',
    cycleWorkDays: '',
    cycleRestDays: ''
  }

  const [position, setPosition] = useState(initialPosition)

  const [positions, setPositions] = useState([])

  const [roles, setRoles] = useState([])

  const [branches, setBranches] = useState([])

  const [departments, setDepartments] = useState([])

  const [employees, setEmployees] = useState([])

  const [editingId, setEditingId] = useState(null)

  const [deleteId, setDeleteId] = useState(null)

  const { toast, showToast } = useToast()

  useEffect(() => {
    setPositions(getPositions())

    setRoles(getStoredArray('roles'))

    setBranches(getStoredArray('branches'))

    setDepartments(getStoredArray('departments'))

    setEmployees(getStoredArray('employees'))
  }, [])

  if (!hasPermission('roles_view')) {
    return <h2>Acesso negado</h2>
  }

  /*
   * ============================================================
   * ALTERAÇÃO DOS CAMPOS
   * ============================================================
   */

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setPosition((prev) => ({
      ...prev,

      [name]: type === 'checkbox' ? checked : value
    }))
  }

  /*
   * ============================================================
   * CARREGAR JORNADA DO CARGO
   * ============================================================
   */

  function loadRoleSchedule(roleId) {
    const selectedRole = roles.find(
      (role) => Number(role.id) === Number(roleId)
    )

    if (!selectedRole) {
      return
    }

    setPosition((previousPosition) => ({
      ...previousPosition,

      cargoId: roleId,

      scheduleType: selectedRole.scheduleType || 'weekly',

      workload: selectedRole.workload || '',

      dailyHours: selectedRole.dailyHours || '',

      workDaysPerWeek: selectedRole.workDaysPerWeek || '',

      cycleWorkDays: selectedRole.cycleWorkDays || '',

      cycleRestDays: selectedRole.cycleRestDays || ''
    }))
  }

  /*
   * ============================================================
   * VALIDAÇÃO DA JORNADA
   * ============================================================
   */

  function validatePositionSchedule() {
    const workload = Number(position.workload)

    const dailyHours = Number(position.dailyHours)

    const workDaysPerWeek = Number(position.workDaysPerWeek)

    if (position.workload === '' || Number.isNaN(workload) || workload <= 0) {
      return 'O cargo selecionado não possui uma carga horária semanal válida.'
    }

    /*
     * Jornada semanal:
     *
     * horas por dia × dias trabalhados
     *
     * não pode ultrapassar a carga semanal definida no cargo.
     */

    if (position.scheduleType === 'weekly') {
      if (!position.dailyHours || Number.isNaN(dailyHours) || dailyHours <= 0) {
        return 'O cargo selecionado não possui uma quantidade válida de horas por dia.'
      }

      if (
        !position.workDaysPerWeek ||
        Number.isNaN(workDaysPerWeek) ||
        workDaysPerWeek <= 0 ||
        workDaysPerWeek > 7
      ) {
        return 'O cargo selecionado não possui uma quantidade válida de dias trabalhados por semana.'
      }

      const calculatedWeeklyHours = dailyHours * workDaysPerWeek

      if (calculatedWeeklyHours > workload) {
        return (
          `A jornada da posição soma ${calculatedWeeklyHours}h por semana, ` +
          `mas o cargo está configurado para ${workload}h.`
        )
      }
    }

    /*
     * ==========================================================
     * 12x36
     * ==========================================================
     */

    if (position.scheduleType === '12x36') {
      if (dailyHours !== 12) {
        return (
          'A posição está vinculada a uma jornada 12x36, ' +
          'portanto deve trabalhar 12 horas por dia de trabalho.'
        )
      }

      if (
        Number(position.cycleWorkDays) !== 1 ||
        Number(position.cycleRestDays) !== 1
      ) {
        return 'A escala 12x36 deve permanecer configurada como 1 dia trabalhado e 1 ciclo de descanso.'
      }
    }

    /*
     * ==========================================================
     * 4x2
     * ==========================================================
     */

    if (position.scheduleType === '4x2') {
      if (
        Number(position.cycleWorkDays) !== 4 ||
        Number(position.cycleRestDays) !== 2
      ) {
        return 'A escala 4x2 deve permanecer configurada como 4 dias trabalhados e 2 dias de descanso.'
      }
    }

    /*
     * ==========================================================
     * 5x2
     * ==========================================================
     */

    if (position.scheduleType === '5x2') {
      if (
        Number(position.cycleWorkDays) !== 5 ||
        Number(position.cycleRestDays) !== 2
      ) {
        return 'A escala 5x2 deve permanecer configurada como 5 dias trabalhados e 2 dias de descanso.'
      }
    }

    /*
     * ==========================================================
     * 6x1
     * ==========================================================
     */

    if (position.scheduleType === '6x1') {
      if (
        Number(position.cycleWorkDays) !== 6 ||
        Number(position.cycleRestDays) !== 1
      ) {
        return 'A escala 6x1 deve permanecer configurada como 6 dias trabalhados e 1 dia de descanso.'
      }
    }

    return null
  }

  /*
   * ============================================================
   * SALVAR
   * ============================================================
   */

  function handleSubmit(e) {
    e.preventDefault()

    if (!position.cargoId) {
      showToast('Selecione o cargo.', 'warning')
      return
    }

    if (!position.branchId) {
      showToast('Selecione a filial.', 'warning')
      return
    }

    if (!position.departmentId) {
      showToast('Selecione o departamento.', 'warning')
      return
    }

    if (!editingId && !hasPermission('roles_create')) {
      showToast('Você não tem permissão para criar posições.', 'warning')

      return
    }

    if (editingId && !hasPermission('roles_edit')) {
      showToast('Você não tem permissão para editar posições.', 'warning')

      return
    }

    /*
     * Uma posição não pode ser superior a ela mesma.
     */

    if (
      editingId &&
      position.parentPositionId &&
      Number(position.parentPositionId) === Number(editingId)
    ) {
      showToast('Uma posição não pode ser superior dela mesma.', 'warning')

      return
    }

    /*
     * Valida a jornada herdada do cargo.
     */

    const scheduleError = validatePositionSchedule()

    if (scheduleError) {
      showToast(scheduleError, 'warning')
      return
    }

    const selectedRole = roles.find(
      (role) => Number(role.id) === Number(position.cargoId)
    )

    const selectedBranch = branches.find(
      (branch) => Number(branch.id) === Number(position.branchId)
    )

    const selectedDepartment = departments.find(
      (department) => Number(department.id) === Number(position.departmentId)
    )

    const selectedParent = positions.find(
      (item) => Number(item.id) === Number(position.parentPositionId)
    )

    const positionData = {
      ...position,

      cargoId: Number(position.cargoId),

      cargoName: selectedRole?.name || '',

      branchId: Number(position.branchId),

      branchName: selectedBranch?.name || '',

      departmentId: Number(position.departmentId),

      departmentName: selectedDepartment?.name || '',

      parentPositionId: position.parentPositionId
        ? Number(position.parentPositionId)
        : null,

      parentPositionName: selectedParent?.cargoName || '',

      /*
       * Guarda também uma cópia das informações da jornada.
       *
       * Isso permite que o módulo de ponto consulte a posição
       * sem precisar descobrir novamente qual era a configuração
       * utilizada no momento do cadastro.
       */

      scheduleType:
        position.scheduleType || selectedRole?.scheduleType || 'weekly',

      workload:
        position.workload !== ''
          ? Number(position.workload)
          : Number(selectedRole?.workload || 0),

      dailyHours:
        position.dailyHours !== ''
          ? Number(position.dailyHours)
          : Number(selectedRole?.dailyHours || 0),

      workDaysPerWeek:
        position.workDaysPerWeek !== ''
          ? Number(position.workDaysPerWeek)
          : Number(selectedRole?.workDaysPerWeek || 0),

      cycleWorkDays:
        position.cycleWorkDays !== ''
          ? Number(position.cycleWorkDays)
          : Number(selectedRole?.cycleWorkDays || 0),

      cycleRestDays:
        position.cycleRestDays !== ''
          ? Number(position.cycleRestDays)
          : Number(selectedRole?.cycleRestDays || 0)
    }

    if (editingId) {
      const updated = updatePosition({
        ...positionData,
        id: editingId
      })

      setPositions(updated)

      showToast('Posição atualizada com sucesso!', 'success')
    } else {
      const newPosition = {
        ...positionData,
        id: Date.now()
      }

      const updated = addPosition(newPosition)

      setPositions(updated)

      showToast('Posição criada com sucesso!', 'success')
    }

    setPosition(initialPosition)

    setEditingId(null)
  }

  /*
   * ============================================================
   * EDITAR
   * ============================================================
   */

  function handleEdit(item) {
    if (!hasPermission('roles_edit')) {
      showToast('Você não tem permissão para editar posições.', 'warning')

      return
    }

    setPosition({
      ...initialPosition,

      ...item,

      cargoId: item.cargoId || '',

      branchId: item.branchId || '',

      departmentId: item.departmentId || '',

      parentPositionId: item.parentPositionId || '',

      scheduleType: item.scheduleType || 'weekly',

      workload: item.workload ?? '',

      dailyHours: item.dailyHours ?? '',

      workDaysPerWeek: item.workDaysPerWeek ?? '',

      cycleWorkDays: item.cycleWorkDays ?? '',

      cycleRestDays: item.cycleRestDays ?? ''
    })

    setEditingId(item.id)
  }

  /*
   * ============================================================
   * EXCLUIR
   * ============================================================
   */

  function handleDelete(id) {
    if (!hasPermission('roles_delete')) {
      showToast('Você não tem permissão para excluir posições.', 'warning')

      return
    }

    /*
     * Não permite excluir uma posição que possui
     * outras posições subordinadas.
     */

    const hasChildren = positions.some(
      (item) => Number(item.parentPositionId) === Number(id)
    )

    if (hasChildren) {
      showToast(
        'Esta posição possui subordinados. Remova ou mova os subordinados antes de excluí-la.',
        'warning'
      )

      return
    }

    /*
     * Uma posição pode ter vários funcionários.
     *
     * Mesmo assim, não permitimos sua exclusão enquanto
     * existir algum funcionário vinculado a ela.
     */

    const linkedEmployees = employees.filter(
      (employee) =>
        employee.positionId && Number(employee.positionId) === Number(id)
    )

    if (linkedEmployees.length > 0) {
      if (linkedEmployees.length === 1) {
        showToast(
          `Não é possível excluir esta posição porque ela está vinculada ao funcionário ${linkedEmployees[0].name}.`,
          'warning'
        )
      } else {
        showToast(
          `Não é possível excluir esta posição porque ela está vinculada a ${linkedEmployees.length} funcionários.`,
          'warning'
        )
      }

      return
    }

    setDeleteId(id)
  }

  /*
   * ============================================================
   * CONFIRMAR EXCLUSÃO
   * ============================================================
   */

  function confirmDelete() {
    const updated = deletePosition(deleteId)

    setPositions(updated)

    setDeleteId(null)

    showToast('Posição excluída com sucesso!', 'success')
  }

  /*
   * ============================================================
   * LISTAS AUXILIARES
   * ============================================================
   */

  const availableDepartments = departments.filter(
    (department) => Number(department.branchId) === Number(position.branchId)
  )

  const availableParents = positions.filter((item) => {
    if (editingId && item.id === editingId) {
      return false
    }

    return (
      Number(item.branchId) === Number(position.branchId) &&
      Number(item.departmentId) === Number(position.departmentId)
    )
  })

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="organograma-page">
      <div className="organograma-header">
        <h1>Organograma</h1>

        <p>Estruture os cargos da empresa em uma hierarquia organizacional.</p>
      </div>

      {/* ======================================================
          CADASTRO DE POSIÇÃO
      ======================================================= */}

      <div className="organograma-form-card">
        <h2>{editingId ? 'Editar posição' : 'Nova posição'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="organograma-form-grid">
            {/* FILIAL */}

            <select
              name="branchId"
              value={position.branchId}
              onChange={(e) => {
                handleChange(e)

                setPosition((prev) => ({
                  ...prev,
                  departmentId: '',
                  parentPositionId: ''
                }))
              }}
            >
              <option value="">Selecione a filial</option>

              {branches
                .filter((branch) => branch.active !== false)
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
            </select>

            {/* DEPARTAMENTO */}

            <select
              name="departmentId"
              value={position.departmentId}
              onChange={(e) => {
                handleChange(e)

                setPosition((prev) => ({
                  ...prev,
                  parentPositionId: ''
                }))
              }}
              disabled={!position.branchId}
            >
              <option value="">Selecione o departamento</option>

              {availableDepartments
                .filter((department) => department.active !== false)
                .map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
            </select>

            {/* CARGO */}

            <select
              name="cargoId"
              value={position.cargoId}
              onChange={(e) => {
                loadRoleSchedule(e.target.value)
              }}
            >
              <option value="">Selecione o cargo</option>

              {roles
                .filter((role) => role.active !== false)
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>

            {/* SUPERIOR */}

            <select
              name="parentPositionId"
              value={position.parentPositionId || ''}
              onChange={handleChange}
              disabled={!position.branchId || !position.departmentId}
            >
              <option value="">Sem superior — posição raiz</option>

              {availableParents.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.cargoName}
                </option>
              ))}
            </select>
          </div>

          {/* ==================================================
              RESUMO DA JORNADA
          =================================================== */}

          {position.cargoId && (
            <div
              style={{
                marginTop: '20px',
                padding: '16px',
                border: '1px solid #e2e4ea',
                borderRadius: '10px',
                background: '#f8f9fc'
              }}
            >
              <strong>Jornada da posição</strong>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px',
                  marginTop: '12px'
                }}
              >
                <div>
                  <small>Tipo</small>

                  <div>
                    {position.scheduleType === 'weekly' && 'Jornada semanal'}

                    {position.scheduleType === '12x36' && '12x36'}

                    {position.scheduleType === '4x2' && '4x2'}

                    {position.scheduleType === '5x2' && '5x2'}

                    {position.scheduleType === '6x1' && '6x1'}

                    {position.scheduleType === 'custom' && 'Personalizada'}
                  </div>
                </div>

                <div>
                  <small>Carga semanal</small>

                  <div>{position.workload || '-'}h</div>
                </div>

                <div>
                  <small>Horas por dia</small>

                  <div>{position.dailyHours || '-'}h</div>
                </div>

                {position.scheduleType === 'weekly' && (
                  <div>
                    <small>Dias por semana</small>

                    <div>{position.workDaysPerWeek || '-'}</div>
                  </div>
                )}

                {position.cycleWorkDays && (
                  <div>
                    <small>Ciclo</small>

                    <div>
                      {position.cycleWorkDays} dias trabalho /{' '}
                      {position.cycleRestDays} dias descanso
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATUS */}

          <label className="organograma-checkbox">
            <input
              type="checkbox"
              name="active"
              checked={position.active}
              onChange={handleChange}
            />
            Posição ativa
          </label>

          {(hasPermission('roles_create') || hasPermission('roles_edit')) && (
            <div className="organograma-form-actions">
              <button className="save-btn" type="submit">
                {editingId ? 'Atualizar posição' : 'Criar posição'}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setPosition(initialPosition)

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

      {/* ======================================================
          ESTRUTURA
      ======================================================= */}

      <div className="organograma-section">
        <div className="organograma-section-header">
          <div>
            <h2>Estrutura organizacional</h2>

            <p>
              As posições sem superior são consideradas raízes da estrutura.
            </p>
          </div>
        </div>

        <div className="organograma-tree">
          {positions.length === 0 ? (
            <p className="organograma-empty">Nenhuma posição cadastrada.</p>
          ) : (
            positions
              .filter((positionItem) => !positionItem.parentPositionId)
              .map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  positions={positions}
                  employees={employees}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir posição"
        message="Tem certeza que deseja excluir esta posição?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}

/*
 * ==============================================================
 * ÁRVORE DO ORGANOGRAMA
 * ==============================================================
 */

function TreeNode({ node, positions, employees, onEdit, onDelete }) {
  const children = positions.filter(
    (position) => Number(position.parentPositionId) === Number(node.id)
  )

  /*
   * Uma posição pode ser ocupada por vários funcionários.
   *
   * Por isso usamos filter() em vez de find().
   */

  const positionEmployees = employees.filter(
    (employee) =>
      employee.active === true &&
      employee.positionId &&
      Number(employee.positionId) === Number(node.id)
  )

  return (
    <div className="tree-node-wrapper">
      <div className="tree-node">
        <div className="tree-node-content">
          <strong>{node.cargoName}</strong>

          <span>{node.departmentName}</span>

          <small>{node.branchName}</small>

          {/* JORNADA */}

          {node.scheduleType && (
            <small>
              Jornada:{' '}
              {node.scheduleType === 'weekly' &&
                `${node.workload || 0}h semanais`}
              {node.scheduleType === '12x36' && '12x36'}
              {node.scheduleType === '4x2' && '4x2'}
              {node.scheduleType === '5x2' && '5x2'}
              {node.scheduleType === '6x1' && '6x1'}
              {node.scheduleType === 'custom' && 'Personalizada'}
            </small>
          )}

          {/* FUNCIONÁRIOS */}

          {positionEmployees.length === 0 ? (
            <span>Vaga disponível</span>
          ) : (
            <div>
              {positionEmployees.map((employee) => (
                <span key={employee.id}>👤 {employee.name}</span>
              ))}
            </div>
          )}
        </div>

        <div className="tree-node-actions">
          <button
            type="button"
            onClick={() => onEdit(node)}
            title="Editar posição"
          >
            ✏️
          </button>

          <button
            type="button"
            onClick={() => onDelete(node.id)}
            title="Excluir posição"
          >
            🗑️
          </button>
        </div>
      </div>

      {children.length > 0 && (
        <div className="tree-children">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              positions={positions}
              employees={employees}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
