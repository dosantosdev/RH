import { useState, useEffect } from 'react'

// Importa funções do serviço
import { getEmployees, addEmployee } from '../services/employee'

function Employees() {
  // 🧠 Estado para armazenar lista de funcionários
  const [employees, setEmployees] = useState([])

  // 🧠 Estados do formulário
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')

  // 🔍 Estado para busca
  const [search, setSearch] = useState('')

  // 🚀 Roda quando a tela carrega
  useEffect(() => {
    // Carrega funcionários do localStorage
    setEmployees(getEmployees())
  }, [])

  // 🧑‍💼 Função para cadastrar funcionário
  function handleAddEmployee() {
    // Cria objeto do funcionário
    const newEmployee = {
      id: Date.now(), // gera ID único
      name: name,
      position: position
    }

    // Salva no localStorage
    addEmployee(newEmployee)

    // Atualiza lista na tela
    setEmployees(getEmployees())

    // Limpa inputs
    setName('')
    setPosition('')
  }

  // 🔍 Filtra funcionários pela busca
  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <h2>Funcionários</h2>

      {/* 🔍 Campo de busca */}
      <input
        placeholder="Buscar funcionário"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <br /><br />

      {/* 🧑‍💼 Cadastro */}
      <input
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Cargo"
        value={position}
        onChange={(e) => setPosition(e.target.value)}
      />

      <button onClick={handleAddEmployee}>
        Adicionar
      </button>

      <br /><br />

      {/* 📋 Lista de funcionários */}
      <ul>
        {filteredEmployees.map((emp) => (
          <li key={emp.id}>
            {emp.name} - {emp.position}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Employees