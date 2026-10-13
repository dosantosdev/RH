import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createChatConversation,
  getChatConversations,
  getChatDirectory,
  getChatMessages,
  sendChatMessage,
  updateChatStatus
} from '../../services/chat'
import './chat.css'

const STATUS_LABELS = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting: 'Aguardando resposta',
  resolved: 'Resolvido'
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('loggedUser') || 'null')
  } catch {
    return null
  }
}

export default function Chat() {
  const currentUser = useMemo(getCurrentUser, [])
  const canManageSupport = currentUser?.isAdmin === true ||
    currentUser?.permissions?.includes('chat_manage')

  const [conversations, setConversations] = useState([])
  const [directory, setDirectory] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newType, setNewType] = useState('direct')
  const [newTitle, setNewTitle] = useState('')
  const [newFirstMessage, setNewFirstMessage] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])
  const [directorySearch, setDirectorySearch] = useState('')
  const [branchFilter, setBranchFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [conversationSearch, setConversationSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const messagesEndRef = useRef(null)
  const draftRef = useRef(null)

  const selectedConversation = conversations.find((item) => item.id === selectedId) || null

  const branchOptions = useMemo(() => {
    const map = new Map()
    directory.forEach((person) => {
      if (person.branch_id && person.branch_name) map.set(person.branch_id, person.branch_name)
    })
    return [...map.entries()].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [directory])

  const departmentOptions = useMemo(() => {
    const map = new Map()
    directory.forEach((person) => {
      if (person.department_id && person.department_name) {
        map.set(person.department_id, person.department_name)
      }
    })
    return [...map.entries()].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [directory])

  const visibleDirectory = useMemo(() => {
    const query = directorySearch.trim().toLocaleLowerCase('pt-BR')
    return directory.filter((person) => {
      const matchesSearch = !query ||
        `${person.name} ${person.username}`.toLocaleLowerCase('pt-BR').includes(query)
      const matchesBranch = !branchFilter || person.branch_id === branchFilter
      const matchesDepartment = !departmentFilter || person.department_id === departmentFilter
      return matchesSearch && matchesBranch && matchesDepartment
    })
  }, [directory, directorySearch, branchFilter, departmentFilter])

  const visibleConversations = useMemo(() => {
    const query = conversationSearch.trim().toLocaleLowerCase('pt-BR')

    return conversations.filter((conversation) => {
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'support' && conversation.type === 'support') ||
        (statusFilter !== 'support' && statusFilter !== 'all' &&
          conversation.type === 'support' && conversation.status === statusFilter)

      const searchableText = [
        conversation.title,
        conversation.participant_names,
        conversation.last_message,
        conversation.last_sender_name
      ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')

      return matchesStatus && (!query || searchableText.includes(query))
    })
  }, [conversations, statusFilter, conversationSearch])

  const loadConversations = useCallback(async (quiet = false) => {
    try {
      const result = await getChatConversations()
      setConversations(result)
      setError('')
      if (!selectedId && result.length) {
        setSelectedId(result[0].id)
      }
    } catch (loadError) {
      if (!quiet) setError(loadError.message || 'Não foi possível carregar as conversas.')
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [selectedId])

  const loadDirectory = useCallback(async () => {
    try {
      const result = await getChatDirectory()
      setDirectory(result)
    } catch (loadError) {
      setError(loadError.message || 'Não foi possível carregar os usuários da empresa.')
    }
  }, [])

  const loadMessages = useCallback(async (conversationId, quiet = false) => {
    if (!conversationId) {
      setMessages([])
      return
    }

    try {
      const result = await getChatMessages(conversationId)
      setMessages(result)
      setConversations((current) => current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, unread_count: 0 }
          : conversation
      ))
      setError('')
    } catch (loadError) {
      if (!quiet) setError(loadError.message || 'Não foi possível carregar as mensagens.')
    }
  }, [])

  useEffect(() => {
    loadConversations()
    loadDirectory()
  }, [loadConversations, loadDirectory])

  // Atualiza a lista periodicamente para refletir novas mensagens e não lidas.
  useEffect(() => {
    const timer = setInterval(() => {
      loadConversations(true)
    }, 5000)
    return () => clearInterval(timer)
  }, [loadConversations])

  // O polling permite atualização sem recarregar a página; WebSocket pode ser adicionado depois.
  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return undefined
    }

    loadMessages(selectedId)
    const timer = setInterval(() => loadMessages(selectedId, true), 4000)
    return () => clearInterval(timer)
  }, [selectedId, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, selectedId])

  async function handleSend(event) {
    event.preventDefault()
    const body = draft.trim()

    if (!body || !selectedId || sending) return

    setSending(true)
    setError('')

    try {
      const message = await sendChatMessage(selectedId, body)
      setMessages((current) => [...current, message])
      setDraft('')
      await loadConversations(true)
      draftRef.current?.focus()
    } catch (sendError) {
      setError(sendError.message || 'Não foi possível enviar a mensagem.')
    } finally {
      setSending(false)
    }
  }

  function toggleUser(userId) {
    setSelectedUsers((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]
    )
  }

  async function handleCreateConversation(event) {
    event.preventDefault()
    if (creating) return

    if (newType === 'direct' && selectedUsers.length !== 1) {
      setError('Selecione uma pessoa para iniciar uma conversa individual.')
      return
    }

    if (newType === 'group' && selectedUsers.length < 1) {
      setError('Selecione pelo menos uma pessoa para criar o grupo.')
      return
    }

    if ((newType === 'group' || newType === 'support') && !newTitle.trim()) {
      setError(newType === 'support'
        ? 'Informe o assunto do atendimento.'
        : 'Informe o nome do grupo.')
      return
    }

    setCreating(true)
    setError('')

    try {
      const conversation = await createChatConversation({
        type: newType,
        title: newTitle.trim(),
        participantIds: selectedUsers,
        branchId: branchFilter || null,
        departmentId: departmentFilter || null
      })

      if (newFirstMessage.trim()) {
        await sendChatMessage(conversation.id, newFirstMessage.trim())
      }

      await loadConversations(true)
      setSelectedId(conversation.id)
      setShowNew(false)
      setNewTitle('')
      setNewFirstMessage('')
      setSelectedUsers([])
      setDirectorySearch('')
      setBranchFilter('')
      setDepartmentFilter('')
      setNotice(newType === 'support'
        ? 'Atendimento criado com sucesso.'
        : 'Conversa criada com sucesso.')
      window.setTimeout(() => setNotice(''), 3500)
    } catch (createError) {
      setError(createError.message || 'Não foi possível criar a conversa.')
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusChange(status) {
    if (!selectedConversation || !canManageSupport) return

    try {
      await updateChatStatus(selectedConversation.id, status, selectedConversation.assigned_to || null)
      await loadConversations(true)
      setNotice('Status do atendimento atualizado.')
      window.setTimeout(() => setNotice(''), 3000)
    } catch (statusError) {
      setError(statusError.message || 'Não foi possível atualizar o atendimento.')
    }
  }

  async function handleAssigneeChange(assignedTo) {
    if (!selectedConversation || !canManageSupport) return

    try {
      await updateChatStatus(
        selectedConversation.id,
        selectedConversation.status,
        assignedTo || null
      )
      await loadConversations(true)
      setNotice('Responsável pelo atendimento atualizado.')
      window.setTimeout(() => setNotice(''), 3000)
    } catch (assigneeError) {
      setError(assigneeError.message || 'Não foi possível atualizar o responsável.')
    }
  }

  function conversationTitle(conversation) {
    if (conversation.title) return conversation.title
    if (conversation.type === 'direct') {
      return conversation.participant_names || 'Conversa individual'
    }
    return 'Conversa'
  }

  function conversationSubtitle(conversation) {
    if (conversation.type === 'support') {
      return `Atendimento · ${STATUS_LABELS[conversation.status] || conversation.status}`
    }
    if (conversation.type === 'group') {
      return `${conversation.participant_count || 0} participantes`
    }
    return 'Conversa individual'
  }

  return (
    <main className="chat-page">
      <header className="chat-page-header">
        <div>
          <span className="chat-eyebrow">COMUNICAÇÃO INTERNA</span>
          <h1>Chat corporativo</h1>
          <p>Converse com colegas ou acompanhe solicitações de atendimento.</p>
        </div>
        <button className="chat-primary-button" type="button" onClick={() => {
          setShowNew((current) => !current)
          setError('')
        }}>
          {showNew ? 'Cancelar' : '+ Nova conversa'}
        </button>
      </header>

      {error && <div className="chat-alert chat-alert-error" role="alert">{error}</div>}
      {notice && <div className="chat-alert chat-alert-success" role="status">{notice}</div>}

      <section className="chat-workspace">
        <aside className="chat-sidebar">
          <div className="chat-list-heading">
            <h2>Conversas</h2>
            <span>{conversations.length}</span>
          </div>

          <label className="chat-filter-label" htmlFor="chat-search">Pesquisar conversas</label>
          <input
            id="chat-search"
            className="chat-input chat-sidebar-search"
            value={conversationSearch}
            onChange={(event) => setConversationSearch(event.target.value)}
            placeholder="Nome ou mensagem..."
          />

          <label className="chat-filter-label" htmlFor="chat-status-filter">Mostrar</label>
          <select
            id="chat-status-filter"
            className="chat-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Todas as conversas</option>
            <option value="support">Atendimentos</option>
            <option value="open">Atendimentos abertos</option>
            <option value="in_progress">Em atendimento</option>
            <option value="waiting">Aguardando resposta</option>
            <option value="resolved">Resolvidos</option>
          </select>

          <div className="chat-conversation-list">
            {loading && <p className="chat-empty">Carregando conversas...</p>}
            {!loading && visibleConversations.length === 0 && (
              <p className="chat-empty">Nenhuma conversa por aqui ainda.</p>
            )}
            {visibleConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className={`chat-conversation-item ${selectedId === conversation.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(conversation.id)}
              >
                <span className={`chat-avatar ${conversation.type}`}>
                  {conversation.type === 'support' ? 'AT' : conversationTitle(conversation).slice(0, 1).toUpperCase()}
                </span>
                <span className="chat-conversation-copy">
                  <span className="chat-conversation-title">{conversationTitle(conversation)}</span>
                  <span className="chat-conversation-subtitle">{conversationSubtitle(conversation)}</span>
                  <span className="chat-last-message">
                    {conversation.last_sender_name ? `${conversation.last_sender_name}: ` : ''}
                    {conversation.last_message || 'Nenhuma mensagem ainda'}
                  </span>
                </span>
                <span className="chat-conversation-meta">
                  <span>{formatTime(conversation.last_message_at)}</span>
                  {Number(conversation.unread_count) > 0 && (
                    <b className="chat-unread-count">{conversation.unread_count}</b>
                  )}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="chat-main">
          {showNew ? (
            <form className="chat-new-conversation" onSubmit={handleCreateConversation}>
              <div className="chat-panel-heading">
                <div>
                  <h2>Iniciar conversa</h2>
                  <p>Os participantes são limitados à sua empresa.</p>
                </div>
              </div>

              <label className="chat-form-label" htmlFor="chat-new-type">Tipo</label>
              <select
                id="chat-new-type"
                className="chat-select"
                value={newType}
                onChange={(event) => {
                  setNewType(event.target.value)
                  setSelectedUsers([])
                  setError('')
                }}
              >
                <option value="direct">Conversa individual</option>
                <option value="group">Grupo</option>
                <option value="support">Solicitar atendimento</option>
              </select>

              {(newType === 'group' || newType === 'support') && (
                <>
                  <label className="chat-form-label" htmlFor="chat-new-title">
                    {newType === 'support' ? 'Assunto do atendimento' : 'Nome do grupo'}
                  </label>
                  <input
                    id="chat-new-title"
                    className="chat-input"
                    value={newTitle}
                    maxLength={180}
                    onChange={(event) => setNewTitle(event.target.value)}
                    placeholder={newType === 'support' ? 'Ex.: Dúvida sobre folha de pagamento' : 'Ex.: Equipe da filial'}
                    required
                  />
                </>
              )}

              {newType !== 'support' && (
                <>
                  <label className="chat-form-label" htmlFor="chat-directory-search">Buscar pessoa</label>
                  <input
                    id="chat-directory-search"
                    className="chat-input"
                    value={directorySearch}
                    onChange={(event) => setDirectorySearch(event.target.value)}
                    placeholder="Nome ou usuário..."
                  />

                  <div className="chat-directory-filters">
                    <div>
                      <label className="chat-form-label" htmlFor="chat-branch-filter">Filial</label>
                      <select id="chat-branch-filter" className="chat-select" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
                        <option value="">Todas as filiais</option>
                        {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="chat-form-label" htmlFor="chat-department-filter">Departamento</label>
                      <select id="chat-department-filter" className="chat-select" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                        <option value="">Todos os departamentos</option>
                        {departmentOptions.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <p className="chat-selection-help">
                    {newType === 'direct'
                      ? 'Selecione uma pessoa.'
                      : 'Selecione uma ou mais pessoas para adicionar ao grupo.'}
                    {selectedUsers.length ? ` Selecionadas: ${selectedUsers.length}.` : ''}
                  </p>

                  <div className="chat-directory-list">
                    {visibleDirectory.map((person) => (
                      <label className="chat-directory-person" key={person.id}>
                        <input
                          type={newType === 'direct' ? 'radio' : 'checkbox'}
                          name="chat-person"
                          checked={selectedUsers.includes(person.id)}
                          onChange={() => {
                            if (newType === 'direct') setSelectedUsers([person.id])
                            else toggleUser(person.id)
                          }}
                        />
                        <span className="chat-avatar">{person.name.slice(0, 1).toUpperCase()}</span>
                        <span className="chat-directory-person-copy">
                          <strong>{person.name}</strong>
                          <small>
                            {[person.branch_name, person.department_name].filter(Boolean).join(' · ') || person.username}
                          </small>
                        </span>
                      </label>
                    ))}
                    {!visibleDirectory.length && <p className="chat-empty">Nenhum usuário encontrado com esses filtros.</p>}
                  </div>
                </>
              )}

              <label className="chat-form-label" htmlFor="chat-first-message">Mensagem inicial (opcional)</label>
              <textarea
                id="chat-first-message"
                className="chat-input chat-textarea"
                value={newFirstMessage}
                maxLength={5000}
                onChange={(event) => setNewFirstMessage(event.target.value)}
                placeholder="Escreva uma primeira mensagem..."
                rows={3}
              />

              <div className="chat-form-actions">
                <button type="button" className="chat-secondary-button" onClick={() => setShowNew(false)}>Cancelar</button>
                <button type="submit" className="chat-primary-button" disabled={creating}>
                  {creating ? 'Criando...' : newType === 'support' ? 'Abrir atendimento' : 'Criar conversa'}
                </button>
              </div>
            </form>
          ) : selectedConversation ? (
            <>
              <header className="chat-conversation-header">
                <div className="chat-header-person">
                  <span className={`chat-avatar large ${selectedConversation.type}`}>
                    {selectedConversation.type === 'support' ? 'AT' : conversationTitle(selectedConversation).slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <h2>{conversationTitle(selectedConversation)}</h2>
                    <p>{conversationSubtitle(selectedConversation)}</p>
                  </div>
                </div>

                {selectedConversation.type === 'support' && canManageSupport && (
                  <div className="chat-support-controls">
                    <label className="chat-status-control">
                      <span>Status</span>
                      <select
                        className="chat-select"
                        value={selectedConversation.status}
                        onChange={(event) => handleStatusChange(event.target.value)}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="chat-status-control">
                      <span>Responsável</span>
                      <select
                        className="chat-select"
                        value={selectedConversation.assigned_to || ''}
                        onChange={(event) => handleAssigneeChange(event.target.value)}
                      >
                        <option value="">Sem responsável</option>
                        {!directory.some((person) => person.id === currentUser?.id) && currentUser?.id && (
                          <option value={currentUser.id}>{currentUser.name || 'Você'}</option>
                        )}
                        {directory.map((person) => (
                          <option key={person.id} value={person.id}>{person.name}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </header>

              <div className="chat-message-list" aria-live="polite">
                {messages.length === 0 && (
                  <div className="chat-no-messages">
                    <span>✦</span>
                    <strong>Esta conversa está começando</strong>
                    <p>Envie uma mensagem para iniciar o histórico.</p>
                  </div>
                )}

                {messages.map((message) => {
                  const isMine = message.sender_id === currentUser?.id
                  return (
                    <article key={message.id} className={`chat-message-row ${isMine ? 'mine' : ''}`}>
                      {!isMine && <span className="chat-message-sender">{message.sender_name}</span>}
                      <div className="chat-message-bubble">
                        <p>{message.body}</p>
                        <time dateTime={message.created_at}>{formatTime(message.created_at)}</time>
                      </div>
                    </article>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {selectedConversation.type === 'support' && selectedConversation.status === 'resolved' ? (
                <div className="chat-resolved-note">
                  Este atendimento está resolvido.
                  {canManageSupport ? ' Altere o status para permitir novas mensagens.' : ' Entre em contato com o responsável se precisar reabri-lo.'}
                </div>
              ) : (
                <form className="chat-composer" onSubmit={handleSend}>
                  <textarea
                    ref={draftRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Escreva sua mensagem..."
                    maxLength={5000}
                    rows={2}
                    aria-label="Mensagem"
                  />
                  <div className="chat-composer-footer">
                    <span>{draft.length}/5000</span>
                    <button type="submit" className="chat-primary-button" disabled={sending || !draft.trim()}>
                      {sending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="chat-welcome">
              <span className="chat-welcome-icon">✦</span>
              <h2>Seu espaço de comunicação</h2>
              <p>Escolha uma conversa ou inicie uma nova para começar.</p>
              <button type="button" className="chat-primary-button" onClick={() => setShowNew(true)}>Iniciar conversa</button>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
