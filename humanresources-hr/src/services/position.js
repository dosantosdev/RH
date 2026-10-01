import { getStoredArray, setStored } from './storage'

export function getPositions() {
  return getStoredArray('positions')
}

export function addPosition(position) {
  const positions = getPositions()

  const updatedPositions = [...positions, position]

  setStored('positions', updatedPositions)

  return updatedPositions
}

export function updatePosition(updatedPosition) {
  const positions = getPositions()

  const updatedPositions = positions.map((position) =>
    position.id === updatedPosition.id ? updatedPosition : position
  )

  setStored('positions', updatedPositions)

  return updatedPositions
}

export function deletePosition(id) {
  const positions = getPositions()

  const updatedPositions = positions.filter((position) => position.id !== id)

  setStored('positions', updatedPositions)

  return updatedPositions
}
