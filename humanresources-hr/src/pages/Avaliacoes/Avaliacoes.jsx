import { useMemo, useState } from 'react'

import { getEmployees } from '../../services/employee'

import {
  getEvaluationModelTypeLabel,
  getActiveEvaluationModels
} from '../../services/evaluationModels'

import {
  calculateEvaluationDuration,
  calculateEvaluationProgress,
  calculateStageDuration,
  createEvaluationWorkflow,
  getEvaluationWorkflows
} from '../../services/evaluationWorkflow'

import './avaliacoes.css'

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString('pt-BR')
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString('pt-BR')
}

function formatDuration(duration) {
  if (!duration) {
    return '-'
  }

  if (duration.minutes < 60) {
    return `${Math.round(duration.minutes)} min`
  }

  if (duration.hours < 24) {
    return `${duration.hours.toFixed(1)} h`
  }

  return `${duration.days.toFixed(1)} dias`
}

export default function Avaliacoes() {
  const [employees] = useState(() =>
    getEmployees().filter((employee) => employee.active !== false)
  )

  const [models] = useState(getActiveEvaluationModels)

  const [workflows, setWorkflows] = useState(getEvaluationWorkflows)

  const [search, setSearch] = useState('')

  const [statusFilter, setStatusFilter] = useState('all')

  const [showForm, setShowForm] = useState(false)

  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  const [form, setForm] = useState({
    employeeId: '',
    modelId: '',
    startDate: '',
    endDate: ''
  })

  const [error, setError] = useState('')

  const filteredWorkflows = useMemo(() => {
    const value = search.trim().toLowerCase()

    return workflows.filter((workflow) => {
      if (statusFilter !== 'all' && workflow.status !== statusFilter) {
        return false
      }

      if (!value) {
        return true
      }

      return (
        workflow.employeeName?.toLowerCase().includes(value) ||
        workflow.modelName?.toLowerCase().includes(value) ||
        workflow.branchName?.toLowerCase().includes(value)
      )
    })
  }, [workflows, search, statusFilter])

  const summary = useMemo(() => {
    return {
      total: workflows.length,

      pending: workflows.filter((item) => item.status === 'in_progress').length,

      completed: workflows.filter((item) => item.status === 'completed').length,

      cancelled: workflows.filter((item) => item.status === 'cancelled').length
    }
  }, [workflows])

  function handleFormChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,

      [name]: value
    }))
  }

  function openCreate() {
    setForm({
      employeeId: '',
      modelId: '',
      startDate: '',
      endDate: ''
    })

    setError('')

    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)

    setError('')
  }

  function handleCreate(event) {
    event.preventDefault()

    setError('')

    const employee = employees.find(
      (item) => String(item.id) === String(form.employeeId)
    )

    if (!employee) {
      setError('Selecione um funcionário.')

      return
    }

    if (!form.modelId) {
      setError('Selecione um modelo de avaliação.')

      return
    }

    try {
      createEvaluationWorkflow({
        employeeId: employee.id,

        employeeName: employee.name,

        branchId: employee.branchId || employee.branch?.id || '',

        branchName: employee.branchName || employee.branch?.name || '',

        modelId: form.modelId,

        startDate: form.startDate,

        endDate: form.endDate,

        createdBy: 'current-user',

        createdByName: 'Usuário atual'
      })

      setWorkflows(getEvaluationWorkflows())

      closeForm()
    } catch (workflowError) {
      setError(workflowError.message)
    }
  }

  function refresh() {
    setWorkflows(getEvaluationWorkflows())
  }

  return (
    <div className="evaluations-page">
      <header className="evaluations-header">
        <div>
          <span className="evaluations-eyebrow">RH</span>

          <h1>Avaliações de desempenho</h1>

          <p>Acompanhe avaliações, etapas, responsáveis, PDI e 180°.</p>
        </div>

        <button
          type="button"
          className="evaluations-primary-button"
          onClick={openCreate}
        >
          + Nova avaliação
        </button>
      </header>

      <section className="evaluations-summary">
        <div className="evaluation-summary-card">
          <span>Total</span>

          <strong>{summary.total}</strong>
        </div>

        <div className="evaluation-summary-card">
          <span>Em andamento</span>

          <strong>{summary.pending}</strong>
        </div>

        <div className="evaluation-summary-card">
          <span>Concluídas</span>

          <strong>{summary.completed}</strong>
        </div>

        <div className="evaluation-summary-card">
          <span>Canceladas</span>

          <strong>{summary.cancelled}</strong>
        </div>
      </section>

      <section className="evaluations-card">
        <div className="evaluations-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar funcionário, modelo ou filial..."
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todos os status</option>

            <option value="in_progress">Em andamento</option>

            <option value="completed">Concluídas</option>

            <option value="cancelled">Canceladas</option>
          </select>
        </div>

        {filteredWorkflows.length === 0 ? (
          <div className="evaluations-empty">
            <strong>Nenhuma avaliação encontrada.</strong>

            <p>Crie uma nova avaliação para começar.</p>
          </div>
        ) : (
          <div className="evaluations-table-wrapper">
            <table className="evaluations-table">
              <thead>
                <tr>
                  <th>Funcionário</th>

                  <th>Modelo</th>

                  <th>Período</th>

                  <th>Progresso</th>

                  <th>Status</th>

                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {filteredWorkflows.map((workflow) => {
                  const progress = calculateEvaluationProgress(workflow)

                  return (
                    <tr key={workflow.id}>
                      <td>
                        <strong>{workflow.employeeName}</strong>

                        <small>
                          {workflow.branchName || 'Filial não informada'}
                        </small>
                      </td>

                      <td>
                        <strong>{workflow.modelName}</strong>

                        <small>
                          {getEvaluationModelTypeLabel(workflow.modelType)}
                        </small>
                      </td>

                      <td>
                        {formatDate(workflow.startDate)} até{' '}
                        {formatDate(workflow.endDate)}
                      </td>

                      <td>
                        <div className="evaluation-progress">
                          <div className="evaluation-progress-bar">
                            <span
                              style={{
                                width: `${progress.percentage}%`
                              }}
                            />
                          </div>

                          <small>
                            {progress.completedStages} de {progress.totalStages}{' '}
                            etapas
                          </small>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`evaluation-status ${workflow.status}`}
                        >
                          {workflow.status === 'in_progress'
                            ? 'Em andamento'
                            : workflow.status === 'completed'
                              ? 'Concluída'
                              : workflow.status === 'cancelled'
                                ? 'Cancelada'
                                : 'Rascunho'}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="table-action-button"
                          onClick={() => setSelectedWorkflow(workflow)}
                        >
                          Acompanhar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showForm && (
        <div className="evaluations-modal-overlay">
          <div className="evaluations-modal">
            <form onSubmit={handleCreate}>
              <header className="evaluations-modal-header">
                <div>
                  <span className="evaluations-eyebrow">NOVA AVALIAÇÃO</span>

                  <h2>Criar avaliação</h2>
                </div>

                <button
                  type="button"
                  className="evaluations-modal-close"
                  onClick={closeForm}
                >
                  ×
                </button>
              </header>

              <div className="evaluations-modal-body">
                {error && <div className="evaluations-error">{error}</div>}

                <div className="evaluations-form-grid">
                  <div className="evaluations-form-field evaluations-form-field-full">
                    <label>Funcionário *</label>

                    <select
                      name="employeeId"
                      value={form.employeeId}
                      onChange={handleFormChange}
                    >
                      <option value="">Selecione...</option>

                      {employees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="evaluations-form-field evaluations-form-field-full">
                    <label>Modelo *</label>

                    <select
                      name="modelId"
                      value={form.modelId}
                      onChange={handleFormChange}
                    >
                      <option value="">Selecione o modelo...</option>

                      {models.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="evaluations-form-field">
                    <label>Data inicial</label>

                    <input
                      type="date"
                      name="startDate"
                      value={form.startDate}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="evaluations-form-field">
                    <label>Data final</label>

                    <input
                      type="date"
                      name="endDate"
                      value={form.endDate}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              </div>

              <footer className="evaluations-modal-footer">
                <button
                  type="button"
                  className="evaluations-secondary-button"
                  onClick={closeForm}
                >
                  Cancelar
                </button>

                <button type="submit" className="evaluations-primary-button">
                  Criar avaliação
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {selectedWorkflow && (
        <EvaluationDetails
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
          onRefresh={() => {
            refresh()

            const updated = getEvaluationWorkflows().find(
              (item) => String(item.id) === String(selectedWorkflow.id)
            )

            setSelectedWorkflow(updated || null)
          }}
        />
      )}
    </div>
  )
}

/*
 * ============================================================
 * DETALHES DA AVALIAÇÃO
 * ============================================================
 */

function EvaluationDetails({ workflow, onClose, onRefresh }) {
  const progress = calculateEvaluationProgress(workflow)

  const currentStage = workflow.stages?.find(
    (stage) => stage.status === 'pending' || stage.status === 'in_progress'
  )

  return (
    <div className="evaluations-modal-overlay">
      <div className="evaluations-modal evaluations-modal-large">
        <header className="evaluations-modal-header">
          <div>
            <span className="evaluations-eyebrow">ACOMPANHAMENTO</span>

            <h2>{workflow.modelName}</h2>

            <p>{workflow.employeeName}</p>
          </div>

          <button
            type="button"
            className="evaluations-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="evaluations-modal-body">
          <div className="evaluation-detail-progress">
            <div>
              <strong>Progresso das etapas</strong>

              <span>{progress.percentage}%</span>
            </div>

            <div className="evaluation-progress-bar large">
              <span
                style={{
                  width: `${progress.percentage}%`
                }}
              />
            </div>
          </div>

          <section className="evaluation-detail-section">
            <h3>Etapas</h3>

            <div className="evaluation-workflow">
              {workflow.stages.map((stage) => {
                const duration = calculateStageDuration(stage)

                return (
                  <div
                    key={stage.id}
                    className={`evaluation-workflow-stage ${stage.status}`}
                  >
                    <div className="evaluation-workflow-number">
                      {stage.order}
                    </div>

                    <div className="evaluation-workflow-content">
                      <div className="evaluation-workflow-top">
                        <div>
                          <strong>{stage.name}</strong>

                          <span>
                            {stage.responsibleUserName || stage.responsibleType}
                          </span>
                        </div>

                        <span className={`evaluation-status ${stage.status}`}>
                          {stage.status === 'locked'
                            ? 'Bloqueada'
                            : stage.status === 'pending'
                              ? 'Pendente'
                              : stage.status === 'in_progress'
                                ? 'Em andamento'
                                : 'Concluída'}
                        </span>
                      </div>

                      {stage.startedAt && (
                        <small>Início: {formatDateTime(stage.startedAt)}</small>
                      )}

                      {stage.completedAt && (
                        <small>
                          Conclusão: {formatDateTime(stage.completedAt)}
                        </small>
                      )}

                      {duration && (
                        <small>Tempo: {formatDuration(duration)}</small>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="evaluation-detail-section">
            <h3>PDI</h3>

            <div className="evaluation-detail-box">
              <span className={`evaluation-status ${workflow.pdi?.status}`}>
                {workflow.pdi?.status === 'completed'
                  ? 'Concluído'
                  : workflow.pdi?.status === 'pending'
                    ? 'Pendente'
                    : 'Bloqueado'}
              </span>

              <p>
                Responsável:{' '}
                {workflow.pdi?.responsibleUserName ||
                  'Gerente ou supervisor do setor'}
              </p>
            </div>
          </section>

          <section className="evaluation-detail-section">
            <h3>Avaliação 180°</h3>

            <div className="evaluation-detail-box">
              {!workflow.evaluation180?.enabled ? (
                <p>A avaliação 180° não foi ativada neste modelo.</p>
              ) : (
                <>
                  <span
                    className={`evaluation-status ${workflow.evaluation180.status}`}
                  >
                    {workflow.evaluation180.status === 'completed'
                      ? 'Concluída'
                      : workflow.evaluation180.status === 'pending'
                        ? 'Pendente'
                        : 'Bloqueada'}
                  </span>

                  <p>Esta etapa será preenchida pelo funcionário após o PDI.</p>
                </>
              )}
            </div>
          </section>

          <section className="evaluation-detail-section">
            <h3>Tempo total</h3>

            <p>{formatDuration(calculateEvaluationDuration(workflow))}</p>

            {currentStage && (
              <p>
                Etapa atual: <strong>{currentStage.name}</strong>
              </p>
            )}
          </section>
        </div>

        <footer className="evaluations-modal-footer">
          <button
            type="button"
            className="evaluations-secondary-button"
            onClick={onClose}
          >
            Fechar
          </button>

          <button
            type="button"
            className="evaluations-primary-button"
            onClick={onRefresh}
          >
            Atualizar
          </button>
        </footer>
      </div>
    </div>
  )
}
