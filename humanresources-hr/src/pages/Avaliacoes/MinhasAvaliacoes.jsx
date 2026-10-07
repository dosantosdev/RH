import { useState } from 'react'

import { getEmployees } from '../../services/employee'
import { getCurrentUser } from '../../services/auth'

import {
  calculateEvaluationProgress,
  completeEvaluation180,
  completeEvaluationPdi,
  completeEvaluationStage,
  getEvaluationWorkflows,
  isEvaluation180Unlocked,
  isPdiUnlocked,
  saveEvaluation180Answer,
  saveEvaluation180Signature,
  saveEvaluationAnswer,
  saveEvaluationPdiAnswer,
  saveEvaluationPdiSignature,
  saveEvaluationStageSignature,
  startEvaluation180,
  startEvaluationPdi,
  startEvaluationStage
} from '../../services/evaluationWorkflow'

import {
  canAnswerEvaluation180,
  canAnswerEvaluationPdi,
  canAnswerEvaluationStage,
  canViewEvaluation180,
  isEvaluationEmployee,
  isEvaluationStageResponsible
} from '../../services/evaluationAccess'

import SignaturePad from '../../components/evaluations/SignaturePad'

import './avaliacoes.css'

/*
 * ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================
 */

export default function MinhasAvaliacoes() {
  const employees = getEmployees()

  const currentUser = getCurrentUser()

  const [workflows, setWorkflows] = useState(getEvaluationWorkflows)

  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  const [message, setMessage] = useState('')

  /*
   * ============================================================
   * ATUALIZAR DADOS
   * ============================================================
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
   * ============================================================
   * VERIFICAR SE O USUÁRIO PODE ATUAR
   * ============================================================
   */

  function canActOnWorkflow(workflow) {
    if (!currentUser || !workflow) {
      return false
    }

    /*
     * Funcionário avaliado.
     */
    if (isEvaluationEmployee(workflow, currentUser)) {
      return true
    }

    /*
     * Responsável por alguma etapa.
     */
    if (
      workflow.stages?.some((stage) =>
        isEvaluationStageResponsible(workflow, stage, currentUser)
      )
    ) {
      return true
    }

    /*
     * Responsável pelo PDI.
     */
    if (canAnswerEvaluationPdi(workflow, currentUser)) {
      return true
    }

    /*
     * Funcionário que responderá o 180°.
     */
    if (canAnswerEvaluation180(workflow, currentUser)) {
      return true
    }

    return false
  }

  /*
   * ============================================================
   * AVALIAÇÕES DISPONÍVEIS
   * ============================================================
   */

  const availableWorkflows = workflows.filter(
    (workflow) => workflow.status !== 'cancelled' && canActOnWorkflow(workflow)
  )

  /*
   * ============================================================
   * NOME DO FUNCIONÁRIO
   * ============================================================
   */

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
                  ) : isEvaluation180Unlocked(workflow) &&
                    workflow.evaluation180?.status !== 'completed' ? (
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
  const currentUser = getCurrentUser()

  const currentStage = workflow.stages?.find(
    (stage) => stage.status === 'pending' || stage.status === 'in_progress'
  )

  const [activeStage, setActiveStage] = useState(currentStage?.id || null)

  const [answers, setAnswers] = useState({})

  const [stageSignature, setStageSignature] = useState('')

  const [pdiSignature, setPdiSignature] = useState('')

  const [signature180, setSignature180] = useState('')

  const [error, setError] = useState('')

  /*
   * ============================================================
   * RESPOSTA
   * ============================================================
   */

  function handleAnswer(questionId, value) {
    setAnswers((previous) => ({
      ...previous,

      [questionId]: value
    }))
  }

  /*
   * ============================================================
   * ETAPA
   * ============================================================
   */

  function handleStartStage(stage) {
    if (!canAnswerEvaluationStage(workflow, stage, currentUser)) {
      setError('Você não é o responsável por esta etapa.')

      return
    }

    const result = startEvaluationStage(workflow.id, stage.id)

    if (!result.success) {
      setError(
        result.error || result.message || 'Não foi possível iniciar a etapa.'
      )

      return
    }

    setError('')

    setActiveStage(stage.id)

    setStageSignature('')

    setAnswers({})

    onRefresh()
  }

  /*
   * ============================================================
   * CONCLUIR ETAPA
   * ============================================================
   */

  function handleSaveStage(stage) {
    if (!canAnswerEvaluationStage(workflow, stage, currentUser)) {
      setError('Você não possui permissão para responder esta etapa.')

      return
    }

    if (!stageSignature) {
      setError('Faça sua assinatura antes de concluir a etapa.')

      return
    }

    /*
     * Salva as respostas.
     */
    for (const question of stage.questions || []) {
      const answer = answers[question.questionId]

      if (answer !== undefined) {
        saveEvaluationAnswer({
          workflowId: workflow.id,

          stageId: stage.id,

          questionId: question.questionId,

          answer
        })
      }
    }

    /*
     * ==========================================================
     * SALVA A ASSINATURA
     * ==========================================================
     *
     * O componente SignaturePad já transforma o desenho em
     * Base64 PNG.
     *
     * Aqui gravamos a assinatura no workflow antes de chamar
     * completeEvaluationStage().
     */
    const signatureResult = saveEvaluationStageSignature({
      workflowId: workflow.id,

      stageId: stage.id,

      signature: stageSignature,

      signedById: currentUser?.id || '',

      signedByName: currentUser?.name || currentUser?.username || ''
    })

    if (!signatureResult.success) {
      setError(
        signatureResult.error ||
          signatureResult.message ||
          'Não foi possível salvar a assinatura da etapa.'
      )

      return
    }

    /*
     * Agora a etapa pode ser concluída porque a assinatura
     * já existe no workflow.
     */
    const result = completeEvaluationStage(
      workflow.id,

      stage.id,

      currentUser?.id || '',

      currentUser?.name || currentUser?.username || ''
    )

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
   * ============================================================
   * PDI
   * ============================================================
   */

  function handlePdi() {
    if (!canAnswerEvaluationPdi(workflow, currentUser)) {
      setError(
        'Você não possui permissão para preencher o PDI desta avaliação.'
      )

      return
    }

    const result = startEvaluationPdi(workflow.id)

    if (!result.success) {
      setError(
        result.error || result.message || 'Não foi possível iniciar o PDI.'
      )

      return
    }

    setError('')

    setPdiSignature('')

    setAnswers({})

    onRefresh()
  }

  /*
   * ============================================================
   * CONCLUIR PDI
   * ============================================================
   */

  function handleSavePdi() {
    if (!canAnswerEvaluationPdi(workflow, currentUser)) {
      setError(
        'Você não possui permissão para preencher o PDI desta avaliação.'
      )

      return
    }

    if (!pdiSignature) {
      setError('Faça sua assinatura antes de concluir o PDI.')

      return
    }

    for (const question of workflow.pdi?.questions || []) {
      const answer = answers[question.questionId]

      if (answer !== undefined) {
        saveEvaluationPdiAnswer({
          workflowId: workflow.id,

          questionId: question.questionId,

          answer
        })
      }
    }

    /*
     * Salva a assinatura primeiro.
     */
    const signatureResult = saveEvaluationPdiSignature({
      workflowId: workflow.id,

      signature: pdiSignature,

      signedById: currentUser?.id || '',

      signedByName: currentUser?.name || currentUser?.username || ''
    })

    if (!signatureResult.success) {
      setError(
        signatureResult.error ||
          signatureResult.message ||
          'Não foi possível salvar a assinatura do PDI.'
      )

      return
    }

    const result = completeEvaluationPdi(
      workflow.id,

      currentUser?.id || '',

      currentUser?.name || currentUser?.username || ''
    )

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
   * ============================================================
   * 180°
   * ============================================================
   */

  function handleStart180() {
    if (!canAnswerEvaluation180(workflow, currentUser)) {
      setError(
        'Somente o funcionário avaliado pode responder a avaliação 180°.'
      )

      return
    }

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

    setSignature180('')

    setAnswers({})

    onRefresh()
  }

  /*
   * ============================================================
   * CONCLUIR 180°
   * ============================================================
   */

  function handleSave180() {
    if (!canAnswerEvaluation180(workflow, currentUser)) {
      setError(
        'Somente o funcionário avaliado pode responder a avaliação 180°.'
      )

      return
    }

    if (!signature180) {
      setError('Faça sua assinatura antes de concluir a avaliação 180°.')

      return
    }

    for (const question of workflow.evaluation180?.questions || []) {
      const answer = answers[question.questionId]

      if (answer !== undefined) {
        saveEvaluation180Answer({
          workflowId: workflow.id,

          questionId: question.questionId,

          answer
        })
      }
    }

    /*
     * Salva a assinatura primeiro.
     */
    const signatureResult = saveEvaluation180Signature({
      workflowId: workflow.id,

      signature: signature180,

      signedById: currentUser?.id || '',

      signedByName: currentUser?.name || currentUser?.username || ''
    })

    if (!signatureResult.success) {
      setError(
        signatureResult.error ||
          signatureResult.message ||
          'Não foi possível salvar a assinatura do 180°.'
      )

      return
    }

    const result = completeEvaluation180(
      workflow.id,

      currentUser?.id || '',

      currentUser?.name || currentUser?.username || ''
    )

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
   * ============================================================
   * ESTADOS
   * ============================================================
   */

  const stage = workflow.stages?.find((item) => item.id === activeStage)

  const pdiUnlocked = isPdiUnlocked(workflow)

  const evaluation180Unlocked = isEvaluation180Unlocked(workflow)

  const canAnswerCurrentStage = stage
    ? canAnswerEvaluationStage(workflow, stage, currentUser)
    : false

  const canAnswerPdi = canAnswerEvaluationPdi(workflow, currentUser)

  const canAnswer180 = canAnswerEvaluation180(workflow, currentUser)

  const canView180 = canViewEvaluation180(workflow, currentUser)

  /*
   * ============================================================
   * RENDER
   * ============================================================
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

                  {stage.responsibleUserName && (
                    <small>Responsável: {stage.responsibleUserName}</small>
                  )}
                </div>

                {stage.status === 'pending' && canAnswerCurrentStage && (
                  <button
                    type="button"
                    className="evaluations-primary-button"
                    onClick={() => handleStartStage(stage)}
                  >
                    Iniciar etapa
                  </button>
                )}
              </div>

              {stage.status === 'pending' && !canAnswerCurrentStage && (
                <div className="evaluation-detail-box">
                  <strong>Esta etapa está aguardando outro responsável.</strong>

                  <p>Você não pode responder esta etapa.</p>
                </div>
              )}

              {stage.status === 'in_progress' && canAnswerCurrentStage && (
                <div className="evaluation-answer-list">
                  {(stage.questions || []).map((question, index) => (
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

                  <SignaturePad
                    value={stageSignature}
                    onChange={setStageSignature}
                  />

                  <button
                    type="button"
                    className="evaluations-primary-button"
                    onClick={() => handleSaveStage(stage)}
                  >
                    Concluir etapa
                  </button>
                </div>
              )}

              {stage.status === 'in_progress' && !canAnswerCurrentStage && (
                <div className="evaluation-detail-box">
                  <strong>
                    Esta etapa está sendo respondida pelo responsável.
                  </strong>

                  <p>Você não possui permissão para alterar esta etapa.</p>
                </div>
              )}

              {stage.status === 'completed' && (
                <div className="evaluation-detail-box">
                  <strong>Etapa concluída.</strong>

                  {stage.averageScore !== undefined && (
                    <p>
                      Média da etapa: <strong>{stage.averageScore}</strong>
                    </p>
                  )}

                  {stage.signedAt && (
                    <p>Assinada em: {formatDateTime(stage.signedAt)}</p>
                  )}

                  {stage.signedByName && (
                    <p>Assinada por: {stage.signedByName}</p>
                  )}
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
                  workflow.pdi?.status !== 'in_progress' &&
                  canAnswerPdi && (
                    <button
                      type="button"
                      className="evaluations-primary-button"
                      onClick={handlePdi}
                    >
                      Iniciar PDI
                    </button>
                  )}
              </div>

              {workflow.pdi?.status === 'pending' && !canAnswerPdi && (
                <div className="evaluation-detail-box">
                  <strong>
                    O PDI está aguardando o gerente/supervisor responsável.
                  </strong>
                </div>
              )}

              {workflow.pdi?.status === 'in_progress' && canAnswerPdi && (
                <div className="evaluation-answer-list">
                  {(workflow.pdi.questions || []).map((question, index) => (
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
                        value={answers[question.questionId] ?? question.answer}
                        onChange={(event) =>
                          handleAnswer(question.questionId, event.target.value)
                        }
                      />
                    </div>
                  ))}

                  <SignaturePad
                    value={pdiSignature}
                    onChange={setPdiSignature}
                  />

                  <button
                    type="button"
                    className="evaluations-primary-button"
                    onClick={handleSavePdi}
                  >
                    Concluir PDI
                  </button>
                </div>
              )}

              {workflow.pdi?.status === 'in_progress' && !canAnswerPdi && (
                <div className="evaluation-detail-box">
                  <strong>O PDI está sendo preenchido pelo responsável.</strong>
                </div>
              )}

              {workflow.pdi?.status === 'completed' && (
                <div className="evaluation-detail-box">
                  <strong>PDI concluído.</strong>

                  {workflow.pdi?.signedAt && (
                    <p>Assinado em: {formatDateTime(workflow.pdi.signedAt)}</p>
                  )}

                  {workflow.pdi?.signedByName && (
                    <p>Assinado por: {workflow.pdi.signedByName}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* ==================================================
              180°
          ================================================== */}

          {evaluation180Unlocked && canView180 && (
            <section className="evaluation-response-section">
              <div className="evaluation-response-heading">
                <div>
                  <span>180°</span>

                  <h3>Avaliação do supervisor</h3>

                  <p>
                    Esta avaliação é respondida somente pelo funcionário
                    avaliado.
                  </p>
                </div>

                {workflow.evaluation180?.status === 'pending' &&
                  canAnswer180 && (
                    <button
                      type="button"
                      className="evaluations-primary-button"
                      onClick={handleStart180}
                    >
                      Iniciar 180°
                    </button>
                  )}
              </div>

              {workflow.evaluation180?.status === 'pending' &&
                !canAnswer180 && (
                  <div className="evaluation-detail-box">
                    <strong>
                      O 180° será respondido pelo funcionário avaliado.
                    </strong>

                    <p>
                      Você pode visualizar o andamento, mas não pode responder
                      esta etapa.
                    </p>
                  </div>
                )}

              {workflow.evaluation180?.status === 'in_progress' &&
                canAnswer180 && (
                  <div className="evaluation-answer-list">
                    {(workflow.evaluation180.questions || []).map(
                      (question, index) => (
                        <QuestionAnswer
                          key={question.questionId}
                          question={question}
                          index={index}
                          value={
                            answers[question.questionId] ?? question.answer
                          }
                          onChange={(value) =>
                            handleAnswer(question.questionId, value)
                          }
                        />
                      )
                    )}

                    <SignaturePad
                      value={signature180}
                      onChange={setSignature180}
                    />

                    <button
                      type="button"
                      className="evaluations-primary-button"
                      onClick={handleSave180}
                    >
                      Concluir 180°
                    </button>
                  </div>
                )}

              {workflow.evaluation180?.status === 'in_progress' &&
                !canAnswer180 && (
                  <div className="evaluation-detail-box">
                    <strong>
                      Esta avaliação está sendo respondida pelo funcionário.
                    </strong>
                  </div>
                )}

              {workflow.evaluation180?.status === 'completed' && (
                <div className="evaluation-detail-box">
                  <strong>Avaliação 180° concluída.</strong>

                  <p>
                    As respostas do 180° são restritas conforme as regras de
                    acesso da avaliação.
                  </p>

                  {canView180 && workflow.evaluation180?.signedAt && (
                    <p>
                      Assinada em:{' '}
                      {formatDateTime(workflow.evaluation180.signedAt)}
                    </p>
                  )}
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
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Selecione uma nota...</option>

          {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
            <option key={number} value={number}>
              {number}
            </option>
          ))}
        </select>
      )}

      {question.questionType === 'yes_no' && (
        <select
          value={value ?? ''}
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
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  )
}

/*
 * ============================================================
 * DATA/HORA
 * ============================================================
 */

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('pt-BR')
}
