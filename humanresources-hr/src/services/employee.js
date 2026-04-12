// 🧑‍💼 Buscar todos os funcionários
export function getEmployees() {
  return JSON.parse(localStorage.getItem('employees')) || []
}

// ➕ Adicionar funcionário
export function addEmployee(employee) {
  const employees = getEmployees()
  employees.push(employee)
  localStorage.setItem('employees', JSON.stringify(employees))
}

// 🗑️ Excluir funcionário
export function deleteEmployee(id) {
  const employees = getEmployees()

  const updated = employees.filter((emp) => emp.id !== id)

  localStorage.setItem('employees', JSON.stringify(updated))
}

// ✏️ Atualizar funcionário
export function updateEmployee(updatedEmployee) {
  const employees = getEmployees()

  const updated = employees.map((emp) =>
    emp.id === updatedEmployee.id ? updatedEmployee : emp
  )

  localStorage.setItem('employees', JSON.stringify(updated))
}