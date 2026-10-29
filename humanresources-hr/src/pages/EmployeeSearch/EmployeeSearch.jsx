import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './employeeSearch.css'
import { hasPermission } from '../../services/permissions'
import { searchEmployees } from '../../services/employeeApi'
import EmployeeList from '../../components/employees/EmployeeList'

/**
 * Tela de busca de funcionários.
 *
 * Ao abrir a tela, carrega todos os funcionários cadastrados. Quando o usuário
 * informa pelo menos dois caracteres, consulta a API com o termo de pesquisa.
 * Os resultados são organizados primeiro por filial e depois por departamento,
 * para facilitar a localização dos cadastros.
 */
export default function EmployeeSearch() {
  const [employees, setEmployees] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const allowed = hasPermission('employees_view')
  const normalizedSearch = search.trim()

  // Carrega todos os funcionários na abertura da tela. Para buscas com dois
  // ou mais caracteres, a API recebe o termo e retorna somente os resultados.
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError('')

      try {
        const result = await searchEmployees(normalizedSearch.length >= 2 ? normalizedSearch : '')
        if (active) setEmployees(Array.isArray(result) ? result : [])
      } catch (requestError) {
        if (active) {
          setEmployees([])
          setError(requestError.message || 'Não foi possível consultar os funcionários no banco de dados.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }, normalizedSearch.length >= 2 ? 250 : 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [normalizedSearch])

  // Agrupa os resultados por filial e, dentro de cada filial, por departamento.
  // Cadastros sem vínculo aparecem em grupos próprios para não ficarem ocultos.
  const groupedEmployees = useMemo(() => {
    const branches = new Map()

    for (const employee of employees) {
      const branchName = String(employee.branchName || '').trim() || 'Filial não informada'
      const departmentName = String(employee.departmentName || '').trim() || 'Departamento não informado'

      if (!branches.has(branchName)) branches.set(branchName, new Map())
      const departments = branches.get(branchName)
      if (!departments.has(departmentName)) departments.set(departmentName, [])
      departments.get(departmentName).push(employee)
    }

    return [...branches.entries()]
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([branchName, departments]) => ({
        branchName,
        total: [...departments.values()].reduce((sum, list) => sum + list.length, 0),
        departments: [...departments.entries()]
          .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
          .map(([departmentName, list]) => ({
            departmentName,
            employees: [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))
          }))
      }))
  }, [employees])

  if (!allowed) return <h2>Acesso negado</h2>

  const openEmployee = (employee) => {
    const employeeId = employee.databaseId || employee.id
    if (!employeeId || employeeId === 'undefined') {
      setError('Este resultado não possui um identificador válido no banco de dados.')
      return
    }
    navigate(`/funcionario/${encodeURIComponent(employeeId)}`)
  }

  return (
    <main className="search-container">
      <header className="employee-search-header">
        <div>
          <h2>Buscar funcionários</h2>
          <p>Consulte os funcionários cadastrados, organizados por filial e departamento.</p>
        </div>
        <span className="employee-search-count">
          {employees.length} {employees.length === 1 ? 'funcionário' : 'funcionários'}
        </span>
      </header>

      <div className="search-box">
        <span className="icon" aria-hidden="true">🔍</span>
        <input
          type="search"
          placeholder="Buscar por nome, CPF ou e-mail..."
          aria-label="Buscar funcionários por nome, CPF ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <button type="button" className="clear-search" onClick={() => setSearch('')} aria-label="Limpar busca">
            Limpar
          </button>
        )}
      </div>

      {normalizedSearch.length === 1 && (
        <p className="employee-search-hint">Digite mais um caractere para filtrar a lista. Enquanto isso, todos os funcionários continuam visíveis.</p>
      )}
      {loading && <p role="status" className="employee-search-message">Carregando funcionários...</p>}
      {error && <p role="alert" className="employee-search-error">{error}</p>}

      {!loading && !error && employees.length === 0 && (
        <p className="employee-search-message">
          {normalizedSearch.length >= 2 ? 'Nenhum funcionário encontrado para essa busca.' : 'Nenhum funcionário cadastrado.'}
        </p>
      )}

      {!loading && !error && employees.length > 0 && (
        <div className="employee-branch-groups">
          {groupedEmployees.map((branch) => (
            <section className="employee-branch-group" key={branch.branchName}>
              <header className="employee-branch-heading">
                <div>
                  <span className="employee-group-eyebrow">FILIAL</span>
                  <h3>{branch.branchName}</h3>
                </div>
                <span className="employee-group-count">
                  {branch.total} {branch.total === 1 ? 'funcionário' : 'funcionários'}
                </span>
              </header>

              {branch.departments.map((department) => (
                <section className="employee-department-group" key={`${branch.branchName}-${department.departmentName}`}>
                  <h4>{department.departmentName}</h4>
                  <EmployeeList employees={department.employees} onSelect={openEmployee} />
                </section>
              ))}
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
