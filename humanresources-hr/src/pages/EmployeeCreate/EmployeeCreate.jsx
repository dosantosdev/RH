import { useState } from 'react'

import EmployeeForm from '../../components/employees/EmployeeForm'
import Toast from '../../components/ui/Toast'

import useToast from '../../hooks/useToast'

import { hasPermission } from '../../services/permissions'
import { addEmployee, getEmployees } from '../../services/employee'
import { getStoredArray } from '../../services/storage'
import { validateEmployee } from '../../services/employeeValidation'
import { initialEmployeeForm } from '../../data/initialEmployeeForm'

import './employeeCreate.css'

function createInitialForm() {
  return {
    ...initialEmployeeForm,
    cnhCategories: [],
    certificates: [],
    dependents: []
  }
}

export default function EmployeeCreate() {
  const [formData, setFormData] = useState(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationAttempt, setValidationAttempt] = useState(0)

  const { toast, showToast } = useToast()

  if (!hasPermission('employees_create')) {
    return <h2>Acesso negado</h2>
  }

  function handleSaveEmployee() {
    if (!hasPermission('employees_create')) {
      showToast(
        'Você não tem permissão para cadastrar funcionários.',
        'error'
      )
      return false
    }

    const roles = getStoredArray('roles')
    const employees = getEmployees()
    const errors = validateEmployee(formData, employees, roles)

    if (errors.length > 0) {
      const errorsByField = {}

      errors.forEach((error) => {
        if (error.field && !errorsByField[error.field]) {
          errorsByField[error.field] = error.message
        }
      })

      setFieldErrors(errorsByField)
      setValidationAttempt((prev) => prev + 1)
      showToast(errors[0].message, 'warning')

      return false
    }

    setFieldErrors({})

    const newEmployee = {
      ...formData,
      id: Date.now()
    }

    addEmployee(newEmployee)

    showToast('Funcionário cadastrado com sucesso!', 'success')

    setFormData(createInitialForm())

    return true
  }

  function handlePhotoUpload(e) {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem válido.', 'warning')
      return
    }

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

      <Toast show={toast.show} message={toast.message} type={toast.type} />

      <EmployeeForm
        formData={formData}
        setFormData={setFormData}
        handleSaveEmployee={handleSaveEmployee}
        handlePhotoUpload={handlePhotoUpload}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
        validationAttempt={validationAttempt}
      />
    </div>
  )
}
