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

import useEmployeeForm from '../../Hooks/useEmployeeForm'

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
    positions,
    handleChange,
    handleCheckboxChange,
    handleDependentsChange,
    handleDependentFieldChange
  } = useEmployeeForm(formData, setFormData)

  /*
   * Localiza a posição selecionada.
   */
  const selectedPosition = positions.find(
    (position) => Number(position.id) === Number(form.positionId)
  )

  /*
   * O cargo continua sendo obtido através da posição.
   *
   * Isso mantém a estrutura atual funcionando:
   *
   * posição → cargo → regras de CNH/certificados
   */
  const selectedRole = selectedPosition
    ? roles.find((role) => Number(role.id) === Number(selectedPosition.cargoId))
    : roles.find((role) => Number(role.id) === Number(form.roleId))

  /*
   * Quando uma posição é selecionada,
   * seus dados relacionados são preenchidos automaticamente.
   */
  function handlePositionChange(e) {
    const positionId = e.target.value

    const selected = positions.find(
      (position) => Number(position.id) === Number(positionId)
    )

    if (!selected) {
      setFormData((prev) => ({
        ...prev,

        positionId: '',
        positionName: '',

        roleId: '',
        roleName: '',

        branchId: '',
        branchName: '',

        departmentId: '',
        departmentName: ''
      }))

      clearFieldError('positionId')

      return
    }

    const selectedRoleForPosition = roles.find(
      (role) => Number(role.id) === Number(selected.cargoId)
    )

    setFormData((prev) => ({
      ...prev,

      /*
       * POSIÇÃO
       */
      positionId: selected.id,

      positionName: selected.cargoName || '',

      /*
       * CARGO
       *
       * Mantemos roleId/roleName porque outras partes
       * do sistema ainda utilizam esses dados.
       */
      roleId: selected.cargoId || '',

      roleName: selectedRoleForPosition?.name || selected.cargoName || '',

      /*
       * FILIAL
       */
      branchId: selected.branchId || '',

      branchName: selected.branchName || '',

      /*
       * DEPARTAMENTO
       */
      departmentId: selected.departmentId || '',

      departmentName: selected.departmentName || ''
    }))

    clearFieldError('positionId')
  }

  function clearFieldError(fieldName) {
    if (!fieldName || !setFieldErrors) {
      return
    }

    setFieldErrors((prev) => {
      const updated = {
        ...prev
      }

      Object.keys(updated).forEach((key) => {
        if (
          key === fieldName ||
          key.startsWith(`${fieldName}.`) ||
          (fieldName === 'maritalStatus' && key.startsWith('spouse')) ||
          (fieldName === 'hasDependents' && key.startsWith('dependents'))
        ) {
          delete updated[key]
        }
      })

      return updated
    })
  }

  function handleFieldChange(e) {
    const fieldName = e.target.name

    handleChange(e)

    clearFieldError(fieldName)
  }

  function handleFieldCheckboxChange(e, field) {
    handleCheckboxChange(e, field)

    clearFieldError(field)
  }

  function handleFieldDependentChange(index, field, value) {
    handleDependentFieldChange(index, field, value)

    clearFieldError(`dependents[${index}].${field}`)
  }

  function handleFieldDependentsChange(value) {
    handleDependentsChange(value)

    clearFieldError('dependentsCount')
  }

  function handleSubmit(e) {
    e.preventDefault()

    const saved = handleSaveEmployee()

    if (saved && fileRef.current) {
      fileRef.current.value = ''
    }
  }

  /*
   * Após uma tentativa de validação,
   * leva o usuário até o primeiro erro.
   */
  useEffect(() => {
    if (!validationAttempt) {
      return
    }

    const firstError = Object.keys(fieldErrors)[0]

    if (!firstError) {
      return
    }

    const field = document.querySelector(`[data-error-field="${firstError}"]`)

    if (!field) {
      return
    }

    field.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })

    setTimeout(() => {
      const focusable = field.querySelector('input, select, textarea, button')

      focusable?.focus({
        preventScroll: true
      })
    }, 350)
  }, [validationAttempt, fieldErrors])

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <EmploymentSection
        form={form}
        handleChange={handleFieldChange}
        positions={positions}
        handlePositionChange={handlePositionChange}
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

      <ContactSection
        form={form}
        handleChange={handleFieldChange}
        errors={fieldErrors}
      />

      <DocumentsSection
        form={form}
        handleChange={handleFieldChange}
        handleCheckboxArray={handleFieldCheckboxChange}
        errors={fieldErrors}
      />

      <AddressSection
        form={form}
        handleChange={handleFieldChange}
        errors={fieldErrors}
      />

      <BankingSection
        form={form}
        handleChange={handleFieldChange}
        errors={fieldErrors}
      />

      <TransportSection
        form={form}
        handleChange={handleFieldChange}
        errors={fieldErrors}
      />

      <SpouseSection
        form={form}
        handleChange={handleFieldChange}
        errors={fieldErrors}
      />

      <DependentsSection
        form={form}
        handleChange={handleFieldChange}
        handleDependents={handleFieldDependentsChange}
        handleDependentChange={handleFieldDependentChange}
        errors={fieldErrors}
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
