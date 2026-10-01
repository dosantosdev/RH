import { useEffect, useState } from 'react'

import { getTrainingAssessments } from '../../services/trainingAssessment'

import { addAssessmentAttempt } from '../../services/trainingParticipant'

export default function TrainingTakeAssessment({
  training,
  participant,
  onClose,
  onComplete
}) {
  const [assessment, setAssessment] = useState(null)

  const [answers, setAnswers] = useState({})

  const [result, setResult] = useState(null)

  useEffect(() => {
    const assessments = getTrainingAssessments()

    const existingAssessment = assessments.find(
      (item) => item.trainingId === training.id
    )

    setAssessment(existingAssessment || null)
  }, [training.id])

  function handleAnswerChange(questionId, answer) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: Number(answer)
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()

    if (!assessment) {
      return
    }

    const questions = assessment.questions || []

    if (questions.length === 0) {
      alert('Esta avaliação ainda não possui perguntas.')

      return
    }

    const unansweredQuestions = questions.filter(
      (question) => answers[question.id] === undefined
    )

    if (unansweredQuestions.length > 0) {
      alert('Responda todas as perguntas antes de enviar a avaliação.')

      return
    }

    let earnedPoints = 0

    let totalPoints = 0

    questions.forEach((question) => {
      const points = Number(question.points) || 0

      totalPoints += points

      if (answers[question.id] === question.correctAnswer) {
        earnedPoints += points
      }
    })

    const score =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

    const minimumScore = Number(assessment.minimumScore) || 0

    const approved = score >= minimumScore

    const attempt = {
      id: Date.now(),

      startedAt: new Date().toISOString(),

      completedAt: new Date().toISOString(),

      answers,

      earnedPoints,

      totalPoints,

      score,

      minimumScore,

      approved
    }

    addAssessmentAttempt(participant.id, attempt)

    setResult({
      score,
      minimumScore,
      approved,
      earnedPoints,
      totalPoints
    })

    if (onComplete) {
      onComplete(attempt)
    }
  }

  if (!assessment) {
    return (
      <div className="training-modal-overlay">
        <div className="training-content-modal">
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

          <div className="training-assessment-empty">
            <span>📝</span>

            <h3>Avaliação não encontrada</h3>

            <p>Este treinamento ainda não possui uma avaliação cadastrada.</p>
          </div>
        </div>
      </div>
    )
  }

  if (assessment.questions?.length === 0) {
    return (
      <div className="training-modal-overlay">
        <div className="training-content-modal">
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

          <div className="training-assessment-empty">
            <span>📝</span>

            <h3>Nenhuma pergunta cadastrada</h3>

            <p>A avaliação ainda não está pronta para ser realizada.</p>
          </div>
        </div>
      </div>
    )
  }

  if (result) {
    return (
      <div className="training-modal-overlay">
        <div className="training-content-modal">
          <div className="training-modal-header">
            <div>
              <h2>Resultado da avaliação</h2>

              <p>{participant.employeeName}</p>
            </div>

            <button
              type="button"
              className="training-modal-close"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="training-assessment-result">
            <div
              className={
                result.approved
                  ? 'assessment-result-icon approved'
                  : 'assessment-result-icon failed'
              }
            >
              {result.approved ? '✓' : '✕'}
            </div>

            <h2>{result.approved ? 'Aprovado' : 'Reprovado'}</h2>

            <p>Resultado da avaliação</p>

            <div className="assessment-result-score">
              <strong>{result.score}%</strong>

              <span>Nota mínima: {result.minimumScore}%</span>
            </div>

            <div className="assessment-result-points">
              <span>Pontuação</span>

              <strong>
                {result.earnedPoints} / {result.totalPoints}
              </strong>
            </div>
          </div>

          <div className="training-modal-footer">
            <button
              type="button"
              className="training-primary-button"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal">
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

        <div className="training-assessment-take-info">
          <div>
            <span>Participante</span>

            <strong>{participant.employeeName}</strong>
          </div>

          <div>
            <span>Questões</span>

            <strong>{assessment.questions.length}</strong>
          </div>

          <div>
            <span>Nota mínima</span>

            <strong>{assessment.minimumScore}%</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="training-assessment-take-form">
          {assessment.questions.map((question, index) => (
            <div key={question.id} className="training-take-question">
              <div className="training-take-question-title">
                <strong>
                  {index + 1}. {question.question}
                </strong>

                <span>{question.points} ponto(s)</span>
              </div>

              <div className="training-take-alternatives">
                {question.alternatives.map((alternative, alternativeIndex) => (
                  <label
                    key={alternativeIndex}
                    className={
                      answers[question.id] === alternativeIndex
                        ? 'training-take-alternative selected'
                        : 'training-take-alternative'
                    }
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={alternativeIndex}
                      checked={answers[question.id] === alternativeIndex}
                      onChange={(e) =>
                        handleAnswerChange(question.id, e.target.value)
                      }
                    />

                    <span>{String.fromCharCode(65 + alternativeIndex)}</span>

                    <p>{alternative}</p>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="training-modal-footer">
            <button
              type="button"
              className="training-secondary-button"
              onClick={onClose}
            >
              Cancelar
            </button>

            <button type="submit" className="training-primary-button">
              Finalizar avaliação
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
