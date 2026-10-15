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


/**
 * Atualiza os dados públicos do usuário na sessão local da API.
 * O token de autenticação é preservado e nenhum dado de senha é armazenado.
 */
export function updateApiSessionUser(updates) {
  const currentUser = getApiUser()
  if (!currentUser || !updates || typeof updates !== 'object') return null

  const updatedUser = { ...currentUser, ...updates }
  localStorage.setItem(USER_KEY, JSON.stringify(updatedUser))
  return updatedUser
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


/**
 * Baixa um arquivo protegido pela sessão da API.
 * A rota de documentos pode retornar um binário (PostgreSQL) ou, para
 * documentos legados, um JSON com a URL antiga do Firebase.
 */
export async function apiDownload(path) {
  const token = getApiToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  const headers = new Headers()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: 'GET',
      headers,
      signal: controller.signal
    })
    const contentType = response.headers.get('content-type') || ''

    if (!response.ok) {
      let message = 'Não foi possível abrir o documento.'
      if (contentType.includes('application/json')) {
        const body = await response.json()
        message = body?.message || message
      }
      const error = new Error(message)
      error.status = response.status
      throw error
    }

    if (contentType.includes('application/json')) {
      const result = await response.json()
      if (result?.url) return { legacyUrl: result.url, fileName: result.fileName || 'documento' }
      throw new Error(result?.message || 'O servidor não retornou o conteúdo do documento.')
    }

    const blob = await response.blob()
    const disposition = response.headers.get('content-disposition') || ''
    let fileName = 'documento'
    const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)
    const plainName = disposition.match(/filename="([^"]+)"/i)
    if (encodedName?.[1]) {
      try { fileName = decodeURIComponent(encodedName[1]) } catch { fileName = encodedName[1] }
    } else if (plainName?.[1]) {
      fileName = plainName[1]
    }
    return { blob, fileName }
  } finally {
    clearTimeout(timeout)
  }
}

/** Abre o documento obtido pela API em outra aba. */
export async function openApiDocument(path) {
  const result = await apiDownload(path)
  if (result.legacyUrl) {
    window.open(result.legacyUrl, '_blank', 'noopener,noreferrer')
    return
  }

  const objectUrl = URL.createObjectURL(result.blob)
  const opened = window.open(objectUrl, '_blank', 'noopener,noreferrer')
  if (!opened) {
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = result.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
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
