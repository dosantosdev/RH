import { useRef } from 'react'

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
  handlePhotoUpload
}) {
  const fileRef = useRef()

  // ✅ mantém compatibilidade com o código já existente
  const form = formData

  const {
    roles,
    branches,
    handleChange,
    handleCheckboxChange,
    handleDependentsChange,
    handleDependentFieldChange
  } = useEmployeeForm(formData, setFormData)

  // ✅ SELECT RETORNA STRING
  // ✅ role.id geralmente é NUMBER
  // ✅ precisa converter

  const selectedRole = roles.find((role) => role.id === Number(form.roleId))

  function handleSubmit(e) {
    e.preventDefault()

    handleSaveEmployee()

    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <EmploymentSection
        form={form}
        handleChange={handleChange}
        roles={roles}
        branches={branches}
      />

      <PersonalSection
        form={form}
        handleChange={handleChange}
        handlePhotoUpload={handlePhotoUpload}
        fileRef={fileRef}
      />

      <PhysicalSection form={form} handleChange={handleChange} />

      <ContactSection form={form} handleChange={handleChange} />

      <DocumentsSection
        form={form}
        handleChange={handleChange}
        handleCheckboxArray={handleCheckboxChange}
      />

      <AddressSection form={form} handleChange={handleChange} />

      <BankingSection form={form} handleChange={handleChange} />

      <TransportSection form={form} handleChange={handleChange} />

      <SpouseSection form={form} handleChange={handleChange} />

      <DependentsSection
        form={form}
        handleChange={handleChange}
        handleDependents={handleDependentsChange}
        handleDependentChange={handleDependentFieldChange}
      />

      <CertificatesSection
        form={form}
        selectedRole={selectedRole}
        handleCheckboxArray={handleCheckboxChange}
      />

      {(hasPermission('employees_create') ||
        hasPermission('employees_edit')) && (
        <button type="submit">Salvar</button>
      )}
    </form>
  )
}
