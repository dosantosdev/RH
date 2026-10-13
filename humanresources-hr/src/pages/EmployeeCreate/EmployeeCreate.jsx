import { useState } from 'react'

import EmployeeForm from '../../components/employees/EmployeeForm'
import Toast from '../../components/ui/Toast'
import useToast from '../../hooks/useToast'

import { hasPermission } from '../../services/permissions'
import { addEmployee, getEmployees } from '../../services/employee'
import { getStoredArray } from '../../services/storage'
import { validateEmployee } from '../../services/employeeValidation'
import { initialEmployeeForm } from '../../data/initialEmployeeForm'
import { apiRequest } from '../../services/api'

import './employeeCreate.css'

function createInitialForm() {
  return {
    ...initialEmployeeForm,
    cnhCategories: [],
    certificates: [],
    dependents: []
  }
}

// Converte datas no formato dd/mm/aaaa para ISO, aceito pelo PostgreSQL.
// Se o campo já estiver em ISO ou vazio, preserva o valor compatível.
function toIsoDate(value) {
  if (!value) return null

  const text = String(value).trim()
  const brDate = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (brDate) {
    return `${brDate[3]}-${brDate[2]}-${brDate[1]}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  return null
}

export default function EmployeeCreate() {
  const [formData, setFormData] = useState(createInitialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validationAttempt, setValidationAttempt] = useState(0)
  const [saving, setSaving] = useState(false)

  const { toast, showToast } = useToast()

  if (!hasPermission('employees_create')) {
    return <h2>Acesso negado</h2>
  }

  async function handleSaveEmployee() {
    if (!hasPermission('employees_create')) {
      showToast(
        'Você não tem permissão para cadastrar funcionários.',
        'error'
      )
      return false
    }

    if (saving) return false

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
    setSaving(true)

    try {
      // Os IDs antigos de filial/departamento/cargo são locais e podem não
      // existir no PostgreSQL. Por isso, guardamos o formulário completo em
      // registrationData e só enviamos as relações depois de migrá-las.
      const payload = {
        name: String(formData.name || '').trim(),
        cpf: formData.cpf || null,
        rg: formData.rg || null,
        email: formData.email || null,
        phone: formData.phone || null,
        birthDate: toIsoDate(formData.birthDate),
        admissionDate: toIsoDate(formData.admissionDate),
        status: 'active',
        registrationData: formData
      }

      const saved = await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      // Mantém compatibilidade com telas legadas enquanto a migração ocorre,
      // mas o ID vem do PostgreSQL, que passa a ser a fonte principal.
      const localEmployee = {
        ...formData,
        id: saved.id,
        databaseId: saved.id,
        status: saved.status || 'active'
      }

      addEmployee(localEmployee)

      showToast(
        'Funcionário cadastrado no banco de dados com sucesso!',
        'success'
      )

      setFormData(createInitialForm())
      setFieldErrors({})
      return true
    } catch (error) {
      console.error('Erro ao cadastrar funcionário na API:', error)

      const message = error.status === 403
        ? 'Você não tem permissão para cadastrar funcionários na API.'
        : error.message || 'Não foi possível salvar o funcionário no banco de dados.'

      showToast(message, 'error')
      return false
    } finally {
      setSaving(false)
    }
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

      {saving && <p>Salvando funcionário no banco de dados...</p>}

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
