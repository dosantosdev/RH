import { useState } from 'react'

import TrainingCertificate from './TrainingCertificate'

export default function TrainingParticipantCard({
  training,
  participant,
  onViewTraining
}) {
  const [showCertificate, setShowCertificate] = useState(false)

  const progress = Number(participant?.progress) || 0

  const isApproved = participant?.assessmentStatus === 'approved'

  const isCompleted =
    participant?.status === 'completed' && progress >= 100 && isApproved

  const contents = Array.isArray(training?.contents) ? training.contents : []

  const completedContents = Array.isArray(participant?.completedContents)
    ? participant.completedContents
    : []

  function handleCertificateClick(e) {
    e.stopPropagation()

    if (!isCompleted) {
      return
    }

    setShowCertificate(true)
  }

  function handleViewTraining() {
    if (onViewTraining) {
      onViewTraining(training, participant)
    }
  }

  function getAssessmentLabel() {
    if (participant?.assessmentStatus === 'approved') {
      return 'Aprovada'
    }

    if (participant?.assessmentStatus === 'failed') {
      return 'Reprovada'
    }

    return 'Não realizada'
  }

  function getStatusLabel() {
    if (isCompleted) {
      return 'Concluído'
    }

    if (participant?.status === 'failed') {
      return 'Reprovado'
    }

    if (participant?.status === 'in_progress') {
      return 'Em andamento'
    }

    return 'Pendente'
  }

  return (
    <>
      <div className="training-participant-card">
        {/* ============================================
            CABEÇALHO
        ============================================ */}

        <div className="training-participant-card-header">
          <div className="training-participant-card-category">
            {training?.category || 'TREINAMENTO'}
          </div>

          <div className="training-participant-card-header-actions">
            {/* ========================================
                CERTIFICADO
            ======================================== */}

            <button
              type="button"
              className={
                isCompleted
                  ? 'training-participant-certificate available'
                  : 'training-participant-certificate locked'
              }
              onClick={handleCertificateClick}
              disabled={!isCompleted}
              title={
                isCompleted
                  ? 'Emitir certificado'
                  : 'Certificado disponível após concluir o treinamento e ser aprovado'
              }
              aria-label={
                isCompleted ? 'Emitir certificado' : 'Certificado bloqueado'
              }
            >
              {isCompleted ? '🎓' : '🔒'}
            </button>

            {/* ========================================
                STATUS
            ======================================== */}

            <span
              className={
                isCompleted
                  ? 'training-participant-status completed'
                  : participant?.status === 'failed'
                    ? 'training-participant-status failed'
                    : 'training-participant-status pending'
              }
            >
              {getStatusLabel()}
            </span>
          </div>
        </div>

        {/* ============================================
            INFORMAÇÕES DO TREINAMENTO
        ============================================ */}

        <div className="training-participant-card-content">
          <h3>{training?.name}</h3>

          <p>{training?.description || 'Nenhuma descrição cadastrada.'}</p>
        </div>

        {/* ============================================
            INFORMAÇÕES
        ============================================ */}

        <div className="training-participant-card-info">
          <div>
            <span>Carga horária</span>

            <strong>{training?.duration || 0} hora(s)</strong>
          </div>

          <div>
            <span>Progresso</span>

            <strong>{progress}%</strong>
          </div>

          <div>
            <span>Avaliação</span>

            <strong>{getAssessmentLabel()}</strong>
          </div>
        </div>

        {/* ============================================
            BARRA DE PROGRESSO
        ============================================ */}

        <div className="training-participant-card-progress">
          <div
            className="training-participant-card-progress-bar"
            aria-label={`Progresso de ${progress}%`}
          >
            <div
              style={{
                width: `${Math.min(Math.max(progress, 0), 100)}%`
              }}
            />
          </div>
        </div>

        {/* ============================================
            RODAPÉ
        ============================================ */}

        <div className="training-participant-card-footer">
          <span>{completedContents.length} conteúdo(s) concluído(s)</span>

          <button
            type="button"
            className="training-participant-view-button"
            onClick={handleViewTraining}
          >
            Visualizar treinamento
          </button>
        </div>
      </div>

      {/* ==============================================
          CERTIFICADO
      ============================================== */}

      {showCertificate && (
        <TrainingCertificate
          training={training}
          participant={participant}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </>
  )
}
