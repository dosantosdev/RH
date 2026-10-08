import { useMemo, useState } from 'react'

import { hasPermission } from '../../services/permissions'

import { getEmployees } from '../../services/employee'

import { getPayrollByCompetence } from '../../services/payroll'

import {
  addBankHoursEntry,
  BANK_HOURS_ENTRY_CATEGORIES,
  BANK_HOURS_ENTRY_TYPES,
  deleteBankHoursEntry,
  getBankHoursEntries
} from '../../services/bankHours'

import {
  calculateBankHoursSummary,
  calculateFinancialReports,
  calculateTermination,
  calculateThirteenth,
  calculateVacation,
  deleteVacation,
  formatDate,
  formatMinutes,
  formatMoney,
  getTerminations,
  getThirteenths,
  getVacations,
  printPayslip,
  saveTermination,
  saveThirteenth,
  saveVacation
} from '../../services/financialAdvanced'

import './gestaoFinanceira.css'

const TABS = [
  ['reports', 'Relatórios'],
  ['bank', 'Banco de Horas'],
  ['vacation', 'Férias'],
  ['thirteenth', '13º Salário'],
  ['termination', 'Rescisão'],
  ['payslip', 'Demonstrativos']
]

function currentCompetence() {
  const date = new Date()

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function endOfMonth(competence) {
  if (!competence) {
    return ''
  }

  const [year, month] = competence.split('-').map(Number)

  return `${year}-${String(month).padStart(2, '0')}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, '0')}`
}

export default function GestaoFinanceira() {
  const canView = hasPermission('finance_advanced_view')

  const canManage = hasPermission('finance_advanced_manage')

  const employees = useMemo(
    () =>
      getEmployees().sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
      ),
    []
  )

  const [tab, setTab] = useState('reports')

  const [competence, setCompetence] = useState(currentCompetence())

  const [employeeId, setEmployeeId] = useState('')

  const [startDate, setStartDate] = useState(
    `${new Date().getFullYear()}-01-01`
  )

  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10))

  const [message, setMessage] = useState('')

  const [entries, setEntries] = useState(() => getBankHoursEntries())

  const [vacations, setVacations] = useState(() => getVacations())

  const [thirteenths, setThirteenths] = useState(() => getThirteenths())

  const [terminations, setTerminations] = useState(() => getTerminations())

  const [vacationDays, setVacationDays] = useState(30)

  const [abonoDays, setAbonoDays] = useState(0)

  const [thirteenthYear, setThirteenthYear] = useState(new Date().getFullYear())

  const [terminationDate, setTerminationDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [terminationReason, setTerminationReason] = useState('sem_justa_causa')

  const [noticeDays, setNoticeDays] = useState(30)

  const [terminationVacationDays, setTerminationVacationDays] = useState(0)

  const [unpaidDeductions, setUnpaidDeductions] = useState(0)

  const [bankMinutes, setBankMinutes] = useState(60)

  const [bankType, setBankType] = useState('credit')

  const [bankCategory, setBankCategory] = useState('manual_adjustment')

  const [bankDate, setBankDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  const [bankDescription, setBankDescription] = useState('')

  const selectedEmployee = employees.find(
    (employee) => Number(employee.id) === Number(employeeId)
  )

  const report = useMemo(
    () => calculateFinancialReports(startDate.slice(0, 7), endDate.slice(0, 7)),
    [startDate, endDate]
  )

  const bankSummary = employeeId
    ? calculateBankHoursSummary(employeeId, startDate, endDate)
    : null

  const vacationCalculation = employeeId
    ? calculateVacation(employeeId, startDate, vacationDays, {
        abonoDays
      })
    : null

  const thirteenthCalculation = employeeId
    ? calculateThirteenth(employeeId, thirteenthYear)
    : null

  const terminationCalculation = employeeId
    ? calculateTermination(employeeId, terminationDate, {
        reason: terminationReason,

        noticeDays,

        vacationDays: terminationVacationDays,

        unpaidDeductions
      })
    : null

  const payroll = getPayrollByCompetence(competence)

  function notify(text) {
    setMessage(text)

    window.setTimeout(() => setMessage(''), 3000)
  }

  function addBankEntry() {
    if (!canManage) {
      return
    }

    if (!employeeId) {
      notify('Selecione um funcionário.')

      return
    }

    if (!bankMinutes || Number(bankMinutes) <= 0) {
      notify('Informe os minutos.')

      return
    }

    addBankHoursEntry({
      employeeId: Number(employeeId),

      date: bankDate,

      type: bankType,

      category: bankCategory,

      minutes: Number(bankMinutes),

      description: bankDescription || 'Lançamento financeiro'
    })

    setEntries(getBankHoursEntries())

    notify('Lançamento do banco de horas salvo.')
  }

  function saveVacationRecord() {
    if (!canManage || !vacationCalculation) {
      return
    }

    saveVacation({
      employeeId: Number(employeeId),

      startDate,

      days: vacationDays,

      abonoDays,

      calculation: vacationCalculation,

      status: 'scheduled'
    })

    setVacations(getVacations())

    notify('Férias registradas.')
  }

  function saveThirteenthRecord() {
    if (!canManage || !thirteenthCalculation) {
      return
    }

    saveThirteenth({
      employeeId: Number(employeeId),

      year: thirteenthYear,

      calculation: thirteenthCalculation,

      status: 'calculated'
    })

    setThirteenths(getThirteenths())

    notify('13º salário registrado.')
  }

  function saveTerminationRecord() {
    if (!canManage || !terminationCalculation) {
      return
    }

    saveTermination({
      employeeId: Number(employeeId),

      dismissalDate: terminationDate,

      calculation: terminationCalculation,

      status: 'simulated'
    })

    setTerminations(getTerminations())

    notify('Simulação de rescisão registrada.')
  }

  if (!canView) {
    return (
      <div className="financial-advanced">
        <div className="financial-denied">
          <span>🔒</span>

          <h2>Acesso negado</h2>

          <p>Você não possui permissão para acessar a gestão financeira.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="financial-advanced">
      <header className="financial-advanced-header">
        <div>
          <span>FINANCEIRO</span>

          <h1>Gestão Financeira</h1>

          <p>
            Relatórios, banco de horas, férias, 13º, rescisões e demonstrativos.
          </p>
        </div>

        <select
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
        >
          <option value="">Selecione um funcionário</option>

          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </header>

      {message && <div className="financial-message">{message}</div>}

      <nav className="financial-tabs">
        {TABS.map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? 'active' : ''}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* ======================================================
          RELATÓRIOS
      ====================================================== */}

      {tab === 'reports' && (
        <section className="financial-section">
          <div className="financial-filters">
            <label>
              De
              <input
                type="month"
                value={startDate.slice(0, 7)}
                onChange={(event) => setStartDate(`${event.target.value}-01`)}
              />
            </label>

            <label>
              Até
              <input
                type="month"
                value={endDate.slice(0, 7)}
                onChange={(event) => setEndDate(endOfMonth(event.target.value))}
              />
            </label>
          </div>

          <div className="financial-cards">
            <article>
              <span>Bruto</span>

              <strong>{formatMoney(report.totals.gross)}</strong>
            </article>

            <article>
              <span>Descontos</span>

              <strong>{formatMoney(report.totals.deductions)}</strong>
            </article>

            <article>
              <span>Líquido</span>

              <strong>{formatMoney(report.totals.net)}</strong>
            </article>

            <article>
              <span>Horas extras</span>

              <strong>{formatMinutes(report.totals.overtimeMinutes)}</strong>
            </article>

            <article>
              <span>INSS</span>

              <strong>{formatMoney(report.totals.inss)}</strong>
            </article>

            <article>
              <span>IRRF</span>

              <strong>{formatMoney(report.totals.irrf)}</strong>
            </article>

            <article>
              <span>FGTS empresa</span>

              <strong>{formatMoney(report.totals.fgts)}</strong>
            </article>
          </div>

          <h2>Por competência</h2>

          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Competência</th>

                  <th>Status</th>

                  <th>Funcionários</th>

                  <th>Bruto</th>

                  <th>Descontos</th>

                  <th>Líquido</th>
                </tr>
              </thead>

              <tbody>
                {report.byCompetence.map((row) => (
                  <tr key={row.competence}>
                    <td>{row.competence}</td>

                    <td>{row.status === 'closed' ? 'Fechada' : 'Em aberto'}</td>

                    <td>{row.employees}</td>

                    <td>{formatMoney(row.gross)}</td>

                    <td>{formatMoney(row.deductions)}</td>

                    <td>{formatMoney(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Maiores custos acumulados</h2>

          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Funcionário</th>

                  <th>Bruto</th>

                  <th>Líquido</th>

                  <th>Horas extras</th>
                </tr>
              </thead>

              <tbody>
                {report.byEmployee.slice(0, 10).map((row) => (
                  <tr key={row.employeeId}>
                    <td>{row.employeeName}</td>

                    <td>{formatMoney(row.gross)}</td>

                    <td>{formatMoney(row.net)}</td>

                    <td>{formatMinutes(row.overtimeMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Custos por departamento</h2>

          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Departamento</th>
                  <th>Funcionários</th>
                  <th>Bruto</th>
                  <th>Descontos</th>
                  <th>FGTS</th>
                  <th>Líquido</th>
                </tr>
              </thead>

              <tbody>
                {report.byDepartment.map((row) => (
                  <tr key={row.department}>
                    <td>{row.department}</td>
                    <td>{row.employees}</td>
                    <td>{formatMoney(row.gross)}</td>
                    <td>{formatMoney(row.deductions)}</td>
                    <td>{formatMoney(row.fgts)}</td>
                    <td>{formatMoney(row.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ======================================================
          BANCO DE HORAS
      ====================================================== */}

      {tab === 'bank' && (
        <section className="financial-section">
          <h2>Banco de Horas</h2>

          <div className="financial-filters">
            <label>
              Início
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label>
              Fim
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
          </div>

          {bankSummary ? (
            <div className="financial-cards">
              <article>
                <span>Previsto</span>

                <strong>{formatMinutes(bankSummary.expectedMinutes)}</strong>
              </article>

              <article>
                <span>Trabalhado</span>

                <strong>{formatMinutes(bankSummary.workedMinutes)}</strong>
              </article>

              <article>
                <span>Extras</span>

                <strong>{formatMinutes(bankSummary.overtimeMinutes)}</strong>
              </article>

              <article>
                <span>Saldo</span>

                <strong>{formatMinutes(bankSummary.balanceMinutes)}</strong>
              </article>
            </div>
          ) : (
            <p>Selecione um funcionário para visualizar o saldo.</p>
          )}

          {canManage && (
            <div className="financial-form-grid">
              <label>
                Data
                <input
                  type="date"
                  value={bankDate}
                  onChange={(event) => setBankDate(event.target.value)}
                />
              </label>

              <label>
                Tipo
                <select
                  value={bankType}
                  onChange={(event) => setBankType(event.target.value)}
                >
                  {BANK_HOURS_ENTRY_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Categoria
                <select
                  value={bankCategory}
                  onChange={(event) => setBankCategory(event.target.value)}
                >
                  {BANK_HOURS_ENTRY_CATEGORIES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Minutos
                <input
                  type="number"
                  min="1"
                  value={bankMinutes}
                  onChange={(event) => setBankMinutes(event.target.value)}
                />
              </label>

              <label className="wide">
                Descrição
                <input
                  value={bankDescription}
                  onChange={(event) => setBankDescription(event.target.value)}
                />
              </label>

              <button onClick={addBankEntry}>Lançar</button>
            </div>
          )}

          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Minutos</th>
                  <th>Descrição</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {entries
                  .filter(
                    (entry) => Number(entry.employeeId) === Number(employeeId)
                  )
                  .map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date)}</td>

                      <td>{entry.type === 'credit' ? 'Crédito' : 'Débito'}</td>

                      <td>{formatMinutes(entry.minutes)}</td>

                      <td>{entry.description}</td>

                      <td>
                        {canManage && (
                          <button
                            className="danger-link"
                            onClick={() => {
                              deleteBankHoursEntry(entry.id)

                              setEntries(getBankHoursEntries())

                              notify('Lançamento removido.')
                            }}
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ======================================================
          FÉRIAS
      ====================================================== */}

      {tab === 'vacation' && (
        <section className="financial-section">
          <h2>Férias</h2>

          <p className="financial-note">
            Cálculo gerencial baseado no salário cadastrado e nos dias
            informados. Não substitui a conferência legal da folha.
          </p>

          <div className="financial-form-grid">
            <label>
              Início
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label>
              Dias
              <input
                type="number"
                min="1"
                max="30"
                value={vacationDays}
                onChange={(event) => setVacationDays(event.target.value)}
              />
            </label>

            <label>
              Abono (dias)
              <input
                type="number"
                min="0"
                max="10"
                value={abonoDays}
                onChange={(event) => setAbonoDays(event.target.value)}
              />
            </label>
          </div>

          {vacationCalculation && (
            <div className="financial-cards">
              <article>
                <span>Férias</span>

                <strong>
                  {formatMoney(vacationCalculation.vacationValue)}
                </strong>
              </article>

              <article>
                <span>1/3</span>

                <strong>
                  {formatMoney(vacationCalculation.constitutionalAdditional)}
                </strong>
              </article>

              <article>
                <span>Abono</span>

                <strong>{formatMoney(vacationCalculation.abonoValue)}</strong>
              </article>

              <article>
                <span>Total</span>

                <strong>{formatMoney(vacationCalculation.grossValue)}</strong>
              </article>
            </div>
          )}

          {canManage && vacationCalculation && (
            <button onClick={saveVacationRecord}>Registrar férias</button>
          )}

          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Funcionário</th>

                  <th>Início</th>

                  <th>Dias</th>

                  <th>Total</th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {vacations.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {
                        employees.find(
                          (item) =>
                            Number(item.id) === Number(record.employeeId)
                        )?.name
                      }
                    </td>

                    <td>{formatDate(record.startDate)}</td>

                    <td>{record.days}</td>

                    <td>{formatMoney(record.calculation?.grossValue)}</td>

                    <td>
                      {canManage && (
                        <button
                          className="danger-link"
                          onClick={() => {
                            deleteVacation(record.id)

                            setVacations(getVacations())
                          }}
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ======================================================
          13º
      ====================================================== */}

      {tab === 'thirteenth' && (
        <section className="financial-section">
          <h2>13º Salário</h2>

          <p className="financial-note">
            Simulação gerencial de avos e parcelas. Descontos e regras
            específicas deverão ser conferidos antes do pagamento.
          </p>

          <label>
            Ano
            <input
              type="number"
              value={thirteenthYear}
              onChange={(event) =>
                setThirteenthYear(Number(event.target.value))
              }
            />
          </label>

          {thirteenthCalculation && (
            <div className="financial-cards">
              <article>
                <span>Avos</span>

                <strong>
                  {thirteenthCalculation.months}
                  /12
                </strong>
              </article>

              <article>
                <span>Bruto</span>

                <strong>{formatMoney(thirteenthCalculation.grossValue)}</strong>
              </article>

              <article>
                <span>1ª parcela</span>

                <strong>
                  {formatMoney(thirteenthCalculation.firstInstallment)}
                </strong>
              </article>

              <article>
                <span>2ª parcela</span>

                <strong>
                  {formatMoney(thirteenthCalculation.secondInstallment)}
                </strong>
              </article>
            </div>
          )}

          {canManage && thirteenthCalculation && (
            <button onClick={saveThirteenthRecord}>Registrar 13º</button>
          )}

          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Funcionário</th>

                  <th>Ano</th>

                  <th>Avos</th>

                  <th>Bruto</th>

                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {thirteenths.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {
                        employees.find(
                          (item) =>
                            Number(item.id) === Number(record.employeeId)
                        )?.name
                      }
                    </td>

                    <td>{record.year}</td>

                    <td>
                      {record.calculation?.months}
                      /12
                    </td>

                    <td>{formatMoney(record.calculation?.grossValue)}</td>

                    <td>{record.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ======================================================
          RESCISÃO
      ====================================================== */}

      {tab === 'termination' && (
        <section className="financial-section">
          <h2>Rescisão</h2>

          <p className="financial-note">
            Esta tela gera uma simulação administrativa. Não considera todas as
            verbas, encargos, convenções coletivas ou regras específicas de cada
            modalidade de desligamento.
          </p>

          <div className="financial-form-grid">
            <label>
              Data de desligamento
              <input
                type="date"
                value={terminationDate}
                onChange={(event) => setTerminationDate(event.target.value)}
              />
            </label>

            <label>
              Motivo
              <select
                value={terminationReason}
                onChange={(event) => setTerminationReason(event.target.value)}
              >
                <option value="sem_justa_causa">Sem justa causa</option>

                <option value="pedido_demissao">Pedido de demissão</option>

                <option value="justa_causa">Justa causa</option>
              </select>
            </label>

            <label>
              Aviso (dias)
              <input
                type="number"
                min="0"
                value={noticeDays}
                onChange={(event) => setNoticeDays(event.target.value)}
              />
            </label>

            <label>
              Férias (dias)
              <input
                type="number"
                min="0"
                value={terminationVacationDays}
                onChange={(event) =>
                  setTerminationVacationDays(event.target.value)
                }
              />
            </label>

            <label>
              Descontos
              <input
                type="number"
                min="0"
                step="0.01"
                value={unpaidDeductions}
                onChange={(event) => setUnpaidDeductions(event.target.value)}
              />
            </label>
          </div>

          {terminationCalculation && (
            <div className="financial-cards">
              <article>
                <span>Saldo salário</span>

                <strong>
                  {formatMoney(terminationCalculation.saldoSalario)}
                </strong>
              </article>

              <article>
                <span>Aviso</span>

                <strong>{formatMoney(terminationCalculation.aviso)}</strong>
              </article>

              <article>
                <span>Férias + 1/3</span>

                <strong>
                  {formatMoney(
                    terminationCalculation.ferias +
                      terminationCalculation.feriasAdicional
                  )}
                </strong>
              </article>

              <article>
                <span>13º proporcional</span>

                <strong>
                  {formatMoney(terminationCalculation.proporcional13)}
                </strong>
              </article>

              <article>
                <span>Bruto</span>

                <strong>{formatMoney(terminationCalculation.gross)}</strong>
              </article>

              <article>
                <span>Líquido simulado</span>

                <strong>{formatMoney(terminationCalculation.net)}</strong>
              </article>
            </div>
          )}

          {canManage && terminationCalculation && (
            <button onClick={saveTerminationRecord}>Registrar simulação</button>
          )}

          <div className="financial-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Funcionário</th>

                  <th>Data</th>

                  <th>Motivo</th>

                  <th>Bruto</th>

                  <th>Líquido</th>
                </tr>
              </thead>

              <tbody>
                {terminations.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {
                        employees.find(
                          (item) =>
                            Number(item.id) === Number(record.employeeId)
                        )?.name
                      }
                    </td>

                    <td>{formatDate(record.dismissalDate)}</td>

                    <td>{record.calculation?.reason}</td>

                    <td>{formatMoney(record.calculation?.gross)}</td>

                    <td>{formatMoney(record.calculation?.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ======================================================
          DEMONSTRATIVOS
      ====================================================== */}

      {tab === 'payslip' && (
        <section className="financial-section">
          <h2>Demonstrativos de pagamento</h2>

          <label>
            Competência
            <input
              type="month"
              value={competence}
              onChange={(event) => setCompetence(event.target.value)}
            />
          </label>

          {!payroll ? (
            <p>Nenhuma folha encontrada para esta competência.</p>
          ) : (
            <div className="financial-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Funcionário</th>

                    <th>Bruto</th>

                    <th>Descontos</th>

                    <th>Líquido</th>

                    <th />
                  </tr>
                </thead>

                <tbody>
                  {(payroll.employees || []).map((employee) => (
                    <tr key={employee.employeeId}>
                      <td>{employee.employeeName}</td>

                      <td>{formatMoney(employee.grossSalary)}</td>

                      <td>{formatMoney(employee.totalDeductions)}</td>

                      <td>{formatMoney(employee.netSalary)}</td>

                      <td>
                        <button
                          onClick={() => printPayslip(employee, competence)}
                        >
                          Imprimir / PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedEmployee && (
            <div className="financial-mini-card">
              <strong>{selectedEmployee.name}</strong>

              <span>
                Funcionário selecionado para as operações financeiras.
              </span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
