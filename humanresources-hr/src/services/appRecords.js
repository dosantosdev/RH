import { apiRequest } from './api'

const MODULE_KEY = /^[a-z][a-z0-9_-]{0,79}$/
const RECORD_KEY = /^[^\s]{1,180}$/

/**
 * Persistência JSONB no PostgreSQL para dados ainda em processo de
 * migração para tabelas relacionais específicas.
 *
 * Os módulos finais devem preferir suas rotas/tabelas de domínio quando
 * elas existirem. O escopo da empresa é sempre resolvido pelo backend.
 */
export async function listAppRecords(moduleKey) {
  if (!MODULE_KEY.test(moduleKey || '')) throw new Error('Módulo inválido.')
  return apiRequest(`/app-records/${encodeURIComponent(moduleKey)}`)
}

export async function getAppRecord(moduleKey, recordKey) {
  if (!MODULE_KEY.test(moduleKey || '') || !RECORD_KEY.test(recordKey || '')) {
    throw new Error('Identificador inválido.')
  }
  const result = await apiRequest(
    `/app-records/${encodeURIComponent(moduleKey)}/${encodeURIComponent(recordKey)}`
  )
  return result.payload
}

export async function saveAppRecord(moduleKey, recordKey, payload) {
  if (!MODULE_KEY.test(moduleKey || '') || !RECORD_KEY.test(recordKey || '')) {
    throw new Error('Identificador inválido.')
  }
  const result = await apiRequest(
    `/app-records/${encodeURIComponent(moduleKey)}/${encodeURIComponent(recordKey)}`,
    { method: 'PUT', body: JSON.stringify({ payload }) }
  )
  return result.payload
}

export async function deleteAppRecord(moduleKey, recordKey) {
  if (!MODULE_KEY.test(moduleKey || '') || !RECORD_KEY.test(recordKey || '')) {
    throw new Error('Identificador inválido.')
  }
  return apiRequest(
    `/app-records/${encodeURIComponent(moduleKey)}/${encodeURIComponent(recordKey)}`,
    { method: 'DELETE' }
  )
}
