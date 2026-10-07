import { useEffect, useState } from 'react'

import {
  getTrainingAssessments,
  addTrainingAssessment,
  updateTrainingAssessment,
  deleteTrainingAssessment
} from '../../services/trainingAssessment'

const EMPTY_ALTERNATIVES = ['', '', '', '']

const INITIAL_QUESTION = {
  question: '',
  alternatives: [...EMPTY_ALTERNATIVES],
  correctAnswer: 0,
  points: 1
}

/*
 * Garante que uma pergunta sempre tenha exatamente
 * quatro alternativas.
 *
 * Isso é necessário principalmente para perguntas antigas
 * que foram cadastradas antes da estrutura atual.
 */
function normalizeQuestion(question) {
  const alternatives = Array.isArray(question?.alternatives)
    ? [...question.alternatives]
    : []

  while (alternatives.length < 4) {
    alternatives.push('')
  }

  return {
    ...question,

    question:
      question?.question || question?.text || question?.questionText || '',

    alternatives: alternatives.slice(0, 4),

    correctAnswer: Number.isInteger(Number(question?.correctAnswer))
      ? Number(question.correctAnswer)
      : 0,

    points: Number(question?.points) || 1
  }
}

/*
 * Normaliza toda a avaliação.
 */
function normalizeAssessment(assessment) {
  if (!assessment) {
    return null
  }

  return {
    ...assessment,

    allowRetake: assessment.allowRetake !== false,

    unlimitedAttempts: assessment.unlimitedAttempts === true,

    maxAttempts:
      Number(assessment.maxAttempts) > 0 ? Number(assessment.maxAttempts) : 2,

    questions: Array.isArray(assessment.questions)
      ? assessment.questions.map(normalizeQuestion)
      : []
  }
}

export default function TrainingAssessment({ training, onClose }) {
  const [assessment, setAssessment] = useState(null)

  const [question, setQuestion] = useState({
    ...INITIAL_QUESTION,
    alternatives: [...EMPTY_ALTERNATIVES]
  })

  const [editingQuestion, setEditingQuestion] = useState(null)

  /*
   * ============================================================
   * CARREGAR AVALIAÇÃO
   * ============================================================
   */

  useEffect(() => {
    const assessments = getTrainingAssessments()

    const existingAssessment = assessments.find(
      (item) => Number(item.trainingId) === Number(training.id)
    )

    if (existingAssessment) {
      setAssessment(normalizeAssessment(existingAssessment))
    }
  }, [training.id])

  /*
   * ============================================================
   * ALTERAR PERGUNTA
   * ============================================================
   */

  function handleQuestionChange(e) {
    const { name, value } = e.target

    setQuestion((prev) => ({
      ...prev,

      [name]: value
    }))
  }

  /*
   * ============================================================
   * ALTERAR ALTERNATIVA
   * ============================================================
   */

  function handleAlternativeChange(index, value) {
    setQuestion((prev) => {
      const alternatives = [...prev.alternatives]

      alternatives[index] = value

      return {
        ...prev,

        alternatives
      }
    })
  }

  /*
   * ============================================================
   * CRIAR AVALIAÇÃO
   * ============================================================
   */

  function handleCreateAssessment() {
    const newAssessment = {
      id: Date.now(),

      trainingId: training.id,

      trainingName: training.name,

      minimumScore: Number(training.minimumScore) || 0,

      allowRetake: training.allowRetake !== false,

      unlimitedAttempts: false,

      maxAttempts: 2,

      attempts: [],

      questions: []
    }

    const updatedAssessments = addTrainingAssessment(newAssessment)

    const createdAssessment = updatedAssessments.find(
      (item) => item.id === newAssessment.id
    )

    setAssessment(normalizeAssessment(createdAssessment))
  }

  /*
   * ============================================================
   * CONFIGURAÇÕES
   * ============================================================
   */

  function handleAssessmentSettingChange(field, value) {
    if (!assessment) {
      return
    }

    const updatedAssessment = {
      ...assessment,

      [field]: value
    }

    const updatedAssessments = updateTrainingAssessment(updatedAssessment)

    const updated = updatedAssessments.find((item) => item.id === assessment.id)

    setAssessment(normalizeAssessment(updated))
  }

  function handleAllowRetakeChange(e) {
    const allowRetake = e.target.checked

    if (!assessment) {
      return
    }

    const updatedAssessment = {
      ...assessment,

      allowRetake,

      unlimitedAttempts: allowRetake ? assessment.unlimitedAttempts : false
    }

    const updatedAssessments = updateTrainingAssessment(updatedAssessment)

    const updated = updatedAssessments.find((item) => item.id === assessment.id)

    setAssessment(normalizeAssessment(updated))
  }

  function handleUnlimitedAttemptsChange(e) {
    const unlimitedAttempts = e.target.checked

    handleAssessmentSettingChange('unlimitedAttempts', unlimitedAttempts)
  }

  function handleMaxAttemptsChange(e) {
    const value = Math.max(2, Number(e.target.value) || 2)

    handleAssessmentSettingChange('maxAttempts', value)
  }

  /*
   * ============================================================
   * VALIDAR ALTERNATIVAS
   * ============================================================
   */

  function validateQuestion() {
    if (!question.question.trim()) {
      alert('Informe a pergunta.')

      return false
    }

    const alternatives = question.alternatives || []

    if (alternatives.length !== 4) {
      alert('A pergunta precisa possuir quatro alternativas.')

      return false
    }

    const hasEmptyAlternative = alternatives.some(
      (alternative) => !String(alternative).trim()
    )

    if (hasEmptyAlternative) {
      alert('Preencha todas as alternativas A, B, C e D.')

      return false
    }

    const correctAnswer = Number(question.correctAnswer)

    if (correctAnswer < 0 || correctAnswer > 3) {
      alert('Selecione uma alternativa correta.')

      return false
    }

    return true
  }

  /*
   * ============================================================
   * ADICIONAR PERGUNTA
   * ============================================================
   */

  function handleAddQuestion(e) {
    e.preventDefault()

    if (!assessment) {
      return
    }

    if (!validateQuestion()) {
      return
    }

    const newQuestion = {
      id: Date.now(),

      question: question.question.trim(),

      alternatives: question.alternatives.map((alternative) =>
        String(alternative).trim()
      ),

      correctAnswer: Number(question.correctAnswer),

      points: Number(question.points) || 1
    }

    const updatedAssessment = {
      ...assessment,

      questions: [...(assessment.questions || []), newQuestion]
    }

    const updatedAssessments = updateTrainingAssessment(updatedAssessment)

    const updated = updatedAssessments.find((item) => item.id === assessment.id)

    setAssessment(normalizeAssessment(updated))

    resetQuestion()
  }

  /*
   * ============================================================
   * EDITAR PERGUNTA
   * ============================================================
   *
   * Aqui está a correção decisiva.
   *
   * Mesmo que uma pergunta antiga tenha:
   *
   * alternatives: []
   *
   * ela passará a mostrar quatro campos para que
   * possamos corrigir os dados antigos.
   */

  function handleEditQuestion(item) {
    const normalized = normalizeQuestion(item)

    setEditingQuestion(item)

    setQuestion({
      question: normalized.question,

      alternatives: [...normalized.alternatives],

      correctAnswer: normalized.correctAnswer,

      points: normalized.points
    })
  }

  /*
   * ============================================================
   * ATUALIZAR PERGUNTA
   * ============================================================
   */

  function handleUpdateQuestion(e) {
    e.preventDefault()

    if (!assessment || !editingQuestion) {
      return
    }

    if (!validateQuestion()) {
      return
    }

    const updatedQuestions = assessment.questions.map((item) =>
      item.id === editingQuestion.id
        ? {
            ...item,

            question: question.question.trim(),

            alternatives: question.alternatives.map((alternative) =>
              String(alternative).trim()
            ),

            correctAnswer: Number(question.correctAnswer),

            points: Number(question.points) || 1
          }
        : normalizeQuestion(item)
    )

    const updatedAssessment = {
      ...assessment,

      questions: updatedQuestions
    }

    const updatedAssessments = updateTrainingAssessment(updatedAssessment)

    const updated = updatedAssessments.find((item) => item.id === assessment.id)

    setAssessment(normalizeAssessment(updated))

    setEditingQuestion(null)

    resetQuestion()
  }

  /*
   * ============================================================
   * EXCLUIR PERGUNTA
   * ============================================================
   */

  function handleDeleteQuestion(questionId) {
    const confirmed = window.confirm('Deseja excluir esta pergunta?')

    if (!confirmed) {
      return
    }

    const updatedAssessment = {
      ...assessment,

      questions: assessment.questions.filter((item) => item.id !== questionId)
    }

    const updatedAssessments = updateTrainingAssessment(updatedAssessment)

    const updated = updatedAssessments.find((item) => item.id === assessment.id)

    setAssessment(normalizeAssessment(updated))

    if (editingQuestion?.id === questionId) {
      setEditingQuestion(null)

      resetQuestion()
    }
  }

  /*
   * ============================================================
   * CANCELAR EDIÇÃO
   * ============================================================
   */

  function resetQuestion() {
    setQuestion({
      ...INITIAL_QUESTION,

      alternatives: [...EMPTY_ALTERNATIVES]
    })
  }

  function handleCancelEdit() {
    setEditingQuestion(null)

    resetQuestion()
  }

  /*
   * ============================================================
   * EXCLUIR AVALIAÇÃO
   * ============================================================
   */

  function handleDeleteAssessment() {
    const confirmed = window.confirm(
      'Deseja excluir a avaliação deste treinamento? As perguntas cadastradas também serão removidas.'
    )

    if (!confirmed) {
      return
    }

    deleteTrainingAssessment(assessment.id)

    setAssessment(null)

    resetQuestion()
  }

  /*
   * ============================================================
   * PONTUAÇÃO
   * ============================================================
   */

  function calculateTotalPoints() {
    if (!assessment?.questions) {
      return 0
    }

    return assessment.questions.reduce(
      (total, item) => total + Number(item.points || 0),
      0
    )
  }

  const attemptLimitText = !assessment?.allowRetake
    ? '1 tentativa'
    : assessment.unlimitedAttempts
      ? 'Ilimitadas'
      : `${assessment.maxAttempts || 2} tentativas`

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal training-assessment-modal">
        <div className="training-modal-header">
          <div>
            <span className="training-progress-kicker">AVALIAÇÃO</span>

            <h2>Avaliação</h2>

            <p>{training.name}</p>
          </div>

          <button
            type="button"
            className="training-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {!assessment ? (
          <div className="training-assessment-empty">
            <span>📝</span>

            <h3>Nenhuma avaliação cadastrada</h3>

            <p>Crie uma avaliação para este treinamento.</p>

            <button
              type="button"
              className="training-primary-button"
              onClick={handleCreateAssessment}
            >
              + Criar avaliação
            </button>
          </div>
        ) : (
          <div
            className="training-content-body"
            style={{
              maxHeight: 'calc(90vh - 145px)',
              overflowY: 'auto'
            }}
          >
            {/* RESUMO */}

            <div className="training-assessment-summary">
              <div>
                <span>Questões</span>

                <strong>{assessment.questions?.length || 0}</strong>
              </div>

              <div>
                <span>Pontuação total</span>

                <strong>{calculateTotalPoints()}</strong>
              </div>

              <div>
                <span>Nota mínima</span>

                <strong>{assessment.minimumScore}%</strong>
              </div>

              <div>
                <span>Tentativas</span>

                <strong>{attemptLimitText}</strong>
              </div>
            </div>

            {/* CONFIGURAÇÕES */}

            <div className="training-assessment-settings">
              <div className="training-assessment-settings-header">
                <div>
                  <h3>Configuração das tentativas</h3>

                  <p>
                    Defina se o funcionário poderá refazer a avaliação e qual
                    será o limite de tentativas.
                  </p>
                </div>
              </div>

              <label className="training-assessment-setting-checkbox">
                <input
                  type="checkbox"
                  checked={assessment.allowRetake}
                  onChange={handleAllowRetakeChange}
                />

                <span>
                  <strong>Permitir refazer a avaliação</strong>

                  <small>
                    O funcionário poderá realizar novas tentativas enquanto
                    houver tentativas disponíveis.
                  </small>
                </span>
              </label>

              {assessment.allowRetake && (
                <div className="training-attempt-settings">
                  <label className="training-assessment-setting-checkbox">
                    <input
                      type="checkbox"
                      checked={assessment.unlimitedAttempts}
                      onChange={handleUnlimitedAttemptsChange}
                    />

                    <span>
                      <strong>Permitir tentativas ilimitadas</strong>

                      <small>
                        O funcionário poderá refazer a avaliação quantas vezes
                        quiser.
                      </small>
                    </span>
                  </label>

                  {!assessment.unlimitedAttempts && (
                    <div className="training-field full training-attempt-number-field">
                      <label htmlFor="training-max-attempts">
                        Número máximo de tentativas
                      </label>

                      <input
                        id="training-max-attempts"
                        type="number"
                        min="2"
                        step="1"
                        value={assessment.maxAttempts || 2}
                        onChange={handleMaxAttemptsChange}
                      />

                      <small>Inclui a primeira tentativa do funcionário.</small>
                    </div>
                  )}
                </div>
              )}

              <div className="training-best-score-info">
                🏆
                <span>
                  A maior nota obtida entre todas as tentativas será considerada
                  como a nota válida do funcionário.
                </span>
              </div>
            </div>

            {/* PERGUNTAS */}

            <div className="training-content-list">
              <div className="training-content-section-header">
                <div>
                  <h3>Perguntas</h3>

                  <span>{assessment.questions?.length || 0} pergunta(s)</span>
                </div>
              </div>

              {assessment.questions?.length > 0 ? (
                <div className="training-assessment-questions">
                  {assessment.questions.map((item, index) => {
                    const normalized = normalizeQuestion(item)

                    const hasAlternatives = normalized.alternatives.some(
                      (alternative) => String(alternative).trim()
                    )

                    return (
                      <div
                        key={item.id}
                        className="training-assessment-question"
                      >
                        <div className="training-assessment-question-header">
                          <strong>
                            {index + 1}. {normalized.question}
                          </strong>

                          <span>{normalized.points} ponto(s)</span>
                        </div>

                        {hasAlternatives ? (
                          <div className="training-assessment-alternatives">
                            {normalized.alternatives.map(
                              (alternative, alternativeIndex) => (
                                <div
                                  key={alternativeIndex}
                                  className={
                                    alternativeIndex ===
                                    normalized.correctAnswer
                                      ? 'assessment-alternative correct'
                                      : 'assessment-alternative'
                                  }
                                >
                                  <span>
                                    {String.fromCharCode(65 + alternativeIndex)}
                                  </span>

                                  <p>{alternative || 'Sem texto'}</p>

                                  {alternativeIndex ===
                                    normalized.correctAnswer && (
                                    <small>Resposta correta</small>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="training-assessment-missing-alternatives">
                            <strong>
                              ⚠️ Esta pergunta está sem alternativas.
                            </strong>

                            <p>
                              Clique em
                              <strong> Editar</strong> para preencher as
                              alternativas A, B, C e D.
                            </p>
                          </div>
                        )}

                        <div className="training-assessment-question-actions">
                          <button
                            type="button"
                            onClick={() => handleEditQuestion(item)}
                          >
                            ✏️ Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(item.id)}
                          >
                            🗑️ Excluir
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="training-content-empty">
                  <span>📝</span>

                  <p>Nenhuma pergunta cadastrada.</p>
                </div>
              )}
            </div>

            {/* FORMULÁRIO */}

            <form
              className="training-new-content"
              onSubmit={
                editingQuestion ? handleUpdateQuestion : handleAddQuestion
              }
            >
              <h3>
                {editingQuestion ? 'Editar pergunta' : 'Adicionar pergunta'}
              </h3>

              <div className="training-content-form-grid">
                <div className="training-field full">
                  <label>Pergunta *</label>

                  <textarea
                    name="question"
                    value={question.question}
                    onChange={handleQuestionChange}
                    rows="3"
                    placeholder="Digite a pergunta..."
                  />
                </div>

                {question.alternatives.map((alternative, index) => (
                  <div key={index} className="training-field full">
                    <label>
                      Alternativa {String.fromCharCode(65 + index)} *
                    </label>

                    <input
                      type="text"
                      value={alternative}
                      onChange={(e) =>
                        handleAlternativeChange(index, e.target.value)
                      }
                      placeholder={`Alternativa ${String.fromCharCode(
                        65 + index
                      )}`}
                    />
                  </div>
                ))}

                <div className="training-field">
                  <label>Resposta correta</label>

                  <select
                    name="correctAnswer"
                    value={question.correctAnswer}
                    onChange={handleQuestionChange}
                  >
                    <option value="0">A</option>

                    <option value="1">B</option>

                    <option value="2">C</option>

                    <option value="3">D</option>
                  </select>
                </div>

                <div className="training-field">
                  <label>Pontos</label>

                  <input
                    type="number"
                    name="points"
                    min="1"
                    value={question.points}
                    onChange={handleQuestionChange}
                  />
                </div>
              </div>

              <div className="training-content-form-actions">
                {editingQuestion && (
                  <button
                    type="button"
                    className="training-secondary-button"
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </button>
                )}

                <button type="submit" className="training-primary-button">
                  {editingQuestion ? 'Salvar pergunta' : '+ Adicionar pergunta'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="training-modal-footer">
          {assessment && (
            <button
              type="button"
              className="training-danger-button"
              onClick={handleDeleteAssessment}
            >
              Excluir avaliação
            </button>
          )}

          <button
            type="button"
            className="training-secondary-button"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
