import { useEffect, useState } from 'react'

import { updateParticipantProgress } from '../../services/trainingParticipant'

export default function TrainingProgress({ training, participant, onClose }) {
  const [currentParticipant, setCurrentParticipant] = useState(participant)

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

  function calculateStatus(progress) {
    if (progress >= 100) {
      return 'completed'
    }

    if (progress > 0) {
      return 'in_progress'
    }

    return 'pending'
  }

  function toggleContent(contentId) {
    const currentCompleted = currentParticipant.completedContents || []

    const isCompleted = currentCompleted.includes(contentId)

    const updatedCompleted = isCompleted
      ? currentCompleted.filter((id) => id !== contentId)
      : [...currentCompleted, contentId]

    const progress = calculateProgress(updatedCompleted)

    const status = calculateStatus(progress)

    const updatedParticipant = {
      ...currentParticipant,

      completedContents: updatedCompleted,

      progress,

      status,

      completedAt:
        status === 'completed'
          ? currentParticipant.completedAt || new Date().toISOString()
          : null
    }

    updateParticipantProgress(currentParticipant.id, progress, updatedCompleted)

    setCurrentParticipant(updatedParticipant)
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
            {content.url ? (
              <video controls width="100%">
                <source src={content.url} />
                Seu navegador não suporta reprodução de vídeo.
              </video>
            ) : (
              <p>Vídeo não disponível.</p>
            )}
          </div>
        )

      case 'pdf':
        return (
          <div className="training-progress-content-pdf">
            {content.url ? (
              <iframe
                src={content.url}
                title={content.title || 'Documento PDF'}
                width="100%"
                height="500"
              />
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

  const completedContents = currentParticipant.completedContents || []

  const progress = calculateProgress(completedContents)

  const status = calculateStatus(progress)

  return (
    <div className="training-modal-overlay">
      <div className="training-content-modal">
        {/* CABEÇALHO */}

        <div className="training-modal-header">
          <div>
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

        {/* RESUMO */}

        <div className="training-progress-summary">
          <div className="training-progress-summary-info">
            <div>
              <span>Treinamento</span>

              <strong>{training.name}</strong>
            </div>

            <div>
              <span>Status</span>

              <strong>
                {status === 'completed'
                  ? 'Concluído'
                  : status === 'in_progress'
                    ? 'Em andamento'
                    : 'Pendente'}
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

        {/* CONTEÚDOS */}

        <div className="training-progress-body">
          <div className="training-content-section-header">
            <div>
              <h3>Conteúdos</h3>

              <span>Marque cada conteúdo após concluí-lo.</span>
            </div>
          </div>

          {contents.length === 0 ? (
            <div className="training-content-empty">
              <span>📚</span>

              <p>Este treinamento ainda não possui conteúdos.</p>
            </div>
          ) : (
            <div className="training-progress-content-list">
              {contents.map((content, index) => {
                const isCompleted = completedContents.includes(content.id)

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
                        {index + 1}
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

        {/* RODAPÉ */}

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
