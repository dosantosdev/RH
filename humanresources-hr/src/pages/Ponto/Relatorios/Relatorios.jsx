import { useMemo, useState } from 'react'

import './relatorios.css'

import { getEmployees } from '../../../services/employee'
import { getStoredArray } from '../../../services/storage'

import {
  calculateTimeClockPeriod,
  formatMinutes
} from '../../../services/timeClock'

import { getEmployeeMedicalCertificates } from '../../../services/medicalCertificates'

export default function Relatorios() {
  const [employees] = useState(() =>
    getEmployees().filter((employee) => employee.active !== false)
  )

  const [branches] = useState(() =>
    getStoredArray('branches').filter((branch) => branch.active !== false)
  )

  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedReport, setSelectedReport] = useState('attendance')

  const [startDate, setStartDate] = useState(() => {
    const date = new Date()

    date.setDate(1)

    return formatDateInput(date)
  })

  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()))

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
   * FUNCIONÁRIOS DO RELATÓRIO
   * ============================================================
   */

  const reportEmployees = useMemo(() => {
    if (selectedEmployeeId) {
      return filteredEmployees.filter(
        (employee) => Number(employee.id) === Number(selectedEmployeeId)
      )
    }

    return filteredEmployees
  }, [filteredEmployees, selectedEmployeeId])

  /*
   * ============================================================
   * APURAÇÃO DOS DADOS
   * ============================================================
   */

  const reportData = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) {
      return []
    }

    return reportEmployees.map((employee) => {
      const period = calculateTimeClockPeriod(
        employee.id,
        parseDate(startDate),
        parseDate(endDate)
      )

      const days = period?.days || []

      let absences = 0
      let absenceMinutes = 0

      let delays = 0
      let delayMinutes = 0

      let overtimeMinutes = 0

      days.forEach((day) => {
        const expectedMinutes = Number(day.expectedMinutes || 0)
        const workedMinutes = Number(day.workedMinutes || 0)
        const punches = day.record?.punches || []

        if (expectedMinutes <= 0) {
          return
        }

        if (punches.length === 0) {
          absences += 1
          absenceMinutes += expectedMinutes

          return
        }

        const differenceMinutes = expectedMinutes - workedMinutes

        if (differenceMinutes > 0) {
          delays += 1
          delayMinutes += differenceMinutes
        }

        if (differenceMinutes < 0) {
          overtimeMinutes += Math.abs(differenceMinutes)
        }
      })

      const certificates = getEmployeeMedicalCertificates(employee.id).filter(
        (certificate) => {
          if (!certificate.startDate || !certificate.endDate) {
            return false
          }

          return (
            certificate.startDate <= endDate && certificate.endDate >= startDate
          )
        }
      )

      return {
        employee,
        period,
        absences,
        absenceMinutes,
        delays,
        delayMinutes,
        overtimeMinutes,
        certificates
      }
    })
  }, [reportEmployees, startDate, endDate])

  /*
   * ============================================================
   * TOTAIS
   * ============================================================
   */

  const totals = useMemo(() => {
    return reportData.reduce(
      (result, item) => {
        result.workedMinutes += Number(item.period?.totals?.workedMinutes || 0)

        result.expectedMinutes += Number(
          item.period?.totals?.expectedMinutes || 0
        )

        result.overtimeMinutes += item.overtimeMinutes

        result.absences += item.absences

        result.absenceMinutes += item.absenceMinutes

        result.delays += item.delays

        result.delayMinutes += item.delayMinutes

        result.certificates += item.certificates.length

        return result
      },
      {
        workedMinutes: 0,
        expectedMinutes: 0,
        overtimeMinutes: 0,
        absences: 0,
        absenceMinutes: 0,
        delays: 0,
        delayMinutes: 0,
        certificates: 0
      }
    )
  }, [reportData])

  /*
   * ============================================================
   * LIMPAR FILTROS
   * ============================================================
   */

  function handleClearFilters() {
    setSelectedBranchId('')
    setSelectedEmployeeId('')
    setSelectedReport('attendance')

    const date = new Date()

    date.setDate(1)

    setStartDate(formatDateInput(date))
    setEndDate(formatDateInput(new Date()))
  }

  /*
   * ============================================================
   * EXPORTAR / IMPRIMIR
   * ============================================================
   */

  function handlePrint() {
    window.print()
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="relatorios-page">
      <header className="relatorios-header">
        <div>
          <span className="relatorios-kicker">PONTO</span>

          <h1>Relatórios</h1>

          <p>
            Consulte e gere relatórios consolidados das informações de ponto dos
            funcionários.
          </p>
        </div>

        <button
          type="button"
          className="relatorios-print-button"
          onClick={handlePrint}
        >
          Imprimir relatório
        </button>
      </header>

      {/*
       * ========================================================
       * FILTROS
       * ========================================================
       */}

      <section className="relatorios-filters">
        <div className="relatorios-filter">
          <label htmlFor="relatorios-start-date">Data inicial</label>

          <input
            id="relatorios-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div className="relatorios-filter">
          <label htmlFor="relatorios-end-date">Data final</label>

          <input
            id="relatorios-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="relatorios-filter">
          <label htmlFor="relatorios-branch">Filial</label>

          <select
            id="relatorios-branch"
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

        <div className="relatorios-filter">
          <label htmlFor="relatorios-employee">Funcionário</label>

          <select
            id="relatorios-employee"
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

        <div className="relatorios-filter relatorios-filter-report">
          <label htmlFor="relatorios-report">Relatório</label>

          <select
            id="relatorios-report"
            value={selectedReport}
            onChange={(event) => setSelectedReport(event.target.value)}
          >
            <option value="attendance">Resumo de ponto</option>

            <option value="absences">Faltas e atrasos</option>

            <option value="overtime">Horas extras</option>

            <option value="certificates">Atestados</option>

            <option value="complete">Relatório completo</option>
          </select>
        </div>

        <button
          type="button"
          className="relatorios-clear-button"
          onClick={handleClearFilters}
        >
          Limpar filtros
        </button>
      </section>

      {/*
       * ========================================================
       * RESUMO
       * ========================================================
       */}

      <section className="relatorios-summary">
        <SummaryCard
          label="Funcionários"
          value={String(reportData.length)}
          description="Incluídos no relatório"
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
          label="Faltas"
          value={String(totals.absences)}
          description="Dias sem marcação"
          variant="negative"
        />

        <SummaryCard
          label="Atrasos"
          value={String(totals.delays)}
          description={formatMinutes(totals.delayMinutes)}
          variant="warning"
        />

        <SummaryCard
          label="Atestados"
          value={String(totals.certificates)}
          description="No período selecionado"
        />
      </section>

      {/*
       * ========================================================
       * RELATÓRIO
       * ========================================================
       */}

      <section className="relatorios-card">
        <div className="relatorios-card-header">
          <div>
            <span>RELATÓRIO</span>

            <h2>{getReportTitle(selectedReport)}</h2>

            <p>
              Período de <strong>{formatDisplayDate(startDate)}</strong> até{' '}
              <strong>{formatDisplayDate(endDate)}</strong>
            </p>
          </div>

          <strong>{reportData.length} funcionário(s)</strong>
        </div>

        {reportData.length === 0 ? (
          <div className="relatorios-empty">
            <span>📊</span>

            <h3>Nenhum dado encontrado</h3>

            <p>Não existem informações para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="relatorios-table-wrapper">
            {selectedReport === 'attendance' && (
              <AttendanceReport data={reportData} />
            )}

            {selectedReport === 'absences' && (
              <AbsenceReport data={reportData} />
            )}

            {selectedReport === 'overtime' && (
              <OvertimeReport data={reportData} />
            )}

            {selectedReport === 'certificates' && (
              <CertificateReport data={reportData} />
            )}

            {selectedReport === 'complete' && (
              <CompleteReport data={reportData} />
            )}
          </div>
        )}
      </section>
    </div>
  )
}

/*
 * ============================================================
 * RELATÓRIO DE PONTO
 * ============================================================
 */

function AttendanceReport({ data }) {
  return (
    <table className="relatorios-table">
      <thead>
        <tr>
          <th>Funcionário</th>
          <th>Filial</th>
          <th>Jornada prevista</th>
          <th>Trabalhado</th>
          <th>Saldo</th>
        </tr>
      </thead>

      <tbody>
        {data.map((item) => {
          const expected = Number(item.period?.totals?.expectedMinutes || 0)

          const worked = Number(item.period?.totals?.workedMinutes || 0)

          const balance = worked - expected

          return (
            <tr key={item.employee.id}>
              <td>
                <strong>{item.employee.name}</strong>

                {item.employee.registration && (
                  <small>Matrícula: {item.employee.registration}</small>
                )}
              </td>

              <td>{item.employee.branchName || 'Não informada'}</td>

              <td>{formatMinutes(expected)}</td>

              <td>{formatMinutes(worked)}</td>

              <td>
                <strong
                  className={
                    balance >= 0 ? 'relatorios-positive' : 'relatorios-negative'
                  }
                >
                  {balance >= 0 ? '+' : '-'}
                  {formatMinutes(Math.abs(balance))}
                </strong>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/*
 * ============================================================
 * RELATÓRIO DE FALTAS E ATRASOS
 * ============================================================
 */

function AbsenceReport({ data }) {
  return (
    <table className="relatorios-table">
      <thead>
        <tr>
          <th>Funcionário</th>
          <th>Filial</th>
          <th>Faltas</th>
          <th>Tempo em falta</th>
          <th>Atrasos / déficit</th>
          <th>Tempo de atraso</th>
        </tr>
      </thead>

      <tbody>
        {data.map((item) => (
          <tr key={item.employee.id}>
            <td>
              <strong>{item.employee.name}</strong>
            </td>

            <td>{item.employee.branchName || 'Não informada'}</td>

            <td>{item.absences}</td>

            <td>{formatMinutes(item.absenceMinutes)}</td>

            <td>{item.delays}</td>

            <td>{formatMinutes(item.delayMinutes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/*
 * ============================================================
 * RELATÓRIO DE HORAS EXTRAS
 * ============================================================
 */

function OvertimeReport({ data }) {
  return (
    <table className="relatorios-table">
      <thead>
        <tr>
          <th>Funcionário</th>
          <th>Filial</th>
          <th>Horas trabalhadas</th>
          <th>Jornada prevista</th>
          <th>Horas extras</th>
        </tr>
      </thead>

      <tbody>
        {data.map((item) => (
          <tr key={item.employee.id}>
            <td>
              <strong>{item.employee.name}</strong>
            </td>

            <td>{item.employee.branchName || 'Não informada'}</td>

            <td>{formatMinutes(item.period?.totals?.workedMinutes || 0)}</td>

            <td>{formatMinutes(item.period?.totals?.expectedMinutes || 0)}</td>

            <td>
              <strong className="relatorios-positive">
                +{formatMinutes(item.overtimeMinutes)}
              </strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/*
 * ============================================================
 * RELATÓRIO DE ATESTADOS
 * ============================================================
 */

function CertificateReport({ data }) {
  return (
    <table className="relatorios-table">
      <thead>
        <tr>
          <th>Funcionário</th>
          <th>Filial</th>
          <th>Atestados</th>
          <th>Período</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        {data.map((item) => {
          if (item.certificates.length === 0) {
            return (
              <tr key={item.employee.id}>
                <td>
                  <strong>{item.employee.name}</strong>
                </td>

                <td>{item.employee.branchName || 'Não informada'}</td>

                <td>0</td>

                <td>—</td>

                <td>
                  <span className="relatorios-status neutral">Nenhum</span>
                </td>
              </tr>
            )
          }

          return item.certificates.map((certificate) => (
            <tr key={`${item.employee.id}-${certificate.id}`}>
              <td>
                <strong>{item.employee.name}</strong>
              </td>

              <td>{item.employee.branchName || 'Não informada'}</td>

              <td>{getCertificateTypeLabel(certificate.type)}</td>

              <td>
                {formatDisplayDate(certificate.startDate)} até{' '}
                {formatDisplayDate(certificate.endDate)}
              </td>

              <td>
                <span className={`relatorios-status ${certificate.status}`}>
                  {getCertificateStatusLabel(certificate.status)}
                </span>
              </td>
            </tr>
          ))
        })}
      </tbody>
    </table>
  )
}

/*
 * ============================================================
 * RELATÓRIO COMPLETO
 * ============================================================
 */

function CompleteReport({ data }) {
  return (
    <table className="relatorios-table">
      <thead>
        <tr>
          <th>Funcionário</th>
          <th>Trabalhado</th>
          <th>Previsto</th>
          <th>Horas extras</th>
          <th>Faltas</th>
          <th>Atrasos</th>
          <th>Atestados</th>
        </tr>
      </thead>

      <tbody>
        {data.map((item) => (
          <tr key={item.employee.id}>
            <td>
              <strong>{item.employee.name}</strong>

              <small>
                {item.employee.branchName || 'Filial não informada'}
              </small>
            </td>

            <td>{formatMinutes(item.period?.totals?.workedMinutes || 0)}</td>

            <td>{formatMinutes(item.period?.totals?.expectedMinutes || 0)}</td>

            <td>
              <strong className="relatorios-positive">
                +{formatMinutes(item.overtimeMinutes)}
              </strong>
            </td>

            <td>{item.absences}</td>

            <td>{item.delays}</td>

            <td>{item.certificates.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/*
 * ============================================================
 * CARD DE RESUMO
 * ============================================================
 */

function SummaryCard({ label, value, description, variant = 'neutral' }) {
  return (
    <article className={`relatorios-summary-card ${variant}`}>
      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>
    </article>
  )
}

/*
 * ============================================================
 * TÍTULOS
 * ============================================================
 */

function getReportTitle(type) {
  const titles = {
    attendance: 'Resumo de ponto',
    absences: 'Faltas e atrasos',
    overtime: 'Horas extras',
    certificates: 'Atestados',
    complete: 'Relatório completo'
  }

  return titles[type] || 'Relatório'
}

/*
 * ============================================================
 * ATESTADOS
 * ============================================================
 */

function getCertificateTypeLabel(type) {
  const labels = {
    medical: 'Atestado médico',
    dental: 'Atestado odontológico',
    occupational: 'Atestado ocupacional',
    accompaniment: 'Acompanhamento de familiar',
    other: 'Outro'
  }

  return labels[type] || type || 'Não informado'
}

function getCertificateStatusLabel(status) {
  const labels = {
    pending: 'Pendente',
    approved: 'Aprovado',
    rejected: 'Recusado',
    cancelled: 'Cancelado'
  }

  return labels[status] || status || 'Não informado'
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
