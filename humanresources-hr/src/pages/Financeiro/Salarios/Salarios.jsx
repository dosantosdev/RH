import { useEffect, useMemo, useState } from 'react'

import './salarios.css'

import { getEmployees } from '../../../services/employee'
import { apiRequest } from '../../../services/api'
import { setStored } from '../../../services/storage'

import {
  formatSalary,
  formatSalaryDate,
  getCurrentSalary,
  getEmployeeSalaryHistory,
  getSalaryHistory
} from '../../../services/salary'

import { hasPermission } from '../../../services/permissions'

/*
 * ============================================================
 * DATA ATUAL
 * ============================================================
 */

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

/*
 * ============================================================
 * FORMULÁRIO INICIAL
 * ============================================================
 */

const initialForm = {
  salary: '',
  effectiveDate: getToday(),
  reason: '',
  notes: ''
}

/*
 * ============================================================
 * MOTIVOS PADRÃO
 * ============================================================
 */

const salaryReasons = [
  'Admissão',
  'Reajuste salarial',
  'Promoção',
  'Dissídio',
  'Mudança de cargo',
  'Ajuste salarial',
  'Outro'
]

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function Salarios() {
  /*
   * ==========================================================
   * PERMISSÕES
   * ==========================================================
   */

  const canView = hasPermission('finance_salary_view')

  const canManage = hasPermission('finance_salary_manage')

  /*
   * ==========================================================
   * FUNCIONÁRIOS
   * ==========================================================
   */

  const [employees, setEmployees] = useState(() =>
    getEmployees()
      .filter((employee) => employee.active !== false)
      .sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
      )
  )
  const [loadingFinancialData, setLoadingFinancialData] = useState(true)
  const [financialDataError, setFinancialDataError] = useState('')
  const [financialDataNotice, setFinancialDataNotice] = useState('')
  const [savingSalary, setSavingSalary] = useState(false)

  // A API/PostgreSQL é a fonte oficial. O cache local só é usado como
  // contingência visual se a API estiver indisponível; nesse caso, a tela
  // avisa explicitamente para evitar confundir cache com dados atualizados.
  useEffect(() => {
    let cancelled = false

    async function loadFinancialData() {
      try {
        const data = await apiRequest('/me/financial-data')
        if (cancelled) return

        if (Array.isArray(data.employees)) {
          const normalizedEmployees = data.employees
            .filter((employee) => employee.active !== false && employee.status !== 'inactive')
            .sort((a, b) =>
              String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
            )
          setStored('employees', normalizedEmployees)
          setEmployees(normalizedEmployees)
        }

        if (Array.isArray(data.salaryHistory)) {
          const cachedSalaryHistory = getSalaryHistory()
          if (data.salaryHistory.length > 0 || cachedSalaryHistory.length === 0) {
            setStored('salaryHistory', data.salaryHistory)
            setFinancialDataNotice('')
          } else {
            // Uma lista vazia na API pode significar que os registros antigos
            // ainda não foram importados. Não sobrescrevemos o cache local.
            setFinancialDataNotice(
              'O PostgreSQL ainda não retornou registros salariais. O histórico local foi preservado e pode precisar de importação.'
            )
          }
        }

        setFinancialDataError('')
      } catch (error) {
        if (!cancelled) {
          setFinancialDataError(
            error?.message || 'Não foi possível carregar os dados salariais do PostgreSQL.'
          )
        }
      } finally {
        if (!cancelled) setLoadingFinancialData(false)
      }
    }

    loadFinancialData()
    return () => {
      cancelled = true
    }
  }, [])

  /*
   * ==========================================================
   * ESTADOS
   * ==========================================================
   */

  const [search, setSearch] = useState('')

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const [form, setForm] = useState(initialForm)

  const [editingId, setEditingId] = useState(null)

  const [message, setMessage] = useState('')

  const [messageType, setMessageType] = useState('')

  /*
   * ==========================================================
   * FUNCIONÁRIO SELECIONADO
   * ==========================================================
   */

  const selectedEmployee = useMemo(() => {
    return employees.find(
      (employee) => String(employee.id) === String(selectedEmployeeId)
    )
  }, [employees, selectedEmployeeId])

  /*
   * ==========================================================
   * HISTÓRICO DO FUNCIONÁRIO
   * ==========================================================
   */

  const salaryHistory = useMemo(() => {
    if (!selectedEmployeeId) {
      return []
    }

    return getEmployeeSalaryHistory(selectedEmployeeId)
  }, [selectedEmployeeId, message])

  /*
   * ==========================================================
   * SALÁRIO ATUAL
   * ==========================================================
   */

  const currentSalary = useMemo(() => {
    if (!selectedEmployeeId) {
      return null
    }

    return getCurrentSalary(selectedEmployeeId)
  }, [selectedEmployeeId, message])

  /*
   * ==========================================================
   * FUNCIONÁRIOS FILTRADOS
   * ==========================================================
   */

  const filteredEmployees = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    if (!searchValue) {
      return employees
    }

    return employees.filter((employee) => {
      return (
        String(employee.name || '')
          .toLowerCase()
          .includes(searchValue) ||
        String(employee.registration || '')
          .toLowerCase()
          .includes(searchValue) ||
        String(employee.cpf || '')
          .toLowerCase()
          .includes(searchValue)
      )
    })
  }, [employees, search])

  /*
   * ==========================================================
   * MENSAGEM
   * ==========================================================
   */

  function showMessage(text, type = 'success') {
    setMessage(text)

    setMessageType(type)

    window.setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 3500)
  }

  /*
   * ==========================================================
   * SELECIONAR FUNCIONÁRIO
   * ==========================================================
   */

  function handleSelectEmployee(employeeId) {
    setSelectedEmployeeId(employeeId)

    setEditingId(null)

    setForm({
      ...initialForm,
      effectiveDate: getToday()
    })

    setMessage('')
    setMessageType('')
  }

  /*
   * ==========================================================
   * ALTERAR FORMULÁRIO
   * ==========================================================
   */

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value
    }))
  }

  /*
   * ==========================================================
   * NOVO REGISTRO
   * ==========================================================
   */

  function handleNewSalary() {
    setEditingId(null)

    setForm({
      ...initialForm,
      effectiveDate: getToday()
    })

    setMessage('')
    setMessageType('')
  }

  /*
   * ==========================================================
   * EDITAR REGISTRO
   * ==========================================================
   */

  function handleEdit(record) {
    if (!canManage) {
      showMessage('Você não possui permissão para alterar salários.', 'warning')

      return
    }

    setEditingId(record.id)

    setForm({
      salary: record.salary,
      effectiveDate: record.effectiveDate || '',
      reason: record.reason || '',
      notes: record.notes || ''
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  /*
   * ==========================================================
   * CANCELAR EDIÇÃO
   * ==========================================================
   */

  function handleCancelEdit() {
    setEditingId(null)

    setForm({
      ...initialForm,
      effectiveDate: getToday()
    })
  }

  /*
   * ==========================================================
   * SALVAR
   * ==========================================================
   */

  async function handleSubmit(event) {
    event.preventDefault()

    if (savingSalary) return

    if (!canManage) {
      showMessage(
        'Você não possui permissão para cadastrar salários.',
        'warning'
      )

      return
    }

    if (!selectedEmployee) {
      showMessage(
        'Selecione um funcionário antes de cadastrar o salário.',
        'warning'
      )

      return
    }

    const salaryValue = Number(form.salary)

    if (!form.salary || Number.isNaN(salaryValue)) {
      showMessage('Informe um salário válido.', 'warning')

      return
    }

    if (salaryValue < 0) {
      showMessage('O salário não pode ser negativo.', 'warning')

      return
    }

    if (!form.effectiveDate) {
      showMessage('Informe a data de vigência.', 'warning')

      return
    }

    if (!form.reason) {
      showMessage('Informe o motivo da alteração salarial.', 'warning')

      return
    }

    setSavingSalary(true)

    try {
      // O PostgreSQL confirma a alteração antes de atualizar o cache local.
      let response

      if (editingId !== null) {
        const existingRecord = salaryHistory.find(
          (record) => String(record.id) === String(editingId)
        )

        if (!existingRecord) {
          showMessage('O registro salarial não foi encontrado. Atualize os dados e tente novamente.', 'warning')
          return
        }

        response = await apiRequest(`/salaries/${encodeURIComponent(String(editingId))}`, {
          method: 'PUT',
          body: JSON.stringify({
            salary: salaryValue,
            effectiveDate: form.effectiveDate,
            reason: form.reason,
            notes: form.notes
          })
        })
      } else {
        response = await apiRequest('/salaries', {
          method: 'POST',
          body: JSON.stringify({
            employeeId: selectedEmployee.id,
            employeeName: selectedEmployee.name,
            salary: salaryValue,
            effectiveDate: form.effectiveDate,
            reason: form.reason,
            notes: form.notes
          })
        })
      }

      if (!Array.isArray(response?.salaryHistory)) {
        throw new Error('A API não retornou o histórico salarial atualizado.')
      }

      setStored('salaryHistory', response.salaryHistory)
      setEditingId(null)
      setForm({ ...initialForm, effectiveDate: getToday() })
      showMessage(
        editingId !== null
          ? 'Registro salarial atualizado com sucesso!'
          : 'Registro salarial cadastrado com sucesso!',
        'success'
      )
    } catch (error) {
      showMessage(
        error?.message || 'Não foi possível salvar o registro no PostgreSQL.',
        'error'
      )
    } finally {
      setSavingSalary(false)
    }
  }

  /*
   * ==========================================================
   * EXCLUIR
   * ==========================================================
   */

  async function handleDelete(record) {
    if (!canManage) {
      showMessage('Você não possui permissão para excluir salários.', 'warning')

      return
    }

    const confirmed = window.confirm(
      `Deseja realmente excluir o registro salarial de ${formatSalaryDate(
        record.effectiveDate
      )}?`
    )

    if (!confirmed) {
      return
    }

    if (savingSalary) return

    setSavingSalary(true)
    try {
      const response = await apiRequest(`/salaries/${encodeURIComponent(String(record.id))}`, {
        method: 'DELETE'
      })
      if (!Array.isArray(response?.salaryHistory)) {
        throw new Error('A API não retornou o histórico salarial atualizado.')
      }
      setStored('salaryHistory', response.salaryHistory)

      if (String(editingId) === String(record.id)) {
        handleCancelEdit()
      }

      showMessage('Registro salarial excluído com sucesso!', 'success')
    } catch (error) {
      showMessage(
        error?.message || 'Não foi possível excluir o registro do PostgreSQL.',
        'error'
      )
    } finally {
      setSavingSalary(false)
    }
  }

  /*
   * ==========================================================
   * ACESSO NEGADO
   * ==========================================================
   */

  if (!canView) {
    return (
      <div className="salary-page">
        <div className="salary-access-denied">
          <span>🔒</span>

          <h2>Acesso negado</h2>

          <p>
            Você não possui permissão para visualizar informações salariais.
          </p>
        </div>
      </div>
    )
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="salary-page">
      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <header className="salary-header">
        <div>
          <span className="salary-kicker">FINANCEIRO</span>

          <h1>Salários</h1>

          <p>Consulte e mantenha o histórico salarial dos funcionários.</p>
        </div>
      </header>

      {/* ======================================================
          MENSAGEM
      ====================================================== */}

      {loadingFinancialData && (
        <div className="salary-message salary-message-warning" role="status">
          Carregando funcionários e histórico salarial do PostgreSQL...
        </div>
      )}

      {financialDataError && (
        <div className="salary-message salary-message-warning" role="alert">
          Não foi possível atualizar os dados pela API: {financialDataError}
          {' '}Os dados exibidos podem estar desatualizados. Evite realizar alterações até restabelecer a conexão.
        </div>
      )}

      {financialDataNotice && (
        <div className="salary-message salary-message-warning" role="status">
          {financialDataNotice}
        </div>
      )}

      {message && (
        <div className={`salary-message salary-message-${messageType}`}>
          {message}
        </div>
      )}

      {/* ======================================================
          CONTEÚDO
      ====================================================== */}

      <div className="salary-layout">
        {/* ====================================================
            LISTA DE FUNCIONÁRIOS
        ==================================================== */}

        <section className="salary-employees-card">
          <div className="salary-card-header">
            <div>
              <h2>Funcionários</h2>

              <p>Selecione um funcionário para consultar o salário.</p>
            </div>
          </div>

          <div className="salary-search">
            <span>🔍</span>

            <input
              type="text"
              placeholder="Buscar funcionário..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="salary-employees-list">
            {filteredEmployees.length === 0 && (
              <div className="salary-empty-small">
                Nenhum funcionário encontrado.
              </div>
            )}

            {filteredEmployees.map((employee) => {
              const isSelected =
                String(employee.id) === String(selectedEmployeeId)

              const employeeSalary = getCurrentSalary(employee.id)

              return (
                <button
                  type="button"
                  key={employee.id}
                  className={`salary-employee-item ${
                    isSelected ? 'salary-employee-item-selected' : ''
                  }`}
                  onClick={() => handleSelectEmployee(employee.id)}
                >
                  <div className="salary-employee-avatar">
                    {employee.photo ? (
                      <img src={employee.photo} alt={employee.name} />
                    ) : (
                      employee.name?.charAt(0).toUpperCase() || '?'
                    )}
                  </div>

                  <div className="salary-employee-info">
                    <strong>{employee.name}</strong>

                    <span>
                      {employee.positionName ||
                        employee.roleName ||
                        'Cargo não informado'}
                    </span>

                    <small>
                      {employeeSalary
                        ? formatSalary(employeeSalary.salary)
                        : 'Salário não cadastrado'}
                    </small>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ====================================================
            ÁREA SALARIAL
        ==================================================== */}

        <section className="salary-details-card">
          {!selectedEmployee ? (
            <div className="salary-empty-state">
              <span>💰</span>

              <h2>Selecione um funcionário</h2>

              <p>
                Escolha um funcionário ao lado para visualizar o salário atual e
                o histórico salarial.
              </p>
            </div>
          ) : (
            <>
              {/* ==============================================
                  CABEÇALHO DO FUNCIONÁRIO
              ============================================== */}

              <div className="salary-selected-header">
                <div>
                  <span className="salary-kicker">FUNCIONÁRIO</span>

                  <h2>{selectedEmployee.name}</h2>

                  <p>
                    {selectedEmployee.positionName ||
                      selectedEmployee.roleName ||
                      'Cargo não informado'}
                  </p>
                </div>

                {currentSalary && (
                  <div className="salary-current-value">
                    <span>Salário atual</span>

                    <strong>{formatSalary(currentSalary.salary)}</strong>

                    <small>
                      Vigente desde{' '}
                      {formatSalaryDate(currentSalary.effectiveDate)}
                    </small>
                  </div>
                )}
              </div>

              {/* ==============================================
                  FORMULÁRIO
              ============================================== */}

              {canManage && (
                <form className="salary-form" onSubmit={handleSubmit}>
                  <div className="salary-form-header">
                    <div>
                      <h3>
                        {editingId !== null
                          ? 'Editar registro salarial'
                          : 'Novo registro salarial'}
                      </h3>

                      <p>
                        Registre uma nova remuneração ou uma alteração salarial.
                      </p>
                    </div>
                  </div>

                  <div className="salary-form-grid">
                    <div className="salary-field">
                      <label htmlFor="salary-value">Salário *</label>

                      <input
                        id="salary-value"
                        name="salary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.salary}
                        onChange={handleChange}
                        placeholder="0,00"
                      />
                    </div>

                    <div className="salary-field">
                      <label htmlFor="salary-date">Data de vigência *</label>

                      <input
                        id="salary-date"
                        name="effectiveDate"
                        type="date"
                        value={form.effectiveDate}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="salary-field salary-field-full">
                      <label htmlFor="salary-reason">Motivo *</label>

                      <select
                        id="salary-reason"
                        name="reason"
                        value={form.reason}
                        onChange={handleChange}
                      >
                        <option value="">Selecione o motivo</option>

                        {salaryReasons.map((reason) => (
                          <option key={reason} value={reason}>
                            {reason}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="salary-field salary-field-full">
                      <label htmlFor="salary-notes">Observações</label>

                      <textarea
                        id="salary-notes"
                        name="notes"
                        rows="3"
                        value={form.notes}
                        onChange={handleChange}
                        placeholder="Observações adicionais..."
                      />
                    </div>
                  </div>

                  <div className="salary-form-actions">
                    {editingId !== null && (
                      <button
                        type="button"
                        className="salary-secondary-button"
                        onClick={handleCancelEdit}
                      >
                        Cancelar
                      </button>
                    )}

                    <button type="submit" disabled={savingSalary} className="salary-primary-button">
                      {editingId !== null
                        ? 'Atualizar salário'
                        : 'Cadastrar salário'}
                    </button>
                  </div>
                </form>
              )}

              {/* ==============================================
                  HISTÓRICO
              ============================================== */}

              <div className="salary-history">
                <div className="salary-history-header">
                  <div>
                    <h3>Histórico salarial</h3>

                    <p>Todas as alterações de remuneração deste funcionário.</p>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      className="salary-new-button"
                      onClick={handleNewSalary}
                    >
                      + Novo registro
                    </button>
                  )}
                </div>

                {salaryHistory.length === 0 ? (
                  <div className="salary-history-empty">
                    <span>📋</span>

                    <strong>Nenhum salário cadastrado</strong>

                    <p>
                      Este funcionário ainda não possui um histórico salarial.
                    </p>
                  </div>
                ) : (
                  <div className="salary-history-table-wrapper">
                    <table className="salary-history-table">
                      <thead>
                        <tr>
                          <th>Vigência</th>

                          <th>Salário</th>

                          <th>Motivo</th>

                          <th>Observações</th>

                          {canManage && <th>Ações</th>}
                        </tr>
                      </thead>

                      <tbody>
                        {salaryHistory.map((record) => (
                          <tr key={record.id}>
                            <td>{formatSalaryDate(record.effectiveDate)}</td>

                            <td>
                              <strong>{formatSalary(record.salary)}</strong>
                            </td>

                            <td>{record.reason || '-'}</td>

                            <td>{record.notes || '-'}</td>

                            {canManage && (
                              <td>
                                <div className="salary-actions">
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(record)}
                                    title="Editar"
                                  >
                                    ✏️
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDelete(record)}
                                    title="Excluir"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
