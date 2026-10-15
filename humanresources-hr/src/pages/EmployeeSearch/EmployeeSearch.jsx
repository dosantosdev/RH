import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './employeeSearch.css'
import { hasPermission } from '../../services/permissions'
import { searchEmployees } from '../../services/employeeApi'
import EmployeeList from '../../components/employees/EmployeeList'

export default function EmployeeSearch() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const itemsPerPage = 50
  const allowed = hasPermission('employees_view')

  useEffect(() => {
    let active = true

    if (search.trim().length < 2) {
      setEmployees([])
      setError('')
      setLoading(false)
      return () => { active = false }
    }

    setLoading(true)
    setError('')
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchEmployees(search)
        if (active) setEmployees(result)
      } catch (requestError) {
        if (active) {
          setEmployees([])
          setError(requestError.message || 'Não foi possível consultar os funcionários no banco de dados.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [search])

  if (!allowed) return <h2>Acesso negado</h2>

  const totalPages = Math.ceil(employees.length / itemsPerPage)
  const startIndex = (page - 1) * itemsPerPage
  const currentEmployees = employees.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="search-container">
      <div className="search-box">
        <span className="icon">🔍</span>
        <input
          type="text"
          placeholder="Digite pelo menos 2 caracteres para buscar funcionário..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
        />
      </div>

      {loading && <p role="status">Buscando funcionários no banco de dados...</p>}
      {error && <p role="alert" className="employee-search-error">{error}</p>}
      {!loading && !error && search.trim().length < 2 && (
        <p>Digite pelo menos 2 caracteres para iniciar a busca.</p>
      )}

      {search.trim().length >= 2 && !error && (
        <>
          <EmployeeList
            employees={currentEmployees}
            onSelect={(employee) => {
              const employeeId = employee.databaseId || employee.id
              if (!employeeId || employeeId === 'undefined') {
                setError('Este resultado não possui um identificador válido no banco de dados.')
                return
              }
              navigate(`/funcionario/${encodeURIComponent(employeeId)}`)
            }}
          />
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button>
              <span>Página {page} de {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage((value) => value + 1)}>→</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
