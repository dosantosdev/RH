import { useMemo, useState } from 'react'

import {
  calculateEvaluationDuration,
  calculateStageDuration,
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

export default function HistoricoAvaliacoes() {
  const [workflows] = useState(() =>
    getEvaluationWorkflows().filter(
      (workflow) => workflow.status === 'completed'
    )
  )

  const [search, setSearch] = useState('')

  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

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

  return (
    <div className="evaluations-page">
      <header className="evaluations-header">
        <div>
          <span className="evaluations-eyebrow">AVALIAÇÕES</span>

          <h1>Histórico</h1>

          <p>Avaliações já concluídas e seus resultados.</p>
        </div>
      </header>

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

      {selectedWorkflow && (
        <div className="evaluations-modal-overlay">
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
              <section className="evaluation-detail-section">
                <h3>Etapas</h3>

                <div className="evaluation-workflow">
                  {selectedWorkflow.stages.map((stage) => (
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
                              {stage.responsibleUserName ||
                                stage.responsibleType}
                            </span>
                          </div>

                          <span className="evaluation-status completed">
                            Concluída
                          </span>
                        </div>

                        <small>
                          Tempo: {formatDuration(calculateStageDuration(stage))}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="evaluation-detail-section">
                <h3>PDI</h3>

                {selectedWorkflow.pdi?.questions?.map((question, index) => (
                  <div
                    className="evaluation-history-answer"
                    key={question.questionId}
                  >
                    <strong>
                      {index + 1}. {question.questionText}
                    </strong>

                    <p>{question.answer || '-'}</p>
                  </div>
                ))}
              </section>

              {selectedWorkflow.evaluation180?.enabled && (
                <section className="evaluation-detail-section">
                  <h3>Avaliação 180°</h3>

                  {selectedWorkflow.evaluation180.questions.map(
                    (question, index) => (
                      <div
                        className="evaluation-history-answer"
                        key={question.questionId}
                      >
                        <strong>
                          {index + 1}. {question.questionText}
                        </strong>

                        <p>{question.answer || '-'}</p>
                      </div>
                    )
                  )}
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
