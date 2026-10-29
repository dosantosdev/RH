import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './employeeSearch.css'
import { hasPermission } from '../../services/permissions'
import { searchEmployees } from '../../services/employeeApi'
import { apiRequest } from '../../services/api'
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
  const [branches, setBranches] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const allowed = hasPermission('employees_view')
  const normalizedSearch = search.trim()

  // Carrega o catálogo de filiais diretamente da API para que filiais sem
  // funcionários também apareçam na listagem com total zero.
  useEffect(() => {
    let active = true
    apiRequest('/organization/branches')
      .then((result) => {
        if (active) setBranches(Array.isArray(result) ? result : [])
      })
      .catch(() => {
        // A listagem de funcionários continua funcionando mesmo que o perfil
        // atual não tenha permissão para consultar o catálogo de filiais.
        if (active) setBranches([])
      })
    return () => { active = false }
  }, [])

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

  // Agrupa por ID de filial (não apenas pelo nome) e inclui todas as filiais
  // cadastradas quando não há filtro de busca, mesmo com zero funcionários.
  const groupedEmployees = useMemo(() => {
    const branchMap = new Map()
    const branchNameById = new Map()

    for (const branch of branches) {
      const id = String(branch.id ?? '')
      const name = String(branch.name || '').trim() || 'Filial sem nome'
      if (id) branchNameById.set(id, name)
      branchMap.set(id || `name:${name}`, {
        id: id || `name:${name}`,
        branchName: name,
        departments: new Map()
      })
    }

    for (const employee of employees) {
      const branchId = String(employee.branchId ?? '')
      const branchName = String(employee.branchName || '').trim()
        || branchNameById.get(branchId)
        || 'Filial não informada'
      const key = branchId || `name:${branchName}`
      if (!branchMap.has(key)) {
        branchMap.set(key, { id: key, branchName, departments: new Map() })
      }
      const branch = branchMap.get(key)
      const departmentName = String(employee.departmentName || '').trim() || 'Departamento não informado'
      if (!branch.departments.has(departmentName)) branch.departments.set(departmentName, [])
      branch.departments.get(departmentName).push(employee)
    }

    const hasSearch = normalizedSearch.length >= 2
    return [...branchMap.values()]
      // Durante uma busca, ocultamos filiais sem resultados para não poluir
      // os resultados filtrados. Sem busca, mostramos todas as filiais.
      .filter((branch) => !hasSearch || [...branch.departments.values()].some((list) => list.length > 0))
      .sort((a, b) => a.branchName.localeCompare(b.branchName, 'pt-BR'))
      .map((branch) => ({
        id: branch.id,
        branchName: branch.branchName,
        total: [...branch.departments.values()].reduce((sum, list) => sum + list.length, 0),
        departments: [...branch.departments.entries()]
          .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
          .map(([departmentName, list]) => ({
            departmentName,
            employees: [...list].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))
          }))
      }))
  }, [employees, branches, normalizedSearch])

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

      {!loading && !error && employees.length === 0 && normalizedSearch.length >= 2 && (
        <p className="employee-search-message">
          {normalizedSearch.length >= 2 ? 'Nenhum funcionário encontrado para essa busca.' : 'Nenhum funcionário cadastrado.'}
        </p>
      )}

      {!loading && !error && (groupedEmployees.length > 0 || employees.length > 0) && (
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

              {branch.total === 0 && (
                <p className="employee-search-message">Nenhum funcionário cadastrado nesta filial.</p>
              )}

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
