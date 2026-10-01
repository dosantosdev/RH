import { getStoredArray, setStored } from './storage'

const STORAGE_KEY = 'trainingParticipants'

export function getTrainingParticipants() {
  return getStoredArray(STORAGE_KEY)
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

    let status = 'pending'

    if (participant.assessmentStatus === 'failed') {
      status = 'failed'
    } else if (
      updatedProgress >= 100 &&
      participant.assessmentStatus === 'approved'
    ) {
      status = 'completed'
    } else if (updatedProgress > 0) {
      status = 'in_progress'
    }

    return {
      ...participant,

      completedContents,

      progress: updatedProgress,

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

export function addAssessmentAttempt(participantId, attempt) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.map((participant) => {
    if (participant.id !== participantId) {
      return participant
    }

    const attempts = Array.isArray(participant.attempts)
      ? participant.attempts
      : []

    const updatedAttempts = [...attempts, attempt]

    const assessmentStatus = attempt.approved ? 'approved' : 'failed'

    let status = 'pending'

    if (assessmentStatus === 'failed') {
      status = 'failed'
    } else if (participant.progress >= 100) {
      status = 'completed'
    } else if (participant.progress > 0) {
      status = 'in_progress'
    }

    return {
      ...participant,

      attempts: updatedAttempts,

      score: attempt.score,

      assessmentStatus,

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
