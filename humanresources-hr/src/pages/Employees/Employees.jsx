import { useState, useEffect } from 'react'
import EmployeeForm from '../components/employees/EmployeeForm'
import EmployeeList from '../components/employees/EmployeeList'
import EmployeeDetails from '../components/employees/EmployeeDetails'
import './employees.css'

export default function Employees() {
  const [employees, setEmployees] = useState([])
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const [formData, setFormData] = useState({
    search: '',
    name: '',
    cpf: '',
    rg: '',
    birthDate: '',
    phone: '',
    email: '',
    address: '',
    cep: '',
    city: '',
    state: '',
    country: '',
    isActive: true,

    // 👇 NOVOS / RECUPERADOS
    role: '',
    admissionDate: '',
    dismissalDate: '',
    isForeigner: false,

    cnhNumber: '',
    cnhFirstDate: '',
    cnhCategories: [],

    certificates: [],
    photo: null
  })

  function handleSaveEmployee() {
    const newEmployee = {
      ...formData,
      id: Date.now()
    }

    setEmployees([...employees, newEmployee])
    setFormData({ name: '', cpf: '', photo: null })
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0]
    const reader = new FileReader()

    reader.onloadend = () => {
      setFormData({ ...formData, photo: reader.result })
    }

    if (file) reader.readAsDataURL(file)
  }

  return (
    <div className="container">
      <h2>Funcionários</h2>

      <EmployeeForm
        formData={formData}
        setFormData={setFormData}
        handleSaveEmployee={handleSaveEmployee}
        handlePhotoUpload={handlePhotoUpload}
      />

      <EmployeeDetails selectedEmployee={selectedEmployee} />

      <EmployeeList
        employees={employees}
        setSelectedEmployee={setSelectedEmployee}
      />
    </div>
  )
}
