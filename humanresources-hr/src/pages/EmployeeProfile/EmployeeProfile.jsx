import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EmployeeProfileCard from '../../components/employees/EmployeeProfileCard'
import './employeeProfile.css'
import { hasPermission } from '../../services/permissions'

export default function EmployeeProfile() {
  if (!hasPermission('employees_view')) {
    return <h2>Acesso negado</h2>
  }
  const { id } = useParams()
  const navigate = useNavigate()

  const [employees, setEmployees] = useState(
    JSON.parse(localStorage.getItem('employees')) || []
  )

  const employee = employees.find((emp) => emp.id === Number(id))

  function handleUpdate(updatedEmployee) {
    // 🔒 BLOQUEIA EDIÇÃO
    if (!hasPermission('employees_edit')) {
      alert('Você não tem permissão para editar funcionários')

      return
    }

    const updatedEmployees = employees.map((emp) =>
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    )

    localStorage.setItem('employees', JSON.stringify(updatedEmployees))
  }

  function handleDelete(employeeToDelete) {
    // 🔒 BLOQUEIA EXCLUSÃO
    if (!hasPermission('employees_delete')) {
      alert('Você não tem permissão para excluir funcionários')

      return
    }

    const confirmDelete = window.confirm(
      'Tem certeza que deseja excluir este cadastro?'
    )

    if (!confirmDelete) return

    const updatedEmployees = employees.filter(
      (emp) => emp.id !== employeeToDelete.id
    )

    localStorage.setItem('employees', JSON.stringify(updatedEmployees))

    setEmployees(updatedEmployees)

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
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
    </div>
  )
}
