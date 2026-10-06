import { useMemo, useState } from 'react'

import {
  calculateEvaluationDuration,
  calculateEvaluationMetrics,
  calculateStageDuration,
  getEvaluationWorkflows
} from '../../services/evaluationWorkflow'

import './avaliacoes.css'

/*
 * ============================================================
 * FORMATAÇÃO DE DATA
 * ============================================================
 */

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

/*
 * ============================================================
 * FORMATAÇÃO DE DURAÇÃO
 * ============================================================
 */

function formatDuration(duration) {
  if (!duration) {
    return '-'
  }

  const minutes = Number(duration.minutes)

  if (!Number.isFinite(minutes)) {
    return '-'
  }

  if (minutes < 60) {
    return `${Math.round(minutes)} min`
  }

  const hours = minutes / 60

  if (hours < 24) {
    return `${hours.toFixed(1)} h`
  }

  const days = minutes / 1440

  return `${days.toFixed(1)} dias`
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function HistoricoAvaliacoes() {
  /*
   * Busca somente avaliações concluídas.
   */
  const [workflows] = useState(() =>
    getEvaluationWorkflows().filter(
      (workflow) => workflow.status === 'completed'
    )
  )

  const [search, setSearch] = useState('')

  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  /*
   * ==========================================================
   * MÉTRICAS
   * ==========================================================
   */

  const metrics = useMemo(() => {
    const result = calculateEvaluationMetrics(workflows)

    /*
     * Compatibilidade com versões anteriores do serviço.
     *
     * Algumas versões utilizavam:
     * averageEvaluationMinutes
     *
     * Outras utilizavam:
     * averageDurationMinutes
     *
     * Aqui aceitamos as duas para evitar que a tela
     * apresente NaN.
     */

    const averageEvaluationMinutes = Number(
      result?.averageEvaluationMinutes ?? result?.averageDurationMinutes ?? 0
    )

    const totalCompleted = Number(
      result?.totalCompleted ??
        result?.completedEvaluations ??
        workflows.length ??
        0
    )

    return {
      totalCompleted: Number.isFinite(totalCompleted) ? totalCompleted : 0,

      averageEvaluationMinutes: Number.isFinite(averageEvaluationMinutes)
        ? averageEvaluationMinutes
        : 0,

      byResponsible: Array.isArray(result?.byResponsible)
        ? result.byResponsible
        : [],

      byBranch: Array.isArray(result?.byBranch) ? result.byBranch : []
    }
  }, [workflows])

  /*
   * ==========================================================
   * FILTRO
   * ==========================================================
   */

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase()

    if (!value) {
      return workflows
    }

    return workflows.filter(
      (workflow) =>
        workflow.employeeName?.toLowerCase().includes(value) ||
        workflow.modelName?.toLowerCase().includes(value) ||
        workflow.branchName?.toLowerCase().includes(value)
    )
  }, [workflows, search])

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="evaluations-page">
      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <header className="evaluations-header">
        <div>
          <span className="evaluations-eyebrow">HISTÓRICO</span>

          <h1>Histórico</h1>

          <p>
            Consulte as avaliações concluídas e os resultados de cada processo.
          </p>
        </div>
      </header>

      {/* ======================================================
          BUSCA E HISTÓRICO
      ====================================================== */}

      <section className="evaluations-card">
        <div className="evaluations-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar funcionário, avaliação ou filial..."
          />
        </div>

        {filtered.length === 0 ? (
          <div className="evaluations-empty">
            <strong>Nenhuma avaliação concluída.</strong>

            <p>As avaliações concluídas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="evaluations-table-wrapper">
            <table className="evaluations-table">
              <thead>
                <tr>
                  <th>Funcionário</th>

                  <th>Avaliação</th>

                  <th>Filial</th>

                  <th>Conclusão</th>

                  <th>Tempo total</th>

                  <th>Ação</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((workflow) => (
                  <tr key={workflow.id}>
                    <td>
                      <strong>{workflow.employeeName}</strong>
                    </td>

                    <td>{workflow.modelName}</td>

                    <td>{workflow.branchName || '-'}</td>

                    <td>{formatDate(workflow.completedAt)}</td>

                    <td>
                      {formatDuration(calculateEvaluationDuration(workflow))}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="table-action-button"
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ======================================================
          RESUMO
      ====================================================== */}

      <section className="evaluations-summary">
        <div className="evaluation-summary-card">
          <span>Avaliações concluídas</span>

          <strong>{metrics.totalCompleted}</strong>
        </div>

        <div className="evaluation-summary-card">
          <span>Tempo médio total</span>

          <strong>
            {formatDuration({
              minutes: metrics.averageEvaluationMinutes
            })}
          </strong>
        </div>

        <div className="evaluation-summary-card">
          <span>Responsáveis avaliados</span>

          <strong>{metrics.byResponsible.length}</strong>
        </div>

        <div className="evaluation-summary-card">
          <span>Filiais avaliadas</span>

          <strong>{metrics.byBranch.length}</strong>
        </div>
      </section>

      {/* ======================================================
          MÉTRICAS
      ====================================================== */}

      <section className="evaluation-metrics-grid">
        {/* ====================================================
            RESPONSÁVEIS
        ==================================================== */}

        <div className="evaluations-card">
          <div className="evaluation-section-heading">
            <div>
              <h3>Tempo médio por responsável</h3>

              <p>
                Quem está levando mais ou menos tempo para concluir as etapas.
              </p>
            </div>
          </div>

          {metrics.byResponsible.length === 0 ? (
            <p className="evaluation-muted">Ainda não há dados suficientes.</p>
          ) : (
            <div className="evaluations-table-wrapper">
              <table className="evaluations-table">
                <thead>
                  <tr>
                    <th>Responsável</th>

                    <th>Etapas</th>

                    <th>Tempo médio</th>
                  </tr>
                </thead>

                <tbody>
                  {metrics.byResponsible.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {item.name || 'Responsável não informado'}
                        </strong>
                      </td>

                      <td>{item.stages ?? item.count ?? 0}</td>

                      <td>
                        {formatDuration({
                          minutes: Number(item.averageMinutes) || 0
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ====================================================
            FILIAIS
        ==================================================== */}

        <div className="evaluations-card">
          <div className="evaluation-section-heading">
            <div>
              <h3>Tempo médio por filial</h3>

              <p>Comparativo das etapas concluídas em cada filial.</p>
            </div>
          </div>

          {metrics.byBranch.length === 0 ? (
            <p className="evaluation-muted">Ainda não há dados suficientes.</p>
          ) : (
            <div className="evaluations-table-wrapper">
              <table className="evaluations-table">
                <thead>
                  <tr>
                    <th>Filial</th>

                    <th>Etapas</th>

                    <th>Tempo médio</th>
                  </tr>
                </thead>

                <tbody>
                  {metrics.byBranch.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name || 'Filial não informada'}</strong>
                      </td>

                      <td>{item.count ?? item.stages ?? 0}</td>

                      <td>
                        {formatDuration({
                          minutes: Number(item.averageMinutes) || 0
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================
          MODAL DE DETALHES
      ====================================================== */}

      {selectedWorkflow && (
        <div
          className="evaluations-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedWorkflow(null)
            }
          }}
        >
          <div className="evaluations-modal evaluations-modal-large">
            <header className="evaluations-modal-header">
              <div>
                <span className="evaluations-eyebrow">HISTÓRICO</span>

                <h2>{selectedWorkflow.modelName}</h2>

                <p>{selectedWorkflow.employeeName}</p>
              </div>

              <button
                type="button"
                className="evaluations-modal-close"
                onClick={() => setSelectedWorkflow(null)}
              >
                ×
              </button>
            </header>

            <div className="evaluations-modal-body">
              {/* ==================================================
                  ETAPAS
              ================================================== */}

              <section className="evaluation-detail-section">
                <h3>Etapas</h3>

                <div className="evaluation-workflow">
                  {selectedWorkflow.stages?.map((stage) => (
                    <div
                      className="evaluation-workflow-stage completed"
                      key={stage.id}
                    >
                      <div className="evaluation-workflow-number">
                        {stage.order}
                      </div>

                      <div className="evaluation-workflow-content">
                        <div className="evaluation-workflow-top">
                          <div>
                            <strong>{stage.name}</strong>

                            <span>
                              {stage.completedByName ||
                                stage.responsibleUserName ||
                                stage.responsibleType ||
                                'Responsável não informado'}
                            </span>
                          </div>

                          <span className="evaluation-status completed">
                            Concluída
                          </span>
                        </div>

                        <small>
                          Tempo: {formatDuration(calculateStageDuration(stage))}
                        </small>

                        {stage.completedByName && (
                          <small>Concluída por: {stage.completedByName}</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ==================================================
                  PDI
              ================================================== */}

              <section className="evaluation-detail-section">
                <h3>PDI</h3>

                <div className="evaluation-detail-box">
                  <p>
                    Responsável:{' '}
                    {selectedWorkflow.pdi?.completedByName ||
                      selectedWorkflow.pdi?.responsibleUserName ||
                      'Gerente/Supervisor'}
                  </p>

                  {selectedWorkflow.pdi?.questions?.map((question, index) => (
                    <div
                      className="evaluation-history-answer"
                      key={question.questionId}
                    >
                      <strong>
                        {index + 1}. {question.questionText}
                      </strong>

                      <p>{question.answer || '-'}</p>

                      {question.comment && (
                        <small>Comentário: {question.comment}</small>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* ==================================================
                  180°
              ================================================== */}

              {selectedWorkflow.evaluation180?.enabled && (
                <section className="evaluation-detail-section">
                  <h3>Avaliação 180°</h3>

                  <div className="evaluation-detail-box">
                    <p>
                      Avaliado por:{' '}
                      {selectedWorkflow.evaluation180?.completedByName ||
                        selectedWorkflow.employeeName}
                    </p>

                    {selectedWorkflow.evaluation180.questions?.map(
                      (question, index) => (
                        <div
                          className="evaluation-history-answer"
                          key={question.questionId}
                        >
                          <strong>
                            {index + 1}. {question.questionText}
                          </strong>

                          <p>{question.answer || '-'}</p>

                          {question.comment && (
                            <small>Comentário: {question.comment}</small>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </section>
              )}
            </div>

            <footer className="evaluations-modal-footer">
              <button
                type="button"
                className="evaluations-secondary-button"
                onClick={() => setSelectedWorkflow(null)}
              >
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
