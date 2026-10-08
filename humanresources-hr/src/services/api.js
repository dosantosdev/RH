import { API_URL, API_TIMEOUT_MS } from '../config/api'

const TOKEN_KEY = 'hr_api_token'
const USER_KEY = 'hr_api_user'

export function getApiToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setApiSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getApiUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function clearApiSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function apiRequest(path, options = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    API_TIMEOUT_MS
  )

  const token = getApiToken()
  const headers = new Headers(options.headers || {})

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      const error = new Error(
        data?.message || 'Não foi possível concluir a requisição.'
      )

      error.status = response.status
      error.data = data

      throw error
    }

    return data
  } finally {
    clearTimeout(timeout)
  }
}

export async function apiLogin(username, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })

  setApiSession(result)

  return result
}

export async function apiHealth() {
  return apiRequest('/health')
}
