import { useState } from 'react'
import EmployeeForm from '../../components/employees/EmployeeForm'
import './employeeCreate.css'
import { hasPermission } from '../../services/permissions'

export default function EmployeeCreate() {
  if (!hasPermission('employees_create')) {
    return <h2>Acesso negado</h2>
  }
  const [formData, setFormData] = useState({
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
    isForeigner: false,

    role: '',
    admissionDate: '',
    dismissalDate: '',

    cnhNumber: '',
    cnhFirstDate: '',
    cnhCategories: [],

    certificates: [],
    photo: null
  })

  function handleSaveEmployee() {
    // 🔒 BLOQUEIA CADASTRO
    if (!hasPermission('employees_create')) {
      alert('Você não tem permissão para cadastrar funcionários')

      return
    }
    const employees = JSON.parse(localStorage.getItem('employees')) || []

    const newEmployee = {
      ...formData,
      id: Date.now()
    }

    localStorage.setItem(
      'employees',
      JSON.stringify([...employees, newEmployee])
    )

    alert('Funcionário cadastrado!')

    // limpa formulário
    setFormData({
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
      isForeigner: false,
      role: '',
      admissionDate: '',
      dismissalDate: '',
      cnhNumber: '',
      cnhFirstDate: '',
      cnhCategories: [],
      certificates: [],
      photo: null
    })
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onloadend = () => {
      setFormData((prev) => ({
        ...prev,
        photo: reader.result
      }))
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className="employee-create-page">
      <div className="employee-create-header">
        <h2>Cadastro de Funcionário</h2>

        <p>Preencha as informações do novo funcionário</p>
      </div>

      <EmployeeForm
        formData={formData}
        setFormData={setFormData}
        handleSaveEmployee={handleSaveEmployee}
        handlePhotoUpload={handlePhotoUpload}
      />
    </div>
  )
}
