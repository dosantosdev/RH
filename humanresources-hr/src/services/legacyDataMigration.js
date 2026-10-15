import { apiRequest } from './api'

/*
 * Dados de sessão e credenciais nunca são enviados por esta importação.
 * Usuários devem ser migrados pela rotina específica de autenticação/usuários,
 * que aplica hash de senha e valida o vínculo com a empresa.
 */
const EXCLUDED_KEYS = new Set([
  'hr_api_token',
  'hr_api_user',
  'loggedUser',
  'currentUser',
  'users',
  'password',
  'passwords',
  'session',
  'token',
])

const SENSITIVE_FIELD = /^(password|password_hash|token|accessToken|refreshToken|secret|apiKey)$/i
const MAX_RECORD_BYTES = 200 * 1024

function safeLegacyValue(value) {
  if (Array.isArray(value)) return value.map(safeLegacyValue)
  if (!value || typeof value !== 'object') return value

  const safe = {}
  for (const [key, child] of Object.entries(value)) {
    if (!SENSITIVE_FIELD.test(key)) safe[key] = safeLegacyValue(child)
  }
  return safe
}

function parseStorageValue(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

/**
 * Faz uma prévia dos itens do localStorage sem enviar nem apagar nada.
 */
export function previewLegacyLocalStorage() {
  const records = []
  const skipped = []

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) continue

    if (EXCLUDED_KEYS.has(key) || /password|token|secret|credential/i.test(key)) {
      skipped.push({ key, reason: 'sessão ou dado sensível excluído' })
      continue
    }

    const value = parseStorageValue(localStorage.getItem(key))
    const payload = safeLegacyValue(value)
    const bytes = new Blob([JSON.stringify(payload)]).size
    if (bytes > MAX_RECORD_BYTES) {
      skipped.push({ key, reason: 'acima do limite de 200 KB; exporte e trate separadamente' })
      continue
    }

    records.push({
      moduleKey: 'legacy',
      recordKey: key,
      payload
    })
  }

  return { records, skipped, total: records.length }
}

/**
 * Envia os dados selecionados em lotes, com confirmação explícita no chamador.
 * Não limpa o localStorage. O backend faz upsert idempotente por chave.
 */
export async function migrateLegacyLocalStorageToPostgres({ confirm = false } = {}) {
  if (confirm !== true) {
    throw new Error('Confirme explicitamente a importação antes de executá-la.')
  }

  const { records, skipped } = previewLegacyLocalStorage()
  let imported = 0

  for (let index = 0; index < records.length; index += 500) {
    const batch = records.slice(index, index + 500)
    const result = await apiRequest('/app-records/legacy-import', {
      method: 'POST',
      body: JSON.stringify({ records: batch })
    })
    imported += result.imported || 0
  }

  return {
    imported,
    skipped,
    message: 'Importação concluída. Os dados locais foram preservados.'
  }
}
