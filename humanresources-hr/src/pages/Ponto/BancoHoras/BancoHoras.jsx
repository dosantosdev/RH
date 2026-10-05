import { useMemo, useState } from 'react'

import { getEmployees } from '../../../services/employee'
import { getStoredArray } from '../../../services/storage'

import {
  calculateTimeClockPeriod,
  formatBalance,
  formatMinutes
} from '../../../services/timeClock'

import {
  addBankHoursEntry,
  BANK_HOURS_ENTRY_CATEGORIES,
  BANK_HOURS_ENTRY_TYPES,
  deleteBankHoursEntry,
  getBankHoursEntries,
  getEmployeeBankHoursEntries,
  updateBankHoursEntry
} from '../../../services/bankHours'

import './bancoHoras.css'

/*
 * ============================================================
 * SALDO MANUAL A PARTIR DO ESTADO ATUAL
 * ============================================================
 */

function calculateManualBalanceFromEntries(
  entries,
  employeeId,
  startDate = '',
  endDate = ''
) {
  return entries
    .filter((entry) => Number(entry.employeeId) === Number(employeeId))
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
      const minutes = Math.max(Math.round(Number(entry.minutes) || 0), 0)

      return total + (entry.type === 'debit' ? -minutes : minutes)
    }, 0)
}

/*
 * ============================================================
 * COMPONENTE PRINCIPAL
 * ============================================================
 */

export default function BancoHoras() {
  const initialPeriod = getInitialPeriod()

  const [employees] = useState(() => getEmployees())

  const [branches] = useState(() => getStoredArray('branches'))

  const [roles] = useState(() => getStoredArray('roles'))

  const [entries, setEntries] = useState(() => getBankHoursEntries())

  const [search, setSearch] = useState('')

  const [selectedBranchId, setSelectedBranchId] = useState('all')

  const [startDate, setStartDate] = useState(initialPeriod.startDate)

  const [endDate, setEndDate] = useState(initialPeriod.endDate)

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const [showEntryModal, setShowEntryModal] = useState(false)

  /*
   * Guarda o lançamento que está sendo editado.
   *
   * Quando for null, o modal está criando um novo lançamento.
   */
  const [editingEntry, setEditingEntry] = useState(null)

  const [entryForm, setEntryForm] = useState(createInitialEntry())

  const [periodError, setPeriodError] = useState('')

  /*
   * ============================================================
   * FUNCIONÁRIOS
   * ============================================================
   */

  const employeeRows = useMemo(() => {
    const start = parseDate(startDate)

    const end = parseDate(endDate)

    if (!start || !end || start > end) {
      return []
    }

    return employees
      .filter((employee) => employee.active !== false)
      .map((employee) => {
        const role = roles.find(
          (item) =>
            Number(item.id) === Number(employee.positionId || employee.roleId)
        )

        const branch = branches.find(
          (item) => Number(item.id) === Number(employee.branchId)
        )

        const branchName =
          branch?.name || employee.branchName || 'Sem filial definida'

        const branchId = branch?.id || employee.branchId || 'without-branch'

        /*
         * Calcula o período usando a mesma fonte
         * utilizada pelo Meu Espelho.
         */

        const periodResult = calculateTimeClockPeriod(employee.id, start, end)

        const periodBalance = Number(periodResult?.totals?.balanceMinutes || 0)

        const overtimeMinutes = Number(
          periodResult?.totals?.overtimeMinutes || 0
        )

        const deficitMinutes = Number(periodResult?.totals?.deficitMinutes || 0)

        /*
         * Lançamentos manuais do período.
         */

        const manualPeriodBalance = calculateManualBalanceFromEntries(
          entries,
          employee.id,
          startDate,
          endDate
        )

        const totalPeriodBalance = periodBalance + manualPeriodBalance

        /*
         * Saldo anterior.
         */

        const previousEnd = addDays(start, -1)

        let previousBalance = 0

        if (employee.admissionDate) {
          const admission = parseDate(employee.admissionDate)

          if (admission && admission <= previousEnd) {
            const previousResult = calculateTimeClockPeriod(
              employee.id,
              admission,
              previousEnd
            )

            previousBalance = Number(
              previousResult?.totals?.balanceMinutes || 0
            )
          }
        }

        /*
         * Soma lançamentos manuais anteriores.
         */

        previousBalance += calculateManualBalanceFromEntries(
          entries,
          employee.id,
          '',
          formatDateInput(previousEnd)
        )

        return {
          employee,

          role,

          branch,

          branchId: String(branchId),

          branchName,

          periodResult,

          periodBalance,

          manualPeriodBalance,

          totalPeriodBalance,

          previousBalance,

          accumulatedBalance: previousBalance + totalPeriodBalance,

          overtimeMinutes,

          deficitMinutes
        }
      })
      .filter((item) => {
        /*
         * FILTRO POR FILIAL
         */

        if (
          selectedBranchId !== 'all' &&
          String(item.branchId) !== String(selectedBranchId)
        ) {
          return false
        }

        /*
         * FILTRO DE BUSCA
         */

        const term = search.trim().toLowerCase()

        if (!term) {
          return true
        }

        return (
          item.employee.name?.toLowerCase().includes(term) ||
          item.role?.name?.toLowerCase().includes(term) ||
          item.employee.positionName?.toLowerCase().includes(term) ||
          item.employee.roleName?.toLowerCase().includes(term) ||
          item.branchName?.toLowerCase().includes(term)
        )
      })
  }, [
    employees,
    branches,
    roles,
    search,
    selectedBranchId,
    startDate,
    endDate,
    entries
  ])

  /*
   * ============================================================
   * AGRUPAMENTO POR FILIAL
   * ============================================================
   */

  const groupedByBranch = useMemo(() => {
    const groups = new Map()

    employeeRows.forEach((item) => {
      if (!groups.has(item.branchId)) {
        groups.set(item.branchId, {
          id: item.branchId,
          name: item.branchName,
          branch: item.branch,
          employees: []
        })
      }

      groups.get(item.branchId).employees.push(item)
    })

    return Array.from(groups.values()).sort((a, b) => {
      if (a.id === 'without-branch') {
        return 1
      }

      if (b.id === 'without-branch') {
        return -1
      }

      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [employeeRows])

  /*
   * ============================================================
   * FUNCIONÁRIO SELECIONADO
   * ============================================================
   */

  const selectedEmployee = employeeRows.find(
    (item) => String(item.employee.id) === String(selectedEmployeeId)
  )

  /*
   * ============================================================
   * TOTAIS
   * ============================================================
   */

  const periodTotals = useMemo(() => {
    return employeeRows.reduce(
      (totals, item) => {
        totals.periodBalance += item.totalPeriodBalance

        totals.overtime += item.overtimeMinutes

        totals.deficit += item.deficitMinutes

        return totals
      },
      {
        periodBalance: 0,
        overtime: 0,
        deficit: 0
      }
    )
  }, [employeeRows])

  /*
   * ============================================================
   * DATAS
   * ============================================================
   */

  function handleStartDateChange(event) {
    const value = event.target.value

    setStartDate(value)

    if (value && endDate && value > endDate) {
      setEndDate(value)
    }
  }

  function handleEndDateChange(event) {
    const value = event.target.value

    setEndDate(value)

    if (value && startDate && value < startDate) {
      setStartDate(value)
    }
  }

  /*
   * ============================================================
   * ABRIR NOVO LANÇAMENTO
   * ============================================================
   */

  function openEntryModal(employeeId) {
    setPeriodError('')

    setSelectedEmployeeId(String(employeeId))

    setEditingEntry(null)

    setEntryForm({
      ...createInitialEntry(),
      date: endDate || startDate
    })

    setShowEntryModal(true)
  }

  /*
   * ============================================================
   * ABRIR EDIÇÃO
   * ============================================================
   */

  function openEditEntryModal(entry) {
    setPeriodError('')

    setSelectedEmployeeId(String(entry.employeeId))

    setEditingEntry(entry)

    setEntryForm({
      date: entry.date || '',
      type: entry.type || 'credit',
      category: entry.category || 'manual_adjustment',
      duration: minutesToDuration(entry.minutes),
      reason: entry.reason || ''
    })

    setShowEntryModal(true)
  }

  /*
   * ============================================================
   * FECHAR MODAL DE LANÇAMENTO
   * ============================================================
   */

  function closeEntryModal() {
    setShowEntryModal(false)

    setEditingEntry(null)

    setEntryForm(createInitialEntry())

    setPeriodError('')
  }

  /*
   * ============================================================
   * ALTERAÇÃO DO FORMULÁRIO
   * ============================================================
   */

  function handleEntryChange(event) {
    const { name, value } = event.target

    setEntryForm((current) => ({
      ...current,
      [name]: value
    }))
  }

  /*
   * ============================================================
   * SALVAR LANÇAMENTO
   * ============================================================
   */

  function handleEntrySubmit(event) {
    event.preventDefault()

    if (!selectedEmployee) {
      return
    }

    /*
     * A data precisa estar dentro do período selecionado.
     */

    if (
      !entryForm.date ||
      entryForm.date < startDate ||
      entryForm.date > endDate
    ) {
      setPeriodError(
        'A data do lançamento deve estar dentro do período selecionado.'
      )

      return
    }

    /*
     * Converte HH:MM para minutos.
     */

    const minutes = durationToMinutes(entryForm.duration)

    if (minutes <= 0) {
      setPeriodError('Informe uma duração válida para o lançamento.')

      return
    }

    /*
     * ==========================================================
     * EDIÇÃO
     * ==========================================================
     */

    if (editingEntry) {
      updateBankHoursEntry({
        ...editingEntry,

        employeeId: selectedEmployee.employee.id,

        branchId: selectedEmployee.branchId,

        date: entryForm.date,

        type: entryForm.type,

        category: entryForm.category,

        minutes,

        reason: entryForm.reason.trim()
      })
    } else {
      /*
       * ========================================================
       * NOVO LANÇAMENTO
       * ========================================================
       */

      addBankHoursEntry({
        employeeId: selectedEmployee.employee.id,

        branchId: selectedEmployee.branchId,

        date: entryForm.date,

        type: entryForm.type,

        category: entryForm.category,

        minutes,

        reason: entryForm.reason.trim()
      })
    }

    /*
     * Atualiza imediatamente o estado da tela.
     */

    setEntries(getBankHoursEntries())

    setPeriodError('')

    closeEntryModal()
  }

  /*
   * ============================================================
   * EXCLUSÃO
   * ============================================================
   */

  function handleDeleteEntry(entryId) {
    const confirmed = window.confirm(
      'Deseja realmente excluir este lançamento do banco de horas?'
    )

    if (!confirmed) {
      return
    }

    deleteBankHoursEntry(entryId)

    setEntries(getBankHoursEntries())
  }

  /*
   * ============================================================
   * LABELS
   * ============================================================
   */

  function getEntryLabel(type) {
    return (
      BANK_HOURS_ENTRY_TYPES.find((item) => item.value === type)?.label || type
    )
  }

  function getCategoryLabel(category) {
    return (
      BANK_HOURS_ENTRY_CATEGORIES.find((item) => item.value === category)
        ?.label || category
    )
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="banco-horas-page">
      <header className="banco-horas-header">
        <div>
          <span className="banco-horas-kicker">PONTO</span>

          <h1>Banco de Horas</h1>

          <p>
            Consulte o saldo de horas, acompanhe compensações e registre ajustes
            do banco de horas por funcionário.
          </p>
        </div>
      </header>

      {/* ======================================================
          FILTROS
      ====================================================== */}

      <section className="banco-horas-filter-card">
        <div className="banco-horas-filter-period">
          <label>
            <span>Data inicial</span>

            <input
              type="date"
              value={startDate}
              onChange={handleStartDateChange}
            />
          </label>

          <span className="banco-horas-filter-separator">até</span>

          <label>
            <span>Data final</span>

            <input type="date" value={endDate} onChange={handleEndDateChange} />
          </label>
        </div>

        <div className="banco-horas-filter-search">
          <input
            type="search"
            placeholder="Buscar funcionário ou cargo..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            value={selectedBranchId}
            onChange={(event) => setSelectedBranchId(event.target.value)}
          >
            <option value="all">Todas as filiais</option>

            {branches
              .filter((branch) => branch.active !== false)
              .sort((a, b) =>
                String(a.name || '').localeCompare(
                  String(b.name || ''),
                  'pt-BR'
                )
              )
              .map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}

            <option value="without-branch">Sem filial definida</option>
          </select>
        </div>
      </section>

      {periodError && !showEntryModal && (
        <div className="banco-horas-period-error">{periodError}</div>
      )}

      {/* ======================================================
          RESUMO
      ====================================================== */}

      <section className="banco-horas-summary-grid">
        <SummaryCard
          label="Saldo no período"
          value={formatBalance(periodTotals.periodBalance)}
          variant={getBalanceVariant(periodTotals.periodBalance)}
        />

        <SummaryCard
          label="Horas extras"
          value={formatMinutes(periodTotals.overtime)}
          variant="positive"
        />

        <SummaryCard
          label="Déficit"
          value={formatMinutes(periodTotals.deficit)}
          variant={periodTotals.deficit > 0 ? 'negative' : 'neutral'}
        />

        <SummaryCard
          label="Funcionários"
          value={String(employeeRows.length)}
          variant="neutral"
        />
      </section>

      {/* ======================================================
          LISTAGEM
      ====================================================== */}

      {employeeRows.length === 0 ? (
        <div className="banco-horas-empty">
          <span>◷</span>

          <h3>Nenhum funcionário encontrado</h3>

          <p>Não existem funcionários ativos para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="banco-horas-branches">
          {groupedByBranch.map((group) => (
            <section key={group.id} className="banco-horas-branch-section">
              <div className="banco-horas-branch-header">
                <div>
                  <span>FILIAL</span>

                  <h2>{group.name}</h2>

                  {group.branch && (
                    <p>
                      {group.branch.city || 'Cidade não informada'}

                      {group.branch.state ? ` - ${group.branch.state}` : ''}
                    </p>
                  )}
                </div>

                <span className="banco-horas-branch-count">
                  {group.employees.length}{' '}
                  {group.employees.length === 1
                    ? 'funcionário'
                    : 'funcionários'}
                </span>
              </div>

              <div className="banco-horas-grid">
                {group.employees.map((item) => (
                  <EmployeeBankCard
                    key={item.employee.id}
                    item={item}
                    onOpenEntry={() => openEntryModal(item.employee.id)}
                    onOpenDetails={() =>
                      setSelectedEmployeeId(item.employee.id)
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ======================================================
          DETALHES
      ====================================================== */}

      {selectedEmployee && !showEntryModal && (
        <BankDetailsModal
          item={selectedEmployee}
          startDate={startDate}
          endDate={endDate}
          entries={getEmployeeBankHoursEntries(selectedEmployee.employee.id)}
          onClose={() => setSelectedEmployeeId('')}
          onAddEntry={() => openEntryModal(selectedEmployee.employee.id)}
          onEditEntry={openEditEntryModal}
          onDeleteEntry={handleDeleteEntry}
          getEntryLabel={getEntryLabel}
          getCategoryLabel={getCategoryLabel}
        />
      )}

      {/* ======================================================
          NOVO / EDITAR LANÇAMENTO
      ====================================================== */}

      {showEntryModal && selectedEmployee && (
        <EntryModal
          employee={selectedEmployee}
          form={entryForm}
          periodError={periodError}
          editingEntry={editingEntry}
          onChange={handleEntryChange}
          onSubmit={handleEntrySubmit}
          onClose={closeEntryModal}
        />
      )}
    </div>
  )
}

/*
 * ============================================================
 * CARD DE RESUMO
 * ============================================================
 */

function SummaryCard({ label, value, variant = 'neutral' }) {
  return (
    <article className={`banco-horas-summary-card ${variant}`}>
      <span>{label}</span>

      <strong>{value}</strong>
    </article>
  )
}

/*
 * ============================================================
 * CARD DO FUNCIONÁRIO
 * ============================================================
 */

function EmployeeBankCard({ item, onOpenEntry, onOpenDetails }) {
  return (
    <article className="banco-horas-card">
      <div className="banco-horas-card-header">
        <div>
          <span>
            {item.role?.name ||
              item.employee.positionName ||
              item.employee.roleName ||
              'Cargo não informado'}
          </span>

          <h3>{item.employee.name}</h3>
        </div>

        <span
          className={`banco-horas-balance-badge ${getBalanceVariant(
            item.accumulatedBalance
          )}`}
        >
          {formatBalance(item.accumulatedBalance)}
        </span>
      </div>

      <div className="banco-horas-card-main">
        <div>
          <span>Saldo anterior</span>

          <strong>{formatBalance(item.previousBalance)}</strong>
        </div>

        <div>
          <span>Saldo no período</span>

          <strong>{formatBalance(item.totalPeriodBalance)}</strong>
        </div>

        <div>
          <span>Horas extras</span>

          <strong>{formatMinutes(item.overtimeMinutes)}</strong>
        </div>

        <div>
          <span>Déficit</span>

          <strong>{formatMinutes(item.deficitMinutes)}</strong>
        </div>
      </div>

      {item.manualPeriodBalance !== 0 && (
        <div className="banco-horas-manual-note">
          Inclui {formatBalance(item.manualPeriodBalance)} em lançamentos
          manuais no período.
        </div>
      )}

      <div className="banco-horas-card-footer">
        <span>
          {item.employee.registration
            ? `Matrícula ${item.employee.registration}`
            : 'Matrícula não informada'}
        </span>

        <div>
          <button type="button" onClick={onOpenDetails}>
            Ver detalhes
          </button>

          <button type="button" className="primary" onClick={onOpenEntry}>
            Lançar horas
          </button>
        </div>
      </div>
    </article>
  )
}

/*
 * ============================================================
 * MODAL DE DETALHES
 * ============================================================
 */

function BankDetailsModal({
  item,
  startDate,
  endDate,
  entries,
  onClose,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  getEntryLabel,
  getCategoryLabel
}) {
  const periodEntries = entries
    .filter((entry) => entry.date >= startDate && entry.date <= endDate)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))

  return (
    <div className="banco-horas-modal-overlay">
      <div className="banco-horas-modal">
        <header className="banco-horas-modal-header">
          <div>
            <span>BANCO DE HORAS</span>

            <h2>{item.employee.name}</h2>

            <p>{item.branchName}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="banco-horas-modal-body">
          <div className="banco-horas-detail-summary">
            <div>
              <span>Período</span>

              <strong>
                {formatDisplayDate(startDate)} → {formatDisplayDate(endDate)}
              </strong>
            </div>

            <div>
              <span>Saldo anterior</span>

              <strong>{formatBalance(item.previousBalance)}</strong>
            </div>

            <div>
              <span>Saldo do período</span>

              <strong>{formatBalance(item.totalPeriodBalance)}</strong>
            </div>

            <div>
              <span>Saldo acumulado</span>

              <strong>{formatBalance(item.accumulatedBalance)}</strong>
            </div>
          </div>

          <div className="banco-horas-detail-section">
            <div className="banco-horas-detail-section-header">
              <div>
                <h3>Lançamentos manuais</h3>

                <p>
                  Ajustes e compensações registrados para este funcionário no
                  período selecionado.
                </p>
              </div>

              <button type="button" onClick={onAddEntry}>
                + Lançar horas
              </button>
            </div>

            {periodEntries.length === 0 ? (
              <div className="banco-horas-no-entries">
                Nenhum lançamento manual neste período.
              </div>
            ) : (
              <div className="banco-horas-entries-list">
                {periodEntries.map((entry) => (
                  <div key={entry.id} className="banco-horas-entry-row">
                    <div>
                      <strong>{formatDisplayDate(entry.date)}</strong>

                      <span>{getEntryLabel(entry.type)}</span>
                    </div>

                    <div>
                      <span>{getCategoryLabel(entry.category)}</span>

                      <small>{entry.reason || 'Sem observação'}</small>
                    </div>

                    <strong
                      className={
                        entry.type === 'debit' ? 'negative' : 'positive'
                      }
                    >
                      {entry.type === 'debit' ? '-' : '+'}

                      {formatMinutes(entry.minutes)}
                    </strong>

                    <div className="banco-horas-entry-actions">
                      <button
                        type="button"
                        className="banco-horas-edit-button"
                        onClick={() => onEditEntry(entry)}
                        title="Editar lançamento"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        className="banco-horas-delete-button"
                        onClick={() => onDeleteEntry(entry.id)}
                        title="Excluir lançamento"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <footer className="banco-horas-modal-footer">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}

/*
 * ============================================================
 * MODAL DE LANÇAMENTO
 * ============================================================
 */

function EntryModal({
  employee,
  form,
  periodError,
  editingEntry,
  onChange,
  onSubmit,
  onClose
}) {
  const isEditing = Boolean(editingEntry)

  return (
    <div className="banco-horas-modal-overlay">
      <div className="banco-horas-entry-modal">
        <header className="banco-horas-modal-header">
          <div>
            <span>{isEditing ? 'EDITAR LANÇAMENTO' : 'NOVO LANÇAMENTO'}</span>

            <h2>{employee.employee.name}</h2>

            <p>{employee.branchName}</p>
          </div>

          <button type="button" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <form onSubmit={onSubmit}>
          <div className="banco-horas-entry-form">
            <label>
              <span>Data</span>

              <input
                type="date"
                name="date"
                value={form.date}
                onChange={onChange}
                required
              />
            </label>

            <label>
              <span>Operação</span>

              <select name="type" value={form.type} onChange={onChange}>
                {BANK_HOURS_ENTRY_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Categoria</span>

              <select name="category" value={form.category} onChange={onChange}>
                {BANK_HOURS_ENTRY_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Quantidade de horas</span>

              <input
                type="text"
                name="duration"
                value={form.duration}
                onChange={onChange}
                placeholder="Ex.: 02:30"
                maxLength={5}
                required
              />

              <small>Informe no formato HH:MM.</small>
            </label>

            <label className="banco-horas-entry-reason">
              <span>Motivo / observação</span>

              <textarea
                name="reason"
                value={form.reason}
                onChange={onChange}
                placeholder="Descreva o motivo do lançamento..."
                rows="4"
              />
            </label>
          </div>

          {periodError && (
            <div className="banco-horas-period-error">{periodError}</div>
          )}

          <footer className="banco-horas-modal-footer">
            <button type="button" onClick={onClose}>
              Cancelar
            </button>

            <button type="submit" className="primary">
              {isEditing ? 'Salvar alteração' : 'Salvar lançamento'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

/*
 * ============================================================
 * FORMULÁRIO INICIAL
 * ============================================================
 */

function createInitialEntry() {
  return {
    date: '',
    type: 'credit',
    category: 'manual_adjustment',
    duration: '',
    reason: ''
  }
}

/*
 * ============================================================
 * PERÍODO INICIAL
 * ============================================================
 */

function getInitialPeriod() {
  const today = new Date()

  const start = new Date(today.getFullYear(), today.getMonth(), 1)

  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  return {
    startDate: formatDateInput(start),

    endDate: formatDateInput(end)
  }
}

/*
 * ============================================================
 * DATAS
 * ============================================================
 */

function parseDate(value) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)

  const date = new Date(year, month - 1, day)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateInput(date) {
  const year = date.getFullYear()

  const month = String(date.getMonth() + 1).padStart(2, '0')

  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value) {
  const date = parseDate(value)

  return date ? date.toLocaleDateString('pt-BR') : '—'
}

function addDays(date, amount) {
  const result = new Date(date)

  result.setDate(result.getDate() + amount)

  return result
}

/*
 * ============================================================
 * DURAÇÃO
 * ============================================================
 */

function durationToMinutes(value) {
  if (!value || !/^\d{1,3}:\d{2}$/.test(value)) {
    return 0
  }

  const [hours, minutes] = value.split(':').map(Number)

  if (minutes > 59) {
    return 0
  }

  return hours * 60 + minutes
}

/*
 * ============================================================
 * CONVERTER MINUTOS PARA HH:MM
 * ============================================================
 */

function minutesToDuration(value) {
  const minutes = Math.max(Math.round(Number(value) || 0), 0)

  const hours = Math.floor(minutes / 60)

  const remainingMinutes = minutes % 60

  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(
    2,
    '0'
  )}`
}

/*
 * ============================================================
 * VARIANTE DO SALDO
 * ============================================================
 */

function getBalanceVariant(minutes) {
  if (minutes > 0) {
    return 'positive'
  }

  if (minutes < 0) {
    return 'negative'
  }

  return 'neutral'
}
