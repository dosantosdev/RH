import { apiRequest } from './api'

export function fetchUsers() {
  return apiRequest('/users')
}

export function fetchUserAccessRoles() {
  return apiRequest('/users/access-roles')
}

export function createApiUser(user) {
  return apiRequest('/users', {
    method: 'POST',
    body: JSON.stringify(user)
  })
}

export function updateApiUser(id, user) {
  return apiRequest(`/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(user)
  })
}

export function deactivateApiUser(id) {
  return apiRequest(`/users/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  })
}
