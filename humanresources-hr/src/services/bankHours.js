const STORAGE_KEY = 'bankHoursEntries'

/*
 * ============================================================
 * TIPOS DE LANÇAMENTO
 * ============================================================
 */

export const BANK_HOURS_ENTRY_TYPES = [
  {
    value: 'credit',
    label: 'Crédito'
  },
  {
    value: 'debit',
    label: 'Débito'
  }
]

export const BANK_HOURS_ENTRY_CATEGORIES = [
  {
    value: 'manual_adjustment',
    label: 'Ajuste manual'
  },
  {
    value: 'compensation',
    label: 'Compensação'
  },
  {
    value: 'agreement',
    label: 'Acordo de compensação'
  },
  {
    value: 'other',
    label: 'Outro'
  }
]

/*
 * ============================================================
 * UTILITÁRIOS
 * ============================================================
 */

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function normalizeMinutes(value) {
  const minutes = Math.round(Number(value) || 0)

  return Math.max(minutes, 0)
}

/*
 * ============================================================
 * STORAGE
 * ============================================================
 */

export function getBankHoursEntries() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      return []
    }

    const parsed = JSON.parse(stored)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/*
 * ============================================================
 * ADICIONAR LANÇAMENTO
 * ============================================================
 */

export function addBankHoursEntry(entry) {
  const entries = getBankHoursEntries()

  const newEntry = {
    ...entry,
    id: entry.id || generateId(),
    minutes: normalizeMinutes(entry.minutes),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  const updated = [...entries, newEntry]

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return newEntry
}

/*
 * ============================================================
 * ATUALIZAR LANÇAMENTO
 * ============================================================
 */

export function updateBankHoursEntry(entry) {
  const entries = getBankHoursEntries()

  const updated = entries.map((item) =>
    String(item.id) === String(entry.id)
      ? {
          ...item,
          ...entry,
          minutes: normalizeMinutes(entry.minutes),
          updatedAt: new Date().toISOString()
        }
      : item
  )

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * EXCLUIR LANÇAMENTO
 * ============================================================
 */

export function deleteBankHoursEntry(entryId) {
  const entries = getBankHoursEntries()

  const updated = entries.filter((item) => String(item.id) !== String(entryId))

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

  return updated
}

/*
 * ============================================================
 * LANÇAMENTOS DO FUNCIONÁRIO
 * ============================================================
 */

export function getEmployeeBankHoursEntries(employeeId) {
  return getBankHoursEntries().filter(
    (item) => Number(item.employeeId) === Number(employeeId)
  )
}

/*
 * ============================================================
 * SALDO DOS LANÇAMENTOS MANUAIS
 * ============================================================
 *
 * Crédito soma ao banco.
 * Débito retira do banco.
 */

export function calculateManualBankHoursBalance(
  employeeId,
  startDate = '',
  endDate = ''
) {
  return getEmployeeBankHoursEntries(employeeId)
    .filter((entry) => {
      if (startDate && entry.date < startDate) {
        return false
      }

      if (endDate && entry.date > endDate) {
        return false
      }

      return true
    })
    .reduce((total, entry) => {
      const minutes = normalizeMinutes(entry.minutes)

      return total + (entry.type === 'debit' ? -minutes : minutes)
    }, 0)
}

/*
 * ============================================================
 * SALDO MANUAL ACUMULADO ATÉ UMA DATA
 * ============================================================
 */

export function calculateManualBankHoursUntil(employeeId, endDate = '') {
  return calculateManualBankHoursBalance(employeeId, '', endDate)
}
