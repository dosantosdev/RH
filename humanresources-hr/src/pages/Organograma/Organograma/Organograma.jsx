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
    active: true
  }

  const [position, setPosition] = useState(initialPosition)
  const [positions, setPositions] = useState([])
  const [roles, setRoles] = useState([])
  const [branches, setBranches] = useState([])
  const [departments, setDepartments] = useState([])

  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { toast, showToast } = useToast()

  useEffect(() => {
    setPositions(getPositions())
    setRoles(getStoredArray('roles'))
    setBranches(getStoredArray('branches'))
    setDepartments(getStoredArray('departments'))
  }, [])

  if (!hasPermission('roles_view')) {
    return <h2>Acesso negado</h2>
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setPosition((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

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

    // Uma posição não pode ser superior a ela mesma.
    if (
      editingId &&
      position.parentPositionId &&
      Number(position.parentPositionId) === Number(editingId)
    ) {
      showToast('Uma posição não pode ser superior dela mesma.', 'warning')
      return
    }

    const selectedRole = roles.find(
      (role) => role.id === Number(position.cargoId)
    )

    const selectedBranch = branches.find(
      (branch) => branch.id === Number(position.branchId)
    )

    const selectedDepartment = departments.find(
      (department) => department.id === Number(position.departmentId)
    )

    const selectedParent = positions.find(
      (item) => item.id === Number(position.parentPositionId)
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

      parentPositionName: selectedParent?.cargoName || ''
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
      parentPositionId: item.parentPositionId || ''
    })

    setEditingId(item.id)
  }

  function handleDelete(id) {
    if (!hasPermission('roles_delete')) {
      showToast('Você não tem permissão para excluir posições.', 'warning')
      return
    }

    const hasChildren = positions.some((item) => item.parentPositionId === id)

    if (hasChildren) {
      showToast(
        'Esta posição possui subordinados. Remova ou mova os subordinados antes de excluí-la.',
        'warning'
      )
      return
    }

    setDeleteId(id)
  }

  function confirmDelete() {
    const updated = deletePosition(deleteId)

    setPositions(updated)
    setDeleteId(null)

    showToast('Posição excluída com sucesso!', 'success')
  }

  const availableDepartments = departments.filter(
    (department) => department.branchId === Number(position.branchId)
  )

  const availableParents = positions.filter((item) => {
    if (editingId && item.id === editingId) {
      return false
    }

    return (
      item.branchId === Number(position.branchId) &&
      item.departmentId === Number(position.departmentId)
    )
  })

  return (
    <div className="organograma-page">
      <div className="organograma-header">
        <h1>Organograma</h1>

        <p>Estruture os cargos da empresa em uma hierarquia organizacional.</p>
      </div>

      {/* CADASTRO DE POSIÇÃO */}

      <div className="organograma-form-card">
        <h2>{editingId ? 'Editar posição' : 'Nova posição'}</h2>

        <form onSubmit={handleSubmit}>
          <div className="organograma-form-grid">
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

            <select
              name="cargoId"
              value={position.cargoId}
              onChange={handleChange}
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

      {/* ESTRUTURA */}

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
              .filter((position) => !position.parentPositionId)
              .map((root) => (
                <TreeNode
                  key={root.id}
                  node={root}
                  positions={positions}
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

function TreeNode({ node, positions, onEdit, onDelete }) {
  const children = positions.filter(
    (position) => Number(position.parentPositionId) === Number(node.id)
  )

  return (
    <div className="tree-node-wrapper">
      <div className="tree-node">
        <div className="tree-node-content">
          <strong>{node.cargoName}</strong>

          <span>{node.departmentName}</span>

          <small>{node.branchName}</small>
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
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
