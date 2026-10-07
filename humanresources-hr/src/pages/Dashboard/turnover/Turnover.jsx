import { useEffect, useMemo, useState } from 'react'

import './turnover.css'

export default function Turnover() {
  const [turnoverPeriod, setTurnoverPeriod] = useState('monthly')

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const date = new Date()

    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  const [employees, setEmployees] = useState([])

  /*
   * ---------------------------------------------------------
   * CONFIGURAÇÃO DE DATAS
   * ---------------------------------------------------------
   */

  const currentDate = new Date()

  const currentYear = currentDate.getFullYear()

  const currentMonth = currentDate.getMonth()

  /*
   * ---------------------------------------------------------
   * NOMES DOS MESES
   * ---------------------------------------------------------
   */

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro'
  ]

  const shortMonthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez'
  ]

  /*
   * ---------------------------------------------------------
   * CARREGAR FUNCIONÁRIOS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadEmployees()
  }, [])

  function loadEmployees() {
    const storedEmployees = JSON.parse(localStorage.getItem('employees')) || []

    setEmployees(storedEmployees)
  }

  /*
   * ---------------------------------------------------------
   * CONVERSÃO DE DATAS
   * ---------------------------------------------------------
   *
   * Aceita:
   *
   * YYYY-MM-DD
   * DD/MM/YYYY
   *
   * A data é criada manualmente para evitar problemas
   * de fuso horário do JavaScript.
   */

  function parseDate(value) {
    if (!value) {
      return null
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value
    }

    const stringValue = String(value).trim()

    if (!stringValue) {
      return null
    }

    /*
     * DD/MM/YYYY
     */

    if (stringValue.includes('/')) {
      const parts = stringValue.split('/')

      if (parts.length !== 3) {
        return null
      }

      const day = Number(parts[0])
      const month = Number(parts[1])
      const year = Number(parts[2])

      const date = new Date(year, month - 1, day)

      return Number.isNaN(date.getTime()) ? null : date
    }

    /*
     * YYYY-MM-DD
     */

    if (stringValue.includes('-')) {
      const parts = stringValue.split('-')

      if (parts.length < 3) {
        return null
      }

      const year = Number(parts[0])
      const month = Number(parts[1])
      const day = Number(parts[2].slice(0, 2))

      const date = new Date(year, month - 1, day)

      return Number.isNaN(date.getTime()) ? null : date
    }

    return null
  }

  /*
   * ---------------------------------------------------------
   * VERIFICAR MÊS
   * ---------------------------------------------------------
   */

  function isSameMonth(date, year, month) {
    if (!date) {
      return false
    }

    return date.getFullYear() === year && date.getMonth() === month
  }

  /*
   * ---------------------------------------------------------
   * TIPO DE DESLIGAMENTO
   * ---------------------------------------------------------
   */

  function getDismissalType(employee) {
    return (
      employee.dismissalType ||
      employee.terminationType ||
      employee.dismissalReasonType ||
      ''
    )
  }

  /*
   * ---------------------------------------------------------
   * DADOS DE UM MÊS
   * ---------------------------------------------------------
   */

  function getMonthData(year, month) {
    let admitted = 0

    let dismissed = 0

    let employeeRequest = 0

    let companyRequest = 0

    let unknownDismissal = 0

    employees.forEach((employee) => {
      const admissionDate = parseDate(employee.admissionDate)

      const dismissalDate = parseDate(employee.dismissalDate)

      /*
       * ADMISSÕES
       */

      if (isSameMonth(admissionDate, year, month)) {
        admitted += 1
      }

      /*
       * DESLIGAMENTOS
       */

      if (isSameMonth(dismissalDate, year, month)) {
        dismissed += 1

        const dismissalType = getDismissalType(employee)

        /*
         * Pedido de demissão
         */

        if (
          dismissalType === 'employee' ||
          dismissalType === 'employeeRequest' ||
          dismissalType === 'pedido'
        ) {
          employeeRequest += 1
        } else if (

        /*
         * Desligamento pela empresa
         */
          dismissalType === 'company' ||
          dismissalType === 'companyRequest' ||
          dismissalType === 'empresa'
        ) {
          companyRequest += 1
        } else {

        /*
         * Desligamento sem motivo informado.
         */
          unknownDismissal += 1
        }
      }
    })

    return {
      year,

      month,

      label: shortMonthNames[month],

      fullLabel: `${monthNames[month]} ${year}`,

      admitted,

      dismissed,

      employeeRequest,

      companyRequest,

      unknownDismissal,

      totalMovements: admitted + dismissed
    }
  }

  /*
   * ---------------------------------------------------------
   * DADOS DOS 12 MESES
   * ---------------------------------------------------------
   */

  const monthlyData = useMemo(() => {
    return shortMonthNames.map((_, index) => getMonthData(currentYear, index))
  }, [employees, currentYear])

  /*
   * ---------------------------------------------------------
   * DADOS SEMESTRAIS
   * ---------------------------------------------------------
   *
   * Janeiro a Junho  -> primeiro semestre
   * Julho a Dezembro -> segundo semestre
   */

  const semesterData = useMemo(() => {
    const firstMonth = currentMonth < 6 ? 0 : 6

    return monthlyData.slice(firstMonth, firstMonth + 6)
  }, [monthlyData, currentMonth])

  /*
   * ---------------------------------------------------------
   * DADOS ANUAIS
   * ---------------------------------------------------------
   */

  const yearlyData = useMemo(() => {
    return monthlyData
  }, [monthlyData])

  /*
   * ---------------------------------------------------------
   * DADOS DO MÊS SELECIONADO
   * ---------------------------------------------------------
   */

  const selectedMonthData = useMemo(() => {
    return getMonthData(selectedMonth.getFullYear(), selectedMonth.getMonth())
  }, [employees, selectedMonth])

  /*
   * ---------------------------------------------------------
   * MÊS ANTERIOR
   * ---------------------------------------------------------
   */

  const previousMonth = useMemo(() => {
    return new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() - 1,
      1
    )
  }, [selectedMonth])

  const previousMonthData = useMemo(() => {
    return getMonthData(previousMonth.getFullYear(), previousMonth.getMonth())
  }, [employees, previousMonth])

  /*
   * ---------------------------------------------------------
   * PERÍODO ATUAL
   * ---------------------------------------------------------
   */

  const currentTurnover = useMemo(() => {
    if (turnoverPeriod === 'semester') {
      return {
        label: currentMonth < 6 ? '1º semestre' : '2º semestre',

        categories: semesterData
      }
    }

    if (turnoverPeriod === 'yearly') {
      return {
        label: `Anual ${currentYear}`,

        categories: yearlyData
      }
    }

    return {
      label: selectedMonthData.fullLabel,

      categories: [selectedMonthData]
    }
  }, [
    turnoverPeriod,
    semesterData,
    yearlyData,
    selectedMonthData,
    currentMonth,
    currentYear
  ])

  /*
   * ---------------------------------------------------------
   * TOTAIS DO PERÍODO
   * ---------------------------------------------------------
   */

  const totalAdmitted = currentTurnover.categories.reduce(
    (total, item) => total + item.admitted,
    0
  )

  const totalDismissed = currentTurnover.categories.reduce(
    (total, item) => total + item.dismissed,
    0
  )

  const totalEmployeeRequest = currentTurnover.categories.reduce(
    (total, item) => total + item.employeeRequest,
    0
  )

  const totalCompanyRequest = currentTurnover.categories.reduce(
    (total, item) => total + item.companyRequest,
    0
  )

  /*
   * ---------------------------------------------------------
   * ESCALA DO GRÁFICO
   * ---------------------------------------------------------
   */

  const allValues = currentTurnover.categories.flatMap((item) => [
    item.admitted,
    item.dismissed
  ])

  const maxValue = Math.max(...allValues, 1)

  /*
   * ---------------------------------------------------------
   * PORCENTAGEM
   * ---------------------------------------------------------
   *
   * Regra:
   *
   * 1 -> 1 = 0%
   * 1 -> 2 = +100%
   * 2 -> 1 = -50%
   * 0 -> 1 = Novo
   * 0 -> 0 = 0%
   */

  function calculateVariation(currentValue, previousValue) {
    if (previousValue === 0) {
      if (currentValue === 0) {
        return {
          value: 0,
          label: '0%',
          type: 'neutral'
        }
      }

      return {
        value: null,
        label: 'Novo',
        type: 'positive'
      }
    }

    const variation = ((currentValue - previousValue) / previousValue) * 100

    return {
      value: variation,

      label: `${variation > 0 ? '+' : ''}${variation.toFixed(0)}%`,

      type: variation > 0 ? 'positive' : variation < 0 ? 'negative' : 'neutral'
    }
  }

  /*
   * ---------------------------------------------------------
   * COMPARATIVO MENSAL
   * ---------------------------------------------------------
   */

  const monthlyComparison = useMemo(() => {
    return [
      {
        key: 'admitted',

        label: 'Admissões',

        current: selectedMonthData.admitted,

        previous: previousMonthData.admitted
      },

      {
        key: 'dismissed',

        label: 'Desligamentos',

        current: selectedMonthData.dismissed,

        previous: previousMonthData.dismissed
      },

      {
        key: 'employeeRequest',

        label: 'Pedido de demissão',

        current: selectedMonthData.employeeRequest,

        previous: previousMonthData.employeeRequest
      },

      {
        key: 'companyRequest',

        label: 'Desligamento pela empresa',

        current: selectedMonthData.companyRequest,

        previous: previousMonthData.companyRequest
      }
    ].map((item) => ({
      ...item,

      variation: calculateVariation(item.current, item.previous)
    }))
  }, [selectedMonthData, previousMonthData])

  /*
   * ---------------------------------------------------------
   * GRÁFICO DE PIZZA
   * ---------------------------------------------------------
   */

  const monthlyPieData = useMemo(() => {
    const data = [
      {
        key: 'admitted',

        label: 'Admissões',

        value: selectedMonthData.admitted,

        className: 'admitted'
      },

      {
        key: 'employeeRequest',

        label: 'Pedido de demissão',

        value: selectedMonthData.employeeRequest,

        className: 'employee-request'
      },

      {
        key: 'companyRequest',

        label: 'Desligamento pela empresa',

        value: selectedMonthData.companyRequest,

        className: 'company-request'
      },

      {
        key: 'unknownDismissal',

        label: 'Desligamento sem motivo informado',

        value: selectedMonthData.unknownDismissal,

        className: 'unknown'
      }
    ]

    return data.filter((item) => item.value > 0)
  }, [selectedMonthData])

  const monthlyPieTotal = monthlyPieData.reduce(
    (total, item) => total + item.value,
    0
  )

  /*
   * ---------------------------------------------------------
   * CORES DO GRÁFICO DE PIZZA
   * ---------------------------------------------------------
   */

  function getPieColor(className) {
    if (className === 'admitted') {
      return '#4f67c6'
    }

    if (className === 'employee-request') {
      return '#f0ad4e'
    }

    if (className === 'company-request') {
      return '#8e7cc3'
    }

    return '#94a3b8'
  }

  /*
   * ---------------------------------------------------------
   * GRADIENTE DA PIZZA
   * ---------------------------------------------------------
   */

  function buildPieGradient() {
    if (monthlyPieTotal === 0) {
      return 'conic-gradient(#e8edf5 0deg 360deg)'
    }

    let currentDegree = 0

    const gradients = monthlyPieData.map((item) => {
      const start = currentDegree

      const end = currentDegree + (item.value / monthlyPieTotal) * 360

      currentDegree = end

      return `${getPieColor(item.className)} ${start}deg ${end}deg`
    })

    return `conic-gradient(${gradients.join(', ')})`
  }

  /*
   * ---------------------------------------------------------
   * VARIAÇÃO DAS CONTRATAÇÕES
   * ---------------------------------------------------------
   */

  const admissionVariation = calculateVariation(
    selectedMonthData.admitted,
    previousMonthData.admitted
  )

  /*
   * ---------------------------------------------------------
   * VERIFICAR MÊS ATUAL
   * ---------------------------------------------------------
   */

  const isCurrentMonth =
    selectedMonth.getFullYear() === currentYear &&
    selectedMonth.getMonth() === currentMonth

  /*
   * ---------------------------------------------------------
   * NAVEGAR PARA MÊS ANTERIOR
   * ---------------------------------------------------------
   */

  function handlePreviousMonth() {
    setSelectedMonth(
      (currentSelectedMonth) =>
        new Date(
          currentSelectedMonth.getFullYear(),
          currentSelectedMonth.getMonth() - 1,
          1
        )
    )
  }

  /*
   * ---------------------------------------------------------
   * NAVEGAR PARA PRÓXIMO MÊS
   * ---------------------------------------------------------
   */

  function handleNextMonth() {
    if (isCurrentMonth) {
      return
    }

    setSelectedMonth(
      (currentSelectedMonth) =>
        new Date(
          currentSelectedMonth.getFullYear(),
          currentSelectedMonth.getMonth() + 1,
          1
        )
    )
  }

  /*
   * ---------------------------------------------------------
   * RENDERIZAÇÃO
   * ---------------------------------------------------------
   */

  return (
    <section className="turnover-card">
      {/* =====================================================
          CABEÇALHO
      ===================================================== */}

      <div className="turnover-header">
        <div>
          <h2>📊 Turnover</h2>

          <p>Admissões e desligamentos de funcionários</p>
        </div>

        <div className="turnover-controls">
          {/* =================================================
              SELEÇÃO DO PERÍODO
          ================================================= */}

          <div className="turnover-period-tabs">
            <button
              type="button"
              className={turnoverPeriod === 'monthly' ? 'active' : ''}
              onClick={() => setTurnoverPeriod('monthly')}
            >
              Mensal
            </button>

            <button
              type="button"
              className={turnoverPeriod === 'semester' ? 'active' : ''}
              onClick={() => setTurnoverPeriod('semester')}
            >
              Semestral
            </button>

            <button
              type="button"
              className={turnoverPeriod === 'yearly' ? 'active' : ''}
              onClick={() => setTurnoverPeriod('yearly')}
            >
              Anual
            </button>
          </div>

          {/* =================================================
              NAVEGAÇÃO MENSAL
          ================================================= */}

          {turnoverPeriod === 'monthly' && (
            <div className="turnover-month-navigation">
              <button
                type="button"
                onClick={handlePreviousMonth}
                aria-label="Mês anterior"
              >
                ‹
              </button>

              <span>
                {monthNames[selectedMonth.getMonth()]}{' '}
                {selectedMonth.getFullYear()}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
                disabled={isCurrentMonth}
              >
                ›
              </button>
            </div>
          )}

          {/* =================================================
              IDENTIFICAÇÃO DO SEMESTRE
          ================================================= */}

          {turnoverPeriod === 'semester' && (
            <div className="turnover-year-label">
              {currentMonth < 6 ? '1º semestre' : '2º semestre'}
            </div>
          )}

          {/* =================================================
              IDENTIFICAÇÃO DO ANO
          ================================================= */}

          {turnoverPeriod === 'yearly' && (
            <div className="turnover-year-label">{currentYear}</div>
          )}
        </div>
      </div>

      {/* =====================================================
          INDICADORES
      ===================================================== */}

      <div className="turnover-summary">
        <div className="turnover-summary-item">
          <span className="turnover-summary-label">Admitidos</span>

          <strong className="turnover-summary-value">{totalAdmitted}</strong>
        </div>

        <div className="turnover-summary-item">
          <span className="turnover-summary-label">Desligados</span>

          <strong className="turnover-summary-value">{totalDismissed}</strong>
        </div>

        <div className="turnover-summary-item">
          <span className="turnover-summary-label">Pedido de demissão</span>

          <strong className="turnover-summary-value">
            {totalEmployeeRequest}
          </strong>
        </div>

        <div className="turnover-summary-item">
          <span className="turnover-summary-label">
            Desligamento pela empresa
          </span>

          <strong className="turnover-summary-value">
            {totalCompanyRequest}
          </strong>
        </div>
      </div>

      {/* =====================================================
          VISÃO MENSAL
      ===================================================== */}

      {turnoverPeriod === 'monthly' ? (
        <div className="turnover-monthly-content">
          <div className="turnover-monthly-overview">
            {/* ===============================================
                PIZZA
            =============================================== */}

            <div className="turnover-pie-section">
              <div className="turnover-section-title">
                <div>
                  <strong>Movimentações do mês</strong>

                  <span>{selectedMonthData.fullLabel}</span>
                </div>
              </div>

              <div className="turnover-pie-content">
                <div
                  className="turnover-pie"
                  style={{
                    background: buildPieGradient()
                  }}
                >
                  <div className="turnover-pie-center">
                    <strong>{monthlyPieTotal}</strong>

                    <span>movimentações</span>
                  </div>
                </div>

                <div className="turnover-pie-legend">
                  {monthlyPieData.length > 0 ? (
                    monthlyPieData.map((item) => (
                      <div key={item.key}>
                        <span className={`legend-dot ${item.className}`} />

                        <div>
                          <strong>{item.value}</strong>

                          <span>{item.label}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="turnover-no-data">
                      Nenhuma movimentação registrada neste mês.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ===============================================
                COMPARATIVO
            =============================================== */}

            <div className="turnover-comparison">
              <div className="turnover-section-title">
                <div>
                  <strong>Comparativo com o mês anterior</strong>

                  <span>{previousMonthData.fullLabel}</span>
                </div>
              </div>

              <div className="turnover-comparison-list">
                {monthlyComparison.map((item) => {
                  const difference = item.current - item.previous

                  return (
                    <div className="turnover-comparison-item" key={item.key}>
                      <div>
                        <strong>{item.label}</strong>

                        <span>
                          {item.current} neste mês · {item.previous} no anterior
                        </span>
                      </div>

                      <div
                        className={`turnover-variation ${item.variation.type}`}
                      >
                        <strong>
                          {difference > 0 ? '+' : ''}
                          {difference}
                        </strong>

                        <span>{item.variation.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ===============================================
              DESTAQUE DAS CONTRATAÇÕES
          =============================================== */}

          <div className="turnover-month-highlight">
            <div>
              <span>Contratações em {selectedMonthData.fullLabel}</span>

              <strong>{selectedMonthData.admitted}</strong>
            </div>

            <div>
              <span>Contratações em {previousMonthData.fullLabel}</span>

              <strong>{previousMonthData.admitted}</strong>
            </div>

            <div>
              <span>Variação de contratações</span>

              <strong>{admissionVariation.label}</strong>
            </div>
          </div>
        </div>
      ) : (
        /* ===================================================
           VISÃO SEMESTRAL / ANUAL
        =================================================== */

        <>
          <div className="turnover-chart">
            <div className="turnover-chart-area">
              {currentTurnover.categories.map((item) => {
                const admittedHeight = (item.admitted / maxValue) * 100

                const dismissedHeight = (item.dismissed / maxValue) * 100

                return (
                  <div
                    className="turnover-column"
                    key={`${item.year}-${item.month}`}
                  >
                    <div className="turnover-bars">
                      <div
                        className="turnover-bar admitted"
                        style={{
                          height: `${admittedHeight}%`
                        }}
                        title={`Admitidos: ${item.admitted}`}
                      />

                      <div
                        className="turnover-bar dismissed"
                        style={{
                          height: `${dismissedHeight}%`
                        }}
                        title={`Desligados: ${item.dismissed}`}
                      />
                    </div>

                    <span className="turnover-month">{item.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ===============================================
              LEGENDA
          =============================================== */}

          <div className="turnover-legend">
            <div>
              <span className="legend-dot admitted" />
              Admitidos
            </div>

            <div>
              <span className="legend-dot dismissed" />
              Desligados
            </div>

            <div>
              <span className="legend-dot employee-request" />
              Pedido de demissão
            </div>

            <div>
              <span className="legend-dot company-request" />
              Desligamento pela empresa
            </div>
          </div>
        </>
      )}
    </section>
  )
}
