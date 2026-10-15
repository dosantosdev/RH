import { apiRequest, getApiToken } from './api'

/*
 * Cache local compatível com a API atual do projeto.
 *
 * As funções getStoredArray/getStoredObject continuam síncronas porque
 * dezenas de componentes existentes dependem desse contrato. Após login,
 * syncLocalStorageWithPostgres hidrata o cache a partir do PostgreSQL e
 * setStored/removeStored espelham as alterações na API.
 *
 * Não sincronizamos credenciais, sessão, usuários nem chaves de autenticação.
 * Esses dados pertencem às rotas específicas de autenticação/usuários.
 */
const DB_MODULE = 'client_state'
const TRAINING_DB_MODULE = 'trainings'
const TRAINING_STORAGE_KEYS = new Set([
  'trainings',
  'trainingParticipants',
  'trainingAssessments',
  'trainingCertificates'
])

// Avaliações têm um módulo próprio no PostgreSQL, separado do estado geral.
const EVALUATION_DB_MODULE = 'evaluations'
// O Ponto passa a ter módulos de persistência separados por domínio.
// A leitura do módulo legado `timekeeping` continua habilitada na migração
// inicial, para que registros já gravados não sejam perdidos.
const LEGACY_TIMEKEEPING_DB_MODULE = 'timekeeping'
const TIMEKEEPING_MODULES = [
  { dbModule: 'timekeeping_clock', keys: ['timeClockRecords'] },
  { dbModule: 'timekeeping_bank_hours', keys: ['bankHoursEntries'] },
  { dbModule: 'timekeeping_schedules', keys: ['workSchedules', 'employeeWorkSchedules'] },
  { dbModule: 'timekeeping_closings', keys: ['monthlyClosings'] },
  { dbModule: 'timekeeping_medical', keys: ['medicalCertificates'] }
]
const TIMEKEEPING_KEY_TO_MODULE = new Map(
  TIMEKEEPING_MODULES.flatMap((module) => module.keys.map((key) => [key, module.dbModule]))
)
const RECRUITMENT_DB_MODULE = 'recruitment'
const FINANCIAL_MODULES = {
  salaries: {
    dbModule: 'salaries',
    viewPermission: 'finance_salary_view',
    managePermission: 'finance_salary_manage',
    keys: ['salaryHistory']
  },
  payroll: {
    dbModule: 'payroll',
    viewPermission: 'finance_payroll_view',
    managePermission: 'finance_payroll_manage',
    keys: ['payrolls']
  },
  financialEvents: {
    dbModule: 'financial_events',
    viewPermission: 'finance_events_view',
    managePermission: 'finance_events_manage',
    keys: ['financialEvents']
  },
  financialAdvanced: {
    dbModule: 'financial_advanced',
    viewPermission: 'finance_advanced_view',
    managePermission: 'finance_advanced_manage',
    keys: ['financialVacations', 'financialThirteenths', 'financialTerminations']
  }
}
const FINANCIAL_KEY_TO_MODULE = new Map(
  Object.values(FINANCIAL_MODULES).flatMap((module) =>
    module.keys.map((key) => [key, module.dbModule])
  )
)
const FINANCIAL_STORAGE_KEYS = new Set(FINANCIAL_KEY_TO_MODULE.keys())
const EVALUATION_STORAGE_KEYS = new Set([
  'evaluations',
  'evaluationModels',
  'evaluationWorkflows'
])

// Chaves usadas pelas abas de Ponto, Jornadas, Banco de Horas e Fechamento.
// São armazenadas em um módulo próprio para não misturar esses dados ao estado geral.
const TIMEKEEPING_STORAGE_KEYS = new Set([
  'timeClockRecords',
  'bankHoursEntries',
  'workSchedules',
  'employeeWorkSchedules',
  'monthlyClosings',
  'medicalCertificates'
])

// Recrutamento: listas operacionais sincronizadas em módulo próprio.
// Links públicos ficam fora desta lista porque contêm tokens de acesso.
const RECRUITMENT_STORAGE_KEYS = new Set([
  'recruitmentVacancies',
  'recruitmentCandidates',
  'recruitmentStages',
  'recruitmentInterviews'
])

function isDedicatedModuleKey(key) {
  return TRAINING_STORAGE_KEYS.has(key) || EVALUATION_STORAGE_KEYS.has(key) || TIMEKEEPING_STORAGE_KEYS.has(key) || RECRUITMENT_STORAGE_KEYS.has(key) || FINANCIAL_STORAGE_KEYS.has(key)
}

function getDatabaseModuleForKey(key) {
  if (TRAINING_STORAGE_KEYS.has(key)) return TRAINING_DB_MODULE
  if (EVALUATION_STORAGE_KEYS.has(key)) return EVALUATION_DB_MODULE
  if (TIMEKEEPING_KEY_TO_MODULE.has(key)) return TIMEKEEPING_KEY_TO_MODULE.get(key)
  if (RECRUITMENT_STORAGE_KEYS.has(key)) return RECRUITMENT_DB_MODULE
  if (FINANCIAL_KEY_TO_MODULE.has(key)) return FINANCIAL_KEY_TO_MODULE.get(key)
  return DB_MODULE
}

function getLoggedUserForSync() {
  try {
    return JSON.parse(localStorage.getItem('loggedUser') || 'null')
  } catch {
    return null
  }
}

function userHasAnyPermission(permissions = []) {
  const user = getLoggedUserForSync()
  if (user?.isAdmin === true) return true
  return Array.isArray(user?.permissions) && permissions.some((permission) => user.permissions.includes(permission))
}

const TIMEKEEPING_MODULE_PERMISSIONS = {
  timekeeping: {
    view: ['ponto_controle_view', 'ponto_controle_edit'],
    manage: ['ponto_controle_edit']
  },
  timekeeping_clock: {
    view: ['ponto_controle_view', 'ponto_controle_edit'],
    manage: ['ponto_controle_edit']
  },
  timekeeping_bank_hours: {
    view: ['ponto_banco_horas_view', 'ponto_banco_horas_manage'],
    manage: ['ponto_banco_horas_manage']
  },
  timekeeping_schedules: {
    view: ['ponto_jornadas_view', 'ponto_jornadas_create', 'ponto_jornadas_edit', 'ponto_jornadas_delete'],
    manage: ['ponto_jornadas_create', 'ponto_jornadas_edit', 'ponto_jornadas_delete']
  },
  timekeeping_closings: {
    view: ['ponto_fechamento_view', 'ponto_fechamento_manage'],
    manage: ['ponto_fechamento_manage']
  },
  timekeeping_medical: {
    view: ['ponto_atestados_view', 'ponto_atestados_manage'],
    manage: ['ponto_atestados_manage']
  }
}

function userCanViewModule(moduleKey) {
  if (moduleKey === 'trainings') return userHasAnyPermission(['trainings_view'])
  if (moduleKey === 'evaluations') return userHasAnyPermission(['evaluations_view'])
  if (TIMEKEEPING_MODULE_PERMISSIONS[moduleKey]) {
    return userHasAnyPermission(TIMEKEEPING_MODULE_PERMISSIONS[moduleKey].view)
  }
  if (moduleKey === 'recruitment') return userHasAnyPermission(['recruitment_view'])
  const financialModule = Object.values(FINANCIAL_MODULES).find((module) => module.dbModule === moduleKey)
  return financialModule ? userHasAnyPermission([financialModule.viewPermission, financialModule.managePermission]) : true
}

function userCanManageModule(moduleKey) {
  if (moduleKey === 'trainings') return userHasAnyPermission(['trainings_create', 'trainings_edit', 'trainings_delete'])
  if (moduleKey === 'evaluations') return userHasAnyPermission(['evaluations_create', 'evaluations_edit', 'evaluations_delete'])
  if (TIMEKEEPING_MODULE_PERMISSIONS[moduleKey]) {
    return userHasAnyPermission(TIMEKEEPING_MODULE_PERMISSIONS[moduleKey].manage)
  }
  if (moduleKey === 'recruitment') return userHasAnyPermission(['recruitment_create', 'recruitment_edit', 'recruitment_delete'])
  const financialModule = Object.values(FINANCIAL_MODULES).find((module) => module.dbModule === moduleKey)
  return financialModule ? userHasAnyPermission([financialModule.managePermission]) : true
}

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
  'roles',
  'accessRoles',
  // Dados que já possuem rotas de domínio ou exigem autorização própria.
  'employees',
  'branches',
  'departments',
  'positions',
  // Links de candidatura são capacidades de acesso e permanecem locais até
  // existir um fluxo específico e seguro de persistência desses tokens.
  'recruitmentApplicationLinks'
])
const SENSITIVE_KEY = /password|token|secret|credential|session|auth/i
const pendingWrites = new Map()
let syncPromise = null

function canSyncKey(key) {
  return typeof key === 'string' &&
    !isDedicatedModuleKey(key) &&
    key.length > 0 &&
    key.length <= 180 &&
    !/\s/.test(key) &&
    !EXCLUDED_KEYS.has(key) &&
    !SENSITIVE_KEY.test(key)
}

function sanitizePayload(value) {
  if (Array.isArray(value)) return value.map(sanitizePayload)
  if (!value || typeof value !== 'object') return value

  const clean = {}
  for (const [field, child] of Object.entries(value)) {
    if (!/^(password|password_hash|token|accessToken|refreshToken|secret|apiKey|authorization)$/i.test(field)) {
      clean[field] = sanitizePayload(child)
    }
  }
  return clean
}

function scheduleDatabaseWrite(key, value) {
  if (!getApiToken() || (!canSyncKey(key) && !isDedicatedModuleKey(key))) return
  const moduleKey = getDatabaseModuleForKey(key)
  if (isDedicatedModuleKey(key) && !userCanManageModule(moduleKey)) return

  // Coalesces repeated state updates for the same key.
  if (pendingWrites.has(key)) clearTimeout(pendingWrites.get(key))
  const timer = setTimeout(async () => {
    pendingWrites.delete(key)
    try {
      await apiRequest(`/app-records/${getDatabaseModuleForKey(key)}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ payload: sanitizePayload(value) })
      })
    } catch (error) {
      console.error(
        `[PostgreSQL] Não foi possível sincronizar "${key}". Os dados permanecem no cache local.`,
        error
      )
    }
  }, 250)
  pendingWrites.set(key, timer)
}

/*
 * Também observa gravações diretas em localStorage feitas por serviços
 * legados que ainda não usam setStored. Assim a ponte cobre abas que utilizam
 * Storage.setItem/removeItem diretamente, sem alterar a API síncrona da UI.
 */
function installStorageWriteBridge() {
  if (typeof window === 'undefined' || typeof Storage === 'undefined') return
  if (window.__hrPostgresStorageBridgeInstalled) return

  const originalSetItem = Storage.prototype.setItem
  const originalRemoveItem = Storage.prototype.removeItem

  Storage.prototype.setItem = function bridgedSetItem(key, value) {
    originalSetItem.call(this, key, value)
    if (this === window.localStorage && (canSyncKey(String(key)) || isDedicatedModuleKey(String(key)))) {
      try {
        scheduleDatabaseWrite(String(key), JSON.parse(String(value)))
      } catch {
        // Dados não JSON permanecem locais e não são enviados à API.
      }
    }
  }

  Storage.prototype.removeItem = function bridgedRemoveItem(key) {
    originalRemoveItem.call(this, key)
    if (this === window.localStorage && getApiToken() && (canSyncKey(String(key)) || isDedicatedModuleKey(String(key)))) {
      const moduleKey = getDatabaseModuleForKey(String(key))
      if (isDedicatedModuleKey(String(key)) && !userCanManageModule(moduleKey)) return
      apiRequest(`/app-records/${getDatabaseModuleForKey(String(key))}/${encodeURIComponent(String(key))}`, {
        method: 'DELETE'
      }).catch((error) => {
        if (error.status !== 404) {
          console.error(`[PostgreSQL] Não foi possível remover "${key}".`, error)
        }
      })
    }
  }

  window.__hrPostgresStorageBridgeInstalled = true
}

installStorageWriteBridge()

export function getStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function getStoredObject(key, fallback = null) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

export function setStored(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function removeStored(key) {
  localStorage.removeItem(key)
}

/**
 * Sincroniza o módulo Treinamentos como um conjunto separado no PostgreSQL.
 *
 * Cada lista legada (treinamentos, participantes, avaliações e certificados)
 * é mantida em uma chave própria dentro do módulo `trainings`. O localStorage
 * permanece apenas como cache compatível com os componentes síncronos atuais.
 * Na primeira sincronização, dados já existentes no banco prevalecem; chaves
 * que só existam localmente são importadas sem apagar nada.
 */
export async function syncTrainingDataWithPostgres() {
  if (!getApiToken() || !userCanViewModule(TRAINING_DB_MODULE)) return { synced: 0, skipped: true }

  const keys = [...TRAINING_STORAGE_KEYS]
  const response = await apiRequest(`/app-records/${TRAINING_DB_MODULE}`)
  const remoteRecords = Array.isArray(response) ? response : []
  const remoteByKey = new Map(remoteRecords.map((record) => [record.recordKey, record]))
  let synced = 0

  for (const key of keys) {
    const remote = remoteByKey.get(key)
    if (remote) {
      // O banco é a referência quando já existe uma versão persistida.
      localStorage.setItem(key, JSON.stringify(remote.payload))
      synced += 1
      continue
    }

    const raw = localStorage.getItem(key)
    if (raw === null) continue

    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      continue
    }

    await apiRequest(`/app-records/${TRAINING_DB_MODULE}/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ payload: sanitizePayload(payload) })
    })
    synced += 1
  }

  return { synced, skipped: false }
}

/**
 * Sincroniza as listas da aba Avaliações com o módulo dedicado no PostgreSQL.
 * O localStorage continua como cache temporário para manter a compatibilidade
 * dos componentes síncronos. Se a chave existir no banco, ela prevalece; caso
 * contrário, os dados locais são importados sem remoção automática.
 */
export async function syncEvaluationDataWithPostgres() {
  if (!getApiToken() || !userCanViewModule(EVALUATION_DB_MODULE)) return { synced: 0, skipped: true }

  const keys = [...EVALUATION_STORAGE_KEYS]
  const response = await apiRequest(`/app-records/${EVALUATION_DB_MODULE}`)
  const remoteRecords = Array.isArray(response) ? response : []
  const remoteByKey = new Map(remoteRecords.map((record) => [record.recordKey, record]))
  let synced = 0

  for (const key of keys) {
    const remote = remoteByKey.get(key)
    if (remote) {
      localStorage.setItem(key, JSON.stringify(remote.payload))
      synced += 1
      continue
    }

    const raw = localStorage.getItem(key)
    if (raw === null) continue

    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      continue
    }

    await apiRequest(`/app-records/${EVALUATION_DB_MODULE}/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ payload: sanitizePayload(payload) })
    })
    synced += 1
  }

  return { synced, skipped: false }
}

/**
 * Sincroniza as listas da aba Ponto com o módulo dedicado `timekeeping` no
 * PostgreSQL. O cache local é mantido por compatibilidade com as telas atuais.
 * Registros existentes no banco prevalecem; chaves locais ausentes no banco são
 * importadas sem apagar dados automaticamente.
 */
export async function syncTimekeepingDataWithPostgres() {
  if (!getApiToken() || !userCanViewModule('timekeeping_clock')) {
    return { synced: 0, skipped: true }
  }

  // Busca o agregado antigo uma única vez para fazer a transição sem apagar
  // registros. Quando o módulo novo já possui a chave, ele sempre prevalece.
  const legacyResponse = await apiRequest(`/app-records/${LEGACY_TIMEKEEPING_DB_MODULE}`)
  const legacyRecords = Array.isArray(legacyResponse) ? legacyResponse : []
  const legacyByKey = new Map(legacyRecords.map((record) => [record.recordKey, record]))
  let synced = 0

  for (const module of TIMEKEEPING_MODULES) {
    const response = await apiRequest(`/app-records/${module.dbModule}`)
    const remoteRecords = Array.isArray(response) ? response : []
    const remoteByKey = new Map(remoteRecords.map((record) => [record.recordKey, record]))

    for (const key of module.keys) {
      const remote = remoteByKey.get(key)
      if (remote) {
        localStorage.setItem(key, JSON.stringify(remote.payload))
        synced += 1
        continue
      }

      // Migração idempotente do registro antigo para seu módulo específico.
      const legacy = legacyByKey.get(key)
      if (legacy) {
        await apiRequest(`/app-records/${module.dbModule}/${encodeURIComponent(key)}`, {
          method: 'PUT',
          body: JSON.stringify({ payload: sanitizePayload(legacy.payload) })
        })
        localStorage.setItem(key, JSON.stringify(legacy.payload))
        synced += 1
        continue
      }

      const raw = localStorage.getItem(key)
      if (raw === null) continue

      let payload
      try {
        payload = JSON.parse(raw)
      } catch {
        continue
      }

      await apiRequest(`/app-records/${module.dbModule}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ payload: sanitizePayload(payload) })
      })
      synced += 1
    }
  }

  return { synced, skipped: false }
}

/**
 * Sincroniza as listas da aba Recrutamento com o módulo dedicado no PostgreSQL.
 * O localStorage permanece como cache temporário para compatibilidade com as
 * telas síncronas. O banco prevalece quando já existe a chave; dados somente
 * locais são enviados sem apagar o original. Links públicos ficam de fora,
 * pois carregam tokens de acesso que precisam de tratamento específico.
 */
export async function syncRecruitmentDataWithPostgres() {
  if (!getApiToken() || !userCanViewModule(RECRUITMENT_DB_MODULE)) return { synced: 0, skipped: true }

  const keys = [...RECRUITMENT_STORAGE_KEYS]
  const response = await apiRequest(`/app-records/${RECRUITMENT_DB_MODULE}`)
  const remoteRecords = Array.isArray(response) ? response : []
  const remoteByKey = new Map(remoteRecords.map((record) => [record.recordKey, record]))
  let synced = 0

  for (const key of keys) {
    const remote = remoteByKey.get(key)
    if (remote) {
      localStorage.setItem(key, JSON.stringify(remote.payload))
      synced += 1
      continue
    }

    const raw = localStorage.getItem(key)
    if (raw === null) continue

    let payload
    try {
      payload = JSON.parse(raw)
    } catch {
      continue
    }

    if (new Blob([JSON.stringify(payload)]).size > 200 * 1024) {
      console.warn(`[PostgreSQL] A chave "${key}" excede 200 KB e não foi sincronizada.`)
      continue
    }

    await apiRequest(`/app-records/${RECRUITMENT_DB_MODULE}/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ payload: sanitizePayload(payload) })
    })
    synced += 1
  }

  return { synced, skipped: false }
}

/**
 * Sincroniza os dados do Financeiro em módulos separados e protegidos por
 * permissões no backend. Usuários com acesso somente de leitura recebem os
 * dados do PostgreSQL, mas nunca enviam alterações locais.
 */
export async function syncFinancialDataWithPostgres() {
  if (!getApiToken()) return { synced: 0, skipped: true }

  const user = getLoggedUserForSync()
  let synced = 0

  for (const module of Object.values(FINANCIAL_MODULES)) {
    const canView = user?.isAdmin === true || (
      Array.isArray(user?.permissions) && (
        user.permissions.includes(module.viewPermission) ||
        user.permissions.includes(module.managePermission)
      )
    )
    if (!canView) continue

    const response = await apiRequest(`/app-records/${module.dbModule}`)
    const remoteRecords = Array.isArray(response) ? response : []
    const remoteByKey = new Map(remoteRecords.map((record) => [record.recordKey, record]))
    const canManage = user?.isAdmin === true || (
      Array.isArray(user?.permissions) && user.permissions.includes(module.managePermission)
    )

    for (const key of module.keys) {
      const remote = remoteByKey.get(key)
      if (remote) {
        localStorage.setItem(key, JSON.stringify(remote.payload))
        synced += 1
        continue
      }

      if (!canManage) continue
      const raw = localStorage.getItem(key)
      if (raw === null) continue

      let payload
      try {
        payload = JSON.parse(raw)
      } catch {
        continue
      }

      if (new Blob([JSON.stringify(payload)]).size > 200 * 1024) {
        console.warn(`[PostgreSQL] A chave financeira "${key}" excede 200 KB e não foi sincronizada.`)
        continue
      }

      await apiRequest(`/app-records/${module.dbModule}/${encodeURIComponent(key)}`, {
        method: 'PUT',
        body: JSON.stringify({ payload: sanitizePayload(payload) })
      })
      synced += 1
    }
  }

  return { synced, skipped: false }
}

/**
 * Sincroniza as chaves de dados compatíveis com a API após autenticação.
 * O banco vence quando já possui a chave; chaves apenas locais são enviadas
 * para o banco. Nenhum dado local é apagado. Repetições são idempotentes.
 */
export function syncLocalStorageWithPostgres() {
  if (!getApiToken()) return Promise.resolve({ synced: 0, skipped: true })
  if (syncPromise) return syncPromise

  syncPromise = (async () => {
    const response = await apiRequest(`/app-records/${DB_MODULE}`)
    const remoteRecords = Array.isArray(response) ? response : []
    const remoteKeys = new Set(remoteRecords.map((record) => record.recordKey))
    let synced = 0

    for (const record of remoteRecords) {
      if (!canSyncKey(record.recordKey)) continue
      localStorage.setItem(record.recordKey, JSON.stringify(record.payload))
      synced += 1
    }

    const localRecords = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key || !canSyncKey(key) || remoteKeys.has(key)) continue

      try {
        const raw = localStorage.getItem(key)
        if (raw === null) continue
        const payload = JSON.parse(raw)
        if (new Blob([JSON.stringify(payload)]).size > 200 * 1024) continue
        localRecords.push({ key, payload })
      } catch {
        // Valores locais não JSON não são enviados por este mecanismo.
      }
    }

    for (const record of localRecords) {
      await apiRequest(`/app-records/${DB_MODULE}/${encodeURIComponent(record.key)}`, {
        method: 'PUT',
        body: JSON.stringify({ payload: sanitizePayload(record.payload) })
      })
      synced += 1
    }

    return { synced, skipped: false }
  })().finally(() => {
    syncPromise = null
  })

  return syncPromise
}
