import { useEffect, useState } from 'react'

import './meuEspelho.css'

import { hasPermission } from '../../../services/permissions'

import { getEmployees } from '../../../services/employee'

import {
  calculateTimeClockPeriod,
  formatBalance,
  formatMinutes,
  PUNCH_TYPE_LABELS
} from '../../../services/timeClock'

export default function MeuEspelho() {
  const [currentUser, setCurrentUser] = useState(null)

  const [employee, setEmployee] = useState(null)

  /*
   * ============================================================
   * PERÍODO
   * ============================================================
   *
   * O espelho agora trabalha com duas datas independentes.
   *
   * Isso permite trabalhar com competências como:
   *
   * 20/09/2026 → 20/10/2026
   * 21/09/2026 → 20/10/2026
   * 01/10/2026 → 31/10/2026
   */

  const initialPeriod = getInitialPeriod()

  const [startDate, setStartDate] = useState(initialPeriod.startDate)

  const [endDate, setEndDate] = useState(initialPeriod.endDate)

  const [period, setPeriod] = useState(null)

  const [loading, setLoading] = useState(true)

  const [periodError, setPeriodError] = useState('')

  /*
   * ============================================================
   * CARREGAMENTO DO USUÁRIO
   * ============================================================
   */

  useEffect(() => {
    loadEmployee()
  }, [])

  /*
   * ============================================================
   * ATUALIZA O ESPELHO
   * ============================================================
   */

  useEffect(() => {
    if (!employee?.id) {
      setPeriod(null)

      return
    }

    loadPeriod(employee.id, startDate, endDate)
  }, [employee, startDate, endDate])

  /*
   * ============================================================
   * CARREGA FUNCIONÁRIO VINCULADO
   * ============================================================
   */

  function loadEmployee() {
    setLoading(true)

    try {
      const loggedUser = JSON.parse(localStorage.getItem('loggedUser'))

      setCurrentUser(loggedUser)

      if (!loggedUser?.employeeId) {
        setEmployee(null)

        return
      }

      const employees = getEmployees()

      const linkedEmployee = employees.find(
        (item) => Number(item.id) === Number(loggedUser.employeeId)
      )

      setEmployee(linkedEmployee || null)
    } finally {
      setLoading(false)
    }
  }

  /*
   * ============================================================
   * CARREGA PERÍODO
   * ============================================================
   */

  function loadPeriod(employeeId, periodStart, periodEnd) {
    if (!periodStart || !periodEnd) {
      return
    }

    const start = parseDate(periodStart)

    const end = parseDate(periodEnd)

    if (!start || !end) {
      setPeriodError('Informe datas válidas para o período.')

      setPeriod(null)

      return
    }

    if (start > end) {
      setPeriodError('A data inicial não pode ser posterior à data final.')

      setPeriod(null)

      return
    }

    setPeriodError('')

    setLoading(true)

    try {
      const result = calculateTimeClockPeriod(employeeId, start, end)

      setPeriod(result)
    } finally {
      setLoading(false)
    }
  }

  /*
   * ============================================================
   * ALTERAÇÃO DAS DATAS
   * ============================================================
   */

  function handleStartDateChange(event) {
    const value = event.target.value

    setStartDate(value)

    /*
     * Se a nova data inicial ficar depois da final,
     * ajustamos automaticamente a data final.
     */

    if (value && endDate && value > endDate) {
      setEndDate(value)
    }
  }

  function handleEndDateChange(event) {
    const value = event.target.value

    setEndDate(value)

    /*
     * Se a nova data final ficar antes da inicial,
     * ajustamos automaticamente a data inicial.
     */

    if (value && startDate && value < startDate) {
      setStartDate(value)
    }
  }

  /*
   * ============================================================
   * NAVEGAÇÃO ENTRE PERÍODOS
   * ============================================================
   *
   * O próximo período começa no dia seguinte ao encerramento
   * do período atual.
   *
   * Exemplo:
   *
   * 20/09 → 20/10
   *
   * próximo:
   *
   * 21/10 → 20/11
   *
   * Isso permite trabalhar com fechamentos de folha.
   */

  function changePeriod(direction) {
    const start = parseDate(startDate)

    const end = parseDate(endDate)

    if (!start || !end || start > end) {
      return
    }

    const periodLength = calculateDateDifference(start, end)

    const newStart = new Date(start)

    if (direction > 0) {
      newStart.setDate(newStart.getDate() + periodLength + 1)
    } else {
      newStart.setDate(newStart.getDate() - periodLength - 1)
    }

    const newEnd = new Date(newStart)

    newEnd.setDate(newEnd.getDate() + periodLength)

    setStartDate(formatDateInput(newStart))

    setEndDate(formatDateInput(newEnd))
  }

  /*
   * ============================================================
   * TOTAIS
   * ============================================================
   */

  const totals = period?.totals || {
    expectedMinutes: 0,
    workedMinutes: 0,
    balanceMinutes: 0,
    overtimeMinutes: 0,
    deficitMinutes: 0,
    absenceDays: 0,
    courseDays: 0,
    offDays: 0,
    pendingDays: 0
  }

  /*
   * ============================================================
   * PERMISSÃO
   * ============================================================
   */

  if (!hasPermission('ponto_espelho_view')) {
    return (
      <div className="time-clock-page">
        <div className="time-clock-access-denied">
          <h2>Acesso negado</h2>

          <p>Você não possui permissão para visualizar seu espelho de ponto.</p>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * USUÁRIO SEM VÍNCULO
   * ============================================================
   */

  if (!currentUser?.employeeId && !loading) {
    return (
      <div className="time-clock-page">
        <div className="time-clock-container">
          <section className="time-clock-card">
            <div className="time-clock-warning">
              <strong>Funcionário não vinculado</strong>

              <p>
                Este usuário ainda não está vinculado a um funcionário. Vincule
                o usuário ao cadastro de um funcionário para visualizar o
                espelho de ponto.
              </p>
            </div>
          </section>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * FUNCIONÁRIO NÃO ENCONTRADO
   * ============================================================
   */

  if (!employee && !loading) {
    return (
      <div className="time-clock-page">
        <div className="time-clock-container">
          <section className="time-clock-card">
            <div className="time-clock-warning">
              <strong>Funcionário não encontrado</strong>

              <p>
                O funcionário vinculado ao usuário não foi encontrado no
                cadastro.
              </p>
            </div>
          </section>
        </div>
      </div>
    )
  }

  /*
   * ============================================================
   * CARREGANDO
   * ============================================================
   */

  if (loading && !period) {
    return (
      <div className="time-clock-page">
        <div className="time-clock-container">
          <section className="time-clock-card">
            <div className="time-clock-loading">
              Carregando espelho de ponto...
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="time-clock-page">
      <div className="time-clock-container">
        {/* ======================================================
            CABEÇALHO
        ====================================================== */}

        <header className="time-clock-page-header">
          <div>
            <span>PONTO</span>

            <h1>Meu Espelho</h1>

            <p>
              Consulte suas marcações, horas trabalhadas e saldo da jornada.
            </p>
          </div>

          {employee && (
            <div className="time-clock-employee-summary">
              <div className="time-clock-avatar">
                {employee.name?.charAt(0).toUpperCase() || '?'}
              </div>

              <div>
                <strong>{employee.name}</strong>

                <span>
                  {employee.position || employee.jobTitle || 'Funcionário'}
                </span>
              </div>
            </div>
          )}
        </header>

        {/* ======================================================
            SELETOR DO PERÍODO
        ====================================================== */}

        <section className="time-clock-card time-clock-period-card">
          <div className="time-clock-period-navigation">
            <button
              type="button"
              className="time-clock-month-button"
              onClick={() => changePeriod(-1)}
              title="Período anterior"
            >
              ‹
            </button>

            <div className="time-clock-period">
              <span>Período da folha</span>

              <strong>
                {formatDisplayDate(startDate)} → {formatDisplayDate(endDate)}
              </strong>
            </div>

            <button
              type="button"
              className="time-clock-month-button"
              onClick={() => changePeriod(1)}
              title="Próximo período"
            >
              ›
            </button>
          </div>

          <div className="time-clock-date-fields">
            <label>
              <span>Data inicial</span>

              <input
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
              />
            </label>

            <span className="time-clock-date-separator">até</span>

            <label>
              <span>Data final</span>

              <input
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
              />
            </label>
          </div>

          {periodError && (
            <div className="time-clock-period-error">{periodError}</div>
          )}
        </section>

        {/* ======================================================
            RESUMO
        ====================================================== */}

        <section className="time-clock-summary-grid">
          <SummaryCard
            label="Horas previstas"
            value={formatMinutes(totals.expectedMinutes)}
            description="Carga prevista no período"
          />

          <SummaryCard
            label="Horas trabalhadas"
            value={formatMinutes(totals.workedMinutes)}
            description="Tempo registrado"
          />

          <SummaryCard
            label="Saldo"
            value={formatBalance(totals.balanceMinutes)}
            description={
              totals.balanceMinutes >= 0 ? 'Saldo positivo' : 'Saldo negativo'
            }
            variant={
              totals.balanceMinutes > 0
                ? 'positive'
                : totals.balanceMinutes < 0
                  ? 'negative'
                  : 'neutral'
            }
          />

          <SummaryCard
            label="Horas extras"
            value={formatMinutes(totals.overtimeMinutes)}
            description="Excedente registrado"
            variant="positive"
          />

          <SummaryCard
            label="Déficit"
            value={formatMinutes(totals.deficitMinutes)}
            description="Horas não cumpridas"
            variant={totals.deficitMinutes > 0 ? 'negative' : 'neutral'}
          />

          <SummaryCard
            label="Faltas"
            value={String(totals.absenceDays)}
            description="Dias sem registro"
            variant={totals.absenceDays > 0 ? 'negative' : 'neutral'}
          />

          <SummaryCard
            label="Cursos / Abonos"
            value={String(totals.courseDays)}
            description="Dias abonados"
            variant="neutral"
          />

          <SummaryCard
            label="Folgas"
            value={String(totals.offDays)}
            description="Dias previstos como folga"
            variant="neutral"
          />
        </section>

        {/* ======================================================
            TABELA DIÁRIA
        ====================================================== */}

        <section className="time-clock-card">
          <div className="time-clock-section-header">
            <div>
              <h2>Registro diário</h2>

              <p>
                Confira a jornada prevista, as marcações e o saldo de cada dia.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="time-clock-loading">Atualizando período...</div>
          ) : !period?.days?.length ? (
            <div className="time-clock-empty">
              <span>🕐</span>

              <h3>Nenhum registro encontrado</h3>

              <p>Não existem dias para o período selecionado.</p>
            </div>
          ) : (
            <div className="time-clock-daily-list">
              {period.days.map((day) => (
                <DailyRow key={day.date} day={day} />
              ))}
            </div>
          )}
        </section>
      </div>
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
    <article className={`time-clock-summary-card ${variant}`}>
      <span>{label}</span>

      <strong>{value}</strong>

      <small>{description}</small>
    </article>
  )
}

/*
 * ============================================================
 * LINHA DO DIA
 * ============================================================
 */

function DailyRow({ day }) {
  const date = parseDate(day.date)

  const weekday = date
    ? date.toLocaleDateString('pt-BR', {
        weekday: 'short'
      })
    : '—'

  const formattedDate = date ? date.toLocaleDateString('pt-BR') : day.date

  const statusClass = `status-${day.status}`

  return (
    <article className="time-clock-daily-row">
      {/* ======================================================
          DATA
      ====================================================== */}

      <div className="time-clock-day-date">
        <strong>{weekday.replace('.', '')}</strong>

        <span>{formattedDate}</span>
      </div>

      {/* ======================================================
          STATUS
      ====================================================== */}

      <div className="time-clock-day-status">
        <span className={`time-clock-status-badge ${statusClass}`}>
          {day.label}
        </span>
      </div>

      {/* ======================================================
          HORAS
      ====================================================== */}

      <div className="time-clock-day-hours">
        <div>
          <span>Previstas</span>

          <strong>{formatMinutes(day.expectedMinutes)}</strong>
        </div>

        <div>
          <span>Trabalhadas</span>

          <strong>{formatMinutes(day.workedMinutes)}</strong>
        </div>

        <div>
          <span>Saldo</span>

          <strong
            className={
              day.differenceMinutes > 0
                ? 'positive'
                : day.differenceMinutes < 0
                  ? 'negative'
                  : ''
            }
          >
            {formatBalance(day.differenceMinutes)}
          </strong>
        </div>
      </div>

      {/* ======================================================
          BATIDAS
      ====================================================== */}

      <div className="time-clock-day-punches">
        {!day.record?.punches?.length ? (
          <span className="time-clock-no-punch">Sem marcações</span>
        ) : (
          day.record.punches.map((punch) => (
            <div className="time-clock-mini-punch" key={punch.id}>
              <strong>{punch.time}</strong>

              <span>{PUNCH_TYPE_LABELS[punch.type]}</span>
            </div>
          ))
        )}
      </div>
    </article>
  )
}

/*
 * ============================================================
 * PERÍODO INICIAL
 * ============================================================
 *
 * Por enquanto iniciamos no primeiro e último dia do mês atual.
 *
 * A configuração do fechamento da empresa será adicionada
 * posteriormente.
 */

function getInitialPeriod() {
  const today = new Date()

  const year = today.getFullYear()

  const month = today.getMonth()

  const startDate = new Date(year, month, 1)

  const endDate = new Date(year, month + 1, 0)

  return {
    startDate: formatDateInput(startDate),
    endDate: formatDateInput(endDate)
  }
}

/*
 * ============================================================
 * DATA PARA INPUT
 * ============================================================
 */

function formatDateInput(date) {
  const year = date.getFullYear()

  const month = String(date.getMonth() + 1).padStart(2, '0')

  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/*
 * ============================================================
 * DATA PARA EXIBIÇÃO
 * ============================================================
 */

function formatDisplayDate(dateString) {
  const date = parseDate(dateString)

  if (!date) {
    return '—'
  }

  return date.toLocaleDateString('pt-BR')
}

/*
 * ============================================================
 * CONVERTE STRING PARA DATE
 * ============================================================
 */

function parseDate(dateString) {
  if (!dateString) {
    return null
  }

  const [year, month, day] = dateString.split('-').map(Number)

  const date = new Date(year, month - 1, day)

  return Number.isNaN(date.getTime()) ? null : date
}

/*
 * ============================================================
 * DIFERENÇA ENTRE DATAS
 * ============================================================
 *
 * Retorna a quantidade de dias entre duas datas.
 *
 * Exemplo:
 *
 * 20/09 → 20/10
 *
 * retorna 30.
 */

function calculateDateDifference(startDate, endDate) {
  const start = new Date(startDate)

  const end = new Date(endDate)

  start.setHours(0, 0, 0, 0)

  end.setHours(0, 0, 0, 0)

  return Math.round((end - start) / (1000 * 60 * 60 * 24))
}
