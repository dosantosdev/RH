import { getStoredArray, setStored } from './storage'

export function getDepartments() {
  return getStoredArray('departments')
}

export function addDepartment(department) {
  const departments = getDepartments()

  const updatedDepartments = [...departments, department]

  setStored('departments', updatedDepartments)

  return updatedDepartments
}

export function updateDepartment(updatedDepartment) {
  const departments = getDepartments()

  const updatedDepartments = departments.map((department) =>
    department.id === updatedDepartment.id ? updatedDepartment : department
  )

  setStored('departments', updatedDepartments)

  return updatedDepartments
}

export function deleteDepartment(id) {
  const departments = getDepartments()

  const updatedDepartments = departments.filter(
    (department) => department.id !== id
  )

  setStored('departments', updatedDepartments)

  return updatedDepartments
}
