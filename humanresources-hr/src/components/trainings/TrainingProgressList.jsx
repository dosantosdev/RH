import { useEffect, useState } from 'react'

import { getTrainingParticipants } from '../../services/trainingParticipant'

import TrainingProgress from './TrainingProgress'

export default function TrainingProgressList({ training, onClose }) {
  const [participants, setParticipants] = useState([])

  const [selectedParticipant, setSelectedParticipant] = useState(null)

  useEffect(() => {
    loadParticipants()
  }, [training.id])

  function loadParticipants() {
    const storedParticipants = getTrainingParticipants()

    const trainingParticipants = storedParticipants.filter(
      (participant) => participant.trainingId === training.id
    )

    setParticipants(trainingParticipants)
  }

  function getStatusLabel(status) {
    const labels = {
      pending: 'Pendente',
      in_progress: 'Em andamento',
      completed: 'Concluído',
      failed: 'Reprovado'
    }

    return labels[status] || 'Pendente'
  }

  function getAssessmentStatusLabel(status) {
    const labels = {
      approved: 'Aprovada',
      failed: 'Reprovada'
    }

    return labels[status] || 'Não realizada'
  }

  function handleCloseProgress() {
    setSelectedParticipant(null)

    loadParticipants()
  }

  if (selectedParticipant) {
    return (
      <TrainingProgress
        training={training}
        participant={selectedParticipant}
        onClose={handleCloseProgress}
      />
    )
  }

  return (
    <div
      className="training-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="training-content-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO */}

        <div className="training-modal-header">
          <div>
            <h2>Progresso</h2>

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

        {/* CONTEÚDO */}

        <div className="training-content-body">
          <div className="training-content-section-header">
            <div>
              <h3>Progresso dos participantes</h3>

              <span>{participants.length} participante(s)</span>
            </div>
          </div>

          {participants.length === 0 ? (
            <div className="training-content-empty">
              <span>📊</span>

              <p>Nenhum participante está inscrito neste treinamento.</p>

              <small>
                Adicione participantes através do botão{' '}
                <strong>Participantes</strong>.
              </small>
            </div>
          ) : (
            <div className="training-participants-list">
              {participants.map((participant) => {
                const progress = Number(participant.progress || 0)

                const status = participant.status || 'pending'

                return (
                  <div
                    key={participant.id}
                    className="training-participant-item"
                  >
                    <div className="training-participant-info">
                      <strong>{participant.employeeName}</strong>

                      <span>{getStatusLabel(status)}</span>

                      <small>
                        Avaliação:{' '}
                        {getAssessmentStatusLabel(participant.assessmentStatus)}
                      </small>
                    </div>

                    <div className="training-participant-progress">
                      <div className="training-progress-info">
                        <span>Progresso</span>

                        <strong>{progress}%</strong>
                      </div>

                      <div className="training-progress-bar">
                        <div
                          style={{
                            width: `${progress}%`
                          }}
                        />
                      </div>
                    </div>

                    <div className="training-participant-score">
                      <span>Nota</span>

                      <strong>
                        {participant.score !== null &&
                        participant.score !== undefined
                          ? `${participant.score}%`
                          : '--'}
                      </strong>
                    </div>

                    <div className="training-content-actions">
                      <button
                        type="button"
                        className="training-content-view"
                        onClick={() => setSelectedParticipant(participant)}
                        title="Ver acompanhamento"
                      >
                        📊
                      </button>
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
