// 🧑‍💼 Função para pegar todos os funcionários
export function getEmployees() {
  // Busca no localStorage a lista de funcionários
  // Se não existir, retorna array vazio
  return JSON.parse(localStorage.getItem('employees')) || []
}

// 🧑‍💼 Função para adicionar um novo funcionário
export function addEmployee(employee) {
  // Pega funcionários já existentes
  const employees = getEmployees()

  // Adiciona o novo funcionário na lista
  employees.push(employee)

  // Salva novamente no localStorage
  localStorage.setItem('employees', JSON.stringify(employees))
}