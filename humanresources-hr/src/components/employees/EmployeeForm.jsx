import { useEffect, useRef } from 'react'

import './employeeForm.css'

import { hasPermission } from '../../services/permissions'

import EmploymentSection from './sections/EmploymentSection'
import PersonalSection from './sections/PersonalSection'
import DocumentsSection from './sections/DocumentsSection'
import AddressSection from './sections/AddressSection'
import ContactSection from './sections/ContactSection'
import BankingSection from './sections/BankingSection'
import SpouseSection from './sections/SpouseSection'
import DependentsSection from './sections/DependentsSection'
import PhysicalSection from './sections/PhysicalSection'
import TransportSection from './sections/TransportSection'
import CertificatesSection from './sections/CertificatesSection'

import useEmployeeForm from '../../hooks/useEmployeeForm'

export default function EmployeeForm({
  formData,
  setFormData,
  handleSaveEmployee,
  handlePhotoUpload,
  fieldErrors = {},
  setFieldErrors,
  validationAttempt = 0
}) {
  const fileRef = useRef()

  const form = formData

  const {
    roles,
    branches,
    handleChange,
    handleCheckboxChange,
    handleDependentsChange,
    handleDependentFieldChange
  } = useEmployeeForm(formData, setFormData)

  const selectedRole = roles.find((role) => role.id === Number(form.roleId))

  function handleFieldChange(e) {
    const fieldName = e.target.name

    handleChange(e)

    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const updated = { ...prev }
        delete updated[fieldName]
        return updated
      })
    }
  }

  function handleFieldCheckboxChange(e, field) {
    handleCheckboxChange(e, field)

    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev }
        delete updated[field]
        return updated
      })
    }
  }

  function handleSubmit(e) {
    e.preventDefault()

    const saved = handleSaveEmployee()

    if (saved && fileRef.current) {
      fileRef.current.value = ''
    }
  }

  // O foco/rolagem acontece somente quando uma nova tentativa de envio é feita.
  // Assim, digitar em um campo inválido não faz a página pular para outro campo.
  useEffect(() => {
    if (!validationAttempt) return

    const firstError = Object.keys(fieldErrors)[0]

    if (!firstError) return

    const field = document.querySelector(`[name="${firstError}"]`)

    if (!field) return

    field.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })

    setTimeout(() => {
      field.focus({ preventScroll: true })
    }, 350)
  }, [validationAttempt])

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <EmploymentSection
        form={form}
        handleChange={handleFieldChange}
        roles={roles}
        branches={branches}
        errors={fieldErrors}
      />

      <PersonalSection
        form={form}
        handleChange={handleFieldChange}
        handlePhotoUpload={handlePhotoUpload}
        fileRef={fileRef}
        errors={fieldErrors}
      />

      <PhysicalSection form={form} handleChange={handleFieldChange} />

      <ContactSection form={form} handleChange={handleFieldChange} />

      <DocumentsSection
        form={form}
        handleChange={handleFieldChange}
        handleCheckboxArray={handleFieldCheckboxChange}
        errors={fieldErrors}
      />

      <AddressSection form={form} handleChange={handleFieldChange} />
      <BankingSection form={form} handleChange={handleFieldChange} />
      <TransportSection form={form} handleChange={handleFieldChange} />
      <SpouseSection form={form} handleChange={handleFieldChange} />

      <DependentsSection
        form={form}
        handleChange={handleFieldChange}
        handleDependents={handleDependentsChange}
        handleDependentChange={handleDependentFieldChange}
      />

      <CertificatesSection
        form={form}
        selectedRole={selectedRole}
        handleCheckboxArray={handleFieldCheckboxChange}
        errors={fieldErrors}
      />

      {(hasPermission('employees_create') ||
        hasPermission('employees_edit')) && (
        <button type="submit">Salvar</button>
      )}
    </form>
  )
}
