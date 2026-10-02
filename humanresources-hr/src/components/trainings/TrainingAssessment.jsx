import { useEffect, useState } from 'react'

import {
  getTrainingAssessments,
  addTrainingAssessment,
  updateTrainingAssessment,
  deleteTrainingAssessment
} from '../../services/trainingAssessment'

export default function TrainingAssessment({ training, onClose }) {
  const initialQuestion = {
    question: '',
    alternatives: ['', '', '', ''],
    correctAnswer: 0,
    points: 1
  }

  const [assessment, setAssessment] = useState(null)

  const [question, setQuestion] = useState(initialQuestion)

  const [editingQuestion, setEditingQuestion] = useState(null)

  useEffect(() => {
    const assessments = getTrainingAssessments()

    const existingAssessment = assessments.find(
      (item) => Number(item.trainingId) === Number(training.id)
    )

    if (existingAssessment) {
      setAssessment({
        ...existingAssessment,

        allowRetake: existingAssessment.allowRetake !== false,

        unlimitedAttempts: existingAssessment.unlimitedAttempts === true,

        maxAttempts:
          Number(existingAssessment.maxAttempts) > 0
            ? Number(existingAssessment.maxAttempts)
            : 2
      })
    }
  }, [training.id])

  function handleQuestionChange(e) {
    const { name, value } = e.target

    setQuestion((prev) => ({
      ...prev,
      [name]: value
    }))
  }

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

    setAssessment(createdAssessment)
  }

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

    setAssessment(updated)
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

    setAssessment(updated)
  }

  function handleUnlimitedAttemptsChange(e) {
    const unlimitedAttempts = e.target.checked

    handleAssessmentSettingChange('unlimitedAttempts', unlimitedAttempts)
  }

  function handleMaxAttemptsChange(e) {
    const value = Math.max(2, Number(e.target.value) || 2)

    handleAssessmentSettingChange('maxAttempts', value)
  }

  function handleAddQuestion(e) {
    e.preventDefault()

    if (!assessment) {
      return
    }

    if (!question.question.trim()) {
      alert('Informe a pergunta.')

      return
    }

    const hasEmptyAlternative = question.alternatives.some(
      (alternative) => !alternative.trim()
    )

    if (hasEmptyAlternative) {
      alert('Preencha todas as alternativas.')

      return
    }

    const newQuestion = {
      id: Date.now(),

      question: question.question.trim(),

      alternatives: question.alternatives,

      correctAnswer: Number(question.correctAnswer),

      points: Number(question.points) || 1
    }

    const updatedAssessment = {
      ...assessment,

      questions: [...(assessment.questions || []), newQuestion]
    }

    const updatedAssessments = updateTrainingAssessment(updatedAssessment)

    const updated = updatedAssessments.find((item) => item.id === assessment.id)

    setAssessment(updated)

    setQuestion({
      ...initialQuestion
    })
  }

  function handleEditQuestion(item) {
    setEditingQuestion(item)

    setQuestion({
      question: item.question,

      alternatives: [...item.alternatives],

      correctAnswer: item.correctAnswer,

      points: item.points
    })
  }

  function handleUpdateQuestion(e) {
    e.preventDefault()

    if (!question.question.trim()) {
      alert('Informe a pergunta.')

      return
    }

    const hasEmptyAlternative = question.alternatives.some(
      (alternative) => !alternative.trim()
    )

    if (hasEmptyAlternative) {
      alert('Preencha todas as alternativas.')

      return
    }

    const updatedQuestions = assessment.questions.map((item) =>
      item.id === editingQuestion.id
        ? {
            ...item,

            question: question.question.trim(),

            alternatives: [...question.alternatives],

            correctAnswer: Number(question.correctAnswer),

            points: Number(question.points) || 1
          }
        : item
    )

    const updatedAssessment = {
      ...assessment,

      questions: updatedQuestions
    }

    const updatedAssessments = updateTrainingAssessment(updatedAssessment)

    const updated = updatedAssessments.find((item) => item.id === assessment.id)

    setAssessment(updated)

    setEditingQuestion(null)

    setQuestion({
      ...initialQuestion
    })
  }

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

    setAssessment(updated)

    if (editingQuestion?.id === questionId) {
      setEditingQuestion(null)

      setQuestion({
        ...initialQuestion
      })
    }
  }

  function handleCancelEdit() {
    setEditingQuestion(null)

    setQuestion({
      ...initialQuestion
    })
  }

  function handleDeleteAssessment() {
    const confirmed = window.confirm(
      'Deseja excluir a avaliação deste treinamento? As perguntas cadastradas também serão removidas.'
    )

    if (!confirmed) {
      return
    }

    deleteTrainingAssessment(assessment.id)

    setAssessment(null)
  }

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

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal training-assessment-modal">
        <div className="training-modal-header">
          <div>
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

            {/* CONFIGURAÇÃO DAS TENTATIVAS */}

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
                        style={{
                          width: '220px',
                          minWidth: '220px',
                          maxWidth: '280px',
                          fontSize: '16px',
                          padding: '13px 14px'
                        }}
                      />

                      <small>Inclui a primeira tentativa do funcionário.</small>
                    </div>
                  )}
                </div>
              )}

              <div className="training-best-score-info">
                🏆
                <span>
                  A maior nota obtida entre todas as tentativas será sempre
                  considerada como a nota válida do funcionário.
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
                  {assessment.questions.map((item, index) => (
                    <div key={item.id} className="training-assessment-question">
                      <div className="training-assessment-question-header">
                        <strong>
                          {index + 1}. {item.question}
                        </strong>

                        <span>{item.points} ponto(s)</span>
                      </div>

                      <div className="training-assessment-alternatives">
                        {item.alternatives.map(
                          (alternative, alternativeIndex) => (
                            <div
                              key={alternativeIndex}
                              className={
                                alternativeIndex === item.correctAnswer
                                  ? 'assessment-alternative correct'
                                  : 'assessment-alternative'
                              }
                            >
                              <span>
                                {String.fromCharCode(65 + alternativeIndex)}
                              </span>

                              <p>{alternative}</p>

                              {alternativeIndex === item.correctAnswer && (
                                <small>Resposta correta</small>
                              )}
                            </div>
                          )
                        )}
                      </div>

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
                  ))}
                </div>
              ) : (
                <div className="training-content-empty">
                  <span>📝</span>

                  <p>Nenhuma pergunta cadastrada.</p>
                </div>
              )}
            </div>

            {/* FORMULÁRIO DE PERGUNTA */}

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
                    <label>Alternativa {String.fromCharCode(65 + index)}</label>

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
