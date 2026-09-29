import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import EmployeeProfileCard from '../../components/employees/EmployeeProfileCard'
import ConfirmModal from '../../components/ui/ConfirmModal'
import Toast from '../../components/ui/Toast'

import useToast from '../../hooks/useToast'

import './employeeProfile.css'

import { hasPermission } from '../../services/permissions'
import { deleteEmployee, updateEmployee, getEmployees } from '../../services/employee'

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employees, setEmployees] = useState(getEmployees)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { toast, showToast } = useToast()

  if (!hasPermission('employees_view')) {
    return <h2>Acesso negado</h2>
  }

  const employee = employees.find((emp) => emp.id === Number(id))

  function handleUpdate(updatedEmployee) {
    if (!hasPermission('employees_edit')) {
      showToast(
        'Você não tem permissão para editar funcionários.',
        'warning'
      )

      return
    }

    const updatedEmployees = updateEmployee(updatedEmployee)

    setEmployees(updatedEmployees)

    showToast('Funcionário atualizado com sucesso!', 'success')
  }

  function handleDeleteRequest() {
    if (!hasPermission('employees_delete')) {
      showToast(
        'Você não tem permissão para excluir funcionários.',
        'warning'
      )

      return
    }

    setDeleteOpen(true)
  }

  function confirmDelete() {
    const updatedEmployees = deleteEmployee(Number(id))

    setEmployees(updatedEmployees)
    setDeleteOpen(false)

    showToast('Funcionário excluído com sucesso!', 'success')

    navigate('/buscar')
  }

  if (!employee) {
    return (
      <div className="employee-profile-page">
        <p>Funcionário não encontrado</p>
      </div>
    )
  }

  return (
    <div className="employee-profile-page">
      <button className="profile-back-btn" onClick={() => navigate(-1)}>
        ← Voltar
      </button>

      <EmployeeProfileCard
        employee={employee}
        onDelete={handleDeleteRequest}
        onUpdate={handleUpdate}
      />

      <ConfirmModal
        isOpen={deleteOpen}
        title="Excluir funcionário"
        message="Tem certeza que deseja excluir este cadastro?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  )
}
