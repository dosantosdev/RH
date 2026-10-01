import { useEffect, useState } from 'react'

import {
  createHandleChange,
  handleCheckboxArray,
  handleDependents,
  handleDependentChange
} from '../utils/employeeHelpers'

import { getStoredArray } from '../services/storage'
import { getPositions } from '../services/position'

export default function useEmployeeForm(formData, setFormData) {
  const [roles, setRoles] = useState([])
  const [branches, setBranches] = useState([])
  const [positions, setPositions] = useState([])

  const handleChange = createHandleChange(formData, setFormData)

  const handleCheckboxChange = (e, field) =>
    handleCheckboxArray(e, field, setFormData)

  const handleDependentsChange = (count) =>
    handleDependents(count, formData, setFormData)

  const handleDependentFieldChange = (index, field, value) =>
    handleDependentChange(index, field, value, formData, setFormData)

  useEffect(() => {
    setRoles(getStoredArray('roles'))
    setBranches(getStoredArray('branches'))
    setPositions(getPositions())
  }, [])

  return {
    roles,
    branches,
    positions,
    handleChange,
    handleCheckboxChange,
    handleDependentsChange,
    handleDependentFieldChange
  }
}
