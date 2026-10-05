import { useEffect, useMemo, useState } from 'react'

import './horasExtras.css'

import { getEmployees } from '../../../services/employee'
import { getStoredArray } from '../../../services/storage'

import {
  calculateTimeClockPeriod,
  formatMinutes,
  formatBalance,
  PUNCH_TYPE_LABELS
} from '../../../services/timeClock'

import { getEmployeeWorkScheduleName } from '../../../services/workSchedule'

export default function HorasExtras() {
  const [employees, setEmployees] = useState([])
  const [branches, setBranches] = useState([])

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const [selectedBranchId, setSelectedBranchId] = useState('')

  const [startDate, setStartDate] = useState(() => {
    const date = new Date()

    date.setDate(1)

    return date.toISOString().slice(0, 10)
  })

  const [endDate, setEndDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )

  const [selectedDetails, setSelectedDetails] = useState(null)

  useEffect(() => {
    setEmployees(getEmployees().filter((employee) => employee.active !== false))

    setBranches(
      getStoredArray('branches').filter((branch) => branch.active !== false)
    )
  }, [])

  /*
   * ============================================================
   * FUNCIONÁRIOS FILTRADOS
   * ============================================================
   */

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      if (!selectedBranchId) {
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

  const calculations = useMemo(() => {
    if (!startDate || !endDate) {
      return []
    }

    if (startDate > endDate) {
      return []
    }

    const employeesToCalculate = selectedEmployeeId
      ? employees.filter(
          (employee) => Number(employee.id) === Number(selectedEmployeeId)
        )
      : filteredEmployees

    return employeesToCalculate
      .map((employee) => {
        const period = calculateTimeClockPeriod(employee.id, startDate, endDate)

        return {
          employee,
          period
        }
      })
      .filter(({ period }) => period.totals.overtimeMinutes > 0)
  }, [employees, filteredEmployees, selectedEmployeeId, startDate, endDate])

  /*
   * ============================================================
   * TOTAIS GERAIS
   * ============================================================
   */

  const totals = useMemo(() => {
    return calculations.reduce(
      (result, item) => {
        result.overtimeMinutes += item.period.totals.overtimeMinutes

        result.workedMinutes += item.period.totals.workedMinutes

        result.expectedMinutes += item.period.totals.expectedMinutes

        return result
      },
      {
        overtimeMinutes: 0,
        workedMinutes: 0,
        expectedMinutes: 0
      }
    )
  }, [calculations])

  /*
   * ============================================================
   * LIMPAR FILTROS
   * ============================================================
   */

  function handleClearFilters() {
    setSelectedEmployeeId('')
    setSelectedBranchId('')

    const date = new Date()

    date.setDate(1)

    setStartDate(date.toISOString().slice(0, 10))

    setEndDate(new Date().toISOString().slice(0, 10))

    setSelectedDetails(null)
  }

  return (
    <div className="horas-extras-page">
      <header className="horas-extras-header">
        <div>
          <span className="horas-extras-kicker">PONTO</span>

          <h1>Horas Extras</h1>

          <p>Apuração das horas trabalhadas acima da jornada prevista.</p>
        </div>
      </header>

      <section className="horas-extras-filters">
        <div className="horas-extras-filter">
          <label htmlFor="startDate">Data inicial</label>

          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div className="horas-extras-filter">
          <label htmlFor="endDate">Data final</label>

          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="horas-extras-filter">
          <label htmlFor="branch">Filial</label>

          <select
            id="branch"
            value={selectedBranchId}
            onChange={(event) => {
              setSelectedBranchId(event.target.value)

              setSelectedEmployeeId('')
            }}
          >
            <option value="">Todas as filiais</option>

            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div className="horas-extras-filter">
          <label htmlFor="employee">Funcionário</label>

          <select
            id="employee"
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

        <button
          type="button"
          className="horas-extras-clear-button"
          onClick={handleClearFilters}
        >
          Limpar filtros
        </button>
      </section>

      <section className="horas-extras-summary">
        <div className="horas-extras-summary-card">
          <span>Horas extras</span>

          <strong>{formatMinutes(totals.overtimeMinutes)}</strong>

          <small>Total positivo no período</small>
        </div>

        <div className="horas-extras-summary-card">
          <span>Horas trabalhadas</span>

          <strong>{formatMinutes(totals.workedMinutes)}</strong>

          <small>Total das marcações</small>
        </div>

        <div className="horas-extras-summary-card">
          <span>Jornada prevista</span>

          <strong>{formatMinutes(totals.expectedMinutes)}</strong>

          <small>Conforme jornada/escala</small>
        </div>

        <div className="horas-extras-summary-card">
          <span>Funcionários</span>

          <strong>{calculations.length}</strong>

          <small>Com horas extras no período</small>
        </div>
      </section>

      <section className="horas-extras-card">
        <div className="horas-extras-card-header">
          <div>
            <span>APURAÇÃO</span>

            <h2>Funcionários com horas extras</h2>

            <p>
              Somente funcionários com saldo positivo são apresentados nesta
              lista.
            </p>
          </div>

          <strong>{calculations.length} resultado(s)</strong>
        </div>

        {calculations.length === 0 ? (
          <div className="horas-extras-empty">
            <span>⏱️</span>

            <h3>Nenhuma hora extra encontrada</h3>

            <p>
              Não existem horas trabalhadas acima da jornada prevista para os
              filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="horas-extras-table-wrapper">
            <table className="horas-extras-table">
              <thead>
                <tr>
                  <th>Funcionário</th>

                  <th>Filial</th>

                  <th>Jornada</th>

                  <th>Previsto</th>

                  <th>Trabalhado</th>

                  <th>Horas extras</th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {calculations.map(({ employee, period }) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.name}</strong>

                      {employee.registration && (
                        <small>Matrícula: {employee.registration}</small>
                      )}
                    </td>

                    <td>{employee.branchName || 'Não informada'}</td>

                    <td>
                      <span className="horas-extras-schedule">
                        {getEmployeeWorkScheduleName(employee)}
                      </span>
                    </td>

                    <td>{formatMinutes(period.totals.expectedMinutes)}</td>

                    <td>{formatMinutes(period.totals.workedMinutes)}</td>

                    <td>
                      <strong className="horas-extras-positive">
                        +{formatMinutes(period.totals.overtimeMinutes)}
                      </strong>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="horas-extras-details-button"
                        onClick={() =>
                          setSelectedDetails({
                            employee,
                            period
                          })
                        }
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

      {selectedDetails && (
        <div
          className="horas-extras-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedDetails(null)
            }
          }}
        >
          <div className="horas-extras-modal">
            <header className="horas-extras-modal-header">
              <div>
                <span>DETALHAMENTO</span>

                <h2>{selectedDetails.employee.name}</h2>

                <p>{selectedDetails.period.scheduleName}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="horas-extras-modal-summary">
              <div>
                <span>Jornada prevista</span>

                <strong>
                  {formatMinutes(selectedDetails.period.totals.expectedMinutes)}
                </strong>
              </div>

              <div>
                <span>Horas trabalhadas</span>

                <strong>
                  {formatMinutes(selectedDetails.period.totals.workedMinutes)}
                </strong>
              </div>

              <div>
                <span>Horas extras</span>

                <strong>
                  +
                  {formatMinutes(selectedDetails.period.totals.overtimeMinutes)}
                </strong>
              </div>

              <div>
                <span>Saldo</span>

                <strong>
                  {formatBalance(selectedDetails.period.totals.balanceMinutes)}
                </strong>
              </div>
            </div>

            <div className="horas-extras-days">
              {selectedDetails.period.days
                .filter(
                  (day) =>
                    day.differenceMinutes > 0 && day.record?.punches?.length
                )
                .map((day) => (
                  <div className="horas-extras-day" key={day.date}>
                    <div className="horas-extras-day-header">
                      <div>
                        <strong>
                          {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                            'pt-BR'
                          )}
                        </strong>

                        <span>{day.label}</span>
                      </div>

                      <strong className="horas-extras-positive">
                        +{formatMinutes(day.differenceMinutes)}
                      </strong>
                    </div>

                    <div className="horas-extras-day-info">
                      <div>
                        <span>Previsto</span>

                        <strong>{formatMinutes(day.expectedMinutes)}</strong>
                      </div>

                      <div>
                        <span>Trabalhado</span>

                        <strong>{formatMinutes(day.workedMinutes)}</strong>
                      </div>

                      <div>
                        <span>Excedente</span>

                        <strong>+{formatMinutes(day.differenceMinutes)}</strong>
                      </div>
                    </div>

                    <div className="horas-extras-punches">
                      {day.record.punches.map((punch) => (
                        <div key={punch.id}>
                          <span>{PUNCH_TYPE_LABELS[punch.type]}</span>

                          <strong>{punch.time}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            <footer className="horas-extras-modal-footer">
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
