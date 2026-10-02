import { useEffect, useMemo, useState } from 'react'

import { getTrainingAssessments } from '../../services/trainingAssessment'

import {
  completeParticipantTraining,
  getTrainingParticipants,
  updateParticipantProgress
} from '../../services/trainingParticipant'

import TrainingTakeAssessment from './TrainingTakeAssessment'

import './TrainingProgress.css'

export default function TrainingProgress({ training, participant, onClose }) {
  const [currentParticipant, setCurrentParticipant] = useState(participant)

  const [showAssessment, setShowAssessment] = useState(false)

  const contents = useMemo(
    () =>
      [...(training.contents || [])].sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      ),
    [training.contents]
  )

  const assessment = useMemo(() => {
    const assessments = getTrainingAssessments()

    return (
      assessments.find(
        (item) => Number(item.trainingId) === Number(training.id)
      ) || null
    )
  }, [training.id, showAssessment])

  const hasAssessment =
    !!assessment &&
    Array.isArray(assessment.questions) &&
    assessment.questions.length > 0

  useEffect(() => {
    setCurrentParticipant(participant)
  }, [participant])

  function refreshParticipant() {
    const participants = getTrainingParticipants()

    const updatedParticipant = participants.find(
      (item) => item.id === participant.id
    )

    if (updatedParticipant) {
      setCurrentParticipant(updatedParticipant)
    }
  }

  function calculateProgress(completedContents) {
    if (contents.length === 0) {
      return 0
    }

    return Math.round((completedContents.length / contents.length) * 100)
  }

  function toggleContent(contentId) {
    const currentCompleted = currentParticipant.completedContents || []

    const isCompleted = currentCompleted.includes(contentId)

    const updatedCompleted = isCompleted
      ? currentCompleted.filter((id) => id !== contentId)
      : [...currentCompleted, contentId]

    const progress = calculateProgress(updatedCompleted)

    updateParticipantProgress(currentParticipant.id, progress, updatedCompleted)

    refreshParticipant()
  }

  const completedContents = currentParticipant.completedContents || []

  const progress = calculateProgress(completedContents)

  const allContentsCompleted =
    contents.length === 0 || completedContents.length >= contents.length

  const assessmentApproved = currentParticipant.assessmentStatus === 'approved'

  const assessmentFailed = currentParticipant.assessmentStatus === 'failed'

  const trainingCompleted = currentParticipant.status === 'completed'

  function handleOpenAssessment() {
    if (!hasAssessment) {
      return
    }

    if (!allContentsCompleted) {
      alert('Conclua todos os conteúdos antes de realizar a avaliação.')

      return
    }

    setShowAssessment(true)
  }

  function handleCloseAssessment() {
    setShowAssessment(false)

    refreshParticipant()
  }

  function handleAssessmentComplete() {
    refreshParticipant()
  }

  function handleCompleteTraining() {
    if (!allContentsCompleted) {
      alert('Conclua todos os conteúdos antes de finalizar o treinamento.')

      return
    }

    if (hasAssessment && currentParticipant.assessmentStatus !== 'approved') {
      alert(
        'É necessário ser aprovado na avaliação antes de concluir o treinamento.'
      )

      return
    }

    completeParticipantTraining(currentParticipant.id)

    refreshParticipant()
  }

  function renderContent(content) {
    switch (content.type) {
      case 'text':
        return (
          <div className="training-progress-content-text">
            <p>{content.content}</p>
          </div>
        )

      case 'video':
        return (
          <div className="training-progress-content-video">
            {content.content ? (
              <iframe
                src={content.content}
                title={content.title || 'Vídeo'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="training-progress-unavailable">
                Vídeo não disponível.
              </div>
            )}
          </div>
        )

      case 'pdf':
        return (
          <div className="training-progress-content-pdf">
            {content.content ? (
              <>
                <iframe
                  src={content.content}
                  title={content.title || 'Documento PDF'}
                />

                <a
                  href={content.content}
                  target="_blank"
                  rel="noreferrer"
                  className="training-pdf-link"
                >
                  Abrir PDF em nova aba
                </a>
              </>
            ) : (
              <div className="training-progress-unavailable">
                PDF não disponível.
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="training-progress-unavailable">
            Este conteúdo não possui uma visualização disponível.
          </div>
        )
    }
  }

  /*
   * Quando o funcionário avança para a avaliação,
   * substituímos o acompanhamento pela prova.
   */
  if (showAssessment) {
    return (
      <TrainingTakeAssessment
        training={training}
        participant={currentParticipant}
        onClose={handleCloseAssessment}
        onComplete={handleAssessmentComplete}
        onApproved={handleCloseAssessment}
      />
    )
  }

  let statusLabel = 'Pendente'

  if (trainingCompleted) {
    statusLabel = 'Concluído'
  } else if (assessmentFailed) {
    statusLabel = 'Reprovado'
  } else if (progress > 0) {
    statusLabel = 'Em andamento'
  }

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal training-progress-modal">
        {/* CABEÇALHO */}

        <div className="training-modal-header training-progress-header">
          <div>
            <span className="training-progress-kicker">TREINAMENTO</span>

            <h2>Acompanhamento</h2>

            <p>{currentParticipant.employeeName}</p>
          </div>

          <button
            type="button"
            className="training-modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* CONTEÚDO COM ROLAGEM */}

        <div className="training-progress-scroll">
          {/* RESUMO */}

          <section className="training-progress-overview-card">
            <div className="training-progress-overview-grid">
              <div className="training-progress-overview-item">
                <span>Treinamento</span>

                <strong>{training.name}</strong>
              </div>

              <div className="training-progress-overview-item">
                <span>Status</span>

                <strong
                  className={`training-progress-status status-${
                    currentParticipant.status || 'pending'
                  }`}
                >
                  {statusLabel}
                </strong>
              </div>

              <div className="training-progress-overview-item">
                <span>Avaliação</span>

                <strong>
                  {hasAssessment
                    ? assessmentApproved
                      ? 'Aprovada'
                      : assessmentFailed
                        ? 'Reprovada'
                        : 'Não realizada'
                    : 'Não aplicável'}
                </strong>
              </div>

              <div className="training-progress-overview-score">
                <strong>{progress}%</strong>

                <span>concluído</span>
              </div>
            </div>

            <div className="training-progress-main-bar">
              <div
                style={{
                  width: `${progress}%`
                }}
              />
            </div>

            <div className="training-progress-overview-footer">
              <span>
                {completedContents.length} de {contents.length} conteúdo(s)
                concluído(s)
              </span>

              {hasAssessment && (
                <span className="training-progress-assessment-indicator">
                  📝 Avaliação obrigatória
                </span>
              )}
            </div>
          </section>

          {/* CONTEÚDOS */}

          <section className="training-progress-section">
            <div className="training-progress-section-header">
              <div>
                <h3>Conteúdos do treinamento</h3>

                <p>Marque cada conteúdo após concluí-lo.</p>
              </div>

              <strong className="training-progress-count-badge">
                {completedContents.length}/{contents.length}
              </strong>
            </div>

            {contents.length === 0 ? (
              <div className="training-progress-empty">
                <span>📚</span>

                <strong>Nenhum conteúdo cadastrado</strong>

                <p>Este treinamento não possui conteúdos.</p>
              </div>
            ) : (
              <div className="training-progress-content-list">
                {contents.map((content, index) => {
                  const isCompleted = completedContents.includes(content.id)

                  return (
                    <article
                      key={content.id}
                      className={`training-progress-content-card ${
                        isCompleted ? 'is-completed' : ''
                      }`}
                    >
                      <div className="training-progress-content-card-header">
                        <div className="training-progress-content-number">
                          {isCompleted ? '✓' : index + 1}
                        </div>

                        <div className="training-progress-content-title">
                          <strong>
                            {content.title || `Conteúdo ${index + 1}`}
                          </strong>

                          <span>
                            {content.type === 'text' && 'Texto'}

                            {content.type === 'video' && 'Vídeo'}

                            {content.type === 'pdf' && 'PDF'}

                            {!['text', 'video', 'pdf'].includes(content.type) &&
                              'Material'}
                          </span>
                        </div>

                        <label className="training-progress-check">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() => toggleContent(content.id)}
                          />

                          <span>
                            {isCompleted ? 'Concluído' : 'Concluir conteúdo'}
                          </span>
                        </label>
                      </div>

                      <div className="training-progress-content-preview">
                        {renderContent(content)}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>

          {/* AVISO DO PRÓXIMO PASSO */}

          {hasAssessment && allContentsCompleted && !trainingCompleted && (
            <section className="training-progress-next-step">
              <div className="training-progress-next-icon">📝</div>

              <div className="training-progress-next-info">
                <strong>
                  {assessmentApproved
                    ? 'Avaliação aprovada'
                    : assessmentFailed
                      ? 'Avaliação reprovada'
                      : 'Conteúdos concluídos'}
                </strong>

                <p>
                  {assessmentApproved
                    ? 'A avaliação foi aprovada. Finalize o treinamento para concluir o processo.'
                    : assessmentFailed
                      ? 'Realize novamente a avaliação para tentar alcançar a nota mínima.'
                      : 'Todos os conteúdos foram concluídos. O próximo passo é realizar a avaliação.'}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* RODAPÉ */}

        <div className="training-modal-footer training-progress-footer">
          <button
            type="button"
            className="training-secondary-button"
            onClick={onClose}
          >
            Fechar
          </button>

          {/* COM AVALIAÇÃO */}

          {hasAssessment &&
            allContentsCompleted &&
            !assessmentApproved &&
            !trainingCompleted && (
              <button
                type="button"
                className="training-primary-button"
                onClick={handleOpenAssessment}
              >
                {assessmentFailed
                  ? 'Realizar avaliação novamente'
                  : 'Avançar para avaliação'}
              </button>
            )}

          {/* AVALIAÇÃO APROVADA */}

          {hasAssessment && assessmentApproved && !trainingCompleted && (
            <button
              type="button"
              className="training-primary-button"
              onClick={handleCompleteTraining}
            >
              ✓ Concluir treinamento
            </button>
          )}

          {/* SEM AVALIAÇÃO */}

          {!hasAssessment && allContentsCompleted && !trainingCompleted && (
            <button
              type="button"
              className="training-primary-button"
              onClick={handleCompleteTraining}
            >
              ✓ Concluir treinamento
            </button>
          )}

          {/* CONCLUÍDO */}

          {trainingCompleted && (
            <span className="training-progress-completed-label">
              ✓ Treinamento concluído
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
