import { useMemo, useState } from 'react'

import './fechamentoMensal.css'

import { getEmployees } from '../../../services/employee'
import { getStoredArray } from '../../../services/storage'

import {
  calculateTimeClockPeriod,
  formatBalance,
  formatMinutes
} from '../../../services/timeClock'

import {
  closeMonthlyClosing,
  createMonthlyClosing,
  formatCompetence,
  getCurrentCompetence,
  getMonthlyClosing,
  reopenMonthlyClosing,
  startMonthlyClosingReview
} from '../../../services/monthlyClosing'

/*
 * ============================================================
 * FUNÇÕES DE DATA
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

function getCompetenceDates(competence) {
  if (!competence || !/^\d{4}-\d{2}$/.test(competence)) {
    return null
  }

  const [year, month] = competence.split('-').map(Number)

  const startDate = new Date(year, month - 1, 1)

  const endDate = new Date(year, month, 0)

  return {
    startDate: formatDateInput(startDate),
    endDate: formatDateInput(endDate)
  }
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function FechamentoMensal() {
  const [employees] = useState(() =>
    getEmployees().filter((employee) => employee.active !== false)
  )

  const [branches] = useState(() =>
    getStoredArray('branches').filter((branch) => branch.active !== false)
  )

  const [selectedCompetence, setSelectedCompetence] = useState(
    getCurrentCompetence()
  )

  const [selectedBranchId, setSelectedBranchId] = useState('all')

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const [closing, setClosing] = useState(() =>
    getMonthlyClosing(getCurrentCompetence())
  )

  const [selectedDetails, setSelectedDetails] = useState(null)

  /*
   * ============================================================
   * PERÍODO DA COMPETÊNCIA
   * ============================================================
   */

  const competenceDates = useMemo(
    () => getCompetenceDates(selectedCompetence),
    [selectedCompetence]
  )

  const startDate = competenceDates?.startDate || ''

  const endDate = competenceDates?.endDate || ''

  /*
   * ============================================================
   * FUNCIONÁRIOS FILTRADOS
   * ============================================================
   */

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      if (selectedBranchId === 'all') {
        return true
      }

      return Number(employee.branchId) === Number(selectedBranchId)
    })
  }, [employees, selectedBranchId])

  /*
   * ============================================================
   * APURAÇÃO
   * ============================================================
   */

  const employeeRows = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) {
      return []
    }

    const employeesToCalculate = selectedEmployeeId
      ? employees.filter(
          (employee) => Number(employee.id) === Number(selectedEmployeeId)
        )
      : filteredEmployees

    return employeesToCalculate.map((employee) => {
      const period = calculateTimeClockPeriod(
        employee.id,
        parseDate(startDate),
        parseDate(endDate)
      )

      const expectedMinutes = Number(period?.totals?.expectedMinutes || 0)

      const workedMinutes = Number(period?.totals?.workedMinutes || 0)

      const overtimeMinutes = Number(period?.totals?.overtimeMinutes || 0)

      const deficitMinutes = Number(period?.totals?.deficitMinutes || 0)

      const balanceMinutes = Number(period?.totals?.balanceMinutes || 0)

      const absenceDays =
        period?.days?.filter((day) => {
          const expected = Number(day.expectedMinutes || 0)

          const worked = Number(day.workedMinutes || 0)

          const punches = day.record?.punches || []

          return expected > 0 && punches.length === 0
        }).length || 0

      const delayDays =
        period?.days?.filter((day) => {
          const expected = Number(day.expectedMinutes || 0)

          const worked = Number(day.workedMinutes || 0)

          const punches = day.record?.punches || []

          return expected > 0 && punches.length > 0 && expected > worked
        }).length || 0

      const branch = branches.find(
        (item) => Number(item.id) === Number(employee.branchId)
      )

      return {
        employee,
        branchName: branch?.name || employee.branchName || 'Não informada',
        period,
        expectedMinutes,
        workedMinutes,
        overtimeMinutes,
        deficitMinutes,
        balanceMinutes,
        absenceDays,
        delayDays
      }
    })
  }, [
    employees,
    filteredEmployees,
    selectedEmployeeId,
    selectedBranchId,
    startDate,
    endDate,
    branches
  ])

  /*
   * ============================================================
   * TOTAIS
   * ============================================================
   */

  const totals = useMemo(() => {
    return employeeRows.reduce(
      (result, item) => {
        result.expectedMinutes += item.expectedMinutes
        result.workedMinutes += item.workedMinutes
        result.overtimeMinutes += item.overtimeMinutes
        result.deficitMinutes += item.deficitMinutes
        result.balanceMinutes += item.balanceMinutes
        result.absenceDays += item.absenceDays
        result.delayDays += item.delayDays

        return result
      },
      {
        expectedMinutes: 0,
        workedMinutes: 0,
        overtimeMinutes: 0,
        deficitMinutes: 0,
        balanceMinutes: 0,
        absenceDays: 0,
        delayDays: 0
      }
    )
  }, [employeeRows])

  /*
   * ============================================================
   * COMPETÊNCIA
   * ============================================================
   */

  function handleCompetenceChange(event) {
    const competence = event.target.value

    setSelectedCompetence(competence)
    setSelectedEmployeeId(null)
    setSelectedDetails(null)

    const existingClosing = getMonthlyClosing(competence)

    setClosing(existingClosing || null)
  }

  function handleInitializeClosing() {
    const newClosing = createMonthlyClosing(selectedCompetence)

    setClosing(newClosing)
  }

  /*
   * ============================================================
   * INICIAR CONFERÊNCIA
   * ============================================================
   */

  function handleStartReview() {
    const existingClosing =
      getMonthlyClosing(selectedCompetence) ||
      createMonthlyClosing(selectedCompetence)

    const updated = startMonthlyClosingReview(selectedCompetence)

    setClosing(updated || existingClosing)
  }

  /*
   * ============================================================
   * FECHAR COMPETÊNCIA
   * ============================================================
   */

  function handleCloseMonthly() {
    const confirmed = window.confirm(
      `Deseja realmente fechar a competência ${formatCompetence(
        selectedCompetence
      )}? Após o fechamento, o período será considerado encerrado.`
    )

    if (!confirmed) {
      return
    }

    const loggedUser = JSON.parse(localStorage.getItem('loggedUser') || 'null')

    const closedBy = loggedUser?.name || loggedUser?.username || 'Usuário'

    const existingClosing =
      getMonthlyClosing(selectedCompetence) ||
      createMonthlyClosing(selectedCompetence)

    const updated = closeMonthlyClosing(selectedCompetence, closedBy)

    setClosing(updated || existingClosing)
  }

  /*
   * ============================================================
   * REABRIR COMPETÊNCIA
   * ============================================================
   */

  function handleReopenMonthly() {
    const confirmed = window.confirm(
      `Deseja reabrir a competência ${formatCompetence(selectedCompetence)}?`
    )

    if (!confirmed) {
      return
    }

    const updated = reopenMonthlyClosing(selectedCompetence)

    setClosing(updated)
  }

  /*
   * ============================================================
   * STATUS
   * ============================================================
   */

  const statusLabel = {
    open: 'Aberto',
    review: 'Em conferência',
    closed: 'Fechado'
  }

  const currentStatus = closing?.status || 'not-created'

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="fechamento-mensal-page">
      <header className="fechamento-mensal-header">
        <div>
          <span className="fechamento-mensal-kicker">PONTO</span>

          <h1>Fechamento Mensal</h1>

          <p>
            Confira os resultados da competência antes de realizar o fechamento
            mensal do ponto.
          </p>
        </div>
      </header>

      {/* ======================================================
          COMPETÊNCIA E FILTROS
      ====================================================== */}

      <section className="fechamento-mensal-filters">
        <div className="fechamento-mensal-filter">
          <label htmlFor="fechamento-competence">Competência</label>

          <input
            id="fechamento-competence"
            type="month"
            value={selectedCompetence}
            onChange={handleCompetenceChange}
          />
        </div>

        <div className="fechamento-mensal-filter">
          <label htmlFor="fechamento-branch">Filial</label>

          <select
            id="fechamento-branch"
            value={selectedBranchId}
            onChange={(event) => {
              setSelectedBranchId(event.target.value)
              setSelectedEmployeeId('')
            }}
          >
            <option value="all">Todas as filiais</option>

            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="fechamento-mensal-filter">
          <label htmlFor="fechamento-employee">Funcionário</label>

          <select
            id="fechamento-employee"
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
          >
            <option value="">Todos os funcionários</option>

            {filteredEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ======================================================
          CABEÇALHO DA COMPETÊNCIA
      ====================================================== */}

      <section className="fechamento-mensal-status-card">
        <div>
          <span>COMPETÊNCIA</span>

          <h2>{formatCompetence(selectedCompetence)}</h2>

          <p>
            Período de {startDate || '—'} até {endDate || '—'}
          </p>
        </div>

        <div className="fechamento-mensal-status">
          <span>Status</span>

          <strong className={`status-${currentStatus}`}>
            {statusLabel[currentStatus] || 'Não inicializado'}
          </strong>
        </div>

        <div className="fechamento-mensal-actions">
          {!closing && (
            <button type="button" onClick={handleInitializeClosing}>
              Iniciar fechamento
            </button>
          )}

          {closing?.status === 'open' && (
            <button type="button" onClick={handleStartReview}>
              Iniciar conferência
            </button>
          )}

          {closing?.status === 'review' && (
            <button
              type="button"
              className="fechamento-mensal-close-button"
              onClick={handleCloseMonthly}
            >
              Fechar competência
            </button>
          )}

          {closing?.status === 'closed' && (
            <button type="button" onClick={handleReopenMonthly}>
              Reabrir competência
            </button>
          )}
        </div>
      </section>

      {/* ======================================================
          RESUMO
      ====================================================== */}

      <section className="fechamento-mensal-summary">
        <SummaryCard
          label="Funcionários"
          value={String(employeeRows.length)}
          description="Considerados na competência"
        />

        <SummaryCard
          label="Horas previstas"
          value={formatMinutes(totals.expectedMinutes)}
          description="Jornada prevista"
        />

        <SummaryCard
          label="Horas trabalhadas"
          value={formatMinutes(totals.workedMinutes)}
          description="Total registrado"
        />

        <SummaryCard
          label="Horas extras"
          value={formatMinutes(totals.overtimeMinutes)}
          description="Saldo positivo"
          variant="positive"
        />

        <SummaryCard
          label="Déficit"
          value={formatMinutes(totals.deficitMinutes)}
          description="Tempo abaixo da jornada"
          variant="negative"
        />

        <SummaryCard
          label="Faltas"
          value={String(totals.absenceDays)}
          description="Dias sem marcação"
          variant="negative"
        />

        <SummaryCard
          label="Atrasos"
          value={String(totals.delayDays)}
          description="Dias com déficit"
          variant="warning"
        />

        <SummaryCard
          label="Saldo geral"
          value={formatBalance(totals.balanceMinutes)}
          description="Saldo da competência"
          variant="neutral"
        />
      </section>

      {/* ======================================================
          CONFERÊNCIA
      ====================================================== */}

      <section className="fechamento-mensal-card">
        <div className="fechamento-mensal-card-header">
          <div>
            <span>CONFERÊNCIA</span>

            <h2>Resultado por funcionário</h2>

            <p>
              Confira as horas previstas, trabalhadas, extras, déficits e
              ocorrências antes de encerrar a competência.
            </p>
          </div>

          <strong>{employeeRows.length} funcionário(s)</strong>
        </div>

        {employeeRows.length === 0 ? (
          <div className="fechamento-mensal-empty">
            <span>📋</span>

            <h3>Nenhum funcionário encontrado</h3>

            <p>Não existem funcionários para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="fechamento-mensal-table-wrapper">
            <table className="fechamento-mensal-table">
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Filial</th>
                  <th>Previsto</th>
                  <th>Trabalhado</th>
                  <th>Extras</th>
                  <th>Déficit</th>
                  <th>Faltas</th>
                  <th>Atrasos</th>
                  <th>Saldo</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {employeeRows.map((item) => (
                  <tr key={item.employee.id}>
                    <td>
                      <strong>{item.employee.name}</strong>

                      {item.employee.registration && (
                        <small>Matrícula: {item.employee.registration}</small>
                      )}
                    </td>

                    <td>{item.branchName}</td>

                    <td>{formatMinutes(item.expectedMinutes)}</td>

                    <td>{formatMinutes(item.workedMinutes)}</td>

                    <td>
                      <strong className="fechamento-mensal-positive">
                        +{formatMinutes(item.overtimeMinutes)}
                      </strong>
                    </td>

                    <td>
                      <strong className="fechamento-mensal-negative">
                        {formatMinutes(item.deficitMinutes)}
                      </strong>
                    </td>

                    <td>{item.absenceDays}</td>

                    <td>{item.delayDays}</td>

                    <td>
                      <strong
                        className={
                          item.balanceMinutes >= 0
                            ? 'fechamento-mensal-positive'
                            : 'fechamento-mensal-negative'
                        }
                      >
                        {formatBalance(item.balanceMinutes)}
                      </strong>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="fechamento-mensal-details-button"
                        onClick={() => setSelectedDetails(item)}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ======================================================
          INFORMAÇÕES DO FECHAMENTO
      ====================================================== */}

      {closing && (
        <section className="fechamento-mensal-info-card">
          <div>
            <span>Status atual</span>

            <strong>{statusLabel[closing.status] || closing.status}</strong>
          </div>

          {closing.closedAt && (
            <div>
              <span>Fechado em</span>

              <strong>
                {new Date(closing.closedAt).toLocaleString('pt-BR')}
              </strong>
            </div>
          )}

          {closing.closedBy && (
            <div>
              <span>Fechado por</span>

              <strong>{closing.closedBy}</strong>
            </div>
          )}
        </section>
      )}

      {/* ======================================================
          MODAL DE DETALHES
      ====================================================== */}

      {selectedDetails && (
        <div
          className="fechamento-mensal-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedDetails(null)
            }
          }}
        >
          <div className="fechamento-mensal-modal">
            <header className="fechamento-mensal-modal-header">
              <div>
                <span>DETALHAMENTO</span>

                <h2>{selectedDetails.employee.name}</h2>

                <p>{selectedDetails.branchName}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="fechamento-mensal-modal-summary">
              <div>
                <span>Previsto</span>

                <strong>
                  {formatMinutes(selectedDetails.expectedMinutes)}
                </strong>
              </div>

              <div>
                <span>Trabalhado</span>

                <strong>{formatMinutes(selectedDetails.workedMinutes)}</strong>
              </div>

              <div>
                <span>Horas extras</span>

                <strong className="fechamento-mensal-positive">
                  +{formatMinutes(selectedDetails.overtimeMinutes)}
                </strong>
              </div>

              <div>
                <span>Déficit</span>

                <strong className="fechamento-mensal-negative">
                  {formatMinutes(selectedDetails.deficitMinutes)}
                </strong>
              </div>

              <div>
                <span>Saldo</span>

                <strong>{formatBalance(selectedDetails.balanceMinutes)}</strong>
              </div>
            </div>

            <div className="fechamento-mensal-modal-occurrences">
              <div>
                <span>Faltas</span>

                <strong>{selectedDetails.absenceDays}</strong>
              </div>

              <div>
                <span>Atrasos / déficit</span>

                <strong>{selectedDetails.delayDays}</strong>
              </div>
            </div>

            <div className="fechamento-mensal-days">
              {selectedDetails.period?.days
                ?.filter((day) => Number(day.expectedMinutes || 0) > 0)
                .map((day) => {
                  const expectedMinutes = Number(day.expectedMinutes || 0)

                  const workedMinutes = Number(day.workedMinutes || 0)

                  const punches = day.record?.punches || []

                  const difference = workedMinutes - expectedMinutes

                  return (
                    <div className="fechamento-mensal-day" key={day.date}>
                      <div>
                        <strong>
                          {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                            'pt-BR'
                          )}
                        </strong>

                        <span>{day.label}</span>
                      </div>

                      <div>
                        <span>Previsto</span>

                        <strong>{formatMinutes(expectedMinutes)}</strong>
                      </div>

                      <div>
                        <span>Trabalhado</span>

                        <strong>{formatMinutes(workedMinutes)}</strong>
                      </div>

                      <div>
                        <span>Saldo</span>

                        <strong
                          className={
                            difference >= 0
                              ? 'fechamento-mensal-positive'
                              : 'fechamento-mensal-negative'
                          }
                        >
                          {formatBalance(difference)}
                        </strong>
                      </div>

                      {punches.length === 0 ? (
                        <small>Nenhuma marcação registrada.</small>
                      ) : (
                        <small>{punches.length} marcação(ões)</small>
                      )}
                    </div>
                  )
                })}
            </div>

            <footer className="fechamento-mensal-modal-footer">
              <button type="button" onClick={() => setSelectedDetails(null)}>
                Fechar
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

/*
 * ============================================================
 * CARD DE RESUMO
 * ============================================================
 */

function SummaryCard({ label, value, description, variant = 'neutral' }) {
  return (
    <article className={`fechamento-mensal-summary-card ${variant}`}>
      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>
    </article>
  )
}
