import { useEffect, useMemo, useState } from 'react'

import './folha.css'

import { hasPermission } from '../../../services/permissions'
import { apiRequest, getApiUser } from '../../../services/api'
import { runWithoutPostgresStorageBridge } from '../../../services/storage'

import {
  calculateFinancialEventAmount,
  getActiveFinancialEvents
} from '../../../services/financialEvents'

import { calculateHourlyRate } from '../../../services/overtime'

import {
  addPayrollEarning,
  addPayrollDeduction,
  calculatePayrollSummary,
  closePayroll,
  createPayroll,
  deletePayroll,
  formatCompetence,
  formatPayrollMinutes,
  formatPayrollMoney,
  getPayrollByCompetence,
  PAYROLL_STATUS,
  recalculatePayroll,
  removePayrollItem,
  reopenPayroll
} from '../../../services/payroll'

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function Folha() {
  /*
   * ==========================================================
   * PERMISSÕES
   * ==========================================================
   */

  const canView = hasPermission('finance_payroll_view')

  const canManage = hasPermission('finance_payroll_manage')

  /*
   * ==========================================================
   * COMPETÊNCIA
   * ==========================================================
   */

  const [competence, setCompetence] = useState(() => {
    const today = new Date()

    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
      2,
      '0'
    )}`
  })

  /*
   * ==========================================================
   * FOLHA
   * ==========================================================
   */

  const [payroll, setPayroll] = useState(() =>
    getPayrollByCompetence(competence)
  )
  const [loadingFinancialData, setLoadingFinancialData] = useState(true)
  const [financialDataError, setFinancialDataError] = useState('')
  const [financialDataNotice, setFinancialDataNotice] = useState('')
  const [financialEvents, setFinancialEvents] = useState(() => getActiveFinancialEvents())

  /*
   * A API/PostgreSQL é a fonte oficial dos dados financeiros.
   * O cache local continua sendo usado temporariamente pelos serviços
   * síncronos existentes, mas só é hidratado após uma resposta da API.
   */
  useEffect(() => {
    let cancelled = false

    async function loadFinancialData() {
      try {
        const [data, payrollData] = await Promise.all([
          apiRequest('/me/financial-data'),
          apiRequest('/payrolls')
        ])
        if (cancelled) return

        const warnings = []
        const cacheArray = (key, value, preserveEmpty = false, dedicatedApi = false) => {
          if (!Array.isArray(value)) return false

          let parsedCache = []
          try {
            parsedCache = JSON.parse(localStorage.getItem(key) || '[]')
          } catch {
            parsedCache = []
          }

          if (preserveEmpty && value.length === 0 && parsedCache.length > 0) {
            warnings.push(
              `O PostgreSQL ainda não retornou registros para ${key}. O cache local foi preservado; pode ser necessária uma importação.`
            )
            return false
          }

          const writeCache = () => localStorage.setItem(key, JSON.stringify(value))
          if (dedicatedApi) runWithoutPostgresStorageBridge(key, writeCache)
          else writeCache()
          return true
        }

        if (Array.isArray(data.employees)) {
          cacheArray('employees', data.employees)
        }

        cacheArray('payrolls', payrollData.payrolls, true, true)
        cacheArray('financialEvents', data.financialEvents, true)
        cacheArray('salaryHistory', data.salaryHistory, true)

        setFinancialEvents(getActiveFinancialEvents())
        setFinancialDataNotice(warnings.join(' '))

        setPayroll(getPayrollByCompetence(competence))
        setFinancialDataError('')
      } catch (error) {
        if (!cancelled) {
          setFinancialDataError(
            error?.message ||
              'Não foi possível carregar os dados financeiros do PostgreSQL.'
          )
        }
      } finally {
        if (!cancelled) setLoadingFinancialData(false)
      }
    }

    loadFinancialData()
    return () => {
      cancelled = true
    }
  }, [competence])

  /*
   * ==========================================================
   * FUNCIONÁRIO SELECIONADO
   * ==========================================================
   */

  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null)

  /*
   * ==========================================================
   * BUSCA
   * ==========================================================
   */

  const [search, setSearch] = useState('')

  /*
   * ==========================================================
   * MODAL DE LANÇAMENTO
   * ==========================================================
   */

  const [itemModal, setItemModal] = useState(null)

  /*
   * itemModal:
   *
   * {
   *   type: 'earning' | 'deduction',
   *   employeeId: 123
   * }
   */

  const [selectedEventId, setSelectedEventId] = useState('')

  const [itemAmount, setItemAmount] = useState('')

  const [itemDescription, setItemDescription] = useState('')

  /*
   * ==========================================================
   * MENSAGEM
   * ==========================================================
   */

  const [message, setMessage] = useState('')

  const [messageType, setMessageType] = useState('')

  /*
   * ==========================================================
   * EVENTOS FINANCEIROS
   * ==========================================================
   */

  const earningEvents = useMemo(
    () => financialEvents.filter((event) => event.type === 'provento'),
    [financialEvents]
  )

  const deductionEvents = useMemo(
    () => financialEvents.filter((event) => event.type === 'desconto'),
    [financialEvents]
  )

  /*
   * ==========================================================
   * FUNCIONÁRIOS FILTRADOS
   * ==========================================================
   */

  const filteredEmployees = useMemo(() => {
    if (!payroll) {
      return []
    }

    const value = search.trim().toLowerCase()

    if (!value) {
      return payroll.employees || []
    }

    return (payroll.employees || []).filter(
      (employee) =>
        String(employee.employeeName || '')
          .toLowerCase()
          .includes(value) ||
        String(employee.employeeCpf || '')
          .toLowerCase()
          .includes(value)
    )
  }, [payroll, search])

  /*
   * ==========================================================
   * FUNCIONÁRIO SELECIONADO
   * ==========================================================
   */

  const selectedEmployee = useMemo(() => {
    if (!payroll || !selectedEmployeeId) {
      return null
    }

    return (payroll.employees || []).find(
      (employee) => String(employee.employeeId) === String(selectedEmployeeId)
    )
  }, [payroll, selectedEmployeeId])

  /*
   * ==========================================================
   * RESUMO
   * ==========================================================
   */

  const summary = useMemo(
    () => calculatePayrollSummary(payroll),
    [payroll]
  )

  /*
   * ==========================================================
   * MENSAGEM
   * ==========================================================
   */

  function showMessage(text, type = 'success') {
    setMessage(text)

    setMessageType(type)

    window.setTimeout(() => {
      setMessage('')
      setMessageType('')
    }, 3500)
  }

  /**
   * Executa primeiro a regra de cálculo já existente no serviço de folha,
   * depois confirma a mutação pela API. Se o servidor recusar a operação,
   * restaura o cache anterior para não exibir uma alteração não persistida.
   * O PostgreSQL permanece como fonte oficial e valida a versão concorrente.
   */
  async function executePayrollMutation(mutateLocally, requestOnServer) {
    const previousCache = localStorage.getItem('payrolls')
    const previousPayroll = getPayrollByCompetence(competence) || null

    try {
      const candidate = runWithoutPostgresStorageBridge('payrolls', mutateLocally)
      const response = await requestOnServer(candidate, previousPayroll)

      if (!response || !Array.isArray(response.payrolls)) {
        throw new Error('A API não retornou a lista atualizada de folhas.')
      }

      runWithoutPostgresStorageBridge('payrolls', () =>
        localStorage.setItem('payrolls', JSON.stringify(response.payrolls))
      )
      const selected = response.payrolls.find(
        (item) => String(item.competence) === String(competence)
      ) || null
      setPayroll(selected)
      setFinancialDataError('')
      return response
    } catch (error) {
      if (previousCache === null) {
        runWithoutPostgresStorageBridge('payrolls', () => localStorage.removeItem('payrolls'))
      } else {
        runWithoutPostgresStorageBridge('payrolls', () =>
          localStorage.setItem('payrolls', previousCache)
        )
      }
      setPayroll(getPayrollByCompetence(competence) || null)
      throw error
    }
  }

  function showPayrollMutationError(error, fallbackMessage) {
    showMessage(error?.message || fallbackMessage, 'warning')
  }

  /*
   * ==========================================================
   * CARREGAR COMPETÊNCIA
   * ==========================================================
   */

  function handleCompetenceChange(event) {
    const value = event.target.value

    setCompetence(value)

    setPayroll(getPayrollByCompetence(value))

    setSelectedEmployeeId(null)

    setSearch('')
  }

  /*
   * ==========================================================
   * CRIAR FOLHA
   * ==========================================================
   */

  async function handleCreatePayroll() {
    if (!canManage) {
      showMessage('Você não possui permissão para criar a folha.', 'warning')
      return
    }
    if (!competence) {
      showMessage('Selecione uma competência.', 'warning')
      return
    }

    const loggedUser = getApiUser()
    const userName = loggedUser?.name || loggedUser?.username || 'Usuário'

    try {
      await executePayrollMutation(
        () => createPayroll(competence, { createdBy: userName }),
        (candidate) => apiRequest('/payrolls', {
          method: 'POST',
          body: JSON.stringify({ payroll: candidate })
        })
      )
      showMessage(`Folha de ${formatCompetence(competence)} criada com sucesso!`)
    } catch (error) {
      showPayrollMutationError(error, 'Não foi possível criar a folha no PostgreSQL.')
    }
  }

  /*
   * ==========================================================
   * FECHAR FOLHA
   * ==========================================================
   */

  async function handleClosePayroll() {
    if (!payroll) return
    if (!canManage) {
      showMessage('Você não possui permissão para fechar a folha.', 'warning')
      return
    }
    const confirmed = window.confirm(
      `Deseja fechar a folha de ${formatCompetence(payroll.competence)}? Depois disso, os lançamentos ficarão bloqueados.`
    )
    if (!confirmed) return

    const loggedUser = getApiUser()
    const userName = loggedUser?.name || loggedUser?.username || 'Usuário'
    try {
      await executePayrollMutation(
        () => closePayroll(payroll.id, { closedBy: userName }),
        (candidate, previous) => apiRequest(`/payrolls/${encodeURIComponent(payroll.id)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'close',
            payroll: candidate,
            expectedUpdatedAt: previous?.updatedAt ?? null
          })
        })
      )
      showMessage('Folha fechada e salva no PostgreSQL com sucesso!')
    } catch (error) {
      showPayrollMutationError(error, 'Não foi possível fechar a folha no PostgreSQL.')
    }
  }

  /*
   * ==========================================================
   * RECALCULAR FOLHA
   * ==========================================================
   */

  async function handleRecalculatePayroll() {
    if (!payroll) return
    if (!canManage) {
      showMessage('Você não possui permissão para recalcular a folha.', 'warning')
      return
    }
    if (payroll.status === PAYROLL_STATUS.CLOSED) {
      showMessage('A folha está fechada e não pode ser recalculada.', 'warning')
      return
    }
    const confirmed = window.confirm(
      'Deseja recalcular a folha? Os lançamentos automáticos serão atualizados e os lançamentos manuais serão preservados.'
    )
    if (!confirmed) return

    try {
      await executePayrollMutation(
        () => recalculatePayroll(payroll.id),
        (candidate, previous) => apiRequest(`/payrolls/${encodeURIComponent(payroll.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ payroll: candidate, expectedUpdatedAt: previous?.updatedAt ?? null })
        })
      )
      setSelectedEmployeeId(null)
      showMessage('Folha recalculada e salva no PostgreSQL com sucesso!')
    } catch (error) {
      showPayrollMutationError(error, 'Não foi possível recalcular a folha no PostgreSQL.')
    }
  }

  /*
   * ==========================================================
   * EXCLUIR FOLHA
   * ==========================================================
   */

  async function handleDeletePayroll() {
    if (!payroll) return
    if (!canManage) {
      showMessage('Você não possui permissão para excluir a folha.', 'warning')
      return
    }
    if (payroll.status === PAYROLL_STATUS.CLOSED) {
      showMessage('A folha fechada não pode ser excluída.', 'warning')
      return
    }
    const confirmed = window.confirm(
      `Deseja excluir a folha de ${formatCompetence(payroll.competence)}? Esta ação não poderá ser desfeita.`
    )
    if (!confirmed) return

    try {
      await executePayrollMutation(
        () => deletePayroll(payroll.id),
        (_candidate, previous) => apiRequest(`/payrolls/${encodeURIComponent(payroll.id)}`, {
          method: 'DELETE',
          body: JSON.stringify({ expectedUpdatedAt: previous?.updatedAt ?? null })
        })
      )
      setSelectedEmployeeId(null)
      showMessage('Folha excluída do PostgreSQL com sucesso!')
    } catch (error) {
      showPayrollMutationError(error, 'Não foi possível excluir a folha no PostgreSQL.')
    }
  }

  /*
   * ==========================================================
   * REABRIR FOLHA
   * ==========================================================
   */

  async function handleReopenPayroll() {
    if (!payroll) return
    if (!canManage) {
      showMessage('Você não possui permissão para reabrir a folha.', 'warning')
      return
    }
    const confirmed = window.confirm('Deseja reabrir esta folha para edição?')
    if (!confirmed) return

    const loggedUser = getApiUser()
    const userName = loggedUser?.name || loggedUser?.username || 'Usuário'
    try {
      await executePayrollMutation(
        () => reopenPayroll(payroll.id, { reopenedBy: userName }),
        (_candidate, previous) => apiRequest(`/payrolls/${encodeURIComponent(payroll.id)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ action: 'reopen', expectedUpdatedAt: previous?.updatedAt ?? null })
        })
      )
      showMessage('Folha reaberta e salva no PostgreSQL com sucesso!')
    } catch (error) {
      showPayrollMutationError(error, 'Não foi possível reabrir a folha no PostgreSQL.')
    }
  }

  /*
   * ==========================================================
   * ABRIR MODAL
   * ==========================================================
   */

  function openItemModal(type, employeeId) {
    if (!canManage) {
      return
    }

    if (payroll?.status === PAYROLL_STATUS.CLOSED) {
      showMessage('A folha está fechada e não pode ser alterada.', 'warning')

      return
    }

    setItemModal({
      type,
      employeeId
    })

    setSelectedEventId('')

    setItemAmount('')

    setItemDescription('')
  }

  /*
   * ==========================================================
   * FECHAR MODAL
   * ==========================================================
   */

  function closeItemModal() {
    setItemModal(null)

    setSelectedEventId('')

    setItemAmount('')

    setItemDescription('')
  }

  /*
   * ==========================================================
   * SELECIONAR EVENTO
   * ==========================================================
   */

  function handleEventChange(event) {
    const eventId = event.target.value

    setSelectedEventId(eventId)

    const source =
      itemModal?.type === 'earning' ? earningEvents : deductionEvents

    const financialEvent = source.find(
      (item) => String(item.id) === String(eventId)
    )

    /*
     * Caso o usuário limpe a seleção.
     */

    if (!financialEvent || !selectedEmployee) {
      setItemAmount('')

      return
    }

    /*
     * ========================================================
     * CÁLCULO AUTOMÁTICO
     * ========================================================
     *
     * O valor é sugerido automaticamente conforme o tipo
     * de cálculo configurado no evento.
     *
     * Para eventos "Por hora":
     *
     * - proventos utilizam as horas extras apuradas no ponto;
     * - descontos utilizam o déficit de horas apurado no ponto.
     *
     * O valor continua editável antes do lançamento.
     */

    const baseSalary = Number(selectedEmployee.baseSalary) || 0

    const hourlyRate = calculateHourlyRate(baseSalary)

    const minutes =
      itemModal?.type === 'earning'
        ? Number(selectedEmployee.timeData?.overtimeMinutes) || 0
        : Number(selectedEmployee.timeData?.deficitMinutes) || 0

    const calculatedAmount = calculateFinancialEventAmount(financialEvent, {
      baseSalary,
      hourlyRate,
      minutes
    })

    if (calculatedAmount > 0) {
      setItemAmount(String(calculatedAmount))
    } else {
      setItemAmount('')
    }
  }

  /*
   * ==========================================================
   * SALVAR ITEM
   * ==========================================================
   */

  async function handleSaveItem(event) {
    event.preventDefault()

    if (!itemModal || !payroll) {
      return
    }

    if (payroll.status === PAYROLL_STATUS.CLOSED) {
      showMessage('A folha está fechada e não pode ser alterada.', 'warning')

      return
    }

    const amount = Number(itemAmount)

    if (!selectedEventId) {
      showMessage('Selecione um evento financeiro.', 'warning')

      return
    }

    if (!itemAmount || Number.isNaN(amount) || amount <= 0) {
      showMessage('Informe um valor válido.', 'warning')

      return
    }

    const source =
      itemModal.type === 'earning' ? earningEvents : deductionEvents

    const selectedEvent = source.find(
      (item) => String(item.id) === String(selectedEventId)
    )

    if (!selectedEvent) {
      showMessage('Evento financeiro não encontrado.', 'warning')

      return
    }

    const itemData = {
      financialEventId: selectedEvent.id,

      eventName: selectedEvent.name,

      eventCode: selectedEvent.code || '',

      description: itemDescription.trim() || selectedEvent.name,

      amount
    }

    try {
      await executePayrollMutation(
        () => itemModal.type === 'earning'
          ? addPayrollEarning(payroll.id, itemModal.employeeId, itemData)
          : addPayrollDeduction(payroll.id, itemModal.employeeId, itemData),
        (candidate, previous) => apiRequest(`/payrolls/${encodeURIComponent(payroll.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ payroll: candidate, expectedUpdatedAt: previous?.updatedAt ?? null })
        })
      )
      closeItemModal()
      showMessage(itemModal.type === 'earning'
        ? 'Provento adicionado e salvo no PostgreSQL.'
        : 'Desconto adicionado e salvo no PostgreSQL.')
    } catch (error) {
      showPayrollMutationError(error, 'Não foi possível salvar o lançamento no PostgreSQL.')
    }
  }

  /*
   * ==========================================================
   * REMOVER ITEM
   * ==========================================================
   */

  async function handleRemoveItem(type, employeeId, itemId) {
    if (!canManage) {
      return
    }

    if (payroll?.status === PAYROLL_STATUS.CLOSED) {
      showMessage('A folha está fechada e não pode ser alterada.', 'warning')

      return
    }

    const confirmed = window.confirm('Deseja remover este lançamento?')

    if (!confirmed) {
      return
    }

    try {
      await executePayrollMutation(
        () => removePayrollItem(payroll.id, employeeId, type, itemId),
        (candidate, previous) => apiRequest(`/payrolls/${encodeURIComponent(payroll.id)}`, {
          method: 'PUT',
          body: JSON.stringify({ payroll: candidate, expectedUpdatedAt: previous?.updatedAt ?? null })
        })
      )
      showMessage('Lançamento removido e alteração salva no PostgreSQL.')
    } catch (error) {
      showPayrollMutationError(error, 'Não foi possível remover o lançamento no PostgreSQL.')
    }
  }

  /*
   * ==========================================================
   * ACESSO NEGADO
   * ==========================================================
   */

  if (!canView) {
    return (
      <div className="payroll-page">
        <div className="payroll-access-denied">
          <span>🔒</span>

          <h2>Acesso negado</h2>

          <p>Você não possui permissão para visualizar a folha de pagamento.</p>
        </div>
      </div>
    )
  }

  /*
   * ==========================================================
   * EVENTOS DO MODAL
   * ==========================================================
   */

  const modalEvents =
    itemModal?.type === 'earning' ? earningEvents : deductionEvents

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="payroll-page">
      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <header className="payroll-header">
        <div>
          <span className="payroll-kicker">FINANCEIRO</span>

          <h1>Folha de Pagamento</h1>

          <p>
            Consolide salários, ponto, proventos e descontos por competência.
          </p>
        </div>

        <div className="payroll-competence">
          <label htmlFor="payroll-competence">Competência</label>

          <input
            id="payroll-competence"
            type="month"
            value={competence}
            onChange={handleCompetenceChange}
          />
        </div>
      </header>

      {loadingFinancialData && (
        <div className="payroll-message payroll-message-warning" role="status">
          Carregando dados financeiros do PostgreSQL...
        </div>
      )}

      {financialDataError && (
        <div className="payroll-message payroll-message-warning" role="alert">
          {financialDataError} Os dados exibidos podem estar desatualizados.
        </div>
      )}

      {financialDataNotice && (
        <div className="payroll-message payroll-message-warning" role="status">
          {financialDataNotice}
        </div>
      )}

      {/* ======================================================
          MENSAGEM
      ====================================================== */}

      {message && (
        <div className={`payroll-message payroll-message-${messageType}`}>
          {message}
        </div>
      )}

      {/* ======================================================
          FOLHA NÃO CRIADA
      ====================================================== */}

      {!payroll ? (
        <div className="payroll-create-card">
          <div className="payroll-create-icon">📋</div>

          <h2>Folha ainda não criada</h2>

          <p>
            A competência <strong>{formatCompetence(competence)}</strong> ainda
            não possui uma folha.
          </p>

          <p>
            Ao criar a folha, os funcionários ativos serão adicionados
            automaticamente com o salário vigente na competência.
          </p>

          {canManage && (
            <button
              type="button"
              className="payroll-primary-button"
              onClick={handleCreatePayroll}
            >
              Criar folha
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ==================================================
              RESUMO
          ================================================== */}

          <section className="payroll-summary">
            <div className="payroll-summary-card">
              <span>Funcionários</span>

              <strong>{summary.employees}</strong>
            </div>

            <div className="payroll-summary-card">
              <span>Salários base</span>

              <strong>{formatPayrollMoney(summary.baseSalary)}</strong>
            </div>

            <div className="payroll-summary-card">
              <span>Proventos</span>

              <strong>{formatPayrollMoney(summary.earnings)}</strong>
            </div>

            <div className="payroll-summary-card">
              <span>Horas extras</span>

              <strong>
                {formatPayrollMinutes(summary.overtimeMinutes)}
              </strong>
            </div>

            <div className="payroll-summary-card">
              <span>Valor horas extras</span>

              <strong>
                {formatPayrollMoney(summary.overtimeAmount)}
              </strong>
            </div>

            <div className="payroll-summary-card">
              <span>INSS</span>

              <strong>
                {formatPayrollMoney(summary.inss)}
              </strong>
            </div>

            <div className="payroll-summary-card">
              <span>IRRF</span>

              <strong>
                {formatPayrollMoney(summary.irrf)}
              </strong>
            </div>

            <div className="payroll-summary-card">
              <span>FGTS empresa</span>

              <strong>
                {formatPayrollMoney(summary.fgts)}
              </strong>
            </div>

            <div className="payroll-summary-card">
              <span>Bruto</span>

              <strong>{formatPayrollMoney(summary.grossSalary)}</strong>
            </div>

            <div className="payroll-summary-card">
              <span>Descontos</span>

              <strong>{formatPayrollMoney(summary.deductions)}</strong>
            </div>

            <div className="payroll-summary-card payroll-summary-net">
              <span>Líquido</span>

              <strong>{formatPayrollMoney(summary.netSalary)}</strong>
            </div>
          </section>

          {/* ==================================================
              BARRA DA FOLHA
          ================================================== */}

          <div className="payroll-toolbar">
            <div>
              <span className="payroll-status-label">Status</span>

              <span
                className={`payroll-status ${
                  payroll.status === PAYROLL_STATUS.CLOSED ? 'closed' : 'draft'
                }`}
              >
                {payroll.status === PAYROLL_STATUS.CLOSED
                  ? 'Fechada'
                  : 'Em aberto'}
              </span>
            </div>

            <div className="payroll-toolbar-actions">
              {payroll.status === PAYROLL_STATUS.DRAFT && canManage && (
                <>
                  <button
                    type="button"
                    className="payroll-secondary-button"
                    onClick={handleRecalculatePayroll}
                  >
                    ↻ Recalcular
                  </button>

                  <button
                    type="button"
                    className="payroll-danger-button"
                    onClick={handleDeletePayroll}
                  >
                    🗑️ Excluir
                  </button>

                  <button
                    type="button"
                    className="payroll-close-button"
                    onClick={handleClosePayroll}
                  >
                    Fechar folha
                  </button>
                </>
              )}

              {payroll.status === PAYROLL_STATUS.CLOSED && canManage && (
                <button
                  type="button"
                  className="payroll-secondary-button"
                  onClick={handleReopenPayroll}
                >
                  Reabrir folha
                </button>
              )}
            </div>
          </div>

          {/* ==================================================
              LISTA
          ================================================== */}

          <section className="payroll-list-card">
            <div className="payroll-list-header">
              <div>
                <h2>Funcionários</h2>

                <p>{formatCompetence(payroll.competence)}</p>
              </div>

              <div className="payroll-search">
                <span>🔍</span>

                <input
                  type="text"
                  placeholder="Buscar funcionário..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="payroll-empty">
                <span>👥</span>

                <strong>Nenhum funcionário encontrado.</strong>
              </div>
            ) : (
              <div className="payroll-table-wrapper">
                <table className="payroll-table">
                  <thead>
                    <tr>
                      <th>Funcionário</th>

                      <th>Salário base</th>

                      <th>Horas extras</th>

                      <th>Proventos</th>

                      <th>Descontos</th>

                      <th>Líquido</th>

                      <th>Ações</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredEmployees.map((employee) => {
                      const earnings = (employee.earnings || []).reduce(
                        (total, item) => total + (Number(item.amount) || 0),
                        0
                      )

                      return (
                        <tr
                          key={employee.employeeId}
                          className={
                            String(selectedEmployeeId) ===
                            String(employee.employeeId)
                              ? 'selected'
                              : ''
                          }
                        >
                          <td>
                            <strong>{employee.employeeName}</strong>

                            <small>{employee.position}</small>
                          </td>

                          <td>{formatPayrollMoney(employee.baseSalary)}</td>

                          <td>
                            <strong>
                              {formatPayrollMinutes(
                                employee.timeData?.overtimeMinutes
                              )}
                            </strong>
                          </td>

                          <td>{formatPayrollMoney(earnings)}</td>

                          <td>
                            {formatPayrollMoney(employee.totalDeductions)}
                          </td>

                          <td>
                            <strong className="payroll-net-value">
                              {formatPayrollMoney(employee.netSalary)}
                            </strong>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="payroll-details-button"
                              onClick={() =>
                                setSelectedEmployeeId(employee.employeeId)
                              }
                            >
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ==================================================
              DETALHES
          ================================================== */}

          {selectedEmployee && (
            <section className="payroll-detail-card">
              <div className="payroll-detail-header">
                <div>
                  <span className="payroll-kicker">DETALHAMENTO</span>

                  <h2>{selectedEmployee.employeeName}</h2>

                  <p>{selectedEmployee.position}</p>
                </div>

                <button
                  type="button"
                  className="payroll-detail-close"
                  onClick={() => setSelectedEmployeeId(null)}
                >
                  ×
                </button>
              </div>

              {/* ==============================================
                  PONTO
              ============================================== */}

              <div className="payroll-detail-section">
                <div className="payroll-detail-section-header">
                  <div>
                    <h3>Informações do Ponto</h3>

                    <p>Dados apurados durante a competência.</p>
                  </div>
                </div>

                <div className="payroll-time-grid">
                  <div>
                    <span>Jornada prevista</span>

                    <strong>
                      {formatPayrollMinutes(
                        selectedEmployee.timeData?.expectedMinutes
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Horas trabalhadas</span>

                    <strong>
                      {formatPayrollMinutes(
                        selectedEmployee.timeData?.workedMinutes
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Horas extras</span>

                    <strong>
                      {formatPayrollMinutes(
                        selectedEmployee.timeData?.overtimeMinutes
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Faltas</span>

                    <strong>
                      {selectedEmployee.timeData?.absenceDays || 0}
                    </strong>
                  </div>
                </div>
              </div>

              {/* ==============================================
                  SALÁRIO
              ============================================== */}

              <div className="payroll-detail-section">
                <div className="payroll-detail-section-header">
                  <div>
                    <h3>Salário</h3>

                    <p>Remuneração base vigente na competência.</p>
                  </div>
                </div>

                <div className="payroll-base-salary">
                  <span>Salário base</span>

                  <strong>
                    {formatPayrollMoney(selectedEmployee.baseSalary)}
                  </strong>

                  <small>
                    Vigente desde{' '}
                    {selectedEmployee.salaryEffectiveDate
                      ? selectedEmployee.salaryEffectiveDate
                      : 'não informado'}
                  </small>
                </div>
              </div>

              {/* ==============================================
                  PROVENTOS
              ============================================== */}

              <div className="payroll-detail-section">
                <div className="payroll-detail-section-header">
                  <div>
                    <h3>Proventos</h3>

                    <p>Valores adicionados ao salário.</p>
                  </div>

                  {canManage && payroll.status === PAYROLL_STATUS.DRAFT && (
                    <button
                      type="button"
                      className="payroll-add-button"
                      onClick={() =>
                        openItemModal('earning', selectedEmployee.employeeId)
                      }
                    >
                      + Adicionar
                    </button>
                  )}
                </div>

                {(selectedEmployee.earnings || []).length === 0 ? (
                  <div className="payroll-detail-empty">
                    Nenhum provento lançado.
                  </div>
                ) : (
                  <div className="payroll-items">
                    {(selectedEmployee.earnings || []).map((item) => (
                      <div className="payroll-item" key={item.id}>
                        <div>
                          <strong>{item.eventName}</strong>

                          <small>{item.description}</small>
                        </div>

                        <div className="payroll-item-right">
                          <strong>{formatPayrollMoney(item.amount)}</strong>

                          {canManage &&
                            payroll.status === PAYROLL_STATUS.DRAFT && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveItem(
                                    'earning',
                                    selectedEmployee.employeeId,
                                    item.id
                                  )
                                }
                              >
                                🗑️
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ==============================================
                  DESCONTOS
              ============================================== */}

              <div className="payroll-detail-section">
                <div className="payroll-detail-section-header">
                  <div>
                    <h3>Descontos</h3>

                    <p>Valores descontados da remuneração.</p>
                  </div>

                  {canManage && payroll.status === PAYROLL_STATUS.DRAFT && (
                    <button
                      type="button"
                      className="payroll-add-button"
                      onClick={() =>
                        openItemModal('deduction', selectedEmployee.employeeId)
                      }
                    >
                      + Adicionar
                    </button>
                  )}
                </div>

                {(selectedEmployee.deductions || []).length === 0 ? (
                  <div className="payroll-detail-empty">
                    Nenhum desconto lançado.
                  </div>
                ) : (
                  <div className="payroll-items">
                    {(selectedEmployee.deductions || []).map((item) => (
                      <div className="payroll-item" key={item.id}>
                        <div>
                          <strong>{item.eventName}</strong>

                          <small>{item.description}</small>
                        </div>

                        <div className="payroll-item-right">
                          <strong>{formatPayrollMoney(item.amount)}</strong>

                          {canManage &&
                            payroll.status === PAYROLL_STATUS.DRAFT && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveItem(
                                    'deduction',
                                    selectedEmployee.employeeId,
                                    item.id
                                  )
                                }
                              >
                                🗑️
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ==============================================
                  ENCARGOS
              ============================================== */}

              <div className="payroll-detail-section">
                <div className="payroll-detail-section-header">
                  <div>
                    <h3>Encargos e retenções</h3>

                    <p>
                      Cálculos parametrizados para a competência de 2026.
                    </p>
                  </div>
                </div>

                <div className="payroll-tax-grid">
                  <div>
                    <span>INSS</span>

                    <strong>
                      {formatPayrollMoney(
                        selectedEmployee.taxes?.inss?.amount || 0
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>IRRF</span>

                    <strong>
                      {formatPayrollMoney(
                        selectedEmployee.taxes?.irrf?.amount || 0
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>FGTS empresa</span>

                    <strong>
                      {formatPayrollMoney(
                        selectedEmployee.taxes?.fgts?.amount || 0
                      )}
                    </strong>
                  </div>
                </div>

                <small className="payroll-tax-note">
                  O FGTS é obrigação do empregador e não é descontado do salário.
                  Os cálculos servem como apoio gerencial e não substituem a
                  apuração oficial no eSocial/DCTFWeb.
                </small>
              </div>

              {/* ==============================================
                  TOTAL
              ============================================== */}

              <div className="payroll-detail-total">
                <div>
                  <span>Salário bruto</span>

                  <strong>
                    {formatPayrollMoney(selectedEmployee.grossSalary)}
                  </strong>
                </div>

                <div>
                  <span>Descontos</span>

                  <strong>
                    {formatPayrollMoney(selectedEmployee.totalDeductions)}
                  </strong>
                </div>

                <div className="net">
                  <span>Salário líquido</span>

                  <strong>
                    {formatPayrollMoney(selectedEmployee.netSalary)}
                  </strong>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* ======================================================
          MODAL
      ====================================================== */}

      {itemModal && (
        <div className="payroll-modal-overlay" onMouseDown={closeItemModal}>
          <div
            className="payroll-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="payroll-modal-header">
              <div>
                <span className="payroll-kicker">
                  {itemModal.type === 'earning' ? 'PROVENTO' : 'DESCONTO'}
                </span>

                <h2>
                  Adicionar{' '}
                  {itemModal.type === 'earning' ? 'provento' : 'desconto'}
                </h2>
              </div>

              <button type="button" onClick={closeItemModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className="payroll-modal-field">
                <label>Evento *</label>

                <select value={selectedEventId} onChange={handleEventChange}>
                  <option value="">Selecione um evento</option>

                  {modalEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.code ? `${event.code} - ` : ''}
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="payroll-modal-field">
                <label>Valor *</label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemAmount}
                  onChange={(event) => setItemAmount(event.target.value)}
                  placeholder="0,00"
                />

                <small>
                  O valor é calculado automaticamente quando o evento possui uma
                  regra de cálculo. Você pode ajustá-lo antes de lançar na
                  folha.
                </small>
              </div>

              <div className="payroll-modal-field">
                <label>Descrição</label>

                <input
                  type="text"
                  value={itemDescription}
                  onChange={(event) => setItemDescription(event.target.value)}
                  placeholder="Descrição do lançamento..."
                />
              </div>

              <div className="payroll-modal-actions">
                <button
                  type="button"
                  className="payroll-secondary-button"
                  onClick={closeItemModal}
                >
                  Cancelar
                </button>

                <button type="submit" className="payroll-primary-button">
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
