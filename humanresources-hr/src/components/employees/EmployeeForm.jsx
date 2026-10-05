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
    branches,
    filteredDepartments,
    filteredPositions,
    handleChange,
    handleCheckboxChange,
    handleDependentsChange,
    handleDependentFieldChange
  } = useEmployeeForm(formData, setFormData)

  /*
   * ============================================================
   * POSIÇÃO ATUAL
   * ============================================================
   */

  const selectedPosition = filteredPositions.find(
    (position) => Number(position.id) === Number(form.positionId)
  )

  /*
   * ============================================================
   * CARGO ATUAL
   * ============================================================
   *
   * O cargo continua sendo descoberto através da posição.
   */

  const selectedRole = selectedPosition
    ? roles.find((role) => Number(role.id) === Number(selectedPosition.cargoId))
    : roles.find((role) => Number(role.id) === Number(form.roleId))

  /*
   * ============================================================
   * NORMALIZAÇÃO DE FUNCIONÁRIOS ANTIGOS
   * ============================================================
   *
   * Caso exista algum funcionário antigo que tenha apenas
   * positionId salvo, recuperamos automaticamente os dados
   * organizacionais da posição.
   *
   * Isso evita perder os vínculos antigos.
   */

  useEffect(() => {
    if (!form.positionId || !filteredPositions.length) {
      return
    }

    const position = filteredPositions.find(
      (item) => Number(item.id) === Number(form.positionId)
    )

    if (!position) {
      return
    }

    const needsUpdate =
      !form.branchId ||
      !form.departmentId ||
      !form.branchName ||
      !form.departmentName

    if (!needsUpdate) {
      return
    }

    setFormData((prev) => ({
      ...prev,

      branchId: position.branchId || prev.branchId || '',
      branchName: position.branchName || prev.branchName || '',

      departmentId: position.departmentId || prev.departmentId || '',

      departmentName: position.departmentName || prev.departmentName || '',

      positionName: position.cargoName || prev.positionName || '',

      roleId: position.cargoId || prev.roleId || '',

      roleName: position.cargoName || prev.roleName || ''
    }))
  }, [
    form.positionId,
    form.branchId,
    form.departmentId,
    form.branchName,
    form.departmentName,
    filteredPositions,
    setFormData
  ])

  /*
   * ============================================================
   * LIMPAR ERRO
   * ============================================================
   */

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

  /*
   * ============================================================
   * ALTERAÇÃO NORMAL
   * ============================================================
   */

  function handleFieldChange(e) {
    const fieldName = e.target.name

    handleChange(e)

    clearFieldError(fieldName)
  }

  /*
   * ============================================================
   * CHECKBOX
   * ============================================================
   */

  function handleFieldCheckboxChange(e, field) {
    handleCheckboxChange(e, field)

    clearFieldError(field)
  }

  /*
   * ============================================================
   * DEPENDENTES
   * ============================================================
   */

  function handleFieldDependentChange(index, field, value) {
    handleDependentFieldChange(index, field, value)

    clearFieldError(`dependents[${index}].${field}`)
  }

  function handleFieldDependentsChange(value) {
    handleDependentsChange(value)

    clearFieldError('dependentsCount')
  }

  /*
   * ============================================================
   * FILIAL
   * ============================================================
   *
   * A filial é o primeiro nível da estrutura organizacional.
   *
   * Quando ela muda, não podemos manter departamento ou posição
   * pertencentes à filial anterior.
   */

  function handleBranchChange(e) {
    const branchId = e.target.value

    const selectedBranch = branches.find(
      (branch) => Number(branch.id) === Number(branchId)
    )

    setFormData((prev) => ({
      ...prev,

      branchId,

      branchName: selectedBranch?.name || '',

      departmentId: '',
      departmentName: '',

      positionId: '',
      positionName: '',

      roleId: '',
      roleName: ''
    }))

    clearFieldError('branchId')
    clearFieldError('departmentId')
    clearFieldError('positionId')
  }

  /*
   * ============================================================
   * DEPARTAMENTO
   * ============================================================
   *
   * O departamento só pode ser escolhido dentro da filial
   * selecionada.
   */

  function handleDepartmentChange(e) {
    const departmentId = e.target.value

    const selectedDepartment = filteredDepartments.find(
      (department) => Number(department.id) === Number(departmentId)
    )

    setFormData((prev) => ({
      ...prev,

      departmentId,

      departmentName: selectedDepartment?.name || '',

      positionId: '',
      positionName: '',

      roleId: '',
      roleName: ''
    }))

    clearFieldError('departmentId')
    clearFieldError('positionId')
  }

  /*
   * ============================================================
   * POSIÇÃO
   * ============================================================
   *
   * A posição só aparece depois da filial + departamento.
   *
   * Ao selecionar uma posição, recuperamos o cargo relacionado.
   */

  function handlePositionChange(e) {
    const positionId = e.target.value

    const selected = filteredPositions.find(
      (position) => Number(position.id) === Number(positionId)
    )

    if (!selected) {
      setFormData((prev) => ({
        ...prev,

        positionId: '',
        positionName: '',

        roleId: '',
        roleName: ''
      }))

      clearFieldError('positionId')

      return
    }

    const selectedRoleForPosition = roles.find(
      (role) => Number(role.id) === Number(selected.cargoId)
    )

    setFormData((prev) => ({
      ...prev,

      positionId: selected.id,

      positionName: selected.cargoName || '',

      roleId: selected.cargoId || '',

      roleName: selectedRoleForPosition?.name || selected.cargoName || '',

      branchId: selected.branchId || prev.branchId || '',

      branchName: selected.branchName || prev.branchName || '',

      departmentId: selected.departmentId || prev.departmentId || '',

      departmentName: selected.departmentName || prev.departmentName || ''
    }))

    clearFieldError('positionId')
  }

  /*
   * ============================================================
   * SUBMIT
   * ============================================================
   */

  function handleSubmit(e) {
    e.preventDefault()

    const saved = handleSaveEmployee()

    if (saved && fileRef.current) {
      fileRef.current.value = ''
    }
  }

  /*
   * ============================================================
   * VALIDAÇÃO
   * ============================================================
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

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <EmploymentSection
        form={form}
        handleChange={handleFieldChange}
        branches={branches}
        filteredDepartments={filteredDepartments}
        filteredPositions={filteredPositions}
        handleBranchChange={handleBranchChange}
        handleDepartmentChange={handleDepartmentChange}
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
