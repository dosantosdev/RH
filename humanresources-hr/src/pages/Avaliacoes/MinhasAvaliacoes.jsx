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
  startEvaluationPdi,
  startEvaluationStage
} from '../../services/evaluationWorkflow'

import './avaliacoes.css'

export default function MinhasAvaliacoes() {
  const employees = getEmployees()

  const [workflows, setWorkflows] = useState(getEvaluationWorkflows)

  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  const [message, setMessage] = useState('')

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
   * Neste primeiro momento mostramos avaliações
   * relacionadas ao usuário atual ou, enquanto a autenticação
   * ainda não estiver ligada a este módulo, todas as avaliações.
   */
  const availableWorkflows = useMemo(
    () => workflows.filter((workflow) => workflow.status !== 'cancelled'),
    [workflows]
  )

  function getEmployeeName(employeeId) {
    return (
      employees.find((employee) => Number(employee.id) === Number(employeeId))
        ?.name || ''
    )
  }

  return (
    <div className="evaluations-page">
      <header className="evaluations-header">
        <div>
          <span className="evaluations-eyebrow">AVALIAÇÕES</span>

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

function EvaluationResponseModal({ workflow, onClose, onRefresh, setMessage }) {
  const currentStage = workflow.stages?.find(
    (stage) => stage.status === 'pending' || stage.status === 'in_progress'
  )

  const [activeStage, setActiveStage] = useState(currentStage?.id || null)

  const [answers, setAnswers] = useState({})

  const [error, setError] = useState('')

  function handleAnswer(questionId, value) {
    setAnswers((previous) => ({
      ...previous,

      [questionId]: value
    }))
  }

  function handleStartStage(stage) {
    const result = startEvaluationStage(workflow.id, stage.id)

    if (!result.success) {
      setError(result.error)

      return
    }

    setError('')

    setActiveStage(stage.id)

    onRefresh()
  }

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
      setError(result.error)

      return
    }

    setError('')

    setMessage('Etapa concluída com sucesso.')

    onRefresh()

    onClose()
  }

  function handlePdi() {
    const result = startEvaluationPdi(workflow.id)

    if (!result.success) {
      setError(result.error)

      return
    }

    onRefresh()
  }

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
      setError(result.error)

      return
    }

    setMessage('PDI concluído com sucesso.')

    onRefresh()

    onClose()
  }

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
      setError(result.error)

      return
    }

    setMessage('Avaliação 180° concluída.')

    onRefresh()

    onClose()
  }

  const stage = workflow.stages?.find((item) => item.id === activeStage)

  const pdiUnlocked = isPdiUnlocked(workflow)

  const evaluation180Unlocked = isEvaluation180Unlocked(workflow)

  return (
    <div className="evaluations-modal-overlay">
      <div className="evaluations-modal evaluations-modal-large">
        <header className="evaluations-modal-header">
          <div>
            <span className="evaluations-eyebrow">RESPONDER</span>

            <h2>{workflow.modelName}</h2>
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
          {error && <div className="evaluations-error">{error}</div>}

          {stage && (
            <section className="evaluation-response-section">
              <div className="evaluation-response-heading">
                <div>
                  <span>ETAPA {stage.order}</span>

                  <h3>{stage.name}</h3>

                  <p>{stage.description}</p>
                </div>

                {stage.status === 'pending' ? (
                  <button
                    type="button"
                    className="evaluations-primary-button"
                    onClick={() => handleStartStage(stage)}
                  >
                    Iniciar etapa
                  </button>
                ) : null}
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

          {pdiUnlocked && (
            <section className="evaluation-response-section">
              <div className="evaluation-response-heading">
                <div>
                  <span>PDI</span>

                  <h3>Plano de Desenvolvimento Individual</h3>

                  <p>Preenchido pelo gerente ou supervisor do setor.</p>
                </div>

                {workflow.pdi?.startedAt === null && (
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
                workflow.pdi?.startedAt && (
                  <div className="evaluation-answer-list">
                    {workflow.pdi.questions.map((question, index) => (
                      <div
                        className="evaluation-answer-card"
                        key={question.questionId}
                      >
                        <label>
                          {index + 1} — {question.questionText}
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

          {evaluation180Unlocked && (
            <section className="evaluation-response-section">
              <div>
                <span>180°</span>

                <h3>Avaliação do supervisor</h3>

                <p>Esta etapa é respondida pelo funcionário.</p>
              </div>

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
