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
// Domínios com persistência relacional própria: não devem voltar à ponte genérica JSONB.
const NORMALIZED_DOMAIN_KEYS = new Set([
  'financialEvents', 'salaryHistory', 'payrolls',
  'financialVacations', 'financialThirteenths', 'financialTerminations'
])
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

function isNormalizedDomainKey(key) {
  return NORMALIZED_DOMAIN_KEYS.has(key)
}

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
const bridgeSuppressedKeys = new Set()
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
  if (isNormalizedDomainKey(key) || !getApiToken() || (!canSyncKey(key) && !isDedicatedModuleKey(key))) return
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
    if (this === window.localStorage &&
        !bridgeSuppressedKeys.has(String(key)) &&
        (!isNormalizedDomainKey(String(key)) && (canSyncKey(String(key)) || isDedicatedModuleKey(String(key))))) {
      try {
        scheduleDatabaseWrite(String(key), JSON.parse(String(value)))
      } catch {
        // Dados não JSON permanecem locais e não são enviados à API.
      }
    }
  }

  Storage.prototype.removeItem = function bridgedRemoveItem(key) {
    originalRemoveItem.call(this, key)
    if (this === window.localStorage &&
        !bridgeSuppressedKeys.has(String(key)) &&
        getApiToken() &&
        (!isNormalizedDomainKey(String(key)) && (canSyncKey(String(key)) || isDedicatedModuleKey(String(key))))) {
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

/**
 * Executa uma alteração local de cache sem acionar a ponte genérica de
 * gravação. Use apenas quando o domínio já persiste pela própria API dedicada.
 */
export function runWithoutPostgresStorageBridge(key, callback) {
  bridgeSuppressedKeys.add(String(key))
  try {
    return callback()
  } finally {
    bridgeSuppressedKeys.delete(String(key))
  }
}

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

/*
 * Persistência assíncrona das alterações administrativas de Treinamentos.
 *
 * Os serviços antigos mantêm contrato síncrono porque várias telas dependem
 * dele. Por isso, atualizamos primeiro o cache local e enfileiramos a gravação
 * no PostgreSQL. Escritas da mesma chave são serializadas para que uma edição
 * mais recente não seja sobrescrita por uma requisição anterior.
 */
const pendingTrainingWrites = new Map()
const TRAINING_SYNC_ERROR_KEY = 'hr_training_sync_error'
const pendingEvaluationWrites = new Map()
const EVALUATION_SYNC_ERROR_KEY = 'hr_evaluation_sync_error'

function enqueueTrainingWrite(key, value) {
  if (!TRAINING_STORAGE_KEYS.has(key)) return
  if (!getApiToken() || !userCanManageModule(TRAINING_DB_MODULE)) return

  const previousWrite = pendingTrainingWrites.get(key) || Promise.resolve()
  const nextWrite = previousWrite
    .catch(() => {})
    .then(async () => {
      const serialized = JSON.stringify(value)
      if (new Blob([serialized]).size > 256 * 1024) {
        throw new Error(`Os dados de "${key}" excedem o limite de 256 KB da API.`)
      }
      await apiRequest(
        `/app-records/${TRAINING_DB_MODULE}/${encodeURIComponent(key)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ payload: sanitizePayload(value) })
        }
      )
      const storedError = localStorage.getItem(TRAINING_SYNC_ERROR_KEY)
      if (storedError) {
        try {
          if (JSON.parse(storedError)?.key === key) localStorage.removeItem(TRAINING_SYNC_ERROR_KEY)
        } catch {
          localStorage.removeItem(TRAINING_SYNC_ERROR_KEY)
        }
      }
    })
    .catch((error) => {
      const message = error?.message || 'Falha ao sincronizar os dados de treinamentos.'
      localStorage.setItem(TRAINING_SYNC_ERROR_KEY, JSON.stringify({
        key,
        message,
        occurredAt: new Date().toISOString()
      }))
      console.error(`[PostgreSQL] Falha ao salvar "${key}":`, error)
      // A fila resolve para evitar rejeições não tratadas em serviços legados
      // que ainda não aguardam explicitamente a persistência.
    })
    .finally(() => {
      if (pendingTrainingWrites.get(key) === nextWrite) {
        pendingTrainingWrites.delete(key)
      }
    })

  pendingTrainingWrites.set(key, nextWrite)
}

/**
 * Aguarda as gravações de Treinamentos iniciadas pelo cache compatível.
 * As telas administrativas podem chamar esta função antes de confirmar uma
 * operação ao usuário, sem precisar converter todos os serviços legados para
 * async de uma só vez.
 */
export async function flushTrainingDataWrites() {
  const pending = [...pendingTrainingWrites.values()]
  if (!pending.length) {
    const storedError = localStorage.getItem(TRAINING_SYNC_ERROR_KEY)
    if (storedError) {
      let parsedError
      try { parsedError = JSON.parse(storedError) } catch { parsedError = null }
      if (parsedError?.message) throw new Error(parsedError.message)
    }
    return
  }
  await Promise.all(pending)
  const storedError = localStorage.getItem(TRAINING_SYNC_ERROR_KEY)
  if (storedError) {
    let parsedError
    try { parsedError = JSON.parse(storedError) } catch { parsedError = null }
    if (parsedError?.message) throw new Error(parsedError.message)
  }
}


/*
 * As gravações de Avaliações são aguardadas pelas telas administrativas
 * antes de mostrar sucesso. O contrato dos serviços continua síncrono para
 * não quebrar componentes existentes durante a migração.
 */
function enqueueEvaluationWrite(key, value) {
  if (!EVALUATION_STORAGE_KEYS.has(key)) return
  if (!getApiToken() || !userCanManageModule(EVALUATION_DB_MODULE)) return

  const previousWrite = pendingEvaluationWrites.get(key) || Promise.resolve()
  const nextWrite = previousWrite
    .catch(() => {})
    .then(async () => {
      const serialized = JSON.stringify(value)
      if (new Blob([serialized]).size > 256 * 1024) {
        throw new Error(`Os dados de "${key}" excedem o limite de 256 KB da API.`)
      }
      await apiRequest(
        `/app-records/${EVALUATION_DB_MODULE}/${encodeURIComponent(key)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ payload: sanitizePayload(value) })
        }
      )
      const storedError = localStorage.getItem(EVALUATION_SYNC_ERROR_KEY)
      if (storedError) {
        try {
          if (JSON.parse(storedError)?.key === key) localStorage.removeItem(EVALUATION_SYNC_ERROR_KEY)
        } catch {
          localStorage.removeItem(EVALUATION_SYNC_ERROR_KEY)
        }
      }
    })
    .catch((error) => {
      localStorage.setItem(EVALUATION_SYNC_ERROR_KEY, JSON.stringify({
        key,
        message: error?.message || 'Falha ao salvar os dados de avaliações.',
        occurredAt: new Date().toISOString()
      }))
      console.error(`[PostgreSQL] Falha ao salvar "${key}":`, error)
    })
    .finally(() => {
      if (pendingEvaluationWrites.get(key) === nextWrite) {
        pendingEvaluationWrites.delete(key)
      }
    })

  pendingEvaluationWrites.set(key, nextWrite)
}

export async function flushEvaluationDataWrites() {
  const pending = [...pendingEvaluationWrites.values()]
  if (pending.length) await Promise.all(pending)

  const storedError = localStorage.getItem(EVALUATION_SYNC_ERROR_KEY)
  if (storedError) {
    let parsedError
    try { parsedError = JSON.parse(storedError) } catch { parsedError = null }
    if (parsedError?.message) throw new Error(parsedError.message)
  }
}

function enqueueEvaluationRemoval(key) {
  if (!EVALUATION_STORAGE_KEYS.has(key)) return
  if (!getApiToken() || !userCanManageModule(EVALUATION_DB_MODULE)) return

  const previousWrite = pendingEvaluationWrites.get(key) || Promise.resolve()
  const nextWrite = previousWrite
    .catch(() => {})
    .then(async () => {
      await apiRequest(
        `/app-records/${EVALUATION_DB_MODULE}/${encodeURIComponent(key)}`,
        { method: 'DELETE' }
      )
      const storedError = localStorage.getItem(EVALUATION_SYNC_ERROR_KEY)
      if (storedError) {
        try {
          if (JSON.parse(storedError)?.key === key) localStorage.removeItem(EVALUATION_SYNC_ERROR_KEY)
        } catch {
          localStorage.removeItem(EVALUATION_SYNC_ERROR_KEY)
        }
      }
    })
    .catch((error) => {
      localStorage.setItem(EVALUATION_SYNC_ERROR_KEY, JSON.stringify({
        key,
        message: error?.message || 'Falha ao remover os dados de avaliações.',
        occurredAt: new Date().toISOString()
      }))
      console.error(`[PostgreSQL] Falha ao remover "${key}":`, error)
    })
    .finally(() => {
      if (pendingEvaluationWrites.get(key) === nextWrite) {
        pendingEvaluationWrites.delete(key)
      }
    })

  pendingEvaluationWrites.set(key, nextWrite)
}

export function setStored(key, value) {
  // Evita que o bridge com debounce faça uma segunda gravação paralela para
  // listas com fila explícita; as demais chaves continuam usando o bridge.
  const hasExplicitQueue = TRAINING_STORAGE_KEYS.has(key) || EVALUATION_STORAGE_KEYS.has(key)
  if (hasExplicitQueue) bridgeSuppressedKeys.add(key)
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } finally {
    if (hasExplicitQueue) bridgeSuppressedKeys.delete(key)
  }
  enqueueTrainingWrite(key, value)
  enqueueEvaluationWrite(key, value)
}

export function removeStored(key) {
  const hasExplicitQueue = TRAINING_STORAGE_KEYS.has(key) || EVALUATION_STORAGE_KEYS.has(key)
  if (hasExplicitQueue) bridgeSuppressedKeys.add(key)
  try {
    localStorage.removeItem(key)
  } finally {
    if (hasExplicitQueue) bridgeSuppressedKeys.delete(key)
  }
  enqueueEvaluationRemoval(key)
  if (!TRAINING_STORAGE_KEYS.has(key)) return
  if (!getApiToken() || !userCanManageModule(TRAINING_DB_MODULE)) return

  const previousWrite = pendingTrainingWrites.get(key) || Promise.resolve()
  const nextWrite = previousWrite
    .catch(() => {})
    .then(async () => {
      await apiRequest(
        `/app-records/${TRAINING_DB_MODULE}/${encodeURIComponent(key)}`,
        { method: 'DELETE' }
      )
    })
    .catch((error) => {
      localStorage.setItem(TRAINING_SYNC_ERROR_KEY, JSON.stringify({
        key,
        message: error?.message || 'Falha ao remover os dados de treinamentos.',
        occurredAt: new Date().toISOString()
      }))
      console.error(`[PostgreSQL] Falha ao remover "${key}":`, error)
    })
    .finally(() => {
      if (pendingTrainingWrites.get(key) === nextWrite) {
        pendingTrainingWrites.delete(key)
      }
    })
  pendingTrainingWrites.set(key, nextWrite)
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

  // Alterações feitas pela própria aba em localStorage não acionam o evento
  // nativo `storage` nessa mesma aba. Notificamos as telas após a hidratação.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hr:recruitment-cache-updated', {
      detail: { keys, synced }
    }))
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

    // O histórico salarial usa tabela e CRUD dedicados. Nunca hidratar nem
    // gravar salaryHistory por app_records, pois isso poderia ressuscitar a
    // lista JSONB legada e sobrescrever a fonte relacional.
    if (module.dbModule === 'salaries') {
      try {
        const response = await apiRequest('/salaries')
        const databaseHistory = Array.isArray(response?.salaryHistory) ? response.salaryHistory : []
        const cachedHistory = getStoredArray('salaryHistory')
        if (databaseHistory.length > 0 || cachedHistory.length === 0) {
          localStorage.setItem('salaryHistory', JSON.stringify(databaseHistory))
          synced += 1
        } else {
          console.warn('[PostgreSQL] O histórico salarial do cache foi preservado porque a API retornou uma lista vazia.')
        }
      } catch (error) {
        console.warn('[PostgreSQL] Não foi possível sincronizar salários pela rota dedicada.', error)
      }
      continue
    }

    // Folhas usam as tabelas relacionais payrolls/payroll_items e a API dedicada.
    // Nunca sincronizar payrolls por app_records: isso poderia ressuscitar o
    // agregado legado ou provocar uma gravação genérica rejeitada pelo servidor.
    if (module.dbModule === 'payroll') {
      try {
        const response = await apiRequest('/payrolls')
        const databasePayrolls = Array.isArray(response?.payrolls) ? response.payrolls : []
        const cachedPayrolls = getStoredArray('payrolls')
        if (databasePayrolls.length > 0 || cachedPayrolls.length === 0) {
          localStorage.setItem('payrolls', JSON.stringify(databasePayrolls))
          synced += 1
        } else {
          console.warn('[PostgreSQL] O cache de folhas foi preservado porque a API retornou uma lista vazia.')
        }
      } catch (error) {
        console.warn('[PostgreSQL] Não foi possível sincronizar a folha pela rota dedicada.', error)
      }
      continue
    }

    // Férias, 13º e rescisões usam registros relacionais dedicados. Mantemos
    // no cache qualquer registro local ainda ausente do banco para permitir
    // importação assistida, sem apagar dados legados automaticamente.
    if (module.dbModule === 'financial_advanced') {
      const collections = [
        ['financialVacations', 'vacations'],
        ['financialThirteenths', 'thirteenths'],
        ['financialTerminations', 'terminations']
      ]
      for (const [key, collection] of collections) {
        try {
          const response = await apiRequest(`/financial-advanced/${collection}`)
          const remoteRecords = Array.isArray(response?.records) ? response.records : []
          const cachedRecords = getStoredArray(key)
          const remoteIds = new Set(remoteRecords.map((record) => String(record.id)))
          const localOnly = cachedRecords.filter((record) => !remoteIds.has(String(record.id)))
          if (localOnly.length) {
            console.warn(`[PostgreSQL] ${localOnly.length} registro(s) local(is) de "${key}" ainda não importado(s); cache preservado.`)
          }
          const merged = new Map(cachedRecords.map((record) => [String(record.id), record]))
          for (const record of remoteRecords) merged.set(String(record.id), record)
          localStorage.setItem(key, JSON.stringify([...merged.values()]))
          synced += 1
        } catch (error) {
          console.warn(`[PostgreSQL] Não foi possível sincronizar "${key}" pela API dedicada.`, error)
        }
      }
      continue
    }

    // Eventos financeiros têm tabela e rota dedicadas. Não hidratar nem gravar
    // esse catálogo por app_records, para impedir que uma lista JSONB antiga
    // volte a ser tratada como fonte oficial.
    if (module.dbModule === 'financial_events') {
      try {
        const response = await apiRequest('/financial-events')
        const databaseEvents = Array.isArray(response?.events) ? response.events : []
        const cachedEvents = getStoredArray('financialEvents')
        if (databaseEvents.length > 0 || cachedEvents.length === 0) {
          localStorage.setItem('financialEvents', JSON.stringify(databaseEvents))
          synced += 1
        }
      } catch (error) {
        console.warn('[PostgreSQL] Não foi possível sincronizar eventos financeiros pela rota dedicada.', error)
      }
      continue
    }

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
