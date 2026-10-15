import { useEffect, useState } from 'react'

import {
  createHandleChange,
  handleCheckboxArray,
  handleDependents,
  handleDependentChange
} from '../utils/employeeHelpers'

import { getStoredArray } from '../services/storage'
import { getPositions } from '../services/position'
import { getDepartments } from '../services/department'

export default function useEmployeeForm(formData, setFormData) {
  const [roles, setRoles] = useState([])

  const [branches, setBranches] = useState([])

  const [departments, setDepartments] = useState([])

  const [positions, setPositions] = useState([])

  const handleChange = createHandleChange(formData, setFormData)

  const handleCheckboxChange = (e, field) =>
    handleCheckboxArray(e, field, setFormData)

  const handleDependentsChange = (count) =>
    handleDependents(count, formData, setFormData)

  const handleDependentFieldChange = (index, field, value) =>
    handleDependentChange(index, field, value, formData, setFormData)

  /*
   * ============================================================
   * CARREGAMENTO DOS DADOS ORGANIZACIONAIS
   * ============================================================
   */

  useEffect(() => {
    const loadCatalogs = () => {
      setRoles(getStoredArray('roles'))
      setBranches(getStoredArray('branches'))
      setDepartments(getDepartments())
      setPositions(getPositions())
    }

    loadCatalogs()
    window.addEventListener('hr:organization-cache-updated', loadCatalogs)
    window.addEventListener('storage', loadCatalogs)
    return () => {
      window.removeEventListener('hr:organization-cache-updated', loadCatalogs)
      window.removeEventListener('storage', loadCatalogs)
    }
  }, [])

  /*
   * ============================================================
   * DEPARTAMENTOS DA FILIAL
   * ============================================================
   *
   * Somente departamentos pertencentes à filial selecionada
   * ficam disponíveis no cadastro do funcionário.
   */

  const filteredDepartments = departments.filter(
    (department) =>
      department.active !== false &&
      Number(department.branchId) === Number(formData.branchId)
  )

  /*
   * ============================================================
   * POSIÇÕES DA FILIAL + DEPARTAMENTO
   * ============================================================
   *
   * Uma posição só pode aparecer quando pertence à combinação
   * atualmente selecionada.
   */

  const filteredPositions = positions.filter((position) => {
    if (position.active === false) {
      return false
    }

    if (!formData.branchId || !formData.departmentId) {
      return false
    }

    return (
      Number(position.branchId) === Number(formData.branchId) &&
      Number(position.departmentId) === Number(formData.departmentId)
    )
  })

  return {
    roles,

    branches,

    departments,

    positions,

    filteredDepartments,

    filteredPositions,

    handleChange,

    handleCheckboxChange,

    handleDependentsChange,

    handleDependentFieldChange
  }
}
