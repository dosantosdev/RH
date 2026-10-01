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
      (item) => item.trainingId === training.id
    )

    if (existingAssessment) {
      setAssessment(existingAssessment)
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

      minimumScore: training.minimumScore || 0,

      allowRetake: training.allowRetake !== false,

      attempts: [],

      questions: []
    }

    const updatedAssessments = addTrainingAssessment(newAssessment)

    const createdAssessment = updatedAssessments.find(
      (item) => item.id === newAssessment.id
    )

    setAssessment(createdAssessment)
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

  function calculateTotalPoints() {
    if (!assessment?.questions) {
      return 0
    }

    return assessment.questions.reduce(
      (total, item) => total + Number(item.points || 0),
      0
    )
  }

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal">
        {/* CABEÇALHO */}

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
          <div className="training-content-body">
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
