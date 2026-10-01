import { useState, useEffect } from 'react'

import './departamentos.css'

import ConfirmModal from '../../../components/ui/ConfirmModal'
import Toast from '../../../components/ui/Toast'
import useToast from '../../../hooks/useToast'

import { hasPermission } from '../../../services/permissions'
import {
  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment
} from '../../../services/department'

import { getStoredArray } from '../../../services/storage'

export default function Departamentos() {
  const initialDepartment = {
    name: '',
    description: '',
    branchId: '',
    active: true
  }

  const [department, setDepartment] = useState(initialDepartment)
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  const { toast, showToast } = useToast()

  useEffect(() => {
    setDepartments(getDepartments())
    setBranches(getStoredArray('branches'))
  }, [])

  if (!hasPermission('departments_view')) {
    return <h2>Acesso negado</h2>
  }

  const filteredDepartments = departments.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  )

  function handleChange(e) {
    const { name, value, type, checked } = e.target

    setDepartment((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!department.name.trim()) {
      showToast('Informe o nome do departamento.', 'warning')
      return
    }

    if (!department.branchId) {
      showToast('Selecione a filial do departamento.', 'warning')
      return
    }

    if (!editingId && !hasPermission('departments_create')) {
      showToast('Você não tem permissão para criar departamentos.', 'warning')
      return
    }

    if (editingId && !hasPermission('departments_edit')) {
      showToast('Você não tem permissão para editar departamentos.', 'warning')
      return
    }

    const selectedBranch = branches.find(
      (branch) => branch.id === Number(department.branchId)
    )

    const departmentData = {
      ...department,
      name: department.name.trim(),
      description: department.description.trim(),
      branchId: Number(department.branchId),
      branchName: selectedBranch?.name || ''
    }

    if (editingId) {
      const updatedDepartment = updateDepartment({
        ...departmentData,
        id: editingId
      })

      setDepartments(updatedDepartment)

      showToast('Departamento atualizado com sucesso!', 'success')
    } else {
      const newDepartment = {
        ...departmentData,
        id: Date.now()
      }

      const updatedDepartments = addDepartment(newDepartment)

      setDepartments(updatedDepartments)

      showToast('Departamento cadastrado com sucesso!', 'success')
    }

    setDepartment(initialDepartment)
    setEditingId(null)
  }

  function handleEdit(item) {
    if (!hasPermission('departments_edit')) {
      showToast('Você não tem permissão para editar departamentos.', 'warning')
      return
    }

    setDepartment({
      ...initialDepartment,
      ...item,
      branchId: item.branchId || ''
    })

    setEditingId(item.id)
  }

  function handleDelete(id) {
    if (!hasPermission('departments_delete')) {
      showToast('Você não tem permissão para excluir departamentos.', 'warning')
      return
    }

    setDeleteId(id)
  }

  function confirmDeleteDepartment() {
    const updatedDepartments = deleteDepartment(deleteId)

    setDepartments(updatedDepartments)
    setDeleteId(null)

    showToast('Departamento excluído com sucesso!', 'success')
  }

  return (
    <div className="departments-page">
      <div className="department-form-container">
        <div className="form-card">
          <h2>Cadastro de Departamentos</h2>

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h3>Informações do Departamento</h3>

              <div className="form-grid">
                <input
                  className="field-large"
                  name="name"
                  value={department.name}
                  placeholder="Nome do departamento"
                  onChange={handleChange}
                />

                <select
                  className="field-large"
                  name="branchId"
                  value={department.branchId}
                  onChange={handleChange}
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

                <input
                  className="field-full"
                  name="description"
                  value={department.description}
                  placeholder="Descrição do departamento"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-section">
              <h3>Status</h3>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  name="active"
                  checked={department.active}
                  onChange={handleChange}
                />
                Departamento ativo
              </label>
            </div>

            {(hasPermission('departments_create') ||
              hasPermission('departments_edit')) && (
              <button className="save-btn" type="submit">
                {editingId ? 'Atualizar departamento' : 'Salvar departamento'}
              </button>
            )}
          </form>
        </div>
      </div>

      <div className="departments-search">
        <input
          type="text"
          placeholder="🔍 Buscar departamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="departments-grid">
        {filteredDepartments.length === 0 && (
          <p>Nenhum departamento cadastrado.</p>
        )}

        {filteredDepartments.map((item) => (
          <div key={item.id} className="departments-list-card default-card">
            <div className="department-item default-inner-card">
              <div className="department-info">
                <h4>{item.name}</h4>

                <p>
                  <strong>Filial:</strong> {item.branchName || 'Não informada'}
                </p>

                {item.description && <p>{item.description}</p>}

                <span>{item.active ? '🟢 Ativo' : '🔴 Inativo'}</span>
              </div>

              <div className="department-actions default-actions">
                {hasPermission('departments_edit') && (
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    title="Editar departamento"
                  >
                    ✏️
                  </button>
                )}

                {hasPermission('departments_delete') && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    title="Excluir departamento"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={deleteId !== null}
        title="Excluir departamento"
        message="Tem certeza que deseja excluir este departamento?"
        onConfirm={confirmDeleteDepartment}
        onCancel={() => setDeleteId(null)}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
