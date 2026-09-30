import { useEffect, useMemo, useState } from 'react'

import './turnover.css'

export default function Turnover() {
  const [turnoverPeriod, setTurnoverPeriod] = useState('monthly')
  const [employees, setEmployees] = useState([])

  useEffect(() => {
    loadEmployees()
  }, [])

  function loadEmployees() {
    const storedEmployees = JSON.parse(localStorage.getItem('employees')) || []

    setEmployees(storedEmployees)
  }

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
   * CONVERSÃO DE DATAS
   * ---------------------------------------------------------
   *
   * Aceita datas nos formatos:
   *
   * YYYY-MM-DD
   * DD/MM/YYYY
   *
   * Isso evita problemas caso os funcionários tenham sido
   * cadastrados utilizando formatos diferentes.
   */

  function parseDate(value) {
    if (!value) {
      return null
    }

    if (value instanceof Date) {
      return value
    }

    const stringValue = String(value)

    if (stringValue.includes('/')) {
      const [day, month, year] = stringValue.split('/')

      const date = new Date(Number(year), Number(month) - 1, Number(day))

      return Number.isNaN(date.getTime()) ? null : date
    }

    if (stringValue.includes('-')) {
      const date = new Date(stringValue)

      return Number.isNaN(date.getTime()) ? null : date
    }

    return null
  }

  /*
   * ---------------------------------------------------------
   * VERIFICAÇÃO DO PERÍODO
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
   * DADOS MENSAIS
   * ---------------------------------------------------------
   *
   * Mostra os 12 meses do ano atual.
   */

  const monthlyData = useMemo(() => {
    const months = [
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

    return months.map((month, index) => {
      let admitted = 0
      let dismissed = 0
      let employeeRequest = 0
      let companyRequest = 0

      employees.forEach((employee) => {
        const admissionDate = parseDate(employee.admissionDate)
        const dismissalDate = parseDate(employee.dismissalDate)

        /*
         * ADMISSÕES
         */
        if (isSameMonth(admissionDate, currentYear, index)) {
          admitted += 1
        }

        /*
         * DESLIGAMENTOS
         */
        if (isSameMonth(dismissalDate, currentYear, index)) {
          dismissed += 1

          /*
           * Quando chegarmos à entrevista demissional,
           * podemos utilizar um campo específico para
           * diferenciar:
           *
           * - pedido do funcionário
           * - desligamento pela empresa
           *
           * Por enquanto, verificamos alguns nomes de campos
           * possíveis para não criar dados fictícios.
           */

          const dismissalType =
            employee.dismissalType ||
            employee.terminationType ||
            employee.dismissalReasonType

          if (
            dismissalType === 'employee' ||
            dismissalType === 'employeeRequest' ||
            dismissalType === 'pedido'
          ) {
            employeeRequest += 1
          }

          if (
            dismissalType === 'company' ||
            dismissalType === 'companyRequest' ||
            dismissalType === 'empresa'
          ) {
            companyRequest += 1
          }
        }
      })

      return {
        label: month,
        admitted,
        dismissed,
        employeeRequest,
        companyRequest
      }
    })
  }, [employees, currentYear])

  /*
   * ---------------------------------------------------------
   * DADOS SEMESTRAIS
   * ---------------------------------------------------------
   *
   * O semestre apresentado depende do mês atual:
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
   *
   * No modo anual utilizamos os dados dos 12 meses.
   */

  const yearlyData = useMemo(() => {
    return monthlyData
  }, [monthlyData])

  /*
   * ---------------------------------------------------------
   * PERÍODO ATUAL
   * ---------------------------------------------------------
   */

  const currentTurnover = useMemo(() => {
    if (turnoverPeriod === 'semester') {
      return {
        label: 'Semestral',
        categories: semesterData
      }
    }

    if (turnoverPeriod === 'yearly') {
      return {
        label: 'Anual',
        categories: yearlyData
      }
    }

    return {
      label: 'Mensal',
      categories: monthlyData
    }
  }, [turnoverPeriod, monthlyData, semesterData, yearlyData])

  /*
   * ---------------------------------------------------------
   * TOTAIS
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
   * NAVEGAÇÃO DOS PERÍODOS
   * ---------------------------------------------------------
   */

  function handlePreviousPeriod() {
    if (turnoverPeriod === 'monthly') {
      setTurnoverPeriod('yearly')
    } else if (turnoverPeriod === 'semester') {
      setTurnoverPeriod('monthly')
    } else {
      setTurnoverPeriod('semester')
    }
  }

  function handleNextPeriod() {
    if (turnoverPeriod === 'monthly') {
      setTurnoverPeriod('semester')
    } else if (turnoverPeriod === 'semester') {
      setTurnoverPeriod('yearly')
    } else {
      setTurnoverPeriod('monthly')
    }
  }

  /*
   * ---------------------------------------------------------
   * RENDERIZAÇÃO
   * ---------------------------------------------------------
   */

  return (
    <section className="turnover-card">
      {/* CABEÇALHO */}

      <div className="turnover-header">
        <div>
          <h2>📊 Turnover</h2>

          <p>Admissões e desligamentos de funcionários</p>
        </div>

        <div className="turnover-period">
          <button
            type="button"
            onClick={handlePreviousPeriod}
            aria-label="Período anterior"
          >
            ‹
          </button>

          <span>{currentTurnover.label}</span>

          <button
            type="button"
            onClick={handleNextPeriod}
            aria-label="Próximo período"
          >
            ›
          </button>
        </div>
      </div>

      {/* INDICADORES */}

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

      {/* GRÁFICO */}

      <div className="turnover-chart">
        <div className="turnover-chart-area">
          {currentTurnover.categories.map((item) => {
            const admittedHeight = (item.admitted / maxValue) * 100

            const dismissedHeight = (item.dismissed / maxValue) * 100

            return (
              <div className="turnover-column" key={item.label}>
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

      {/* LEGENDA */}

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
    </section>
  )
}
