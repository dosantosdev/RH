import { useState } from 'react'
import EmployeeForm from '../../components/employees/EmployeeForm'

export default function EmployeeCreate() {
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
    <div className="container">
      <EmployeeForm
        formData={formData}
        setFormData={setFormData}
        handleSaveEmployee={handleSaveEmployee}
        handlePhotoUpload={handlePhotoUpload}
      />
    </div>
  )
}
