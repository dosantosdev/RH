import { getStoredArray, setStored } from './storage'

export function getEmployees() {
  return getStoredArray('employees')
}

export function addEmployee(employee) {
  const employees = getEmployees()
  const updatedEmployees = [...employees, employee]

  setStored('employees', updatedEmployees)

  return employee
}

export function deleteEmployee(id) {
  const updated = getEmployees().filter((employee) => employee.id !== id)

  setStored('employees', updated)

  return updated
}

export function updateEmployee(updatedEmployee) {
  const updated = getEmployees().map((employee) =>
    employee.id === updatedEmployee.id ? updatedEmployee : employee
  )

  setStored('employees', updated)

  return updated
}
