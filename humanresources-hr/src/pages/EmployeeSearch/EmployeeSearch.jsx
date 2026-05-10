import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './employeeSearch.css'
import { hasPermission } from '../../services/permissions'

import EmployeeList from '../../components/employees/EmployeeList'

export default function EmployeeSearch() {
  if (!hasPermission('employees_view')) {
    return <h2>Acesso negado</h2>
  }
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const navigate = useNavigate()

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
          }}
        />
      </div>

      {/* LISTA */}
      <>
        <EmployeeList
          employees={currentEmployees}
          onSelect={(employee) => navigate(`/funcionario/${employee.id}`)}
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
    </div>
  )
}
