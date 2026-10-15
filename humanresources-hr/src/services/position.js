import { apiRequest } from './api'

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


/*
 * ============================================================
 * POSIÇÕES DO ORGANOGRAMA — API / POSTGRESQL
 * ============================================================
 *
 * As funções síncronas legadas acima permanecem temporariamente
 * para outras telas ainda não migradas. A tela Organograma usa
 * exclusivamente estas funções assíncronas.
 */

function savePositionsCache(rows) {
  const normalized = rows.map((row) => ({
    ...row,
    id: String(row.id),
    cargoId: row.cargoId ? String(row.cargoId) : '',
    branchId: row.branchId ? String(row.branchId) : '',
    departmentId: row.departmentId ? String(row.departmentId) : '',
    parentPositionId: row.parentPositionId ? String(row.parentPositionId) : '',
    employeeId: row.employeeId ? String(row.employeeId) : '',
    active: row.active !== false && row.status !== 'inactive',
    workload: row.workload ?? '',
    dailyHours: row.dailyHours ?? '',
    workDaysPerWeek: row.workDaysPerWeek ?? '',
    cycleWorkDays: row.cycleWorkDays ?? '',
    cycleRestDays: row.cycleRestDays ?? ''
  }))
  setStored('positions', normalized)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hr:organization-cache-updated', { detail: { key: 'positions' } }))
  }
  return normalized
}

export async function listOrganizationPositions() {
  const rows = await apiRequest('/organization/positions')
  return savePositionsCache(rows)
}

export async function createOrganizationPosition(position) {
  const row = await apiRequest('/organization/positions', {
    method: 'POST',
    body: JSON.stringify(position)
  })
  const current = getPositions()
  savePositionsCache([...current.filter((item) => String(item.id) !== String(row.id)), row])
  return row
}

export async function updateOrganizationPosition(id, position) {
  const row = await apiRequest(`/organization/positions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(position)
  })
  const current = getPositions()
  savePositionsCache(current.map((item) => String(item.id) === String(id) ? row : item))
  return row
}

export async function deleteOrganizationPosition(id) {
  await apiRequest(`/organization/positions/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
  savePositionsCache(getPositions().filter((item) => String(item.id) !== String(id)))
}
