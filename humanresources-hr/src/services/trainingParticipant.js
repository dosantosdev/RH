import { getStoredArray, setStored } from './storage'

export function getTrainingParticipants() {
  return getStoredArray('trainingParticipants')
}

export function addTrainingParticipant(participant) {
  const participants = getTrainingParticipants()

  const updatedParticipants = [...participants, participant]

  setStored('trainingParticipants', updatedParticipants)

  return updatedParticipants
}

export function updateTrainingParticipant(updatedParticipant) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.map((participant) =>
    participant.id === updatedParticipant.id ? updatedParticipant : participant
  )

  setStored('trainingParticipants', updatedParticipants)

  return updatedParticipants
}

export function deleteTrainingParticipant(id) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.filter(
    (participant) => participant.id !== id
  )

  setStored('trainingParticipants', updatedParticipants)

  return updatedParticipants
}

export function addAssessmentAttempt(participantId, attempt) {
  const participants = getTrainingParticipants()

  const updatedParticipants = participants.map((participant) => {
    if (participant.id !== participantId) {
      return participant
    }

    const updatedParticipant = {
      ...participant,

      attempts: [...(participant.attempts || []), attempt],

      score: attempt.score,

      assessmentStatus: attempt.approved ? 'approved' : 'failed'
    }

    return updateParticipantCompletion(updatedParticipant)
  })

  setStored('trainingParticipants', updatedParticipants)

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

    const updatedParticipant = {
      ...participant,

      progress,

      completedContents:
        completedContents || participant.completedContents || []
    }

    return updateParticipantCompletion(updatedParticipant)
  })

  setStored('trainingParticipants', updatedParticipants)

  return updatedParticipants
}

function updateParticipantCompletion(participant) {
  const contentsCompleted = Number(participant.progress) >= 100

  const assessmentApproved = participant.assessmentStatus === 'approved'

  if (contentsCompleted && assessmentApproved) {
    return {
      ...participant,

      status: 'completed',

      completedAt: participant.completedAt || new Date().toISOString()
    }
  }

  if (participant.assessmentStatus === 'failed') {
    return {
      ...participant,
      status: 'failed'
    }
  }

  if (Number(participant.progress) > 0) {
    return {
      ...participant,
      status: 'in_progress'
    }
  }

  return {
    ...participant,
    status: 'pending'
  }
}
