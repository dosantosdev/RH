import { useMemo, useState } from 'react'
import {
  REPORT_TYPES,
  REPORT_STATUS_OPTIONS,
  getReportData,
  getReportFilters
} from '../../services/reports'
import { hasPermission } from '../../services/permissions'
import './relatorios.css'

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const number = new Intl.NumberFormat('pt-BR')

function formatValue(value, column) {
  if (value === null || value === undefined || value === '') return '-'

  if (column === 'money') return currency.format(Number(value) || 0)
  if (column === 'number') return number.format(Number(value) || 0)

  if (column === 'minutes') {
    const rawMinutes = Math.round(Number(value) || 0)
    const sign = rawMinutes < 0 ? '-' : ''
    const minutes = Math.abs(rawMinutes)

    return `${sign}${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
      minutes % 60
    ).padStart(2, '0')}`
  }

  return String(value)
}

const REPORT_COLUMNS = {
  employees: [
    ['name', 'Funcionário'],
    ['cpf', 'CPF'],
    ['status', 'Status'],
    ['branch', 'Filial'],
    ['department', 'Departamento'],
    ['position', 'Cargo'],
    ['admissionDate', 'Admissão'],
    ['dismissalDate', 'Demissão']
  ],
  birthdays: [
    ['name', 'Funcionário'],
    ['date', 'Nascimento'],
    ['branch', 'Filial'],
    ['department', 'Departamento'],
    ['position', 'Cargo']
  ],
  admissions: [
    ['name', 'Funcionário'],
    ['date', 'Admissão'],
    ['branch', 'Filial'],
    ['department', 'Departamento'],
    ['position', 'Cargo']
  ],
  dismissals: [
    ['name', 'Funcionário'],
    ['date', 'Demissão'],
    ['status', 'Status'],
    ['branch', 'Filial'],
    ['department', 'Departamento'],
    ['position', 'Cargo']
  ],
  turnover: [
    ['month', 'Período'],
    ['admissions', 'Admissões', 'number'],
    ['dismissals', 'Demissões', 'number'],
    ['averageMovement', 'Movimentação média', 'number'],
    ['headcount', 'Quadro no fim do período', 'number'],
    ['turnoverRate', 'Turnover', 'percent']
  ],
  branches: [
    ['name', 'Filial'],
    ['employees', 'Funcionários', 'number'],
    ['active', 'Ativos', 'number'],
    ['inactive', 'Inativos', 'number']
  ],
  departments: [
    ['name', 'Departamento'],
    ['employees', 'Funcionários', 'number'],
    ['active', 'Ativos', 'number'],
    ['inactive', 'Inativos', 'number']
  ],
  positions: [
    ['name', 'Cargo'],
    ['employees', 'Funcionários', 'number'],
    ['active', 'Ativos', 'number'],
    ['inactive', 'Inativos', 'number']
  ],
  trainings: [
    ['training', 'Treinamento'],
    ['category', 'Categoria'],
    ['duration', 'Carga horária', 'number'],
    ['participants', 'Participantes', 'number'],
    ['completed', 'Concluídos', 'number'],
    ['approved', 'Aprovados', 'number'],
    ['averageProgress', 'Progresso médio', 'percent']
  ],
  certificates: [
    ['type', 'Tipo'],
    ['employee', 'Funcionário'],
    ['training', 'Documento/Treinamento'],
    ['certificateNumber', 'Número'],
    ['issuedAt', 'Emissão'],
    ['expirationDate', 'Vencimento'],
    ['status', 'Status']
  ],
  timeclock: [
    ['employee', 'Funcionário'],
    ['branch', 'Filial'],
    ['department', 'Departamento'],
    ['expected', 'Previsto'],
    ['worked', 'Trabalhado'],
    ['overtime', 'Horas extras'],
    ['deficit', 'Déficit'],
    ['absences', 'Faltas', 'number'],
    ['pending', 'Pendências', 'number']
  ],
  vacations: [
    ['employee', 'Funcionário'],
    ['startDate', 'Início'],
    ['days', 'Dias', 'number'],
    ['abonoDays', 'Abono', 'number'],
    ['status', 'Status'],
    ['gross', 'Valor bruto', 'money']
  ],
  bankhours: [
    ['employee', 'Funcionário'],
    ['date', 'Data'],
    ['type', 'Tipo'],
    ['category', 'Categoria'],
    ['minutes', 'Minutos', 'minutes'],
    ['balance', 'Saldo', 'minutes'],
    ['description', 'Descrição']
  ],
  thirteenth: [
    ['employee', 'Funcionário'],
    ['year', 'Ano', 'number'],
    ['months', 'Avos', 'number'],
    ['gross', 'Bruto', 'money'],
    ['firstInstallment', '1ª parcela', 'money'],
    ['secondInstallment', '2ª parcela', 'money'],
    ['status', 'Status']
  ],
  terminations: [
    ['employee', 'Funcionário'],
    ['dismissalDate', 'Demissão'],
    ['status', 'Status'],
    ['balanceSalary', 'Saldo salário', 'money'],
    ['notice', 'Aviso', 'money'],
    ['vacation', 'Férias', 'money'],
    ['thirteenth', '13º proporcional', 'money'],
    ['gross', 'Bruto', 'money'],
    ['net', 'Líquido', 'money']
  ],
  payroll: [
    ['competence', 'Competência'],
    ['status', 'Status'],
    ['employee', 'Funcionário'],
    ['baseSalary', 'Salário base', 'money'],
    ['earnings', 'Proventos', 'money'],
    ['gross', 'Bruto', 'money'],
    ['deductions', 'Descontos', 'money'],
    ['inss', 'INSS', 'money'],
    ['irrf', 'IRRF', 'money'],
    ['fgts', 'FGTS empresa', 'money'],
    ['net', 'Líquido', 'money'],
    ['overtime', 'Horas extras', 'minutes']
  ],
  medical: [
    ['employee', 'Funcionário'],
    ['type', 'Tipo'],
    ['startDate', 'Início'],
    ['endDate', 'Fim'],
    ['days', 'Dias', 'number'],
    ['status', 'Status'],
    ['cid', 'CID']
  ],
  evaluations: [
    ['employee', 'Funcionário'],
    ['type', 'Tipo'],
    ['status', 'Status'],
    ['result', 'Resultado'],
    ['date', 'Data']
  ]
}

function getDefaultDates() {
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)

  const toKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`

  return {
    startDate: toKey(firstDay),
    endDate: toKey(now),
    referenceDate: toKey(now)
  }
}

function getReportTitle(type) {
  return REPORT_TYPES.find((item) => item.key === type)?.label || 'Relatório'
}

function getCellValue(row, column) {
  return row[column[0]]
}

export default function Relatorios() {
  const canView = hasPermission('reports_view')

  const [reportType, setReportType] = useState('employees')
  const [filters, setFilters] = useState(() => ({
    ...getDefaultDates(),
    status: 'all',
    branchId: '',
    departmentId: '',
    positionId: '',
    warningDays: 30,
    certificateStatus: 'all',
    startCompetence: '',
    endCompetence: '',
    year: new Date().getFullYear()
  }))

  const organization = useMemo(() => getReportFilters(), [])

  const data = useMemo(
    () => getReportData(reportType, filters),
    [reportType, filters]
  )

  const columns = REPORT_COLUMNS[reportType] || []

  if (!canView) {
    return (
      <div className="reports-page">
        <div className="reports-empty">
          <h2>Acesso restrito</h2>
          <p>Você não possui permissão para visualizar os relatórios.</p>
        </div>
      </div>
    )
  }

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value
    }))
  }

  function clearFilters() {
    setFilters({
      ...getDefaultDates(),
      status: 'all',
      branchId: '',
      departmentId: '',
      positionId: '',
      warningDays: 30,
      certificateStatus: 'all',
      startCompetence: '',
      endCompetence: '',
      year: new Date().getFullYear()
    })
  }

  function exportCsv() {
    const header = columns.map((column) => column[1])

    const lines = [
      header,
      ...data.rows.map((row) =>
        columns.map((column) => {
          let value = getCellValue(row, column)

          if (column[2] === 'money') value = Number(value) || 0
          if (column[2] === 'percent') value = `${Number(value) || 0}%`
          if (column[2] === 'minutes') value = formatValue(value, 'minutes')

          return String(value ?? '')
            .replace(/"/g, '""')
            .replace(/\r?\n/g, ' ')
        })
      )
    ]

    const csv = lines.map((line) => line.map((cell) => `"${cell}"`).join(';')).join('\n')
    const blob = new Blob([`\uFEFF${csv}`], {
      type: 'text/csv;charset=utf-8;'
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = `relatorio-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()

    URL.revokeObjectURL(url)
  }

  function printReport() {
    const printWindow = window.open('', '_blank', 'width=1200,height=800')

    if (!printWindow) {
      window.alert(
        'Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.'
      )
      return
    }

    const title = getReportTitle(reportType)
    const generatedAt = new Date().toLocaleString('pt-BR')
    const summaryHtml = summaryEntries.length
      ? `
          <div class="summary-grid">
            ${summaryEntries
              .map(
                ([key, value]) => `
                  <div class="summary-card">
                    <span>${escapeHtml(formatSummaryLabel(key))}</span>
                    <strong>${escapeHtml(formatSummaryValue(key, value))}</strong>
                  </div>
                `
              )
              .join('')}
          </div>
        `
      : ''

    const tableHtml =
      data.rows.length > 0
        ? `
            <table>
              <thead>
                <tr>
                  ${columns.map((column) => `<th>${escapeHtml(column[1])}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${data.rows
                  .map(
                    (row) => `
                      <tr>
                        ${columns
                          .map((column) => {
                            const rawValue = getCellValue(row, column)
                            const displayValue =
                              column[2] === 'percent'
                                ? `${Number(rawValue) || 0}%`
                                : formatValue(rawValue, column[2])

                            return `<td>${escapeHtml(displayValue)}</td>`
                          })
                          .join('')}
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          `
        : `
            <div class="empty">
              <h3>Nenhum dado encontrado</h3>
              <p>Não existem registros para os filtros selecionados.</p>
            </div>
          `

    printWindow.document.open()
    printWindow.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #1f2937;
              background: #fff;
              font-size: 11px;
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 20px;
              margin-bottom: 18px;
              border-bottom: 2px solid #1f2937;
              padding-bottom: 12px;
            }

            .kicker {
              font-size: 9px;
              font-weight: 700;
              letter-spacing: 1.2px;
              color: #6b7280;
              margin-bottom: 4px;
            }

            h1 {
              margin: 0;
              font-size: 22px;
            }

            .meta {
              text-align: right;
              color: #6b7280;
              font-size: 10px;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
              gap: 8px;
              margin-bottom: 14px;
            }

            .summary-card {
              border: 1px solid #d9dee7;
              border-radius: 5px;
              padding: 8px;
            }

            .summary-card span {
              display: block;
              color: #6b7280;
              font-size: 9px;
              margin-bottom: 3px;
            }

            .summary-card strong {
              font-size: 13px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
            }

            th,
            td {
              border: 1px solid #d9dee7;
              padding: 6px 7px;
              text-align: left;
              vertical-align: top;
            }

            th {
              background: #f1f3f6;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: .3px;
            }

            td {
              font-size: 9px;
            }

            tr {
              page-break-inside: avoid;
            }

            thead {
              display: table-header-group;
            }

            .empty {
              border: 1px solid #d9dee7;
              padding: 30px;
              text-align: center;
            }

            .empty h3,
            .empty p {
              margin: 0;
            }

            .empty p {
              margin-top: 5px;
              color: #6b7280;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="kicker">GESTÃO DE RH</div>
              <h1>${escapeHtml(title)}</h1>
            </div>
            <div class="meta">
              <div>Registros: ${data.rows.length}</div>
              <div>Gerado em: ${escapeHtml(generatedAt)}</div>
            </div>
          </div>

          ${summaryHtml}
          ${tableHtml}

          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.print()
              }, 150)
            })
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()

    printWindow.addEventListener('afterprint', () => {
      printWindow.close()
    })
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function formatSummaryValue(key, value) {
    if (key.toLowerCase().includes('rate')) {
      return `${Number(value || 0).toLocaleString('pt-BR', {
        maximumFractionDigits: 2
      })}%`
    }

    if (typeof value === 'number') {
      return number.format(value)
    }

    return value ?? '-'
  }

  const summaryEntries = Object.entries(data.summary || {}).filter(
    ([key, value]) =>
      !['statusLabels', 'month'].includes(key) &&
      typeof value !== 'object'
  )

  return (
    <div className="reports-page">
      <header className="reports-header">
        <div>
          <span className="reports-kicker">GESTÃO DE RH</span>
          <h1>Relatórios</h1>
          <p>
            Centralize indicadores e relatórios do sistema em um único lugar.
          </p>
        </div>

        <div className="reports-actions">
          <button type="button" onClick={exportCsv}>
            Exportar CSV
          </button>

          <button type="button" onClick={printReport}>
            Imprimir
          </button>
        </div>
      </header>

      <section className="reports-filters no-print">
        <div className="reports-filter-header">
          <div>
            <h3>Filtros</h3>
            <p>Use os filtros para reduzir os dados do relatório.</p>
          </div>

          <button type="button" className="reports-clear" onClick={clearFilters}>
            Limpar filtros
          </button>
        </div>

        <div className="reports-filter-grid">
          <label>
            Situação
            <select
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
            >
              {REPORT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Filial
            <select
              value={filters.branchId}
              onChange={(event) => updateFilter('branchId', event.target.value)}
            >
              <option value="">Todas</option>
              {organization.branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Departamento
            <select
              value={filters.departmentId}
              onChange={(event) =>
                updateFilter('departmentId', event.target.value)
              }
            >
              <option value="">Todos</option>
              {organization.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Cargo
            <select
              value={filters.positionId}
              onChange={(event) => updateFilter('positionId', event.target.value)}
            >
              <option value="">Todos</option>
              {organization.positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.name}
                </option>
              ))}
            </select>
          </label>

          {['admissions', 'dismissals', 'turnover', 'timeclock', 'bankhours', 'vacations', 'terminations', 'medical', 'evaluations'].includes(
            reportType
          ) && (
            <>
              <label>
                Data inicial
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(event) =>
                    updateFilter('startDate', event.target.value)
                  }
                />
              </label>

              <label>
                Data final
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(event) =>
                    updateFilter('endDate', event.target.value)
                  }
                />
              </label>
            </>
          )}

          {reportType === 'birthdays' && (
            <label>
              Mês de referência
              <input
                type="month"
                value={filters.referenceDate.slice(0, 7)}
                onChange={(event) =>
                  updateFilter('referenceDate', `${event.target.value}-01`)
                }
              />
            </label>
          )}

          {reportType === 'certificates' && (
            <>
              <label>
                Alertar vencimentos em
                <input
                  type="number"
                  min="1"
                  value={filters.warningDays}
                  onChange={(event) =>
                    updateFilter('warningDays', event.target.value)
                  }
                />
              </label>

              <label>
                Situação
                <select
                  value={filters.certificateStatus}
                  onChange={(event) =>
                    updateFilter('certificateStatus', event.target.value)
                  }
                >
                  <option value="all">Todas</option>
                  <option value="Vencendo">Vencendo</option>
                  <option value="Vencido">Vencidos</option>
                  <option value="Válido">Válidos</option>
                </select>
              </label>
            </>
          )}

          {reportType === 'payroll' && (
            <>
              <label>
                Competência inicial
                <input
                  type="month"
                  value={filters.startCompetence}
                  onChange={(event) =>
                    updateFilter('startCompetence', event.target.value)
                  }
                />
              </label>

              <label>
                Competência final
                <input
                  type="month"
                  value={filters.endCompetence}
                  onChange={(event) =>
                    updateFilter('endCompetence', event.target.value)
                  }
                />
              </label>
            </>
          )}

          {reportType === 'thirteenth' && (
            <label>
              Ano
              <input
                type="number"
                min="2000"
                max="2100"
                value={filters.year}
                onChange={(event) => updateFilter('year', event.target.value)}
              />
            </label>
          )}
        </div>
      </section>

      <section className="reports-tabs no-print">
        {REPORT_TYPES.map((report) => (
          <button
            type="button"
            key={report.key}
            className={reportType === report.key ? 'active' : ''}
            onClick={() => setReportType(report.key)}
          >
            {report.label}
          </button>
        ))}
      </section>

      <section className="reports-content">
        <div className="reports-content-header">
          <div>
            <span>RELATÓRIO ATUAL</span>
            <h2>{getReportTitle(reportType)}</h2>
          </div>

          <strong>{data.rows.length} registro(s)</strong>
        </div>

        {summaryEntries.length > 0 && (
          <div className="reports-summary-grid">
            {summaryEntries.map(([key, value]) => (
              <div className="reports-summary-card" key={key}>
                <span>{formatSummaryLabel(key)}</span>
                <strong>
                  {key.toLowerCase().includes('rate')
                    ? `${Number(value || 0).toLocaleString('pt-BR', {
                        maximumFractionDigits: 2
                      })}%`
                    : typeof value === 'number'
                      ? number.format(value)
                      : value}
                </strong>
              </div>
            ))}
          </div>
        )}

        <div className="reports-table-wrapper">
          {data.rows.length > 0 ? (
            <table className="reports-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column[0]}>{column[1]}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {data.rows.map((row, index) => (
                  <tr key={`${reportType}-${row.id || row.employee || row.name || index}-${index}`}>
                    {columns.map((column) => (
                      <td key={column[0]}>
                        {column[2] === 'percent'
                          ? `${Number(getCellValue(row, column)) || 0}%`
                          : formatValue(getCellValue(row, column), column[2])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="reports-no-data">
              <span>📊</span>
              <h3>Nenhum dado encontrado</h3>
              <p>
                Não existem registros para os filtros selecionados ou ainda
                não há dados cadastrados.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function formatSummaryLabel(key) {
  const labels = {
    total: 'Total',
    active: 'Ativos',
    inactive: 'Inativos',
    groups: 'Grupos',
    employees: 'Funcionários',
    month: 'Mês',
    admissions: 'Admissões',
    dismissals: 'Demissões',
    averageMovement: 'Movimentação média',
    trainings: 'Treinamentos',
    participants: 'Participantes',
    completed: 'Concluídos',
    approved: 'Aprovados',
    expired: 'Vencidos',
    expiring: 'Vencendo',
    valid: 'Válidos',
    scheduled: 'Agendadas',
    credits: 'Créditos',
    debits: 'Débitos',
    balance: 'Saldo',
    gross: 'Bruto',
    net: 'Líquido'
  }

  return labels[key] || key
}
