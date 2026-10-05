import { useMemo, useState } from 'react'

import './avaliacoes.css'

import { getEmployees } from '../../services/employee'

import {
  addEvaluation,
  EVALUATION_STATUSES,
  EVALUATION_TYPES,
  getEvaluationStatusLabel,
  getEvaluationTypeLabel,
  getEvaluations
} from '../../services/evaluations'

export default function Avaliacoes() {
  const [employees] = useState(() =>
    getEmployees().filter((employee) => employee.active !== false)
  )

  const [evaluations, setEvaluations] = useState(() => getEvaluations())

  const [selectedStatus, setSelectedStatus] = useState('all')

  const [selectedType, setSelectedType] = useState('all')

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('all')

  const [search, setSearch] = useState('')

  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState(createInitialForm())

  const [formError, setFormError] = useState('')

  /*
   * ============================================================
   * AVALIAÇÕES FILTRADAS
   * ============================================================
   */

  const filteredEvaluations = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return evaluations.filter((evaluation) => {
      if (selectedStatus !== 'all' && evaluation.status !== selectedStatus) {
        return false
      }

      if (selectedType !== 'all' && evaluation.type !== selectedType) {
        return false
      }

      if (
        selectedEmployeeId !== 'all' &&
        Number(evaluation.employeeId) !== Number(selectedEmployeeId)
      ) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      const employee = employees.find(
        (item) => Number(item.id) === Number(evaluation.employeeId)
      )

      const employeeName = String(employee?.name || '').toLowerCase()

      const evaluationTitle = String(evaluation.title || '').toLowerCase()

      return (
        employeeName.includes(normalizedSearch) ||
        evaluationTitle.includes(normalizedSearch)
      )
    })
  }, [
    evaluations,
    employees,
    selectedStatus,
    selectedType,
    selectedEmployeeId,
    search
  ])

  /*
   * ============================================================
   * RESUMO
   * ============================================================
   */

  const summary = useMemo(() => {
    return evaluations.reduce(
      (result, evaluation) => {
        result.total += 1

        if (evaluation.status === 'draft') {
          result.drafts += 1
        }

        if (
          evaluation.status === 'pending' ||
          evaluation.status === 'in_progress'
        ) {
          result.pending += 1
        }

        if (evaluation.status === 'completed') {
          result.completed += 1
        }

        return result
      },
      {
        total: 0,
        drafts: 0,
        pending: 0,
        completed: 0
      }
    )
  }, [evaluations])

  /*
   * ============================================================
   * FUNCIONÁRIO
   * ============================================================
   */

  function getEmployeeName(employeeId) {
    return (
      employees.find((employee) => Number(employee.id) === Number(employeeId))
        ?.name || 'Funcionário não informado'
    )
  }

  /*
   * ============================================================
   * ALTERAÇÃO DO FORMULÁRIO
   * ============================================================
   */

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value
    }))

    setFormError('')
  }

  /*
   * ============================================================
   * ABRIR FORMULÁRIO
   * ============================================================
   */

  function handleOpenForm() {
    setForm(createInitialForm())

    setFormError('')

    setShowForm(true)
  }

  /*
   * ============================================================
   * FECHAR FORMULÁRIO
   * ============================================================
   */

  function handleCloseForm() {
    setShowForm(false)

    setFormError('')
  }

  /*
   * ============================================================
   * SALVAR AVALIAÇÃO
   * ============================================================
   */

  function handleSubmit(event) {
    event.preventDefault()

    if (!form.employeeId) {
      setFormError('Selecione um funcionário.')

      return
    }

    if (!form.title.trim()) {
      setFormError('Informe o título da avaliação.')

      return
    }

    if (!form.type) {
      setFormError('Selecione o tipo da avaliação.')

      return
    }

    if (!form.evaluator.trim()) {
      setFormError('Informe o avaliador.')

      return
    }

    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setFormError('A data final não pode ser anterior à data inicial.')

      return
    }

    const newEvaluation = addEvaluation({
      employeeId: Number(form.employeeId),

      title: form.title.trim(),

      type: form.type,

      status: form.status,

      evaluator: form.evaluator.trim(),

      startDate: form.startDate,

      endDate: form.endDate,

      notes: form.notes.trim()
    })

    setEvaluations((previous) => [...previous, newEvaluation])

    setShowForm(false)

    setForm(createInitialForm())

    setFormError('')
  }

  /*
   * ============================================================
   * LIMPAR FILTROS
   * ============================================================
   */

  function clearFilters() {
    setSelectedStatus('all')

    setSelectedType('all')

    setSelectedEmployeeId('all')

    setSearch('')
  }

  return (
    <div className="evaluations-page">
      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <header className="evaluations-header">
        <div>
          <span className="evaluations-kicker">RECURSOS HUMANOS</span>

          <h1>Avaliações</h1>

          <p>
            Acompanhe avaliações de desempenho e outros processos de avaliação
            dos funcionários.
          </p>
        </div>

        <button
          type="button"
          className="evaluations-new-button"
          onClick={handleOpenForm}
        >
          + Nova avaliação
        </button>
      </header>

      {/* ======================================================
          RESUMO
      ====================================================== */}

      <section className="evaluations-summary">
        <SummaryCard
          label="Total"
          value={String(summary.total)}
          description="Avaliações cadastradas"
        />

        <SummaryCard
          label="Pendentes"
          value={String(summary.pending)}
          description="Aguardando ou em andamento"
          variant="warning"
        />

        <SummaryCard
          label="Concluídas"
          value={String(summary.completed)}
          description="Avaliações finalizadas"
          variant="positive"
        />

        <SummaryCard
          label="Rascunhos"
          value={String(summary.drafts)}
          description="Ainda não iniciadas"
          variant="neutral"
        />
      </section>

      {/* ======================================================
          CARD PRINCIPAL
      ====================================================== */}

      <section className="evaluations-card">
        <div className="evaluations-card-header">
          <div>
            <span>AVALIAÇÕES</span>

            <h2>Lista de avaliações</h2>

            <p>
              Consulte as avaliações cadastradas e acompanhe o status de cada
              processo.
            </p>
          </div>

          <strong>{filteredEvaluations.length} resultado(s)</strong>
        </div>

        {/* ====================================================
            FILTROS
        ==================================================== */}

        <div className="evaluations-filters">
          <div className="evaluations-filter evaluations-filter-search">
            <label htmlFor="evaluations-search">Buscar</label>

            <input
              id="evaluations-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Funcionário ou avaliação"
            />
          </div>

          <div className="evaluations-filter">
            <label htmlFor="evaluations-status">Status</label>

            <select
              id="evaluations-status"
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
            >
              <option value="all">Todos</option>

              {EVALUATION_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="evaluations-filter">
            <label htmlFor="evaluations-type">Tipo</label>

            <select
              id="evaluations-type"
              value={selectedType}
              onChange={(event) => setSelectedType(event.target.value)}
            >
              <option value="all">Todos</option>

              {EVALUATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="evaluations-filter">
            <label htmlFor="evaluations-employee">Funcionário</label>

            <select
              id="evaluations-employee"
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
            >
              <option value="all">Todos os funcionários</option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="evaluations-clear-button"
            onClick={clearFilters}
          >
            Limpar filtros
          </button>
        </div>

        {/* ====================================================
            LISTAGEM
        ==================================================== */}

        {filteredEvaluations.length === 0 ? (
          <div className="evaluations-empty">
            <span>◎</span>

            <h3>Nenhuma avaliação cadastrada</h3>

            <p>
              Clique em "Nova avaliação" para cadastrar o primeiro processo de
              avaliação.
            </p>
          </div>
        ) : (
          <div className="evaluations-table-wrapper">
            <table className="evaluations-table">
              <thead>
                <tr>
                  <th>Funcionário</th>

                  <th>Avaliação</th>

                  <th>Tipo</th>

                  <th>Avaliador</th>

                  <th>Status</th>

                  <th>Período</th>
                </tr>
              </thead>

              <tbody>
                {filteredEvaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td>
                      <strong>{getEmployeeName(evaluation.employeeId)}</strong>
                    </td>

                    <td>{evaluation.title || 'Não informado'}</td>

                    <td>{getEvaluationTypeLabel(evaluation.type)}</td>

                    <td>{evaluation.evaluator || 'Não informado'}</td>

                    <td>
                      <span
                        className={`evaluation-status ${
                          evaluation.status || 'neutral'
                        }`}
                      >
                        {getEvaluationStatusLabel(evaluation.status)}
                      </span>
                    </td>

                    <td>
                      {formatDisplayDate(evaluation.startDate)}

                      {' até '}

                      {formatDisplayDate(evaluation.endDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ======================================================
          MODAL DE NOVA AVALIAÇÃO
      ====================================================== */}

      {showForm && (
        <div
          className="evaluations-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseForm()
            }
          }}
        >
          <div className="evaluations-modal">
            <header className="evaluations-modal-header">
              <div>
                <span>NOVA AVALIAÇÃO</span>

                <h2>Cadastrar avaliação</h2>

                <p>Preencha as informações básicas da avaliação.</p>
              </div>

              <button
                type="button"
                onClick={handleCloseForm}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <form className="evaluations-form" onSubmit={handleSubmit}>
              {formError && (
                <div className="evaluations-form-error">{formError}</div>
              )}

              <div className="evaluations-form-grid">
                <div className="evaluations-form-field evaluations-form-field-full">
                  <label htmlFor="evaluation-employee">Funcionário *</label>

                  <select
                    id="evaluation-employee"
                    name="employeeId"
                    value={form.employeeId}
                    onChange={handleFormChange}
                  >
                    <option value="">Selecione o funcionário</option>

                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="evaluations-form-field">
                  <label htmlFor="evaluation-title">Título *</label>

                  <input
                    id="evaluation-title"
                    name="title"
                    type="text"
                    value={form.title}
                    onChange={handleFormChange}
                    placeholder="Ex.: Avaliação de desempenho"
                  />
                </div>

                <div className="evaluations-form-field">
                  <label htmlFor="evaluation-type">Tipo *</label>

                  <select
                    id="evaluation-type"
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                  >
                    <option value="">Selecione o tipo</option>

                    {EVALUATION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="evaluations-form-field">
                  <label htmlFor="evaluation-evaluator">Avaliador *</label>

                  <input
                    id="evaluation-evaluator"
                    name="evaluator"
                    type="text"
                    value={form.evaluator}
                    onChange={handleFormChange}
                    placeholder="Nome do avaliador"
                  />
                </div>

                <div className="evaluations-form-field">
                  <label htmlFor="evaluation-status">Status</label>

                  <select
                    id="evaluation-status"
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                  >
                    {EVALUATION_STATUSES.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="evaluations-form-field">
                  <label htmlFor="evaluation-start-date">Data inicial</label>

                  <input
                    id="evaluation-start-date"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="evaluations-form-field">
                  <label htmlFor="evaluation-end-date">Data final</label>

                  <input
                    id="evaluation-end-date"
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="evaluations-form-field evaluations-form-field-full">
                  <label htmlFor="evaluation-notes">Observações</label>

                  <textarea
                    id="evaluation-notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleFormChange}
                    rows="4"
                    placeholder="Observações gerais sobre a avaliação"
                  />
                </div>
              </div>

              <footer className="evaluations-form-footer">
                <button
                  type="button"
                  className="evaluations-cancel-button"
                  onClick={handleCloseForm}
                >
                  Cancelar
                </button>

                <button type="submit" className="evaluations-save-button">
                  Salvar avaliação
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/*
 * ============================================================
 * FORMULÁRIO INICIAL
 * ============================================================
 */

function createInitialForm() {
  return {
    employeeId: '',
    title: '',
    type: '',
    status: 'draft',
    evaluator: '',
    startDate: '',
    endDate: '',
    notes: ''
  }
}

/*
 * ============================================================
 * CARD DE RESUMO
 * ============================================================
 */

function SummaryCard({ label, value, description, variant = 'neutral' }) {
  return (
    <article className={`evaluations-summary-card ${variant}`}>
      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>
    </article>
  )
}

/*
 * ============================================================
 * DATA
 * ============================================================
 */

function formatDisplayDate(value) {
  if (!value) {
    return '—'
  }

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return '—'
  }

  return `${day}/${month}/${year}`
}
