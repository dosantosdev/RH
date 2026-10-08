const DEFAULT_API_URL = 'http://localhost:3333/api'

export const API_URL = (
  import.meta.env.VITE_API_URL || DEFAULT_API_URL
).replace(/\/$/, '')

export const API_TIMEOUT_MS = Number(
  import.meta.env.VITE_API_TIMEOUT_MS || 15000
)
