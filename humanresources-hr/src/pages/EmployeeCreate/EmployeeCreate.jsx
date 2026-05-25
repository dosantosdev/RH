import { useState } from 'react'

import useToast from '../../hooks/useToast'

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

    roleId: '',

    admissionDate: '',
    dismissalDate: '',

    cnhNumber: '',
    cnhFirstDate: '',

    cnhCategories: [],

    certificates: [],

    photo: null
  })

  // ✅ CORRETO
  const { toast, showToast } = useToast()

  function handleSaveEmployee() {
    // 🔒 BLOQUEIA CADASTRO

    if (!hasPermission('employees_create')) {
      showToast('Você não tem permissão para cadastrar funcionários', 'error')

      return
    }

    const roles = JSON.parse(localStorage.getItem('roles')) || []

    const certificates = JSON.parse(localStorage.getItem('certificates')) || []

    const selectedRole = roles.find(
      (role) => role.id === Number(formData.roleId)
    )

    // =========================
    // VALIDA CERTIFICADOS
    // =========================

    if (selectedRole?.requiredCertificates?.length > 0) {
      const requiredCertificates = certificates.filter((certificate) =>
        selectedRole.requiredCertificates.includes(certificate.id)
      )

      const missingCertificates = requiredCertificates.filter(
        (certificate) => !formData.certificates.includes(certificate.name)
      )

      if (missingCertificates.length > 0) {
        showToast(
          `Funcionário não possui os certificados obrigatórios: ${missingCertificates
            .map((c) => c.name)
            .join(', ')}`,

          'warning'
        )

        return
      }
    }

    // =========================
    // VALIDA CNH
    // =========================

    if (selectedRole?.requiresCnh) {
      if (!formData.cnhCategories || formData.cnhCategories.length === 0) {
        showToast(
          'Este cargo exige CNH.',

          'warning'
        )

        return
      }

      const hasRequiredCategory = selectedRole.requiredCnhCategories.some(
        (category) => formData.cnhCategories.includes(category)
      )

      if (!hasRequiredCategory) {
        showToast(
          `Este cargo exige CNH categoria: ${selectedRole.requiredCnhCategories.join(
            ', '
          )}`,

          'warning'
        )

        return
      }
    }

    // =========================
    // SALVA FUNCIONÁRIO
    // =========================

    const employees = JSON.parse(localStorage.getItem('employees')) || []

    const newEmployee = {
      ...formData,

      id: Date.now()
    }

    localStorage.setItem(
      'employees',

      JSON.stringify([...employees, newEmployee])
    )

    showToast('Funcionário cadastrado!', 'success')

    // =========================
    // LIMPA FORMULÁRIO
    // =========================

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

      roleId: '',

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

      {/* ✅ TOAST */}

      {toast.show && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}

      <EmployeeForm
        formData={formData}
        setFormData={setFormData}
        handleSaveEmployee={handleSaveEmployee}
        handlePhotoUpload={handlePhotoUpload}
      />
    </div>
  )
}
