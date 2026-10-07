import { useEffect, useState } from 'react'

import { getTrainingAssessments } from '../../services/trainingAssessment'

import {
  addAssessmentAttempt,
  getTrainingParticipants
} from '../../services/trainingParticipant'

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

  function getBestScore() {
    const attempts = Array.isArray(participant.attempts)
      ? participant.attempts
      : []

    const storedBestScore = Number(participant.bestScore)

    if (Number.isFinite(storedBestScore)) {
      return storedBestScore
    }

    const scores = attempts
      .map((attempt) => Number(attempt.score))
      .filter((score) => Number.isFinite(score))

    if (scores.length === 0) {
      return null
    }

    return Math.max(...scores)
  }

  function handleSubmit(e) {
    e?.preventDefault()

    if (!assessment) {
      return
    }

    const questions = assessment.questions || []

    if (questions.length === 0) {
      alert('Esta avaliação ainda não possui perguntas.')

      return
    }

    /*
     * Verifica se alguma pergunta está sem alternativas.
     *
     * Se aparecer este aviso, significa que a pergunta
     * precisa ser corrigida no cadastro da avaliação.
     */
    const invalidQuestions = questions.filter(
      (question) =>
        !Array.isArray(question.alternatives) ||
        question.alternatives.length < 4 ||
        question.alternatives.some(
          (alternative) => !String(alternative || '').trim()
        )
    )

    if (invalidQuestions.length > 0) {
      alert(
        'Esta avaliação possui uma ou mais perguntas sem as quatro alternativas preenchidas. Volte ao cadastro da avaliação, clique em "Editar" e preencha as alternativas A, B, C e D.'
      )

      return
    }

    const attempts = Array.isArray(participant.attempts)
      ? participant.attempts
      : []

    const attemptLimit = getAttemptLimit()

    if (attempts.length >= attemptLimit) {
      alert(
        attemptLimit === 1
          ? 'Este participante já realizou esta avaliação e uma nova tentativa não está permitida.'
          : 'O número máximo de tentativas desta avaliação já foi atingido.'
      )

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

      if (answers[question.id] === Number(question.correctAnswer)) {
        earnedPoints += points
      }
    })

    const score =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

    const minimumScore = Number(assessment.minimumScore) || 0

    const previousBestScore = getBestScore()

    const bestScore =
      previousBestScore === null ? score : Math.max(previousBestScore, score)

    const approved = bestScore >= minimumScore

    const attempt = {
      id: Date.now(),

      startedAt: new Date().toISOString(),

      completedAt: new Date().toISOString(),

      answers,

      earnedPoints,

      totalPoints,

      score,

      bestScore,

      minimumScore,

      approved
    }

    addAssessmentAttempt(participant.id, attempt, {
      minimumScore,

      allowRetake: assessment.allowRetake !== false,

      unlimitedAttempts: assessment.unlimitedAttempts === true,

      maxAttempts: assessment.maxAttempts
    })

    const nextAttemptCount = attempts.length + 1

    setResult({
      score,

      bestScore,

      minimumScore,

      approved,

      earnedPoints,

      totalPoints,

      attemptNumber: nextAttemptCount,

      attemptLimit
    })

    /*
     * IMPORTANTE:
     *
     * Não fechamos a avaliação aqui.
     *
     * O resultado permanece na tela.
     */
    if (onComplete) {
      onComplete(attempt)
    }

    if (approved) {
      const updatedParticipants = getTrainingParticipants()

      const updatedParticipant = updatedParticipants.find(
        (item) => item.id === participant.id
      )

      if (updatedParticipant) {
        setCertificateParticipant(updatedParticipant)
      }
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

  const attempts = Array.isArray(participant.attempts)
    ? participant.attempts
    : []

  const attemptLimit = getAttemptLimit()

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal training-assessment-modal">
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
          >
            Enviar avaliação
          </button>
        </div>
      </div>
    </div>
  )
}
