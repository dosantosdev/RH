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

  return updatedTrainings
}
