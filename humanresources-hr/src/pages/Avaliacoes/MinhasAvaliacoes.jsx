import { useMemo, useState } from 'react'

import { getEmployees } from '../../services/employee'

import {
  calculateEvaluationProgress,
  completeEvaluation180,
  completeEvaluationPdi,
  completeEvaluationStage,
  getEvaluationWorkflows,
  isEvaluation180Unlocked,
  isPdiUnlocked,
  saveEvaluation180Answer,
  saveEvaluationAnswer,
  saveEvaluationPdiAnswer,
  startEvaluation180,
  startEvaluationPdi,
  startEvaluationStage
} from '../../services/evaluationWorkflow'

import './avaliacoes.css'

/*
 * ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================
 */

export default function MinhasAvaliacoes() {
  const employees = getEmployees()

  const [workflows, setWorkflows] = useState(getEvaluationWorkflows)

  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  const [message, setMessage] = useState('')

  /*
   * ==========================================================
   * ATUALIZAR DADOS
   * ==========================================================
   */

  function refresh() {
    const updated = getEvaluationWorkflows()

    setWorkflows(updated)

    if (selectedWorkflow) {
      setSelectedWorkflow(
        updated.find(
          (item) => String(item.id) === String(selectedWorkflow.id)
        ) || null
      )
    }
  }

  /*
   * ==========================================================
   * AVALIAÇÕES DISPONÍVEIS
   * ==========================================================
   *
   * Neste momento, enquanto a autenticação específica
   * do responsável ainda não está conectada ao módulo,
   * mostramos todas as avaliações que não foram canceladas.
   */

  const availableWorkflows = useMemo(
    () => workflows.filter((workflow) => workflow.status !== 'cancelled'),
    [workflows]
  )

  /*
   * ==========================================================
   * NOME DO FUNCIONÁRIO
   * ==========================================================
   */

  function getEmployeeName(employeeId) {
    return (
      employees.find((employee) => Number(employee.id) === Number(employeeId))
        ?.name || ''
    )
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="evaluations-page">
      <header className="evaluations-header">
        <div>
          <span className="evaluations-eyebrow">MINHAS AVALIAÇÕES</span>

          <h1>Minhas avaliações</h1>

          <p>Avaliações e etapas que precisam da sua resposta.</p>
        </div>
      </header>

      {message && <div className="evaluations-success">{message}</div>}

      {availableWorkflows.length === 0 ? (
        <section className="evaluations-card">
          <div className="evaluations-empty">
            <strong>Nenhuma avaliação pendente.</strong>

            <p>
              Quando houver uma avaliação atribuída a você, ela aparecerá aqui.
            </p>
          </div>
        </section>
      ) : (
        <section className="evaluation-my-list">
          {availableWorkflows.map((workflow) => {
            const progress = calculateEvaluationProgress(workflow)

            const currentStage = workflow.stages?.find(
              (stage) =>
                stage.status === 'pending' || stage.status === 'in_progress'
            )

            return (
              <article className="evaluation-my-card" key={workflow.id}>
                <div>
                  <span className="evaluations-eyebrow">AVALIAÇÃO</span>

                  <h2>{workflow.modelName}</h2>

                  <p>
                    Funcionário:{' '}
                    {getEmployeeName(workflow.employeeId) ||
                      workflow.employeeName}
                  </p>
                </div>

                <div className="evaluation-my-progress">
                  <span>{progress.percentage}%</span>

                  <div className="evaluation-progress-bar">
                    <span
                      style={{
                        width: `${progress.percentage}%`
                      }}
                    />
                  </div>
                </div>

                <div className="evaluation-my-current">
                  {currentStage ? (
                    <>
                      <strong>Etapa disponível:</strong>

                      <span>{currentStage.name}</span>
                    </>
                  ) : workflow.pdi?.status === 'pending' ? (
                    <>
                      <strong>Próxima etapa:</strong>

                      <span>PDI</span>
                    </>
                  ) : isEvaluation180Unlocked(workflow) ? (
                    <>
                      <strong>Próxima etapa:</strong>

                      <span>Avaliação 180°</span>
                    </>
                  ) : (
                    <span>Processo concluído.</span>
                  )}
                </div>

                <button
                  type="button"
                  className="evaluations-primary-button"
                  onClick={() => setSelectedWorkflow(workflow)}
                >
                  Responder
                </button>
              </article>
            )
          })}
        </section>
      )}

      {selectedWorkflow && (
        <EvaluationResponseModal
          workflow={selectedWorkflow}
          onClose={() => setSelectedWorkflow(null)}
          onRefresh={refresh}
          setMessage={setMessage}
        />
      )}
    </div>
  )
}

/*
 * ============================================================
 * MODAL DE RESPOSTA
 * ============================================================
 */

function EvaluationResponseModal({ workflow, onClose, onRefresh, setMessage }) {
  const currentStage = workflow.stages?.find(
    (stage) => stage.status === 'pending' || stage.status === 'in_progress'
  )

  const [activeStage, setActiveStage] = useState(currentStage?.id || null)

  const [answers, setAnswers] = useState({})

  const [error, setError] = useState('')

  /*
   * ==========================================================
   * ALTERAR RESPOSTA
   * ==========================================================
   */

  function handleAnswer(questionId, value) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: value
    }))
  }

  /*
   * ==========================================================
   * INICIAR ETAPA
   * ==========================================================
   */

  function handleStartStage(stage) {
    const result = startEvaluationStage(workflow.id, stage.id)

    if (!result.success) {
      setError(
        result.error || result.message || 'Não foi possível iniciar a etapa.'
      )

      return
    }

    setError('')

    setActiveStage(stage.id)

    onRefresh()
  }

  /*
   * ==========================================================
   * CONCLUIR ETAPA
   * ==========================================================
   */

  function handleSaveStage(stage) {
    const stageAnswers = answers

    stage.questions.forEach((question) => {
      if (stageAnswers[question.questionId] !== undefined) {
        saveEvaluationAnswer({
          workflowId: workflow.id,

          stageId: stage.id,

          questionId: question.questionId,

          answer: stageAnswers[question.questionId]
        })
      }
    })

    const result = completeEvaluationStage(workflow.id, stage.id)

    if (!result.success) {
      setError(
        result.error || result.message || 'Não foi possível concluir a etapa.'
      )

      return
    }

    setError('')

    setMessage('Etapa concluída com sucesso.')

    onRefresh()

    onClose()
  }

  /*
   * ==========================================================
   * INICIAR PDI
   * ==========================================================
   */

  function handlePdi() {
    const result = startEvaluationPdi(workflow.id)

    if (!result.success) {
      setError(
        result.error || result.message || 'Não foi possível iniciar o PDI.'
      )

      return
    }

    setError('')

    onRefresh()
  }

  /*
   * ==========================================================
   * CONCLUIR PDI
   * ==========================================================
   */

  function handleSavePdi() {
    const pdiQuestions = workflow.pdi?.questions || []

    pdiQuestions.forEach((question) => {
      const answer = answers[question.questionId]

      if (answer !== undefined) {
        saveEvaluationPdiAnswer({
          workflowId: workflow.id,

          questionId: question.questionId,

          answer
        })
      }
    })

    const result = completeEvaluationPdi(workflow.id)

    if (!result.success) {
      setError(
        result.error || result.message || 'Não foi possível concluir o PDI.'
      )

      return
    }

    setError('')

    setMessage('PDI concluído com sucesso.')

    onRefresh()

    onClose()
  }

  /*
   * ==========================================================
   * INICIAR 180°
   * ==========================================================
   */

  function handleStart180() {
    const result = startEvaluation180(workflow.id)

    if (!result.success) {
      setError(
        result.error ||
          result.message ||
          'Não foi possível iniciar a avaliação 180°.'
      )

      return
    }

    setError('')

    onRefresh()
  }

  /*
   * ==========================================================
   * CONCLUIR 180°
   * ==========================================================
   */

  function handleSave180() {
    const questions = workflow.evaluation180?.questions || []

    questions.forEach((question) => {
      const answer = answers[question.questionId]

      if (answer !== undefined) {
        saveEvaluation180Answer({
          workflowId: workflow.id,

          questionId: question.questionId,

          answer
        })
      }
    })

    const result = completeEvaluation180(workflow.id)

    if (!result.success) {
      setError(
        result.error ||
          result.message ||
          'Não foi possível concluir a avaliação 180°.'
      )

      return
    }

    setError('')

    setMessage('Avaliação 180° concluída.')

    onRefresh()

    onClose()
  }

  /*
   * ==========================================================
   * ESTADOS
   * ==========================================================
   */

  const stage = workflow.stages?.find((item) => item.id === activeStage)

  const pdiUnlocked = isPdiUnlocked(workflow)

  const evaluation180Unlocked = isEvaluation180Unlocked(workflow)

  /*
   * ==========================================================
   * RENDER MODAL
   * ==========================================================
   */

  return (
    <div className="evaluations-modal-overlay">
      <div className="evaluations-modal evaluations-modal-large">
        <header className="evaluations-modal-header">
          <div>
            <span className="evaluations-eyebrow">MINHAS AVALIAÇÕES</span>

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
          {error && <div className="evaluation-error">{error}</div>}

          {/* ==================================================
              ETAPA
          ================================================== */}

          {stage && (
            <section className="evaluation-response-section">
              <div className="evaluation-response-heading">
                <div>
                  <span>ETAPA {stage.order}</span>

                  <h3>{stage.name}</h3>

                  <p>{stage.description}</p>
                </div>

                {stage.status === 'pending' && (
                  <button
                    type="button"
                    className="evaluations-primary-button"
                    onClick={() => handleStartStage(stage)}
                  >
                    Iniciar etapa
                  </button>
                )}
              </div>

              {stage.status === 'in_progress' && (
                <div className="evaluation-answer-list">
                  {stage.questions.map((question, index) => (
                    <QuestionAnswer
                      key={question.questionId}
                      question={question}
                      index={index}
                      value={answers[question.questionId] ?? question.answer}
                      onChange={(value) =>
                        handleAnswer(question.questionId, value)
                      }
                    />
                  ))}

                  <button
                    type="button"
                    className="evaluations-primary-button"
                    onClick={() => handleSaveStage(stage)}
                  >
                    Concluir etapa
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              PDI
          ================================================== */}

          {pdiUnlocked && (
            <section className="evaluation-response-section">
              <div className="evaluation-response-heading">
                <div>
                  <span>PDI</span>

                  <h3>Plano de Desenvolvimento Individual</h3>

                  <p>Preenchido pelo gerente ou supervisor do setor.</p>
                </div>

                {workflow.pdi?.status !== 'completed' &&
                  workflow.pdi?.status !== 'in_progress' && (
                    <button
                      type="button"
                      className="evaluations-primary-button"
                      onClick={handlePdi}
                    >
                      Iniciar PDI
                    </button>
                  )}
              </div>

              {workflow.pdi?.status !== 'completed' &&
                workflow.pdi?.status === 'in_progress' && (
                  <div className="evaluation-answer-list">
                    {workflow.pdi.questions.map((question, index) => (
                      <div
                        className="evaluation-answer-card"
                        key={question.questionId}
                      >
                        <label>
                          {index + 1} — {question.questionText}
                          {question.required && <span> *</span>}
                        </label>

                        <textarea
                          rows="4"
                          value={
                            answers[question.questionId] ?? question.answer
                          }
                          onChange={(event) =>
                            handleAnswer(
                              question.questionId,
                              event.target.value
                            )
                          }
                        />
                      </div>
                    ))}

                    <button
                      type="button"
                      className="evaluations-primary-button"
                      onClick={handleSavePdi}
                    >
                      Concluir PDI
                    </button>
                  </div>
                )}
            </section>
          )}

          {/* ==================================================
              180°
          ================================================== */}

          {evaluation180Unlocked && (
            <section className="evaluation-response-section">
              <div className="evaluation-response-heading">
                <div>
                  <span>180°</span>

                  <h3>Avaliação do supervisor</h3>

                  <p>Esta etapa é respondida pelo funcionário.</p>
                </div>

                {workflow.evaluation180?.status === 'pending' && (
                  <button
                    type="button"
                    className="evaluations-primary-button"
                    onClick={handleStart180}
                  >
                    Iniciar 180°
                  </button>
                )}
              </div>

              {workflow.evaluation180?.status === 'in_progress' && (
                <div className="evaluation-answer-list">
                  {workflow.evaluation180.questions.map((question, index) => (
                    <QuestionAnswer
                      key={question.questionId}
                      question={question}
                      index={index}
                      value={answers[question.questionId] ?? question.answer}
                      onChange={(value) =>
                        handleAnswer(question.questionId, value)
                      }
                    />
                  ))}

                  <button
                    type="button"
                    className="evaluations-primary-button"
                    onClick={handleSave180}
                  >
                    Concluir 180°
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        <footer className="evaluations-modal-footer">
          <button
            type="button"
            className="evaluations-secondary-button"
            onClick={onClose}
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}

/*
 * ============================================================
 * COMPONENTE DE PERGUNTA
 * ============================================================
 */

function QuestionAnswer({ question, index, value, onChange }) {
  return (
    <div className="evaluation-answer-card">
      <label>
        {index + 1}. {question.questionText}
        {question.required && <span> *</span>}
      </label>

      {question.questionType === 'scale' && (
        <select
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecione uma nota...</option>

          {Array.from(
            {
              length: 10
            },
            (_, index) => index + 1
          ).map((number) => (
            <option key={number} value={number}>
              {number}
            </option>
          ))}
        </select>
      )}

      {question.questionType === 'yes_no' && (
        <select
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecione...</option>

          <option value="yes">Sim</option>

          <option value="no">Não</option>
        </select>
      )}

      {question.questionType === 'text' && (
        <textarea
          rows="4"
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}
