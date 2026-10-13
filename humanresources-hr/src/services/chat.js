import { apiRequest } from './api'

export function getChatDirectory(filters = {}) {
  const params = new URLSearchParams()

  if (filters.search) params.set('search', filters.search)
  if (filters.branchId) params.set('branchId', filters.branchId)
  if (filters.departmentId) params.set('departmentId', filters.departmentId)

  const query = params.toString()
  return apiRequest(`/chat/directory${query ? `?${query}` : ''}`)
}

export function getChatConversations() {
  return apiRequest('/chat/conversations')
}

export function createChatConversation(payload) {
  return apiRequest('/chat/conversations', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function getChatMessages(conversationId) {
  return apiRequest(`/chat/conversations/${conversationId}/messages`)
}

export function sendChatMessage(conversationId, body) {
  return apiRequest(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body })
  })
}

export function updateChatStatus(conversationId, status, assignedTo = null) {
  return apiRequest(`/chat/conversations/${conversationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, assignedTo })
  })
}
