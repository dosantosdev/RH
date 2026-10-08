import { useMemo, useState } from 'react'

import './salarios.css'

import { getEmployees } from '../../../services/employee'

import {
  addSalaryRecord,
  deleteSalaryRecord,
  formatSalary,
  formatSalaryDate,
  getCurrentSalary,
  getEmployeeSalaryHistory,
  updateSalaryRecord
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

  const [employees] = useState(() =>
    getEmployees()
      .filter((employee) => employee.active !== false)
      .sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
      )
  )

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
      (employee) => Number(employee.id) === Number(selectedEmployeeId)
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

  function handleSubmit(event) {
    event.preventDefault()

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

    const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || 'null')

    const userName = loggedUser?.name || loggedUser?.username || 'Usuário'

    /*
     * ========================================================
     * ATUALIZAÇÃO
     * ========================================================
     */

    if (editingId !== null) {
      const existingRecord =
        salaryHistory.find(
          (record) => Number(record.id) === Number(editingId)
        ) || {}

      updateSalaryRecord({
        ...existingRecord,
        salary: salaryValue,
        effectiveDate: form.effectiveDate,
        reason: form.reason,
        notes: form.notes,
        updatedAt: new Date().toISOString(),
        updatedBy: userName
      })

      setEditingId(null)

      setForm({
        ...initialForm,
        effectiveDate: getToday()
      })

      showMessage('Registro salarial atualizado com sucesso!', 'success')

      return
    }

    /*
     * ========================================================
     * NOVO REGISTRO
     * ========================================================
     */

    addSalaryRecord({
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      salary: salaryValue,
      effectiveDate: form.effectiveDate,
      reason: form.reason,
      notes: form.notes,
      createdBy: userName
    })

    setForm({
      ...initialForm,
      effectiveDate: getToday()
    })

    showMessage('Registro salarial cadastrado com sucesso!', 'success')
  }

  /*
   * ==========================================================
   * EXCLUIR
   * ==========================================================
   */

  function handleDelete(record) {
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

    deleteSalaryRecord(record.id)

    if (Number(editingId) === Number(record.id)) {
      handleCancelEdit()
    }

    showMessage('Registro salarial excluído com sucesso!', 'success')
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
                Number(employee.id) === Number(selectedEmployeeId)

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

                    <button type="submit" className="salary-primary-button">
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
