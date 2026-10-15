import { apiRequest } from './api'
import { setStored, getStoredArray } from './storage'

const root = '/organization'

const CACHE_KEYS = {
  branches: 'branches',
  departments: 'departments',
  roles: 'roles',
  positions: 'positions'
}

function normalizeRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((row) => ({
    ...row,
    id: String(row.id),
    ...(row.branchId != null ? { branchId: String(row.branchId) } : {}),
    ...(row.departmentId != null ? { departmentId: String(row.departmentId) } : {}),
    ...(row.cargoId != null ? { cargoId: String(row.cargoId) } : {}),
    ...(row.parentPositionId != null ? { parentPositionId: String(row.parentPositionId) } : {}),
    ...(row.employeeId != null ? { employeeId: String(row.employeeId) } : {}),
    active: row.active !== false && row.status !== 'inactive'
  }))
}

function updateCache(key, rows) {
  const normalized = normalizeRows(rows)
  setStored(CACHE_KEYS[key], normalized)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hr:organization-cache-updated', { detail: { key } }))
  }
  return normalized
}

async function listEntity(path, cacheKey) {
  const rows = await apiRequest(`${root}/${path}`)
  return updateCache(cacheKey, rows)
}

async function createEntity(path, cacheKey, data) {
  const saved = await apiRequest(`${root}/${path}`, { method: 'POST', body: JSON.stringify(data) })
  const current = getStoredArray(CACHE_KEYS[cacheKey])
  updateCache(cacheKey, [...current.filter((item) => String(item.id) !== String(saved.id)), saved])
  return saved
}

async function updateEntity(path, cacheKey, id, data) {
  const saved = await apiRequest(`${root}/${path}/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) })
  const current = getStoredArray(CACHE_KEYS[cacheKey])
  updateCache(cacheKey, current.map((item) => String(item.id) === String(id) ? saved : item))
  return saved
}

async function deleteEntity(path, cacheKey, id) {
  await apiRequest(`${root}/${path}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const current = getStoredArray(CACHE_KEYS[cacheKey])
  updateCache(cacheKey, current.filter((item) => String(item.id) !== String(id)))
}

export const listBranches = () => listEntity('branches', 'branches')
export const createBranch = (data) => createEntity('branches', 'branches', data)
export const updateBranch = (id, data) => updateEntity('branches', 'branches', id, data)
export const deleteBranch = (id) => deleteEntity('branches', 'branches', id)

export const listDepartments = () => listEntity('departments', 'departments')
export const createDepartment = (data) => createEntity('departments', 'departments', data)
export const updateDepartment = (id, data) => updateEntity('departments', 'departments', id, data)
export const deleteDepartment = (id) => deleteEntity('departments', 'departments', id)

export const listProfessionalRoles = () => listEntity('roles', 'roles')
export const createProfessionalRole = (data) => createEntity('roles', 'roles', data)
export const updateProfessionalRole = (id, data) => updateEntity('roles', 'roles', id, data)
export const deleteProfessionalRole = (id) => deleteEntity('roles', 'roles', id)

/** Atualiza o cache de compatibilidade a partir das APIs de domínio. */
export async function syncOrganizationCatalogsWithPostgres() {
  const tasks = [
    ['branches', listBranches],
    ['departments', listDepartments],
    ['roles', listProfessionalRoles],
    ['positions', async () => {
      const rows = await apiRequest(`${root}/positions`)
      return updateCache('positions', rows)
    }]
  ]
  const results = await Promise.allSettled(tasks.map(([, load]) => load()))
  return {
    synced: results.filter((result) => result.status === 'fulfilled').length,
    skipped: false,
    errors: results.filter((result) => result.status === 'rejected').map((result, index) => ({
      catalog: tasks[index]?.[0],
      message: result.reason?.message || 'Falha ao sincronizar catálogo'
    }))
  }
}
