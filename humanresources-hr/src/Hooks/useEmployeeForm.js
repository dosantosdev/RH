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
    /*
     * Cargos.
     *
     * Continuamos carregando os cargos porque eles são
     * utilizados para descobrir as regras relacionadas
     * ao funcionário, como certificados e jornada.
     */
    setRoles(getStoredArray('roles'))

    /*
     * Filiais cadastradas.
     */
    setBranches(getStoredArray('branches'))

    /*
     * Departamentos cadastrados.
     */
    setDepartments(getDepartments())

    /*
     * Posições cadastradas no Organograma.
     */
    setPositions(getPositions())
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
