import { useEffect, useState } from 'react'

import './meusTreinamentos.css'

import { hasPermission } from '../../services/permissions'
import { getTrainings } from '../../services/training'
import { getTrainingParticipants } from '../../services/trainingParticipant'

import TrainingProgress from '../../components/trainings/TrainingProgress'

export default function MeusTreinamentos() {
  const [trainings, setTrainings] = useState([])

  const [selectedTraining, setSelectedTraining] = useState(null)

  const [selectedParticipant, setSelectedParticipant] = useState(null)

  useEffect(() => {
    loadTrainings()
  }, [])

  function loadTrainings() {
    const currentUser = JSON.parse(localStorage.getItem('loggedUser'))

    if (!currentUser?.employeeId) {
      setTrainings([])

      return
    }

    const employeeId = Number(currentUser.employeeId)

    const allTrainings = getTrainings()

    const allParticipants = getTrainingParticipants()

    const employeeParticipants = allParticipants.filter(
      (participant) => Number(participant.employeeId) === employeeId
    )

    const employeeTrainings = employeeParticipants
      .map((participant) => {
        const training = allTrainings.find(
          (item) => Number(item.id) === Number(participant.trainingId)
        )

        if (!training) {
          return null
        }

        if (training.active === false) {
          return null
        }

        return {
          training,
          participant
        }
      })
      .filter(Boolean)

    setTrainings(employeeTrainings)
  }

  function handleOpenTraining(item) {
    setSelectedTraining(item.training)

    setSelectedParticipant(item.participant)
  }

  function handleCloseTraining() {
    setSelectedTraining(null)

    setSelectedParticipant(null)

    loadTrainings()
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

  function getAssessmentLabel(status) {
    const labels = {
      approved: 'Aprovada',
      failed: 'Reprovada'
    }

    return labels[status] || 'Não realizada'
  }

  function getProgress(participant) {
    return Math.min(Math.max(Number(participant.progress) || 0, 0), 100)
  }

  if (!hasPermission('my_trainings_view')) {
    return (
      <div className="my-trainings-page">
        <div className="my-trainings-access-denied">
          <span>🔒</span>

          <h2>Acesso não autorizado</h2>

          <p>
            Seu perfil de acesso não possui permissão para realizar
            treinamentos.
          </p>
        </div>
      </div>
    )
  }

  if (selectedTraining && selectedParticipant) {
    return (
      <TrainingProgress
        training={selectedTraining}
        participant={selectedParticipant}
        onClose={handleCloseTraining}
      />
    )
  }

  return (
    <div className="my-trainings-page">
      <div className="my-trainings-header">
        <div>
          <h1>Meus Treinamentos</h1>

          <p>
            Acompanhe seus treinamentos e conclua as atividades atribuídas a
            você.
          </p>
        </div>
      </div>

      {trainings.length === 0 ? (
        <div className="my-trainings-empty">
          <span>📚</span>

          <h2>Nenhum treinamento disponível</h2>

          <p>Você não possui treinamentos ativos atribuídos no momento.</p>
        </div>
      ) : (
        <div className="my-trainings-list">
          {trainings.map(({ training, participant }) => {
            const progress = getProgress(participant)

            const status = participant.status || 'pending'

            return (
              <article key={participant.id} className="my-training-card">
                <div className="my-training-card-header">
                  <div>
                    <span className="my-training-category">
                      {training.category || 'Treinamento'}
                    </span>

                    <h2>{training.name}</h2>
                  </div>

                  <span className={`my-training-status status-${status}`}>
                    {getStatusLabel(status)}
                  </span>
                </div>

                <p className="my-training-description">
                  {training.description || 'Sem descrição disponível.'}
                </p>

                <div className="my-training-info">
                  <div>
                    <span>Carga horária</span>

                    <strong>{training.duration || 0} hora(s)</strong>
                  </div>

                  <div>
                    <span>Progresso</span>

                    <strong>{progress}%</strong>
                  </div>

                  <div>
                    <span>Avaliação</span>

                    <strong>
                      {getAssessmentLabel(participant.assessmentStatus)}
                    </strong>
                  </div>
                </div>

                <div className="my-training-progress">
                  <div className="my-training-progress-bar">
                    <div
                      style={{
                        width: `${progress}%`
                      }}
                    />
                  </div>
                </div>

                <div className="my-training-card-footer">
                  <span>
                    {participant.completedContents?.length || 0} conteúdo(s)
                    concluído(s)
                  </span>

                  <button
                    type="button"
                    className="my-training-button"
                    onClick={() =>
                      handleOpenTraining({
                        training,
                        participant
                      })
                    }
                  >
                    {status === 'completed'
                      ? 'Visualizar treinamento'
                      : progress > 0
                        ? 'Continuar treinamento'
                        : 'Iniciar treinamento'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
