import { useState, useEffect } from 'react'

import {
  createHandleChange,
  handleCheckboxArray,
  handleDependents,
  handleDependentChange
} from '../utils/employeeHelpers'

export default function useEmployeeForm(formData, setFormData) {
  const form = formData

  const setForm = setFormData

  const [roles, setRoles] = useState([])

  const [branches, setBranches] = useState([])

  const handleChange = createHandleChange(form, setForm)

  const handleCheckboxChange = (e, field) =>
    handleCheckboxArray(e, field, setForm)

  const handleDependentsChange = (count) =>
    handleDependents(count, form, setForm)

  const handleDependentFieldChange = (index, field, value) =>
    handleDependentChange(index, field, value, form, setForm)

  useEffect(() => {
    const storedRoles = JSON.parse(localStorage.getItem('roles')) || []

    const storedBranches = JSON.parse(localStorage.getItem('branches')) || []

    setRoles(storedRoles)

    setBranches(storedBranches)
  }, [])

  return {
    roles,

    branches,

    handleChange,

    handleCheckboxChange,

    handleDependentsChange,

    handleDependentFieldChange
  }
}
