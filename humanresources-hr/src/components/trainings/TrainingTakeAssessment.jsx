import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'

import { getTrainingAssessments } from '../../services/trainingAssessment'

import TrainingCertificate from './TrainingCertificate'

function normalizeQuestion(question) {
  const alternatives = Array.isArray(question?.alternatives)
    ? question.alternatives
    : []

  return {
    ...question,

    question:
      question?.question || question?.text || question?.questionText || '',

    alternatives,

    correctAnswer: Number(question?.correctAnswer) || 0,

    points: Number(question?.points) || 1
  }
}

export default function TrainingTakeAssessment({
  training,
  participant,
  onClose,
  onComplete,
  onApproved
}) {
  const [assessment, setAssessment] = useState(null)

  const [answers, setAnswers] = useState({})

  const [result, setResult] = useState(null)

  const [certificateParticipant, setCertificateParticipant] = useState(null)

  const [showCertificate, setShowCertificate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const assessments = getTrainingAssessments()

    const existingAssessment = assessments.find(
      (item) => Number(item.trainingId) === Number(training.id)
    )

    if (!existingAssessment) {
      setAssessment(null)

      return
    }

    setAssessment({
      ...existingAssessment,

      questions: (existingAssessment.questions || []).map(normalizeQuestion)
    })
  }, [training.id])

  function handleAnswerChange(questionId, answer) {
    setAnswers((prev) => ({
      ...prev,

      [questionId]: Number(answer)
    }))
  }

  function getAttemptLimit() {
    if (!assessment) {
      return 1
    }

    if (assessment.allowRetake === false) {
      return 1
    }

    if (assessment.unlimitedAttempts === true) {
      return Infinity
    }

    const maxAttempts = Number(assessment.maxAttempts)

    return maxAttempts >= 2 ? maxAttempts : 1
  }

  async function handleSubmit(e) {
    e?.preventDefault()
    if (!assessment || submitting) return

    const questions = assessment.questions || []
    if (!questions.length) {
      alert('Esta avaliação ainda não possui perguntas.')
      return
    }

    const invalidQuestions = questions.filter(
      (question) =>
        !Array.isArray(question.alternatives) ||
        question.alternatives.length < 4 ||
        question.alternatives.some((alternative) => !String(alternative || '').trim())
    )
    if (invalidQuestions.length > 0) {
      alert('Esta avaliação possui perguntas sem as quatro alternativas preenchidas. Volte ao cadastro da avaliação e corrija as alternativas.')
      return
    }

    const attempts = Array.isArray(participant.attempts) ? participant.attempts : []
    const attemptLimit = getAttemptLimit()
    if (attempts.length >= attemptLimit) {
      alert(attemptLimit === 1
        ? 'Este participante já realizou esta avaliação e uma nova tentativa não está permitida.'
        : 'O número máximo de tentativas desta avaliação já foi atingido.')
      return
    }

    const unansweredQuestions = questions.filter((question) => answers[question.id] === undefined)
    if (unansweredQuestions.length > 0) {
      alert('Responda todas as perguntas antes de enviar a avaliação.')
      return
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      // O servidor calcula a nota usando o gabarito do banco; o cliente envia somente respostas.
      const response = await apiRequest('/me/training-attempt', {
        method: 'POST',
        body: JSON.stringify({
          participantId: participant.id,
          answers
        })
      })
      const resultFromServer = response?.result
      const updatedParticipant = response?.participant
      if (!resultFromServer || !updatedParticipant) {
        throw new Error('O servidor não retornou o resultado da avaliação.')
      }

      setResult(resultFromServer)
      if (onComplete) onComplete(response.attempt, updatedParticipant)
      if (resultFromServer.approved) setCertificateParticipant(updatedParticipant)
    } catch (error) {
      setSubmitError(error?.message || 'Não foi possível registrar a tentativa no servidor.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFinishApproved() {
    if (result?.approved && certificateParticipant?.status === 'completed') {
      setShowCertificate(true)

      return
    }

    if (onApproved) {
      onApproved()

      return
    }

    onClose()
  }

  function handleCloseCertificate() {
    setShowCertificate(false)

    onClose()
  }

  /*
   * ============================================================
   * CERTIFICADO
   * ============================================================
   */

  if (showCertificate && certificateParticipant) {
    return (
      <TrainingCertificate
        training={training}
        participant={certificateParticipant}
        onClose={handleCloseCertificate}
      />
    )
  }

  /*
   * ============================================================
   * SEM AVALIAÇÃO
   * ============================================================
   */

  if (!assessment) {
    return (
      <div className="training-modal-overlay">
        <div className="training-content-modal training-assessment-modal">
          <div className="training-modal-header">
            <div>
              <span className="training-progress-kicker">TREINAMENTO</span>

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

          <div className="training-assessment-empty-screen">
            <span>📝</span>

            <h3>Avaliação não encontrada</h3>

            <p>Este treinamento ainda não possui uma avaliação cadastrada.</p>
          </div>

          <div className="training-modal-footer">
            <button
              type="button"
              className="training-secondary-button"
              onClick={onClose}
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * RESULTADO
   * ============================================================
   */

  if (result) {
    const canIssueCertificate =
      result.approved && certificateParticipant?.status === 'completed'

    return (
      <div className="training-modal-overlay">
        <div className="training-content-modal training-assessment-modal">
          <div className="training-modal-header">
            <div>
              <span className="training-progress-kicker">RESULTADO</span>

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

          <div className="training-assessment-scroll">
            <div className="training-assessment-result-screen">
              <div
                className={`assessment-result-icon ${
                  result.approved ? 'approved' : 'failed'
                }`}
              >
                {result.approved ? '✓' : '✕'}
              </div>

              <h2>{result.approved ? 'Aprovado' : 'Reprovado'}</h2>

              <p>Resultado da avaliação</p>

              <div className="training-assessment-result-score-grid">
                <div className="training-assessment-result-score-card">
                  <strong>{result.score}%</strong>

                  <span>Nota desta tentativa</span>
                </div>

                <div className="training-assessment-result-score-card">
                  <strong>{result.bestScore}%</strong>

                  <span>Melhor nota</span>
                </div>
              </div>

              <div className="training-assessment-result-details">
                <div className="training-assessment-result-detail">
                  <span>Nota mínima</span>

                  <strong>{result.minimumScore}%</strong>
                </div>

                <div className="training-assessment-result-detail">
                  <span>Pontuação</span>

                  <strong>
                    {result.earnedPoints} / {result.totalPoints}
                  </strong>
                </div>
              </div>

              {result.approved && (
                <p className="training-assessment-result-note">
                  A avaliação foi aprovada. Clique em "Concluir treinamento"
                  para finalizar o treinamento.
                </p>
              )}
            </div>
          </div>

          <div className="training-modal-footer">
            {!result.approved && (
              <button
                type="button"
                className="training-secondary-button"
                onClick={onClose}
              >
                Voltar
              </button>
            )}

            {result.approved && canIssueCertificate && (
              <button
                type="button"
                className="training-primary-button"
                onClick={() => setShowCertificate(true)}
              >
                🎓 Emitir certificado
              </button>
            )}

            {result.approved && !canIssueCertificate && (
              <button
                type="button"
                className="training-primary-button"
                onClick={handleFinishApproved}
              >
                ✓ Concluir treinamento
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * PROVA
   * ============================================================
   */

  const questions = assessment.questions || []

  const attemptLimit = getAttemptLimit()

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal training-assessment-modal">
        {submitError && (
          <div className="training-assessment-empty-screen" role="alert">
            <p>{submitError}</p>
          </div>
        )}
        <div className="training-modal-header">
          <div>
            <span className="training-progress-kicker">AVALIAÇÃO</span>

            <h2>Realizar avaliação</h2>

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

        <div className="training-assessment-scroll">
          <div className="training-assessment-info-grid">
            <div className="training-assessment-info-item">
              <span>Nota mínima</span>

              <strong>{Number(assessment.minimumScore) || 0}%</strong>
            </div>

            <div className="training-assessment-info-item">
              <span>Perguntas</span>

              <strong>{questions.length}</strong>
            </div>

            <div className="training-assessment-info-item">
              <span>Tentativas</span>

              <strong>
                {attemptLimit === Infinity ? 'Ilimitadas' : attemptLimit}
              </strong>
            </div>
          </div>

          <form className="training-assessment-form" onSubmit={handleSubmit}>
            {questions.map((question, index) => (
              <div key={question.id} className="training-take-question">
                <div className="training-take-question-title">
                  <strong>
                    {index + 1}. {question.question}
                  </strong>

                  <span>{question.points} ponto(s)</span>
                </div>

                <div className="training-take-alternatives">
                  {question.alternatives.map(
                    (alternative, alternativeIndex) => (
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

                        <span>
                          {String.fromCharCode(65 + alternativeIndex)}
                        </span>

                        <p>{alternative}</p>
                      </label>
                    )
                  )}
                </div>
              </div>
            ))}
          </form>
        </div>

        <div className="training-modal-footer">
          <button
            type="button"
            className="training-secondary-button"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button
            type="button"
            className="training-primary-button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Salvando resultado...' : 'Enviar avaliação'}
          </button>
        </div>
      </div>
    </div>
  )
}
