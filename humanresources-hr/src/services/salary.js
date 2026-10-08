import { getStoredArray, setStored } from './storage'

/*
 * ============================================================
 * SALÁRIOS
 * ============================================================
 *
 * Este serviço é responsável por armazenar o histórico salarial
 * dos funcionários.
 *
 * IMPORTANTE:
 *
 * O salário NÃO fica gravado diretamente no cadastro do
 * funcionário.
 *
 * Cada alteração salarial gera um novo registro.
 *
 * Exemplo:
 *
 * 01/01/2025 → R$ 2.500,00 → Admissão
 * 01/06/2025 → R$ 2.700,00 → Reajuste
 * 01/01/2026 → R$ 3.000,00 → Promoção
 *
 * Dessa forma conseguimos descobrir qual era o salário de um
 * funcionário em qualquer período.
 * ============================================================
 */

const STORAGE_KEY = 'salaryHistory'

/*
 * ============================================================
 * BUSCAR HISTÓRICO
 * ============================================================
 */

export function getSalaryHistory() {
  return getStoredArray(STORAGE_KEY)
}

/*
 * ============================================================
 * BUSCAR HISTÓRICO DE UM FUNCIONÁRIO
 * ============================================================
 */

export function getEmployeeSalaryHistory(employeeId) {
  const history = getSalaryHistory()

  return history
    .filter((item) => Number(item.employeeId) === Number(employeeId))
    .sort((a, b) => {
      /*
       * Ordenamos do registro mais recente para o mais antigo.
       */
      return String(b.effectiveDate || '').localeCompare(
        String(a.effectiveDate || '')
      )
    })
}

/*
 * ============================================================
 * BUSCAR SALÁRIO VIGENTE
 * ============================================================
 *
 * Retorna o último salário cuja data de vigência seja menor
 * ou igual à data de referência.
 *
 * Se nenhuma data for informada, usamos a data atual.
 * ============================================================
 */

export function getCurrentSalary(employeeId, referenceDate = null) {
  const history = getEmployeeSalaryHistory(employeeId)

  const reference = referenceDate || new Date().toISOString().slice(0, 10)

  const validRecords = history.filter((item) => {
    if (!item.effectiveDate) {
      return false
    }

    return item.effectiveDate <= reference
  })

  return validRecords[0] || null
}

/*
 * ============================================================
 * ADICIONAR REGISTRO
 * ============================================================
 */

export function addSalaryRecord(record) {
  const history = getSalaryHistory()

  const newRecord = {
    ...record,
    id: record.id || Date.now(),
    createdAt: record.createdAt || new Date().toISOString()
  }

  const updated = [...history, newRecord]

  setStored(STORAGE_KEY, updated)

  return updated
}

/*
 * ============================================================
 * ATUALIZAR REGISTRO
 * ============================================================
 */

export function updateSalaryRecord(updatedRecord) {
  const history = getSalaryHistory()

  const updated = history.map((record) =>
    Number(record.id) === Number(updatedRecord.id) ? updatedRecord : record
  )

  setStored(STORAGE_KEY, updated)

  return updated
}

/*
 * ============================================================
 * EXCLUIR REGISTRO
 * ============================================================
 */

export function deleteSalaryRecord(id) {
  const history = getSalaryHistory()

  const updated = history.filter((record) => Number(record.id) !== Number(id))

  setStored(STORAGE_KEY, updated)

  return updated
}

/*
 * ============================================================
 * FORMATAR MOEDA
 * ============================================================
 */

export function formatSalary(value) {
  const numericValue = Number(value)

  if (Number.isNaN(numericValue)) {
    return 'R$ 0,00'
  }

  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

/*
 * ============================================================
 * FORMATAR DATA
 * ============================================================
 */

export function formatSalaryDate(value) {
  if (!value) {
    return '-'
  }

  /*
   * Trabalhamos manualmente com YYYY-MM-DD para evitar problemas
   * de fuso horário.
   */
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-')

    return `${day}/${month}/${year}`
  }

  return value
}
