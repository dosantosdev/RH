import { getStoredArray, setStored } from './storage'

const STORAGE_KEY = 'trainingParticipants'

export function getTrainingParticipants() {
  return getStoredArray(STORAGE_KEY)
}

export function getTrainingParticipantsByTrainingId(trainingId) {
  return getTrainingParticipants().filter(
    (participant) => Number(participant.trainingId) === Number(trainingId)
  )
}

export function addTrainingParticipant(participant) {
  const participants = getTrainingParticipants()

  const updatedParticipants = [...participants, participant]

  setStored(STORAGE_KEY, updatedParticipants)

  return updatedParticipants
}

export function updateTrainingParticipant(updatedParticipant) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.map((participant) =>
    participant.id === updatedParticipant.id ? updatedParticipant : participant
  )

  setStored(STORAGE_KEY, updatedParticipants)

  return updatedParticipants
}

export function deleteTrainingParticipant(participantId) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.filter(
    (participant) => participant.id !== participantId
  )

  setStored(STORAGE_KEY, updatedParticipants)

  return updatedParticipants
}

/*
 * Atualiza somente o progresso dos conteúdos.
 *
 * A avaliação não conclui automaticamente
 * o treinamento.
 */
export function updateParticipantProgress(
  participantId,
  progress,
  completedContents
) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.map((participant) => {
    if (participant.id !== participantId) {
      return participant
    }

    const updatedProgress = Number(progress) || 0

    const bestScore = participant.bestScore ?? participant.score ?? null

    const assessmentStatus = participant.assessmentStatus || null

    let status = 'pending'

    if (assessmentStatus === 'failed') {
      status = 'failed'
    } else if (updatedProgress > 0) {
      status = 'in_progress'
    }

    return {
      ...participant,

      completedContents,

      progress: updatedProgress,

      score: bestScore,

      bestScore,

      status,

      completedAt:
        status === 'completed'
          ? participant.completedAt || new Date().toISOString()
          : null
    }
  })

  setStored(STORAGE_KEY, updatedParticipants)

  return updatedParticipants
}

/*
 * Registra uma tentativa da avaliação.
 *
 * A aprovação da avaliação é registrada,
 * mas o treinamento continua em andamento
 * até o usuário clicar em "Concluir treinamento".
 */
export function addAssessmentAttempt(
  participantId,
  attempt,
  assessmentSettings = {}
) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.map((participant) => {
    if (participant.id !== participantId) {
      return participant
    }

    const attempts = Array.isArray(participant.attempts)
      ? participant.attempts
      : []

    const updatedAttempts = [...attempts, attempt]

    const previousBestScore = Number.isFinite(Number(participant.bestScore))
      ? Number(participant.bestScore)
      : Number.isFinite(Number(participant.score))
        ? Number(participant.score)
        : null

    const currentScore = Number(attempt.score) || 0

    const bestScore =
      previousBestScore === null
        ? currentScore
        : Math.max(previousBestScore, currentScore)

    const minimumScore =
      Number(attempt.minimumScore ?? assessmentSettings.minimumScore) || 0

    const approved = bestScore >= minimumScore

    const assessmentStatus = approved ? 'approved' : 'failed'

    let status = 'pending'

    if (assessmentStatus === 'failed') {
      status = 'failed'
    } else if (Number(participant.progress) > 0) {
      status = 'in_progress'
    }

    return {
      ...participant,

      attempts: updatedAttempts,

      score: bestScore,

      bestScore,

      assessmentStatus,

      status,

      completedAt: null
    }
  })

  setStored(STORAGE_KEY, updatedParticipants)

  return updatedParticipants
}

/*
 * Conclusão definitiva do treinamento.
 *
 * É chamada somente depois que:
 *
 * - todos os conteúdos foram concluídos;
 * - a avaliação foi aprovada, quando existir;
 * - o usuário clicou em "Concluir treinamento".
 */
export function completeParticipantTraining(participantId) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.map((participant) => {
    if (participant.id !== participantId) {
      return participant
    }

    return {
      ...participant,

      progress: 100,

      status: 'completed',

      completedAt: participant.completedAt || new Date().toISOString()
    }
  })

  setStored(STORAGE_KEY, updatedParticipants)

  return updatedParticipants
}
