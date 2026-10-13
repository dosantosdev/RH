import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import EmployeeProfileCard from '../../components/employees/EmployeeProfileCard'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'
import './employeeProfile.css'
import { hasPermission } from '../../services/permissions'
import { deleteEmployeeFromApi, getEmployeeById, updateEmployeeInApi } from '../../services/employeeApi'

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { toast, showToast } = useToast()
  const allowed = hasPermission('employees_view')

  const loadEmployee = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const result = await getEmployeeById(id)
      setEmployee(result)
    } catch (error) {
      setLoadError(error.message || 'Não foi possível carregar o funcionário.')
      setEmployee(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (allowed) loadEmployee()
  }, [allowed, loadEmployee])

  if (!allowed) return <h2>Acesso negado</h2>

  async function handleUpdate(updatedEmployee) {
    if (!hasPermission('employees_edit')) {
      showToast('Você não tem permissão para editar funcionários.', 'warning')
      return
    }

    if (saving) return
    setSaving(true)
    try {
      const updated = await updateEmployeeInApi(updatedEmployee)
      setEmployee(updated)
      showToast('Funcionário atualizado no banco de dados com sucesso!', 'success')
      return true
    } catch (error) {
      showToast(error.message || 'Não foi possível atualizar o funcionário.', 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteRequest() {
    if (!hasPermission('employees_delete')) {
      showToast('Você não tem permissão para excluir funcionários.', 'warning')
      return
    }
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    try {
      await deleteEmployeeFromApi(employee.databaseId || employee.id)
      setDeleteOpen(false)
      showToast('Funcionário excluído do banco de dados.', 'success')
      navigate('/buscar')
    } catch (error) {
      setDeleteOpen(false)
      showToast(error.message || 'Não foi possível excluir o funcionário.', 'error')
    }
  }

  if (loading) return <div className="employee-profile-page"><p>Carregando funcionário...</p></div>
  if (loadError) return <div className="employee-profile-page"><p role="alert">{loadError}</p><button onClick={loadEmployee}>Tentar novamente</button></div>
  if (!employee) return <div className="employee-profile-page"><p>Funcionário não encontrado.</p><button onClick={() => navigate('/buscar')}>Voltar à busca</button></div>

  return (
    <div className="employee-profile-page">
      <button className="profile-back-btn" onClick={() => navigate(-1)}>← Voltar</button>
      {saving && <p role="status">Salvando alterações...</p>}
      <EmployeeProfileCard
        key={employee.id}
        employee={employee}
        onDelete={handleDeleteRequest}
        onUpdate={handleUpdate}
      />
      <ConfirmModal
        isOpen={deleteOpen}
        title="Excluir funcionário"
        message="Tem certeza que deseja excluir este cadastro? Esta ação remove o registro do banco de dados."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
