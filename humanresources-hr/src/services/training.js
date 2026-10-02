import { getStoredArray, setStored } from './storage'

export function getTrainings() {
  return getStoredArray('trainings')
}

export function addTraining(training) {
  const trainings = getTrainings()

  const updatedTrainings = [...trainings, training]

  setStored('trainings', updatedTrainings)

  return updatedTrainings
}

export function updateTraining(updatedTraining) {
  const trainings = getTrainings()

  const updatedTrainings = trainings.map((training) =>
    training.id === updatedTraining.id ? updatedTraining : training
  )

  setStored('trainings', updatedTrainings)

  return updatedTrainings
}

export function deleteTraining(id) {
  const trainings = getTrainings()

  const updatedTrainings = trainings.filter((training) => training.id !== id)

  setStored('trainings', updatedTrainings)

  /*
   * Remove também os dados dependentes do treinamento.
   *
   * Os conteúdos ficam dentro do próprio treinamento, mas
   * participantes, avaliações e certificados possuem seus
   * próprios registros no localStorage.
   */
  const participants = getStoredArray('trainingParticipants')
  const updatedParticipants = participants.filter(
    (participant) => Number(participant.trainingId) !== Number(id)
  )

  setStored('trainingParticipants', updatedParticipants)

  const assessments = getStoredArray('trainingAssessments')
  const updatedAssessments = assessments.filter(
    (assessment) => Number(assessment.trainingId) !== Number(id)
  )

  setStored('trainingAssessments', updatedAssessments)

  const certificates = getStoredArray('trainingCertificates')
  const updatedCertificates = certificates.filter(
    (certificate) => Number(certificate.trainingId) !== Number(id)
  )

  setStored('trainingCertificates', updatedCertificates)

  return updatedTrainings
}
