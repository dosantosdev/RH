import { getStoredArray, setStored } from './storage'

export function getTrainingAssessments() {
  return getStoredArray('trainingAssessments')
}

export function addTrainingAssessment(assessment) {
  const assessments = getTrainingAssessments()

  const updatedAssessments = [...assessments, assessment]

  setStored('trainingAssessments', updatedAssessments)

  return updatedAssessments
}

export function updateTrainingAssessment(updatedAssessment) {
  const assessments = getTrainingAssessments()

  const updatedAssessments = assessments.map((assessment) =>
    assessment.id === updatedAssessment.id ? updatedAssessment : assessment
  )

  setStored('trainingAssessments', updatedAssessments)

  return updatedAssessments
}

export function deleteTrainingAssessment(id) {
  const assessments = getTrainingAssessments()

  const updatedAssessments = assessments.filter(
    (assessment) => assessment.id !== id
  )

  setStored('trainingAssessments', updatedAssessments)

  return updatedAssessments
}
