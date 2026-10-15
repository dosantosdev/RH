import { useEffect, useState } from 'react'
import { apiRequest } from '../../services/api'

import TrainingCertificate from './TrainingCertificate'
import TrainingTakeAssessment from './TrainingTakeAssessment'

export default function TrainingProgress({ training, participant, onClose }) {
  const [currentParticipant, setCurrentParticipant] = useState(participant)

  const [showCertificate, setShowCertificate] = useState(false)

  const [showAssessment, setShowAssessment] = useState(false)
  const [savingProgress, setSavingProgress] = useState(false)
  const [progressError, setProgressError] = useState('')

  const contents = [...(training.contents || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0)
  )

  useEffect(() => {
    setCurrentParticipant(participant)
  }, [participant])

  function calculateProgress(completedContents) {
    if (contents.length === 0) {
      return 0
    }

    return Math.round((completedContents.length / contents.length) * 100)
  }

  function calculateStatus(
    progress,
    assessmentStatus = currentParticipant.assessmentStatus
  ) {
    if (assessmentStatus === 'failed') {
      return 'failed'
    }

    if (
      progress >= 100 &&
      assessmentStatus === 'approved' &&
      currentParticipant.status === 'completed'
    ) {
      return 'completed'
    }

    if (progress > 0) {
      return 'in_progress'
    }

    return 'pending'
  }

  function refreshParticipant(updatedParticipant) {
    if (updatedParticipant) {
      setCurrentParticipant(updatedParticipant)
      return updatedParticipant
    }
    return currentParticipant
  }

  async function toggleContent(contentId) {
    if (savingProgress) return
    setSavingProgress(true)
    setProgressError('')
    const currentCompleted = currentParticipant.completedContents || []
    const isCompleted = currentCompleted.some((id) => String(id) === String(contentId))
    const updatedCompleted = isCompleted
      ? currentCompleted.filter((id) => String(id) !== String(contentId))
      : [...currentCompleted, contentId]

    try {
      const response = await apiRequest('/me/training-progress', {
        method: 'PATCH',
        body: JSON.stringify({
          participantId: currentParticipant.id,
          completedContents: updatedCompleted
        })
      })
      refreshParticipant(response?.participant)
    } catch (error) {
      setProgressError(error?.message || 'Não foi possível salvar o progresso no servidor.')
    } finally {
      setSavingProgress(false)
    }
  }

  /*
   * ============================================================
   * AVALIAÇÃO CONCLUÍDA
   * ============================================================
   */

  function handleAssessmentComplete(attempt, updatedParticipant) {
    // O participante só é atualizado com o retorno confirmado pela API.
    if (updatedParticipant) setCurrentParticipant(updatedParticipant)
  }

  /*
   * ============================================================
   * APROVAÇÃO DA AVALIAÇÃO
   * ============================================================
   *
   * A aprovação não conclui automaticamente o treinamento.
   *
   * O usuário precisa clicar em:
   *
   * "Concluir treinamento"
   *
   * Porém a função central valida novamente:
   *
   * - 100% dos conteúdos;
   * - avaliação aprovada.
   */

  async function handleAssessmentApproved() {
    setProgressError('')
    try {
      const response = await apiRequest('/me/training-complete', {
        method: 'POST',
        body: JSON.stringify({ participantId: currentParticipant.id })
      })
      if (!response?.participant || response.participant.status !== 'completed') {
        throw new Error('O servidor não confirmou a conclusão do treinamento.')
      }
      setCurrentParticipant(response.participant)
      setShowAssessment(false)
    } catch (error) {
      setProgressError(error?.message || 'Não foi possível concluir o treinamento.')
    }
  }

  /*
   * ============================================================
   * CONTEÚDOS
   * ============================================================
   */

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
                width="100%"
                height="450"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <p>Vídeo não disponível.</p>
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
                  width="100%"
                  height="500"
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
              <p>PDF não disponível.</p>
            )}
          </div>
        )

      default:
        return (
          <div className="training-progress-content-other">
            <p>Este conteúdo não possui uma visualização disponível.</p>
          </div>
        )
    }
  }

  /*
   * ============================================================
   * CERTIFICADO
   * ============================================================
   */

  if (showCertificate) {
    return (
      <TrainingCertificate
        training={training}
        participant={currentParticipant}
        onClose={() => setShowCertificate(false)}
      />
    )
  }

  /*
   * ============================================================
   * AVALIAÇÃO
   * ============================================================
   */

  if (showAssessment) {
    return (
      <TrainingTakeAssessment
        training={training}
        participant={currentParticipant}
        onClose={() => setShowAssessment(false)}
        onComplete={handleAssessmentComplete}
        onApproved={handleAssessmentApproved}
      />
    )
  }

  const completedContents = currentParticipant.completedContents || []

  const progress = calculateProgress(completedContents)

  const status = calculateStatus(progress)

  const statusLabels = {
    pending: 'Pendente',

    in_progress: 'Em andamento',

    completed: 'Concluído',

    failed: 'Reprovado'
  }

  const canTakeAssessment = progress >= 100

  const canIssueCertificate =
    progress >= 100 &&
    currentParticipant.assessmentStatus === 'approved' &&
    currentParticipant.status === 'completed'

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal">
        <div className="training-modal-header">
          <div>
            <span className="training-progress-kicker">TREINAMENTO</span>

            <h2>Acompanhamento</h2>

            <p>{currentParticipant.employeeName}</p>
          </div>

          <button
            type="button"
            className="training-modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {progressError && (
          <div className="training-assessment-empty-screen" role="alert">
            <p>{progressError}</p>
          </div>
        )}

        {savingProgress && <p role="status">Salvando progresso...</p>}

        <div className="training-progress-summary">
          <div className="training-progress-summary-info">
            <div>
              <span>Treinamento</span>

              <strong>{training.name}</strong>
            </div>

            <div>
              <span>Status</span>

              <strong>{statusLabels[status]}</strong>
            </div>

            <div>
              <span>Avaliação</span>

              <strong>
                {currentParticipant.assessmentStatus === 'approved'
                  ? 'Aprovada'
                  : currentParticipant.assessmentStatus === 'failed'
                    ? 'Reprovada'
                    : 'Não realizada'}
              </strong>
            </div>
          </div>

          <div className="training-progress-percentage">
            <strong>{progress}%</strong>

            <span>concluído</span>
          </div>

          <div className="training-progress-bar">
            <div
              style={{
                width: `${progress}%`
              }}
            />
          </div>

          <div className="training-progress-count">
            <span>
              {completedContents.length} de {contents.length} conteúdo(s)
              concluído(s)
            </span>
          </div>
        </div>

        <div className="training-progress-body">
          <div className="training-content-section-header">
            <div>
              <h3>Conteúdos</h3>

              <span>Marque cada conteúdo após concluí-lo.</span>
            </div>

            <span>
              {completedContents.length}/{contents.length}
            </span>
          </div>

          {contents.length === 0 ? (
            <div className="training-content-empty">
              <span>📚</span>

              <p>Este treinamento ainda não possui conteúdos.</p>
            </div>
          ) : (
            <div className="training-progress-content-list">
              {contents.map((content, index) => {
                const isCompleted = completedContents.some((id) => String(id) === String(content.id))

                return (
                  <div
                    key={content.id}
                    className={
                      isCompleted
                        ? 'training-progress-content-item completed'
                        : 'training-progress-content-item'
                    }
                  >
                    <div className="training-progress-content-header">
                      <div className="training-progress-content-number">
                        {isCompleted ? '✓' : index + 1}
                      </div>

                      <div className="training-progress-content-info">
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
                          disabled={savingProgress}
                        />

                        <span>
                          {isCompleted ? 'Concluído' : 'Marcar como concluído'}
                        </span>
                      </label>
                    </div>

                    <div className="training-progress-content-preview">
                      {renderContent(content)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="training-modal-footer">
          <button
            type="button"
            className="training-secondary-button"
            onClick={onClose}
          >
            Fechar
          </button>

          {canTakeAssessment &&
            currentParticipant.assessmentStatus !== 'approved' && (
              <button
                type="button"
                className="training-primary-button"
                onClick={() => setShowAssessment(true)}
              >
                📝{' '}
                {currentParticipant.assessmentStatus === 'failed'
                  ? 'Tentar novamente'
                  : 'Realizar avaliação'}
              </button>
            )}

          {canIssueCertificate && (
            <button
              type="button"
              className="training-primary-button"
              onClick={() => setShowCertificate(true)}
            >
              🎓 Emitir certificado
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
