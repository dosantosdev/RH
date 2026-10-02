import { useMemo, useState } from 'react'

import './meusTreinamentos.css'

import { getTrainings } from '../../services/training'
import { getTrainingParticipants } from '../../services/trainingParticipant'

import TrainingProgress from '../../components/trainings/TrainingProgress'
import TrainingCertificate from '../../components/trainings/TrainingCertificate'

export default function MeusTreinamentos() {
  const [trainings, setTrainings] = useState(() => getTrainings())
  const [participants, setParticipants] = useState(() =>
    getTrainingParticipants()
  )

  const [selectedParticipant, setSelectedParticipant] = useState(null)
  const [selectedCertificate, setSelectedCertificate] = useState(null)
  const [search, setSearch] = useState('')

  const currentUser = JSON.parse(localStorage.getItem('loggedUser'))
  const employeeId = currentUser?.employeeId

  function loadData() {
    setTrainings(getTrainings())
    setParticipants(getTrainingParticipants())
  }

  const myTrainings = useMemo(() => {
    if (!employeeId) {
      return []
    }

    const employeeParticipants = participants.filter(
      (participant) => Number(participant.employeeId) === Number(employeeId)
    )

    return employeeParticipants
      .map((participant) => {
        const training = trainings.find(
          (item) => Number(item.id) === Number(participant.trainingId)
        )

        if (!training) {
          return null
        }

        return {
          training,
          participant
        }
      })
      .filter(Boolean)
      .filter(({ training }) =>
        training.name?.toLowerCase().includes(search.toLowerCase())
      )
  }, [employeeId, participants, trainings, search])

  function getProgress(participant, training) {
    if (training.contents?.length === 0) {
      return 0
    }

    if (Number.isFinite(Number(participant.progress))) {
      return Math.max(0, Math.min(100, Number(participant.progress)))
    }

    return 0
  }

  function getStatus(participant, training) {
    const progress = getProgress(participant, training)

    if (participant.assessmentStatus === 'failed') {
      return 'failed'
    }

    if (progress >= 100 && participant.assessmentStatus === 'approved') {
      return 'completed'
    }

    if (progress > 0) {
      return 'in_progress'
    }

    return 'pending'
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

  function canIssueCertificate(participant, training) {
    return (
      getProgress(participant, training) >= 100 &&
      participant.assessmentStatus === 'approved' &&
      getStatus(participant, training) === 'completed'
    )
  }

  function handleOpenTraining(participant) {
    const training = trainings.find(
      (item) => Number(item.id) === Number(participant.trainingId)
    )

    if (!training) {
      return
    }

    setSelectedParticipant(participant)
  }

  function handleCloseTraining() {
    setSelectedParticipant(null)
    loadData()
  }

  function handleOpenCertificate(training, participant) {
    if (!canIssueCertificate(participant, training)) {
      return
    }

    setSelectedCertificate({
      training,
      participant
    })
  }

  function handleCloseCertificate() {
    setSelectedCertificate(null)
    loadData()
  }

  if (selectedCertificate) {
    return (
      <TrainingCertificate
        training={selectedCertificate.training}
        participant={selectedCertificate.participant}
        onClose={handleCloseCertificate}
      />
    )
  }

  if (selectedParticipant) {
    const training = trainings.find(
      (item) => Number(item.id) === Number(selectedParticipant.trainingId)
    )

    if (training) {
      return (
        <TrainingProgress
          training={training}
          participant={selectedParticipant}
          onClose={handleCloseTraining}
        />
      )
    }
  }

  const completedCount = myTrainings.filter(
    ({ training, participant }) =>
      getStatus(participant, training) === 'completed'
  ).length

  const inProgressCount = myTrainings.filter(
    ({ training, participant }) =>
      getStatus(participant, training) === 'in_progress'
  ).length

  const pendingCount = myTrainings.filter(
    ({ training, participant }) =>
      getStatus(participant, training) === 'pending'
  ).length

  return (
    <div className="my-trainings-page">
      <div className="my-trainings-header">
        <div>
          <span className="my-trainings-kicker">CAPACITAÇÃO</span>

          <h1>Meus treinamentos</h1>

          <p>
            Acompanhe seus treinamentos, realize as avaliações e acesse seus
            certificados.
          </p>
        </div>
      </div>

      {!employeeId ? (
        <div className="my-trainings-empty">
          <div className="my-trainings-empty-icon">👤</div>

          <h2>Usuário sem funcionário vinculado</h2>

          <p>
            Este usuário ainda não está vinculado a um funcionário. Por isso,
            não há treinamentos disponíveis para exibir.
          </p>
        </div>
      ) : (
        <>
          <div className="my-trainings-summary">
            <div className="my-trainings-summary-card">
              <span>📚</span>

              <div>
                <strong>{myTrainings.length}</strong>

                <small>Treinamentos</small>
              </div>
            </div>

            <div className="my-trainings-summary-card">
              <span>⏳</span>

              <div>
                <strong>{inProgressCount}</strong>

                <small>Em andamento</small>
              </div>
            </div>

            <div className="my-trainings-summary-card">
              <span>🕐</span>

              <div>
                <strong>{pendingCount}</strong>

                <small>Pendentes</small>
              </div>
            </div>

            <div className="my-trainings-summary-card">
              <span>🎓</span>

              <div>
                <strong>{completedCount}</strong>

                <small>Concluídos</small>
              </div>
            </div>
          </div>

          <div className="my-trainings-content">
            <div className="my-trainings-list-header">
              <div>
                <h2>Treinamentos atribuídos</h2>

                <p>Veja seu progresso e continue de onde parou.</p>
              </div>

              <input
                type="text"
                placeholder="Buscar treinamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {myTrainings.length === 0 ? (
              <div className="my-trainings-empty compact">
                <div className="my-trainings-empty-icon">📚</div>

                <h2>Nenhum treinamento encontrado</h2>

                <p>
                  Você ainda não possui treinamentos atribuídos ou nenhum
                  treinamento corresponde à busca.
                </p>
              </div>
            ) : (
              <div className="my-trainings-grid">
                {myTrainings.map(({ training, participant }) => {
                  const progress = getProgress(participant, training)

                  const status = getStatus(participant, training)

                  const certificateAvailable = canIssueCertificate(
                    participant,
                    training
                  )

                  return (
                    <article key={participant.id} className="my-training-card">
                      <div className="my-training-card-header">
                        <div>
                          <span className="my-training-card-category">
                            {training.category || 'Treinamento'}
                          </span>

                          <h3>{training.name}</h3>
                        </div>

                        <div className="my-training-card-header-actions">
                          <button
                            type="button"
                            className={`my-training-certificate ${
                              certificateAvailable ? 'available' : 'locked'
                            }`}
                            disabled={!certificateAvailable}
                            onClick={() =>
                              handleOpenCertificate(training, participant)
                            }
                            title={
                              certificateAvailable
                                ? 'Emitir certificado'
                                : 'Certificado bloqueado'
                            }
                          >
                            {certificateAvailable ? '🎓' : '🔒'}
                          </button>

                          <span className={`my-training-status ${status}`}>
                            {getStatusLabel(status)}
                          </span>
                        </div>
                      </div>

                      <p className="my-training-card-description">
                        {training.description ||
                          'Sem descrição cadastrada para este treinamento.'}
                      </p>

                      <div className="my-training-card-info">
                        <div>
                          <span>Carga horária</span>

                          <strong>{training.duration || 0} hora(s)</strong>
                        </div>

                        <div>
                          <span>Conteúdos</span>

                          <strong>{training.contents?.length || 0}</strong>
                        </div>

                        <div>
                          <span>Avaliação</span>

                          <strong>
                            {participant.assessmentStatus === 'approved'
                              ? 'Aprovada'
                              : participant.assessmentStatus === 'failed'
                                ? 'Reprovada'
                                : 'Pendente'}
                          </strong>
                        </div>
                      </div>

                      <div className="my-training-card-progress">
                        <div className="my-training-card-progress-header">
                          <span>Progresso</span>

                          <strong>{progress}%</strong>
                        </div>

                        <div className="my-training-card-progress-bar">
                          <div
                            style={{
                              width: `${progress}%`
                            }}
                          />
                        </div>
                      </div>

                      <div className="my-training-card-footer">
                        <span>
                          {participant.completedContents?.length || 0} de{' '}
                          {training.contents?.length || 0} conteúdo(s)
                        </span>

                        <button
                          type="button"
                          className="my-training-view-button"
                          onClick={() => handleOpenTraining(participant)}
                        >
                          {status === 'completed'
                            ? 'Visualizar treinamento'
                            : 'Continuar treinamento'}
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
