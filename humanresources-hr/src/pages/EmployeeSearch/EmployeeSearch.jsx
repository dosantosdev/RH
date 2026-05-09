import { useState, useEffect } from 'react'
import './employeeSearch.css'

import EmployeeList from '../../components/employees/EmployeeList'
import EmployeeDetails from '../../components/employees/EmployeeDetails'

export default function EmployeeSearch() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  const itemsPerPage = 50

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('employees')) || []
    setEmployees(stored)
  }, [])

  const filtered = employees
    .filter((emp) => emp.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const currentEmployees = filtered.slice(startIndex, startIndex + itemsPerPage)

  function handleDelete(employee) {
    const confirmDelete = confirm('Deseja excluir este funcionário?')
    if (!confirmDelete) return

    const existing = JSON.parse(localStorage.getItem('employees')) || []

    const updated = existing.filter((emp) => emp.id !== employee.id)

    localStorage.setItem('employees', JSON.stringify(updated))

    setEmployees(updated)
    setSelectedEmployee(null)
  }

  function handleUpdate(updatedEmployee) {
    const existing = JSON.parse(localStorage.getItem('employees')) || []

    const updated = existing.map((emp) =>
      emp.id === updatedEmployee.id ? updatedEmployee : emp
    )

    localStorage.setItem('employees', JSON.stringify(updated))

    setEmployees(updated)
    setSelectedEmployee(updatedEmployee)
  }

  return (
    <div className="search-container">
      {/* BUSCA */}
      <div className="search-box">
        <span className="icon">🔍</span>
        <input
          type="text"
          placeholder="Buscar funcionário..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
            setSelectedEmployee(null)
          }}
        />
      </div>

      {/* DETALHES OU LISTA */}
      {selectedEmployee ? (
        <EmployeeDetails
          employee={selectedEmployee}
          onBack={() => setSelectedEmployee(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      ) : (
        <>
          <EmployeeList
            employees={currentEmployees}
            onSelect={setSelectedEmployee}
          />

          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                ←
              </button>

              <span>
                Página {page} de {totalPages}
              </span>

              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
