import { useState, useEffect } from 'react'
import EmployeeDetails from '../components/EmployeeDetails'

export default function EmployeeSearch() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('employees')) || []
    setEmployees(saved)
  }, [])

  const filtered = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="container">
      <h2>Buscar Funcionários</h2>

      <input
        placeholder="Digite o nome..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {search && filtered.length === 0 && <p>Nenhum funcionário encontrado</p>}

      <ul>
        {filtered.map((emp) => (
          <li key={emp.id}>
            {emp.name}

            <button onClick={() => setSelectedEmployee(emp)}>
              Ver detalhes
            </button>
          </li>
        ))}
      </ul>

      <EmployeeDetails selectedEmployee={selectedEmployee} />
    </div>
  )
}
