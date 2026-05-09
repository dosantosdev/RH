import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import EmployeeProfileCard from '../../components/employees/EmployeeProfileCard'
import './employeeProfile.css'

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [employees, setEmployees] = useState(
    JSON.parse(localStorage.getItem('employees')) || []
  )

  const employee = employees.find((emp) => emp.id === Number(id))

  function handleUpdate(updatedEmployee) {
    const updatedEmployees = employees.map((emp) =>
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    )

    localStorage.setItem('employees', JSON.stringify(updatedEmployees))
  }

  function handleDelete(employeeToDelete) {
    const updatedEmployees = employees.filter(
      (emp) => emp.id !== employeeToDelete.id
    )

    localStorage.setItem('employees', JSON.stringify(updatedEmployees))

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
