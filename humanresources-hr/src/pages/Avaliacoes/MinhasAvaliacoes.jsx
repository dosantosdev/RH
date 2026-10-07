import React, { useEffect, useMemo, useState } from 'react'

import {
  getEvaluationWorkflows,
  startEvaluationPdi,
  answerEvaluationPdiQuestion,
  completeEvaluationPdi,
  refreshEvaluationWorkflowStatus
} from '../../services/evaluationWorkflow'

import {
  canViewEvaluationPdi,
  canRespondToPdi
} from '../../services/evaluationAccess'

import { getStoredArray } from '../../services/storage'

import './avaliacoes.css'

/*
 * ============================================================
 * MINHAS AVALIAÇÕES
 * ============================================================
 *
 * Esta página apresenta as avaliações que estão relacionadas
 * ao usuário logado.
 *
 * O PDI utiliza as perguntas que foram configuradas no modelo
 * da avaliação.
 */

export default function MinhasAvaliacoes() {
  const [currentUser, setCurrentUser] = useState(null)

  const [workflows, setWorkflows] = useState([])

  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null)

  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  const [pdiAnswers, setPdiAnswers] = useState({})

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  const [success, setSuccess] = useState('')

  /*
   * ----------------------------------------------------------
   * USUÁRIO LOGADO
   * ----------------------------------------------------------
   */

  useEffect(() => {
    loadCurrentUser()
  }, [])

  function loadCurrentUser() {
    const users = getStoredArray('users')

    /*
     * O sistema utiliza diferentes nomes dependendo da parte
     * em que o usuário foi criado.
     *
     * Tentamos primeiro os formatos mais comuns.
     */

    const loggedUser = getLoggedUserFromStorage(users)

    setCurrentUser(loggedUser)
  }

  /*
   * ----------------------------------------------------------
   * CARREGAR AVALIAÇÕES
   * ----------------------------------------------------------
   */

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)

      return
    }

    loadWorkflows()
  }, [currentUser])

  function loadWorkflows() {
    setLoading(true)

    try {
      let storedWorkflows = getEvaluationWorkflows()

      /*
       * Atualiza o status das avaliações antigas antes de
       * apresentá-las.
       */

      storedWorkflows = storedWorkflows.map(
        (workflow) => refreshEvaluationWorkflowStatus(workflow.id) || workflow
      )

      /*
       * Depois da atualização, buscamos novamente os dados
       * armazenados.
       */

      storedWorkflows = getEvaluationWorkflows()

      const visibleWorkflows = storedWorkflows.filter(
        (workflow) =>
          canViewEvaluationPdi(workflow, currentUser) ||
          isUserParticipant(workflow, currentUser)
      )

      setWorkflows(visibleWorkflows)
    } catch (loadError) {
      console.error(loadError)

      setError('Não foi possível carregar suas avaliações.')
    } finally {
      setLoading(false)
    }
  }

  /*
   * ----------------------------------------------------------
   * SELECIONAR AVALIAÇÃO
   * ----------------------------------------------------------
   */

  function handleSelectWorkflow(workflow) {
    setSelectedWorkflowId(workflow.id)

    setSelectedWorkflow(workflow)

    setError('')

    setSuccess('')

    /*
     * Carrega as respostas que já existem no PDI.
     */

    setPdiAnswers(getExistingPdiAnswers(workflow))
  }

  /*
   * ----------------------------------------------------------
   * VOLTAR PARA LISTA
   * ----------------------------------------------------------
   */

  function handleBack() {
    setSelectedWorkflowId(null)

    setSelectedWorkflow(null)

    setPdiAnswers({})

    setError('')

    setSuccess('')
  }

  /*
   * ----------------------------------------------------------
   * ALTERAR RESPOSTA
   * ----------------------------------------------------------
   */

  function handleAnswerChange(questionId, value) {
    setPdiAnswers((current) => ({
      ...current,

      [questionId]: value
    }))
  }

  /*
   * ----------------------------------------------------------
   * INICIAR PDI
   * ----------------------------------------------------------
   */

  function handleStartPdi() {
    if (!selectedWorkflow || !currentUser) {
      return
    }

    setError('')

    try {
      const updatedWorkflow = startEvaluationPdi(
        selectedWorkflow.id,
        currentUser.id
      )

      if (!updatedWorkflow) {
        setError('Não foi possível iniciar o PDI.')

        return
      }

      setSelectedWorkflow(updatedWorkflow)

      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === updatedWorkflow.id ? updatedWorkflow : workflow
        )
      )

      setPdiAnswers(getExistingPdiAnswers(updatedWorkflow))

      setSuccess('PDI iniciado com sucesso.')
    } catch (startError) {
      console.error(startError)

      setError(startError.message || 'Não foi possível iniciar o PDI.')
    }
  }

  /*
   * ----------------------------------------------------------
   * SALVAR RESPOSTAS
   * ----------------------------------------------------------
   */

  function handleSavePdi(complete = false) {
    if (!selectedWorkflow || !currentUser) {
      return
    }

    setSaving(true)

    setError('')

    setSuccess('')

    try {
      let updatedWorkflow = selectedWorkflow

      /*
       * Caso o PDI ainda não tenha sido iniciado, iniciamos
       * automaticamente antes de salvar.
       */

      if (!isPdiStarted(updatedWorkflow)) {
        updatedWorkflow = startEvaluationPdi(
          selectedWorkflow.id,
          currentUser.id
        )
      }

      /*
       * Salva cada resposta no workflow.
       */

      Object.entries(pdiAnswers).forEach(([questionId, answer]) => {
        updatedWorkflow = answerEvaluationPdiQuestion(
          updatedWorkflow.id,
          questionId,
          answer,
          currentUser.id
        )
      })

      /*
       * Se o usuário clicou em concluir, fazemos a validação
       * final.
       */

      if (complete) {
        updatedWorkflow = completeEvaluationPdi(
          updatedWorkflow.id,
          currentUser.id
        )

        setSuccess('PDI concluído com sucesso.')
      } else {
        setSuccess('Respostas salvas com sucesso.')
      }

      setSelectedWorkflow(updatedWorkflow)

      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === updatedWorkflow.id ? updatedWorkflow : workflow
        )
      )

      setPdiAnswers(getExistingPdiAnswers(updatedWorkflow))
    } catch (saveError) {
      console.error(saveError)

      setError(saveError.message || 'Não foi possível salvar o PDI.')
    } finally {
      setSaving(false)
    }
  }

  /*
   * ----------------------------------------------------------
   * ESTADOS
   * ----------------------------------------------------------
   */

  const pendingWorkflows = useMemo(
    () => workflows.filter((workflow) => !isPdiCompleted(workflow)),
    [workflows]
  )

  const completedWorkflows = useMemo(
    () => workflows.filter((workflow) => isPdiCompleted(workflow)),
    [workflows]
  )

  /*
   * ==========================================================
   * CARREGANDO
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="avaliacoes-page">
        <div className="avaliacoes-loading">Carregando avaliações...</div>
      </div>
    )
  }

  /*
   * ==========================================================
   * SEM USUÁRIO
   * ==========================================================
   */

  if (!currentUser) {
    return (
      <div className="avaliacoes-page">
        <div className="avaliacoes-empty-page">
          <h2>Usuário não identificado</h2>

          <p>
            Não foi possível identificar o usuário conectado para carregar as
            avaliações.
          </p>
        </div>
      </div>
    )
  }

  /*
   * ==========================================================
   * DETALHES DA AVALIAÇÃO
   * ==========================================================
   */

  if (selectedWorkflow) {
    return (
      <EvaluationDetails
        workflow={selectedWorkflow}
        currentUser={currentUser}
        pdiAnswers={pdiAnswers}
        saving={saving}
        error={error}
        success={success}
        onBack={handleBack}
        onAnswerChange={handleAnswerChange}
        onStartPdi={handleStartPdi}
        onSavePdi={handleSavePdi}
      />
    )
  }

  /*
   * ==========================================================
   * LISTA
   * ==========================================================
   */

  return (
    <div className="avaliacoes-page">
      <div className="avaliacoes-header">
        <div>
          <span className="avaliacoes-kicker">DESEMPENHO</span>

          <h1>Minhas avaliações</h1>

          <p>Consulte suas avaliações e responda aos PDIs disponíveis.</p>
        </div>
      </div>

      {error && (
        <div className="avaliacoes-alert avaliacao-alert-error">{error}</div>
      )}

      {success && (
        <div className="avaliacoes-alert avaliacao-alert-success">
          {success}
        </div>
      )}

      {/* =====================================================
          PENDENTES
      ====================================================== */}

      <section className="avaliacoes-section">
        <div className="avaliacoes-section-header">
          <div>
            <span className="avaliacoes-section-number">01</span>

            <div>
              <h2>Pendentes</h2>

              <p>Avaliações que ainda precisam da sua atenção.</p>
            </div>
          </div>

          <span className="avaliacoes-section-badge">
            {pendingWorkflows.length}
          </span>
        </div>

        {pendingWorkflows.length === 0 ? (
          <div className="avaliacoes-empty-box">
            <strong>Nenhuma avaliação pendente</strong>

            <p>Você não possui avaliações pendentes no momento.</p>
          </div>
        ) : (
          <div className="avaliacoes-models-grid">
            {pendingWorkflows.map((workflow) => (
              <EvaluationCard
                key={workflow.id}
                workflow={workflow}
                currentUser={currentUser}
                onSelect={handleSelectWorkflow}
              />
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          CONCLUÍDAS
      ====================================================== */}

      <section className="avaliacoes-section">
        <div className="avaliacoes-section-header">
          <div>
            <span className="avaliacoes-section-number">02</span>

            <div>
              <h2>Concluídas</h2>

              <p>Avaliações que já foram finalizadas.</p>
            </div>
          </div>

          <span className="avaliacoes-section-badge">
            {completedWorkflows.length}
          </span>
        </div>

        {completedWorkflows.length === 0 ? (
          <div className="avaliacoes-empty-box">
            <strong>Nenhuma avaliação concluída</strong>

            <p>As avaliações concluídas aparecerão aqui.</p>
          </div>
        ) : (
          <div className="avaliacoes-models-grid">
            {completedWorkflows.map((workflow) => (
              <EvaluationCard
                key={workflow.id}
                workflow={workflow}
                currentUser={currentUser}
                onSelect={handleSelectWorkflow}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/*
 * ============================================================
 * CARD DA AVALIAÇÃO
 * ============================================================
 */

function EvaluationCard({ workflow, currentUser, onSelect }) {
  const completed = isPdiCompleted(workflow)

  const pdi = workflow.pdi || {}

  const questions = Array.isArray(pdi.questions) ? pdi.questions : []

  const answered = questions.filter((question) =>
    hasAnswer(question.answer)
  ).length

  const canAnswer = canRespondToPdi(workflow, currentUser)

  return (
    <article className="avaliacoes-model-card">
      <div className="avaliacoes-model-card-header">
        <div>
          <span className="avaliacoes-model-type">
            {getWorkflowType(workflow)}
          </span>

          <h2>{getWorkflowName(workflow)}</h2>
        </div>

        <span
          className={
            completed ? 'avaliacoes-status active' : 'avaliacoes-status pending'
          }
        >
          {completed ? 'Concluída' : 'Pendente'}
        </span>
      </div>

      <p className="avaliacoes-model-description">
        {getEmployeeName(workflow)}
      </p>

      <div className="avaliacoes-model-stats">
        <div>
          <strong>{answered}</strong>

          <span>Respondidas</span>
        </div>

        <div>
          <strong>{questions.length}</strong>

          <span>Perguntas PDI</span>
        </div>

        <div>
          <strong>{getPdiStatusLabel(pdi)}</strong>

          <span>PDI</span>
        </div>
      </div>

      <div className="avaliacoes-model-card-actions">
        <button
          type="button"
          className="avaliacoes-primary-button"
          onClick={() => onSelect(workflow)}
        >
          {completed
            ? 'Visualizar'
            : canAnswer
              ? 'Responder PDI'
              : 'Visualizar avaliação'}
        </button>
      </div>
    </article>
  )
}

/*
 * ============================================================
 * DETALHES
 * ============================================================
 */

function EvaluationDetails({
  workflow,
  currentUser,
  pdiAnswers,
  saving,
  error,
  success,
  onBack,
  onAnswerChange,
  onStartPdi,
  onSavePdi
}) {
  const pdi = workflow.pdi || {}

  const questions = Array.isArray(pdi.questions) ? pdi.questions : []

  const completed = isPdiCompleted(workflow)

  const started = isPdiStarted(workflow)

  const canAnswer = canRespondToPdi(workflow, currentUser)

  const progress = calculateProgress(questions, pdiAnswers)

  return (
    <div className="avaliacoes-page">
      <div className="avaliacoes-header">
        <div>
          <button
            type="button"
            className="avaliacoes-back-button"
            onClick={onBack}
          >
            ← Voltar para avaliações
          </button>

          <span className="avaliacoes-kicker">PDI</span>

          <h1>{getWorkflowName(workflow)}</h1>

          <p>{getEmployeeName(workflow)}</p>
        </div>
      </div>

      {error && (
        <div className="avaliacoes-alert avaliacao-alert-error">{error}</div>
      )}

      {success && (
        <div className="avaliacoes-alert avaliacao-alert-success">
          {success}
        </div>
      )}

      {/* =====================================================
          RESUMO
      ====================================================== */}

      <section className="avaliacoes-section">
        <div className="avaliacoes-section-header">
          <div>
            <span className="avaliacoes-section-number">01</span>

            <div>
              <h2>Resumo</h2>

              <p>Informações desta avaliação.</p>
            </div>
          </div>

          <span
            className={
              completed
                ? 'avaliacoes-status active'
                : 'avaliacoes-status pending'
            }
          >
            {completed
              ? 'Concluída'
              : started
                ? 'Em andamento'
                : 'Não iniciada'}
          </span>
        </div>

        <div className="avaliacoes-detail-grid">
          <div>
            <span>Funcionário</span>

            <strong>{getEmployeeName(workflow)}</strong>
          </div>

          <div>
            <span>Modelo</span>

            <strong>{getWorkflowName(workflow)}</strong>
          </div>

          <div>
            <span>Responsável pelo PDI</span>

            <strong>{getPdiResponsibleName(workflow)}</strong>
          </div>

          <div>
            <span>Progresso</span>

            <strong>{progress}%</strong>
          </div>
        </div>
      </section>

      {/* =====================================================
          PDI
      ====================================================== */}

      <section className="avaliacoes-section avaliacoes-pdi-section">
        <div className="avaliacoes-section-header">
          <div>
            <span className="avaliacoes-section-number">02</span>

            <div>
              <h2>Plano de Desenvolvimento Individual</h2>

              <p>
                Responda às perguntas definidas para este modelo de avaliação.
              </p>
            </div>
          </div>
        </div>

        {!started && !completed && canAnswer ? (
          <div className="avaliacoes-start-box">
            <div>
              <h3>PDI ainda não iniciado</h3>

              <p>Inicie o PDI para registrar suas respostas.</p>
            </div>

            <button
              type="button"
              className="avaliacoes-primary-button"
              onClick={onStartPdi}
            >
              Iniciar PDI
            </button>
          </div>
        ) : null}

        {questions.length === 0 ? (
          <div className="avaliacoes-empty-box">
            <strong>Nenhuma pergunta encontrada</strong>

            <p>Este PDI não possui perguntas configuradas.</p>
          </div>
        ) : (
          <div className="avaliacoes-pdi-list">
            {questions.map((question, index) => {
              const value = pdiAnswers[question.id] ?? question.answer ?? ''

              return (
                <div className="avaliacoes-pdi-question" key={question.id}>
                  <div className="avaliacoes-pdi-question-top">
                    <div className="avaliacoes-pdi-question-number">
                      {index + 1}
                    </div>

                    <div className="avaliacoes-pdi-question-content">
                      <label>
                        {question.text}

                        {question.required !== false && (
                          <span className="avaliacoes-required">*</span>
                        )}
                      </label>

                      {question.type === 'scale' ? (
                        <select
                          value={value}
                          disabled={!canAnswer || completed}
                          onChange={(event) =>
                            onAnswerChange(question.id, event.target.value)
                          }
                        >
                          <option value="">Selecione uma nota</option>

                          {Array.from(
                            {
                              length: 10
                            },
                            (_, number) => (
                              <option key={number + 1} value={number + 1}>
                                {number + 1}
                              </option>
                            )
                          )}
                        </select>
                      ) : question.type === 'yes_no' ? (
                        <select
                          value={value}
                          disabled={!canAnswer || completed}
                          onChange={(event) =>
                            onAnswerChange(question.id, event.target.value)
                          }
                        >
                          <option value="">Selecione</option>

                          <option value="yes">Sim</option>

                          <option value="no">Não</option>
                        </select>
                      ) : (
                        <textarea
                          value={value}
                          disabled={!canAnswer || completed}
                          onChange={(event) =>
                            onAnswerChange(question.id, event.target.value)
                          }
                          rows={5}
                          placeholder="Digite sua resposta..."
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {canAnswer && !completed && questions.length > 0 && (
          <div className="avaliacoes-form-actions">
            <button
              type="button"
              className="avaliacoes-secondary-button"
              disabled={saving}
              onClick={() => onSavePdi(false)}
            >
              {saving ? 'Salvando...' : 'Salvar respostas'}
            </button>

            <button
              type="button"
              className="avaliacoes-primary-button"
              disabled={saving}
              onClick={() => onSavePdi(true)}
            >
              {saving ? 'Concluindo...' : 'Concluir PDI'}
            </button>
          </div>
        )}

        {!canAnswer && !completed && (
          <div className="avaliacoes-info-box">
            <strong>Você não é o responsável por este PDI.</strong>

            <p>
              A avaliação pode ser visualizada, mas somente o responsável
              definido pelo fluxo poderá responder e concluir o PDI.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

/*
 * ============================================================
 * USUÁRIO LOGADO
 * ============================================================
 */

function getLoggedUserFromStorage(users) {
  /*
   * Primeiro tentamos localizar uma sessão salva.
   */

  const possibleSessionKeys = [
    'currentUser',
    'loggedUser',
    'authenticatedUser',
    'user',
    'authUser'
  ]

  for (const key of possibleSessionKeys) {
    const raw = localStorage.getItem(key)

    if (!raw) {
      continue
    }

    try {
      const parsed = JSON.parse(raw)

      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    } catch {
      /*
       * Caso não seja JSON, continuamos procurando.
       */
    }
  }

  /*
   * Alguns projetos guardam somente o ID ou username.
   */

  const possibleIdKeys = [
    'currentUserId',
    'loggedUserId',
    'authenticatedUserId',
    'userId'
  ]

  for (const key of possibleIdKeys) {
    const value = localStorage.getItem(key)

    if (!value) {
      continue
    }

    const found = users.find(
      (user) =>
        String(user.id) === String(value) ||
        String(user.username) === String(value)
    )

    if (found) {
      return found
    }
  }

  /*
   * Último fallback: caso o projeto tenha um único usuário
   * administrador salvo e não exista uma sessão explícita.
   *
   * Não utilizamos isso como primeira opção porque poderia
   * fazer uma pessoa visualizar a avaliação de outro usuário.
   */

  return null
}

/*
 * ============================================================
 * PARTICIPAÇÃO
 * ============================================================
 */

function isUserParticipant(workflow, user) {
  if (!workflow || !user) {
    return false
  }

  const userId = String(user.id)

  const employeeId = String(user.employeeId || user.employee_id || '')

  const candidates = [
    workflow.employeeId,
    workflow.employee?.id,
    workflow.employeeUserId,
    workflow.userId,
    workflow.createdBy,
    workflow.pdi?.responsibleUserId,
    workflow.pdi?.employeeId
  ]

  return candidates.some(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value) !== '' &&
      (String(value) === userId || String(value) === employeeId)
  )
}

/*
 * ============================================================
 * RESPOSTAS
 * ============================================================
 */

function getExistingPdiAnswers(workflow) {
  const answers = {}

  const questions = workflow?.pdi?.questions

  if (!Array.isArray(questions)) {
    return answers
  }

  questions.forEach((question) => {
    if (question && question.id) {
      answers[question.id] = question.answer ?? ''
    }
  })

  return answers
}

/*
 * ============================================================
 * PROGRESSO
 * ============================================================
 */

function calculateProgress(questions, answers) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return 0
  }

  const answered = questions.filter((question) =>
    hasAnswer(answers[question.id] ?? question.answer)
  ).length

  return Math.round((answered / questions.length) * 100)
}

function hasAnswer(value) {
  return value !== undefined && value !== null && String(value).trim() !== ''
}

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

function isPdiStarted(workflow) {
  const pdi = workflow?.pdi

  if (!pdi) {
    return false
  }

  return (
    Boolean(pdi.startedAt) ||
    pdi.status === 'in_progress' ||
    pdi.status === 'completed'
  )
}

function isPdiCompleted(workflow) {
  const pdi = workflow?.pdi

  if (!pdi) {
    return false
  }

  return (
    pdi.completed === true ||
    pdi.status === 'completed' ||
    Boolean(pdi.completedAt)
  )
}

function getPdiStatusLabel(pdi) {
  if (
    pdi?.completed === true ||
    pdi?.status === 'completed' ||
    pdi?.completedAt
  ) {
    return 'OK'
  }

  if (pdi?.startedAt || pdi?.status === 'in_progress') {
    return 'Andamento'
  }

  return 'Pendente'
}

/*
 * ============================================================
 * NOMES / INFORMAÇÕES
 * ============================================================
 */

function getWorkflowName(workflow) {
  return (
    workflow.modelName ||
    workflow.evaluationModelName ||
    workflow.name ||
    'Avaliação de desempenho'
  )
}

function getEmployeeName(workflow) {
  return (
    workflow.employeeName ||
    workflow.employee?.name ||
    workflow.employee?.fullName ||
    'Funcionário'
  )
}

function getPdiResponsibleName(workflow) {
  return (
    workflow.pdi?.responsibleUserName ||
    workflow.pdi?.responsibleName ||
    workflow.pdi?.responsible?.name ||
    'Responsável definido pelo fluxo'
  )
}

function getWorkflowType(workflow) {
  return workflow.modelType || workflow.type || 'Avaliação'
}
