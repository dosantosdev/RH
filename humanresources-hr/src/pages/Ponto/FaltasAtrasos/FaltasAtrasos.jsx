import { useMemo, useState } from 'react'

import './faltasAtrasos.css'

import { getEmployees } from '../../../services/employee'
import { getStoredArray } from '../../../services/storage'

import {
  calculateTimeClockPeriod,
  formatMinutes,
  PUNCH_TYPE_LABELS
} from '../../../services/timeClock'

import { getApprovedMedicalCertificatesForDate } from '../../../services/medicalCertificates'

export default function FaltasAtrasos() {
  const [employees] = useState(() =>
    getEmployees().filter((employee) => employee.active !== false)
  )

  const [branches] = useState(() =>
    getStoredArray('branches').filter((branch) => branch.active !== false)
  )

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')

  const [selectedBranchId, setSelectedBranchId] = useState('')

  const [selectedType, setSelectedType] = useState('all')

  const [startDate, setStartDate] = useState(() => {
    const date = new Date()

    date.setDate(1)

    return formatDateInput(date)
  })

  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()))

  const [selectedDetails, setSelectedDetails] = useState(null)

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

  const occurrences = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) {
      return []
    }

    const employeesToCalculate = selectedEmployeeId
      ? employees.filter(
          (employee) => Number(employee.id) === Number(selectedEmployeeId)
        )
      : filteredEmployees

    const result = []

    employeesToCalculate.forEach((employee) => {
      const period = calculateTimeClockPeriod(
        employee.id,
        parseDate(startDate),
        parseDate(endDate)
      )

      if (!period?.days) {
        return
      }

      period.days.forEach((day) => {
        const expectedMinutes = Number(day.expectedMinutes || 0)

        const workedMinutes = Number(day.workedMinutes || 0)

        const punches = day.record?.punches || []

        /*
         * Dias sem jornada prevista não entram como falta ou atraso.
         */

        if (expectedMinutes <= 0) {
          return
        }

        /*
         * ========================================================
         * ATESTADOS APROVADOS
         * ========================================================
         *
         * Verificamos se existe um atestado aprovado cobrindo
         * especificamente este dia.
         */

        const approvedCertificates = getApprovedMedicalCertificatesForDate(
          employee.id,
          day.date
        )

        /*
         * ========================================================
         * FALTA
         * ========================================================
         *
         * Existia jornada prevista, mas não houve nenhuma marcação.
         */

        if (punches.length === 0) {
          /*
           * Se existe atestado aprovado cobrindo o dia,
           * a ausência passa a ser considerada justificada.
           */

          if (approvedCertificates.length > 0) {
            result.push({
              type: 'justified',
              employee,
              day,
              expectedMinutes,
              workedMinutes,
              differenceMinutes: expectedMinutes,
              punches,
              certificates: approvedCertificates
            })

            return
          }

          /*
           * Caso contrário, continua sendo uma falta normal.
           */

          result.push({
            type: 'absence',
            employee,
            day,
            expectedMinutes,
            workedMinutes,
            differenceMinutes: expectedMinutes,
            punches,
            certificates: []
          })

          return
        }

        /*
         * ========================================================
         * ATRASO / DÉFICIT
         * ========================================================
         *
         * Houve marcação, porém o trabalhador ficou abaixo da
         * jornada prevista.
         */

        const differenceMinutes = expectedMinutes - workedMinutes

        if (differenceMinutes > 0) {
          result.push({
            type: 'delay',
            employee,
            day,
            expectedMinutes,
            workedMinutes,
            differenceMinutes,
            punches,
            certificates: approvedCertificates
          })
        }
      })
    })

    return result.sort((a, b) => {
      if (a.day.date === b.day.date) {
        return String(a.employee.name || '').localeCompare(
          String(b.employee.name || ''),
          'pt-BR'
        )
      }

      return String(b.day.date).localeCompare(String(a.day.date))
    })
  }, [employees, filteredEmployees, selectedEmployeeId, startDate, endDate])

  /*
   * ============================================================
   * OCORRÊNCIAS FILTRADAS PELO TIPO
   * ============================================================
   */

  const filteredOccurrences = useMemo(() => {
    if (selectedType === 'all') {
      return occurrences
    }

    return occurrences.filter((item) => item.type === selectedType)
  }, [occurrences, selectedType])

  /*
   * ============================================================
   * TOTAIS
   * ============================================================
   */

  const totals = useMemo(() => {
    return occurrences.reduce(
      (result, item) => {
        if (item.type === 'absence') {
          result.absences += 1
          result.absenceMinutes += item.differenceMinutes
        }

        if (item.type === 'delay') {
          result.delays += 1
          result.delayMinutes += item.differenceMinutes
        }

        if (item.type === 'justified') {
          result.justified += 1
          result.justifiedMinutes += item.differenceMinutes
        }

        result.total += 1

        return result
      },
      {
        total: 0,
        absences: 0,
        delays: 0,
        justified: 0,
        absenceMinutes: 0,
        delayMinutes: 0,
        justifiedMinutes: 0
      }
    )
  }, [occurrences])

  /*
   * ============================================================
   * LIMPAR FILTROS
   * ============================================================
   */

  function handleClearFilters() {
    setSelectedEmployeeId('')
    setSelectedBranchId('')
    setSelectedType('all')

    const date = new Date()

    date.setDate(1)

    setStartDate(formatDateInput(date))
    setEndDate(formatDateInput(new Date()))

    setSelectedDetails(null)
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="faltas-atrasos-page">
      <header className="faltas-atrasos-header">
        <div>
          <span className="faltas-atrasos-kicker">PONTO</span>

          <h1>Faltas e Atrasos</h1>

          <p>
            Acompanhe faltas, atrasos e ausências justificadas a partir das
            marcações de ponto, jornada prevista e atestados aprovados.
          </p>
        </div>
      </header>

      {/* ========================================================
          FILTROS
      ======================================================== */}

      <section className="faltas-atrasos-filters">
        <div className="faltas-atrasos-filter">
          <label htmlFor="faltas-start-date">Data inicial</label>

          <input
            id="faltas-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>

        <div className="faltas-atrasos-filter">
          <label htmlFor="faltas-end-date">Data final</label>

          <input
            id="faltas-end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <div className="faltas-atrasos-filter">
          <label htmlFor="faltas-branch">Filial</label>

          <select
            id="faltas-branch"
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

        <div className="faltas-atrasos-filter">
          <label htmlFor="faltas-employee">Funcionário</label>

          <select
            id="faltas-employee"
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

        <div className="faltas-atrasos-filter">
          <label htmlFor="faltas-type">Tipo</label>

          <select
            id="faltas-type"
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="absence">Faltas</option>
            <option value="delay">Atrasos / déficit</option>
            <option value="justified">Justificadas por atestado</option>
          </select>
        </div>

        <button
          type="button"
          className="faltas-atrasos-clear-button"
          onClick={handleClearFilters}
        >
          Limpar filtros
        </button>
      </section>

      {/* ========================================================
          RESUMO
      ======================================================== */}

      <section className="faltas-atrasos-summary">
        <SummaryCard
          label="Ocorrências"
          value={String(totals.total)}
          description="Total identificado no período"
        />

        <SummaryCard
          label="Faltas"
          value={String(totals.absences)}
          description="Dias sem marcação e sem justificativa"
          variant="negative"
        />

        <SummaryCard
          label="Atrasos / déficit"
          value={String(totals.delays)}
          description={formatMinutes(totals.delayMinutes)}
          variant="warning"
        />

        <SummaryCard
          label="Justificadas"
          value={String(totals.justified)}
          description="Ausências com atestado aprovado"
          variant="positive"
        />
      </section>

      {/* ========================================================
          LISTAGEM
      ======================================================== */}

      <section className="faltas-atrasos-card">
        <div className="faltas-atrasos-card-header">
          <div>
            <span>APURAÇÃO</span>

            <h2>Ocorrências de ponto</h2>

            <p>
              São apresentados os dias em que havia jornada prevista e houve
              falta, déficit de jornada ou ausência justificada por atestado.
            </p>
          </div>

          <strong>{filteredOccurrences.length} resultado(s)</strong>
        </div>

        {filteredOccurrences.length === 0 ? (
          <div className="faltas-atrasos-empty">
            <span>✓</span>

            <h3>Nenhuma ocorrência encontrada</h3>

            <p>
              Não existem faltas, atrasos ou ausências justificadas para os
              filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="faltas-atrasos-table-wrapper">
            <table className="faltas-atrasos-table">
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Filial</th>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Previsto</th>
                  <th>Trabalhado</th>
                  <th>Diferença</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredOccurrences.map((item) => (
                  <tr key={`${item.employee.id}-${item.day.date}`}>
                    <td>
                      <strong>{item.employee.name}</strong>

                      {item.employee.registration && (
                        <small>Matrícula: {item.employee.registration}</small>
                      )}
                    </td>

                    <td>{item.employee.branchName || 'Não informada'}</td>

                    <td>
                      <strong>{formatDisplayDate(item.day.date)}</strong>

                      <small>{item.day.label}</small>
                    </td>

                    <td>
                      <span className={`faltas-atrasos-status ${item.type}`}>
                        {getOccurrenceLabel(item.type)}
                      </span>
                    </td>

                    <td>{formatMinutes(item.expectedMinutes)}</td>

                    <td>{formatMinutes(item.workedMinutes)}</td>

                    <td>
                      <strong
                        className={
                          item.type === 'absence'
                            ? 'faltas-atrasos-negative'
                            : item.type === 'justified'
                              ? 'faltas-atrasos-positive'
                              : 'faltas-atrasos-warning'
                        }
                      >
                        {item.type === 'justified'
                          ? formatMinutes(item.differenceMinutes)
                          : `-${formatMinutes(item.differenceMinutes)}`}
                      </strong>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="faltas-atrasos-details-button"
                        onClick={() =>
                          setSelectedDetails({
                            employee: item.employee,
                            occurrences: occurrences.filter(
                              (occurrence) =>
                                Number(occurrence.employee.id) ===
                                Number(item.employee.id)
                            )
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

      {/* ========================================================
          MODAL DE DETALHES
      ======================================================== */}

      {selectedDetails && (
        <div
          className="faltas-atrasos-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedDetails(null)
            }
          }}
        >
          <div className="faltas-atrasos-modal">
            <header className="faltas-atrasos-modal-header">
              <div>
                <span>DETALHAMENTO</span>

                <h2>{selectedDetails.employee.name}</h2>

                <p>
                  {selectedDetails.employee.branchName ||
                    'Filial não informada'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetails(null)}
                aria-label="Fechar"
              >
                ×
              </button>
            </header>

            <div className="faltas-atrasos-modal-summary">
              <div>
                <span>Faltas</span>

                <strong>
                  {
                    selectedDetails.occurrences.filter(
                      (item) => item.type === 'absence'
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span>Atrasos / déficit</span>

                <strong>
                  {
                    selectedDetails.occurrences.filter(
                      (item) => item.type === 'delay'
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span>Justificadas</span>

                <strong>
                  {
                    selectedDetails.occurrences.filter(
                      (item) => item.type === 'justified'
                    ).length
                  }
                </strong>
              </div>

              <div>
                <span>Tempo total</span>

                <strong>
                  {formatMinutes(
                    selectedDetails.occurrences
                      .filter((item) => item.type !== 'justified')
                      .reduce(
                        (total, item) => total + item.differenceMinutes,
                        0
                      )
                  )}
                </strong>
              </div>
            </div>

            <div className="faltas-atrasos-details-list">
              {selectedDetails.occurrences.map((item) => (
                <div
                  className="faltas-atrasos-detail-item"
                  key={`${item.employee.id}-${item.day.date}`}
                >
                  <div className="faltas-atrasos-detail-header">
                    <div>
                      <strong>{formatDisplayDate(item.day.date)}</strong>

                      <span>{item.day.label}</span>
                    </div>

                    <span className={`faltas-atrasos-status ${item.type}`}>
                      {getOccurrenceLabel(item.type)}
                    </span>
                  </div>

                  <div className="faltas-atrasos-detail-info">
                    <div>
                      <span>Previsto</span>

                      <strong>{formatMinutes(item.expectedMinutes)}</strong>
                    </div>

                    <div>
                      <span>Trabalhado</span>

                      <strong>{formatMinutes(item.workedMinutes)}</strong>
                    </div>

                    <div>
                      <span>Diferença</span>

                      <strong>
                        {item.type === 'justified'
                          ? formatMinutes(item.differenceMinutes)
                          : `-${formatMinutes(item.differenceMinutes)}`}
                      </strong>
                    </div>
                  </div>

                  {item.type === 'justified' &&
                    item.certificates?.length > 0 && (
                      <div className="faltas-atrasos-certificate-info">
                        <strong>Atestado aprovado</strong>

                        {item.certificates.map((certificate) => (
                          <div
                            key={certificate.id}
                            className="faltas-atrasos-certificate"
                          >
                            <span>
                              {getCertificateTypeLabel(certificate.type)}
                            </span>

                            <small>
                              Período:{' '}
                              {formatDisplayDate(certificate.startDate)} até{' '}
                              {formatDisplayDate(certificate.endDate)}
                            </small>

                            {certificate.description && (
                              <small>{certificate.description}</small>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {item.punches.length > 0 && (
                    <div className="faltas-atrasos-punches">
                      {item.punches.map((punch) => (
                        <div key={punch.id}>
                          <span>
                            {PUNCH_TYPE_LABELS[punch.type] || punch.type}
                          </span>

                          <strong>{punch.time}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.punches.length === 0 && (
                    <div className="faltas-atrasos-no-punches">
                      Nenhuma marcação registrada neste dia.
                    </div>
                  )}
                </div>
              ))}
            </div>

            <footer className="faltas-atrasos-modal-footer">
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
    <article className={`faltas-atrasos-summary-card ${variant}`}>
      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>
    </article>
  )
}

/*
 * ============================================================
 * LABEL DA OCORRÊNCIA
 * ============================================================
 */

function getOccurrenceLabel(type) {
  if (type === 'absence') {
    return 'Falta'
  }

  if (type === 'delay') {
    return 'Atraso / déficit'
  }

  if (type === 'justified') {
    return 'Justificada por atestado'
  }

  return 'Ocorrência'
}

/*
 * ============================================================
 * LABEL DO TIPO DE ATESTADO
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

  return labels[type] || 'Atestado'
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
