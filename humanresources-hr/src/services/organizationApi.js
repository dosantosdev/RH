import { apiRequest } from './api'

const root = '/organization'

export const listBranches = () => apiRequest(`${root}/branches`)
export const createBranch = (data) => apiRequest(`${root}/branches`, { method: 'POST', body: JSON.stringify(data) })
export const updateBranch = (id, data) => apiRequest(`${root}/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteBranch = (id) => apiRequest(`${root}/branches/${id}`, { method: 'DELETE' })

export const listDepartments = () => apiRequest(`${root}/departments`)
export const createDepartment = (data) => apiRequest(`${root}/departments`, { method: 'POST', body: JSON.stringify(data) })
export const updateDepartment = (id, data) => apiRequest(`${root}/departments/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteDepartment = (id) => apiRequest(`${root}/departments/${id}`, { method: 'DELETE' })

export const listProfessionalRoles = () => apiRequest(`${root}/roles`)
export const createProfessionalRole = (data) => apiRequest(`${root}/roles`, { method: 'POST', body: JSON.stringify(data) })
export const updateProfessionalRole = (id, data) => apiRequest(`${root}/roles/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteProfessionalRole = (id) => apiRequest(`${root}/roles/${id}`, { method: 'DELETE' })
