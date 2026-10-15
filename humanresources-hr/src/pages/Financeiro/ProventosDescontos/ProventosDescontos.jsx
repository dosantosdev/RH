import { useEffect, useMemo, useState } from 'react'

import './proventosDescontos.css'

import { hasPermission } from '../../../services/permissions'
import { apiRequest, getApiUser } from '../../../services/api'

import {
  FINANCIAL_CALCULATION_TYPES,
  FINANCIAL_EVENT_TYPES,
  financialCalculationTypeLabels,
  financialEventTypeLabels,
  getFinancialEvents
} from '../../../services/financialEvents'

/*
 * ============================================================
 * FORMULÁRIO INICIAL
 * ============================================================
 */

const initialForm = {
  name: '',
  code: '',
  type: FINANCIAL_EVENT_TYPES.EARNING,
  calculationType: FINANCIAL_CALCULATION_TYPES.FIXED,
  defaultValue: '',
  notes: '',
  active: true
}

/*
 * ============================================================
 * COMPONENTE
 * ============================================================
 */

export default function ProventosDescontos() {
  /*
   * ==========================================================
   * PERMISSÕES
   * ==========================================================
   */

  const canView = hasPermission('finance_events_view')

  const canManage = hasPermission('finance_events_manage')

  /*
   * ==========================================================
   * ESTADOS
   * ==========================================================
   */

  const [events, setEvents] = useState(() => getFinancialEvents())

  const [loading, setLoading] = useState(true)

  const [apiReady, setApiReady] = useState(false)

  const [saving, setSaving] = useState(false)

  const [activeTab, setActiveTab] = useState(FINANCIAL_EVENT_TYPES.EARNING)

  const [search, setSearch] = useState('')

  const [form, setForm] = useState(initialForm)

  const [editingId, setEditingId] = useState(null)

  const [message, setMessage] = useState('')

  const [messageType, setMessageType] = useState('')

  /*
   * ==========================================================
   * CARREGAR EVENTOS DIRETAMENTE DA API
   * ==========================================================
   * O localStorage é mantido apenas como cache de compatibilidade.
   * A API/PostgreSQL é a fonte principal para leitura e gravação.
   */

  useEffect(() => {
    let cancelled = false

    async function loadEvents() {
      setLoading(true)
      try {
        const response = await apiRequest('/financial-events')
        if (cancelled) return

        const databaseEvents = Array.isArray(response?.events)
          ? response.events
          : []
        const cachedEvents = getFinancialEvents()

        if (databaseEvents.length > 0 || cachedEvents.length === 0) {
          setEvents(databaseEvents)
          localStorage.setItem('financialEvents', JSON.stringify(databaseEvents))
        } else {
          // Não apagamos o legado automaticamente: ele pode precisar ser importado.
          setEvents(cachedEvents)
          showMessage(
            'O PostgreSQL ainda não possui eventos. Os dados locais foram preservados; ao salvar, serão enviados à API.',
            'warning'
          )
        }

        setApiReady(true)
      } catch (error) {
        if (cancelled) return
        setApiReady(false)
        setEvents(getFinancialEvents())
        showMessage(
          error?.message || 'Não foi possível carregar os eventos pela API. Nenhuma alteração será gravada localmente como se tivesse sido salva.',
          'error'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadEvents()
    return () => { cancelled = true }
  }, [])

  async function persistEvents(nextEvents, successMessage) {
    if (!apiReady) {
      showMessage('A API não está disponível. Reconecte antes de alterar os eventos.', 'error')
      return false
    }

    setSaving(true)
    try {
      const response = await apiRequest('/financial-events', {
        method: 'PUT',
        body: JSON.stringify({ events: nextEvents })
      })
      const savedEvents = Array.isArray(response?.events) ? response.events : nextEvents
      setEvents(savedEvents)
      // Cache local atualizado somente depois da confirmação do PostgreSQL.
      localStorage.setItem('financialEvents', JSON.stringify(savedEvents))
      showMessage(successMessage)
      return true
    } catch (error) {
      showMessage(error?.message || 'Não foi possível salvar no PostgreSQL.', 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  /*
   * ==========================================================
   * EVENTOS FILTRADOS
   * ==========================================================
   */

  const filteredEvents = useMemo(() => {
    const searchValue = search.trim().toLowerCase()

    return events
      .filter((event) => event.type === activeTab)
      .filter((event) => {
        if (!searchValue) {
          return true
        }

        return (
          String(event.name || '')
            .toLowerCase()
            .includes(searchValue) ||
          String(event.code || '')
            .toLowerCase()
            .includes(searchValue)
        )
      })
      .sort((a, b) =>
        String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR')
      )
  }, [events, activeTab, search])

  /*
   * ==========================================================
   * CONTADORES
   * ==========================================================
   */

  const earningCount = useMemo(() => {
    return events.filter(
      (event) => event.type === FINANCIAL_EVENT_TYPES.EARNING
    ).length
  }, [events])

  const deductionCount = useMemo(() => {
    return events.filter(
      (event) => event.type === FINANCIAL_EVENT_TYPES.DEDUCTION
    ).length
  }, [events])

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

  /*
   * ==========================================================
   * ALTERAR FORMULÁRIO
   * ==========================================================
   */

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((previous) => ({
      ...previous,

      [name]: type === 'checkbox' ? checked : value
    }))
  }

  /*
   * ==========================================================
   * NOVO REGISTRO
   * ==========================================================
   */

  function handleNew() {
    setEditingId(null)

    setForm({
      ...initialForm,
      type: activeTab
    })

    setMessage('')
    setMessageType('')
  }

  /*
   * ==========================================================
   * EDITAR
   * ==========================================================
   */

  function handleEdit(event) {
    if (!canManage) {
      showMessage(
        'Você não possui permissão para alterar eventos financeiros.',
        'warning'
      )

      return
    }

    setEditingId(event.id)

    setForm({
      name: event.name || '',
      code: event.code || '',
      type: event.type || FINANCIAL_EVENT_TYPES.EARNING,
      calculationType:
        event.calculationType || FINANCIAL_CALCULATION_TYPES.FIXED,
      defaultValue: event.defaultValue ?? '',
      notes: event.notes || '',
      active: event.active !== false
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  /*
   * ==========================================================
   * CANCELAR
   * ==========================================================
   */

  function handleCancel() {
    setEditingId(null)

    setForm({
      ...initialForm,
      type: activeTab
    })
  }

  /*
   * ==========================================================
   * SALVAR
   * ==========================================================
   */

  async function handleSubmit(event) {
    event.preventDefault()

    if (!canManage) {
      showMessage('Você não possui permissão para gerenciar eventos financeiros.', 'warning')
      return
    }
    if (!apiReady) {
      showMessage('A API ainda não está disponível. Aguarde a conexão antes de salvar.', 'error')
      return
    }
    if (!form.name.trim()) {
      showMessage('Informe o nome do evento.', 'warning')
      return
    }
    if (!form.type) {
      showMessage('Selecione o tipo do evento.', 'warning')
      return
    }
    if (!form.calculationType) {
      showMessage('Selecione o tipo de cálculo.', 'warning')
      return
    }

    const normalizedCode = form.code.trim().toUpperCase()
    const duplicatedCode = events.some((item) =>
      String(item.id) !== String(editingId) &&
      normalizedCode &&
      String(item.code || '').trim().toUpperCase() === normalizedCode
    )
    if (duplicatedCode) {
      showMessage('Já existe um evento financeiro com este código.', 'warning')
      return
    }

    const loggedUser = getApiUser()
    const userName = loggedUser?.name || loggedUser?.username || 'Usuário'
    const eventData = {
      name: form.name.trim(),
      code: normalizedCode,
      type: form.type,
      calculationType: form.calculationType,
      defaultValue: form.defaultValue === '' ? '' : Number(form.defaultValue),
      notes: form.notes.trim(),
      active: form.active
    }

    let nextEvents
    let successMessage
    if (editingId !== null) {
      nextEvents = events.map((item) => String(item.id) === String(editingId)
        ? { ...item, ...eventData, updatedAt: new Date().toISOString(), updatedBy: userName }
        : item)
      successMessage = 'Evento financeiro atualizado com sucesso!'
    } else {
      const newId = window.crypto?.randomUUID?.() || String(Date.now())
      nextEvents = [...events, {
        ...eventData,
        id: newId,
        createdAt: new Date().toISOString(),
        createdBy: userName
      }]
      successMessage = 'Evento financeiro cadastrado com sucesso!'
    }

    const saved = await persistEvents(nextEvents, successMessage)
    if (!saved) return

    setEditingId(null)
    setForm({ ...initialForm, type: activeTab })
  }

  /*
   * ==========================================================
   * ATIVAR / INATIVAR
   * ==========================================================
   */

  async function handleToggle(event) {
    if (!canManage) {
      showMessage('Você não possui permissão para alterar eventos financeiros.', 'warning')
      return
    }

    const updatedEvent = { ...event, active: event.active === false }
    const nextEvents = events.map((item) =>
      String(item.id) === String(event.id) ? updatedEvent : item
    )
    const saved = await persistEvents(
      nextEvents,
      event.active !== false ? 'Evento financeiro inativado.' : 'Evento financeiro ativado.'
    )
    if (!saved) return
  }

  /*
   * ==========================================================
   * EXCLUIR
   * ==========================================================
   */

  async function handleDelete(event) {
    if (!canManage) {
      showMessage('Você não possui permissão para excluir eventos financeiros.', 'warning')
      return
    }

    const confirmed = window.confirm(`Deseja realmente excluir o evento "${event.name}"?`)
    if (!confirmed) return

    const nextEvents = events.filter((item) => String(item.id) !== String(event.id))
    const saved = await persistEvents(nextEvents, 'Evento financeiro excluído com sucesso!')
    if (!saved) return

    if (String(editingId) === String(event.id)) handleCancel()
  }

  /*
   * ==========================================================
   * ACESSO NEGADO
   * ==========================================================
   */

  if (!canView) {
    return (
      <div className="financial-events-page">
        <div className="financial-events-access-denied">
          <span>🔒</span>

          <h2>Acesso negado</h2>

          <p>
            Você não possui permissão para visualizar proventos e descontos.
          </p>
        </div>
      </div>
    )
  }

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="financial-events-page">
      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <header className="financial-events-header">
        <div>
          <span className="financial-events-kicker">FINANCEIRO</span>

          <h1>Proventos e Descontos</h1>

          <p>Cadastre os eventos que poderão compor a folha de pagamento.</p>
        </div>

        {canManage && (
          <button
            type="button"
            className="financial-events-new-button"
            onClick={handleNew}
            disabled={!apiReady || loading || saving}
          >
            + Novo evento
          </button>
        )}
      </header>

      {/* ======================================================
          MENSAGEM
      ====================================================== */}

      {message && (
        <div
          className={`financial-events-message financial-events-message-${messageType}`}
        >
          {message}
        </div>
      )}

      {loading && (
        <div className="financial-events-message financial-events-message-warning" role="status">
          Carregando eventos financeiros do PostgreSQL...
        </div>
      )}

      {saving && (
        <div className="financial-events-message financial-events-message-warning" role="status">
          Salvando alterações no PostgreSQL...
        </div>
      )}

      {/* ======================================================
          RESUMO
      ====================================================== */}

      <div className="financial-events-summary">
        <div className="financial-summary-card">
          <span>Proventos</span>

          <strong>{earningCount}</strong>

          <small>Valores que aumentam a remuneração</small>
        </div>

        <div className="financial-summary-card">
          <span>Descontos</span>

          <strong>{deductionCount}</strong>

          <small>Valores descontados da remuneração</small>
        </div>
      </div>

      {/* ======================================================
          CONTEÚDO
      ====================================================== */}

      <div className="financial-events-layout">
        {/* ====================================================
            FORMULÁRIO
        ==================================================== */}

        {canManage && (
          <section className="financial-event-form-card">
            <div className="financial-event-form-header">
              <div>
                <h2>{editingId !== null ? 'Editar evento' : 'Novo evento'}</h2>

                <p>Defina como o evento será utilizado futuramente na folha.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="financial-event-form">
              <div className="financial-event-field">
                <label htmlFor="event-name">Nome *</label>

                <input
                  id="event-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Ex.: Hora Extra 50%"
                />
              </div>

              <div className="financial-event-field">
                <label htmlFor="event-code">Código</label>

                <input
                  id="event-code"
                  name="code"
                  type="text"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Ex.: HE50"
                  maxLength="20"
                />
              </div>

              <div className="financial-event-field">
                <label htmlFor="event-type">Tipo *</label>

                <select
                  id="event-type"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                >
                  <option value={FINANCIAL_EVENT_TYPES.EARNING}>
                    Provento
                  </option>

                  <option value={FINANCIAL_EVENT_TYPES.DEDUCTION}>
                    Desconto
                  </option>
                </select>
              </div>

              <div className="financial-event-field">
                <label htmlFor="event-calculation">Tipo de cálculo *</label>

                <select
                  id="event-calculation"
                  name="calculationType"
                  value={form.calculationType}
                  onChange={handleChange}
                >
                  {Object.entries(financialCalculationTypeLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="financial-event-field">
                <label htmlFor="event-value">Valor padrão</label>

                <input
                  id="event-value"
                  name="defaultValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.defaultValue}
                  onChange={handleChange}
                  placeholder="0,00"
                />

                <small>
                  Opcional. O valor real poderá ser informado posteriormente na
                  folha.
                </small>
              </div>

              <div className="financial-event-field financial-event-field-checkbox">
                <label>
                  <input
                    type="checkbox"
                    name="active"
                    checked={form.active}
                    onChange={handleChange}
                  />

                  <span>Evento ativo</span>
                </label>
              </div>

              <div className="financial-event-field financial-event-field-full">
                <label htmlFor="event-notes">Observações</label>

                <textarea
                  id="event-notes"
                  name="notes"
                  rows="4"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Observações sobre este evento..."
                />
              </div>

              <div className="financial-event-form-actions">
                {editingId !== null && (
                  <button
                    type="button"
                    className="financial-event-secondary-button"
                    onClick={handleCancel}
                  >
                    Cancelar
                  </button>
                )}

                <button
                  type="submit"
                  className="financial-event-primary-button"
                  disabled={!apiReady || loading || saving}
                >
                  {editingId !== null ? 'Atualizar evento' : 'Cadastrar evento'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ====================================================
            LISTA
        ==================================================== */}

        <section className="financial-event-list-card">
          <div className="financial-event-list-header">
            <div>
              <h2>Eventos cadastrados</h2>

              <p>Gerencie os itens disponíveis para utilização na folha.</p>
            </div>
          </div>

          {/* ==================================================
              ABAS
          ================================================== */}

          <div className="financial-event-tabs">
            <button
              type="button"
              className={
                activeTab === FINANCIAL_EVENT_TYPES.EARNING ? 'active' : ''
              }
              onClick={() => {
                setActiveTab(FINANCIAL_EVENT_TYPES.EARNING)

                setSearch('')
              }}
            >
              Proventos
              <span>{earningCount}</span>
            </button>

            <button
              type="button"
              className={
                activeTab === FINANCIAL_EVENT_TYPES.DEDUCTION ? 'active' : ''
              }
              onClick={() => {
                setActiveTab(FINANCIAL_EVENT_TYPES.DEDUCTION)

                setSearch('')
              }}
            >
              Descontos
              <span>{deductionCount}</span>
            </button>
          </div>

          {/* ==================================================
              BUSCA
          ================================================== */}

          <div className="financial-event-search">
            <span>🔍</span>

            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {/* ==================================================
              LISTA
          ================================================== */}

          {filteredEvents.length === 0 ? (
            <div className="financial-event-empty">
              <span>
                {activeTab === FINANCIAL_EVENT_TYPES.EARNING ? '➕' : '➖'}
              </span>

              <strong>
                Nenhum {financialEventTypeLabels[activeTab]} cadastrado
              </strong>

              <p>Cadastre o primeiro evento utilizando o formulário.</p>
            </div>
          ) : (
            <div className="financial-event-table-wrapper">
              <table className="financial-event-table">
                <thead>
                  <tr>
                    <th>Evento</th>

                    <th>Código</th>

                    <th>Cálculo</th>

                    <th>Valor padrão</th>

                    <th>Status</th>

                    {canManage && <th>Ações</th>}
                  </tr>
                </thead>

                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <strong>{event.name}</strong>

                        {event.notes && <small>{event.notes}</small>}
                      </td>

                      <td>{event.code || '-'}</td>

                      <td>
                        {financialCalculationTypeLabels[event.calculationType]}
                      </td>

                      <td>
                        {event.defaultValue !== '' &&
                        event.defaultValue !== null &&
                        event.defaultValue !== undefined
                          ? Number(event.defaultValue).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })
                          : '-'}
                      </td>

                      <td>
                        <span
                          className={`financial-event-status ${
                            event.active === false ? 'inactive' : 'active'
                          }`}
                        >
                          {event.active === false ? 'Inativo' : 'Ativo'}
                        </span>
                      </td>

                      {canManage && (
                        <td>
                          <div className="financial-event-actions">
                            <button
                              type="button"
                              title="Editar"
                              disabled={!apiReady || loading || saving}
                              onClick={() => handleEdit(event)}
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              title={
                                event.active === false ? 'Ativar' : 'Inativar'
                              }
                              disabled={!apiReady || loading || saving}
                              onClick={() => handleToggle(event)}
                            >
                              {event.active === false ? '▶️' : '⏸️'}
                            </button>

                            <button
                              type="button"
                              title="Excluir"
                              disabled={!apiReady || loading || saving}
                              onClick={() => handleDelete(event)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
