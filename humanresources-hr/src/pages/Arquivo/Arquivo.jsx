import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiLogin, apiRequest, clearApiSession, getApiToken, openApiDocument } from '../../services/api'
import './arquivo.css'

const EMPTY_UPLOAD = {
  entityType: 'employee',
  entityId: '',
  category: 'Pessoal',
  documentType: '',
  expiresAt: '',
  file: null
}

const CATEGORIES = ['Pessoal', 'Admissional', 'Contratual', 'Saúde ocupacional', 'Treinamento', 'Certificados', 'Financeiro', 'Férias', 'Rescisão', 'Outros']

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value.includes?.('T') ? value : `${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}

function formatBytes(value) {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function expiryLabel(document) {
  if (document.expiry_status === 'expired') return 'Vencido'
  if (document.expiry_status === 'expiring') return 'Vence em até 30 dias'
  if (document.expiry_status === 'valid') return document.expires_at ? 'Válido' : 'Sem validade'
  return document.expires_at ? 'Válido' : 'Sem validade'
}

export default function Arquivo() {
  const [connected, setConnected] = useState(Boolean(getApiToken()))
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: '' })
  const [documents, setDocuments] = useState([])
  const [employees, setEmployees] = useState([])
  const [candidates, setCandidates] = useState([])
  const [search, setSearch] = useState('')
  const [entityTypeFilter, setEntityTypeFilter] = useState('all')
  const [expiryFilter, setExpiryFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [showUpload, setShowUpload] = useState(false)
  const [uploadForm, setUploadForm] = useState(EMPTY_UPLOAD)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadData = useCallback(async () => {
    if (!getApiToken()) {
      setConnected(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const [documentRows, employeeRows, candidateRows] = await Promise.all([
        apiRequest('/documents'),
        apiRequest('/documents/owners?type=employee'),
        apiRequest('/documents/owners?type=candidate')
      ])
      setDocuments(Array.isArray(documentRows) ? documentRows : [])
      setEmployees(Array.isArray(employeeRows) ? employeeRows : [])
      setCandidates(Array.isArray(candidateRows) ? candidateRows : [])
      setConnected(true)
    } catch (err) {
      if (err.status === 401) {
        clearApiSession()
        setConnected(false)
      }
      setError(err.message || 'Não foi possível carregar o Arquivo.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredDocuments = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('pt-BR')
    return documents.filter((document) => {
      const ownerName = document.employee_name || document.candidate_name || ''
      const matchesSearch = !normalized || [
        document.file_name, document.document_type, document.category, ownerName
      ].some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(normalized))
      const matchesEntity = entityTypeFilter === 'all' || document.entity_type === entityTypeFilter
      const matchesExpiry = expiryFilter === 'all' || document.expiry_status === expiryFilter
      const matchesCategory = categoryFilter === 'all' || document.category === categoryFilter
      return matchesSearch && matchesEntity && matchesExpiry && matchesCategory
    })
  }, [documents, search, entityTypeFilter, expiryFilter, categoryFilter])

  const metrics = useMemo(() => ({
    total: documents.length,
    expired: documents.filter((item) => item.expiry_status === 'expired').length,
    expiring: documents.filter((item) => item.expiry_status === 'expiring').length,
    noExpiry: documents.filter((item) => !item.expires_at).length
  }), [documents])

  async function handleLogin(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiLogin(loginForm.username.trim(), loginForm.password)
      setConnected(true)
      setNotice('Conexão com a API realizada.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Não foi possível entrar na API.')
    } finally {
      setBusy(false)
    }
  }

  function handleDisconnect() {
    clearApiSession()
    setConnected(false)
    setDocuments([])
    setEmployees([])
    setNotice('Sessão da API encerrada.')
  }

  async function handleUpload(event) {
    event.preventDefault()
    if (!uploadForm.file || !uploadForm.entityId || !uploadForm.documentType.trim()) {
      setError('Selecione o cadastro, informe o tipo do documento e escolha o arquivo.')
      return
    }

    const body = new FormData()
    body.append('file', uploadForm.file)
    body.append('entityType', uploadForm.entityType)
    body.append('entityId', uploadForm.entityId)
    body.append('category', uploadForm.category)
    body.append('documentType', uploadForm.documentType.trim())
    body.append('expiresAt', uploadForm.expiresAt)

    setBusy(true)
    setError('')
    setNotice('')
    try {
      await apiRequest('/documents', { method: 'POST', body })
      setShowUpload(false)
      setUploadForm(EMPTY_UPLOAD)
      setNotice('Documento enviado e registrado no Arquivo.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o documento.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload(document) {
    setError('')
    try {
      await openApiDocument(`/documents/${encodeURIComponent(document.id)}/download`)
    } catch (err) {
      setError(err.message || 'Não foi possível abrir o documento.')
    }
  }

  async function handleDelete(document) {
    if (!window.confirm(`Deseja excluir o documento "${document.file_name}"? Essa ação não pode ser desfeita.`)) return
    setError('')
    try {
      await apiRequest(`/documents/${document.id}`, { method: 'DELETE' })
      setNotice('Documento excluído.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Não foi possível excluir o documento.')
    }
  }

  const availableOwners = uploadForm.entityType === 'employee' ? employees : candidates

  return (
    <main className="archive-page">
      <header className="archive-header">
        <div>
          <span className="archive-eyebrow">GESTÃO DOCUMENTAL</span>
          <h1>Arquivo</h1>
          <p>Centralize documentos de funcionários e candidatos no PostgreSQL, acompanhe vencimentos e controle o acesso aos arquivos.</p>
        </div>
        <div className="archive-header-actions">
          {connected && <button className="archive-button archive-button-secondary" onClick={handleDisconnect}>Desconectar API</button>}
          <button className="archive-button" disabled={!connected} onClick={() => { setError(''); setShowUpload(true) }}>+ Enviar documento</button>
        </div>
      </header>

      {error && <div className="archive-alert archive-alert-error" role="alert">{error}</div>}
      {notice && <div className="archive-alert archive-alert-success" role="status">{notice}</div>}

      {!connected ? (
        <section className="archive-connect-card">
          <div className="archive-connect-icon">↔</div>
          <h2>Conectar ao banco de dados</h2>
          <p>O Arquivo consulta a API protegida. Metadados e novos arquivos são armazenados no PostgreSQL. Faça login com um usuário cadastrado na API.</p>
          <form onSubmit={handleLogin} className="archive-login-form">
            <label>Usuário<input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} autoComplete="username" required /></label>
            <label>Senha da API<input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} autoComplete="current-password" required /></label>
            <button className="archive-button" disabled={busy}>{busy ? 'Conectando…' : 'Conectar'}</button>
          </form>
          <p className="archive-muted">A API/PostgreSQL ainda precisam estar iniciados e configurados. Esta tela não depende do localStorage para os documentos.</p>
        </section>
      ) : (
        <>
          <section className="archive-metrics">
            <article><span>Documentos</span><strong>{metrics.total}</strong></article>
            <article><span>Vencidos</span><strong className={metrics.expired ? 'archive-number-danger' : ''}>{metrics.expired}</strong></article>
            <article><span>Vencem em 30 dias</span><strong className={metrics.expiring ? 'archive-number-warning' : ''}>{metrics.expiring}</strong></article>
            <article><span>Sem validade informada</span><strong>{metrics.noExpiry}</strong></article>
          </section>

          <section className="archive-panel">
            <div className="archive-toolbar">
              <label className="archive-search">Buscar documento
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome, tipo, categoria ou pessoa…" />
              </label>
              <label>Vínculo
                <select value={entityTypeFilter} onChange={(event) => setEntityTypeFilter(event.target.value)}>
                  <option value="all">Todos</option><option value="employee">Funcionários</option><option value="candidate">Candidatos</option><option value="unassigned">Sem vínculo</option>
                </select>
              </label>
              <label>Validade
                <select value={expiryFilter} onChange={(event) => setExpiryFilter(event.target.value)}>
                  <option value="all">Todas</option><option value="expired">Vencidos</option><option value="expiring">Vencem em 30 dias</option><option value="valid">Válidos</option><option value="no_expiry">Sem validade</option>
                </select>
              </label>
              <label>Categoria
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">Todas</option>{CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <button className="archive-button archive-button-secondary" onClick={loadData} disabled={loading}>{loading ? 'Atualizando…' : 'Atualizar'}</button>
            </div>

            <div className="archive-table-wrap">
              <table className="archive-table">
                <thead><tr><th>Documento</th><th>Pessoa vinculada</th><th>Categoria</th><th>Validade</th><th>Enviado em</th><th>Tamanho</th><th>Ações</th></tr></thead>
                <tbody>
                  {filteredDocuments.map((document) => (
                    <tr key={document.id}>
                      <td><strong>{document.document_type || 'Documento'}</strong><small>{document.file_name}</small></td>
                      <td>{document.employee_name || document.candidate_name || '—'}<small>{document.entity_type === 'candidate' ? 'Candidato' : document.entity_type === 'employee' ? 'Funcionário' : 'Sem vínculo'}</small></td>
                      <td>{document.category || 'Outros'}</td>
                      <td><span className={`archive-status archive-status-${document.expiry_status || 'no_expiry'}`}>{expiryLabel(document)}</span><small>{formatDate(document.expires_at)}</small></td>
                      <td>{formatDate(document.created_at)}</td>
                      <td>{formatBytes(document.size_bytes)}</td>
                      <td><div className="archive-row-actions"><button title="Abrir documento" onClick={() => handleDownload(document)}>Abrir</button><button className="archive-delete-link" title="Excluir documento" onClick={() => handleDelete(document)}>Excluir</button></div></td>
                    </tr>
                  ))}
                  {!filteredDocuments.length && <tr><td colSpan="7" className="archive-empty">{loading ? 'Carregando documentos…' : 'Nenhum documento encontrado com esses filtros.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <footer className="archive-table-footer">{filteredDocuments.length} de {documents.length} documento(s)</footer>
          </section>
        </>
      )}

      {showUpload && (
        <div className="archive-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowUpload(false) }}>
          <section className="archive-modal" role="dialog" aria-modal="true" aria-labelledby="archive-upload-title">
            <div className="archive-modal-heading"><div><span className="archive-eyebrow">NOVO ARQUIVO</span><h2 id="archive-upload-title">Enviar documento</h2></div><button aria-label="Fechar" onClick={() => setShowUpload(false)}>×</button></div>
            <form onSubmit={handleUpload}>
              <div className="archive-form-grid">
                <label>Vincular a
                  <select value={uploadForm.entityType} onChange={(event) => setUploadForm({ ...uploadForm, entityType: event.target.value, entityId: '' })}>
                    <option value="employee">Funcionário</option><option value="candidate">Candidato</option>
                  </select>
                </label>
                <label>{uploadForm.entityType === 'employee' ? 'Funcionário' : 'Candidato'}
                  <select value={uploadForm.entityId} onChange={(event) => setUploadForm({ ...uploadForm, entityId: event.target.value })} required>
                    <option value="">Selecione…</option>{availableOwners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name}</option>)}
                  </select>
                </label>
                <label>Categoria
                  <select value={uploadForm.category} onChange={(event) => setUploadForm({ ...uploadForm, category: event.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
                </label>
                <label>Tipo de documento<input value={uploadForm.documentType} onChange={(event) => setUploadForm({ ...uploadForm, documentType: event.target.value })} placeholder="Ex.: RG, CPF, CTPS Digital…" required /></label>
                <label>Data de validade (opcional)<input type="date" value={uploadForm.expiresAt} onChange={(event) => setUploadForm({ ...uploadForm, expiresAt: event.target.value })} /></label>
                <label className="archive-file-input">Arquivo (máx. configurado na API)<input type="file" onChange={(event) => setUploadForm({ ...uploadForm, file: event.target.files?.[0] || null })} required /></label>
              </div>
              {uploadForm.file && <p className="archive-file-selected">Selecionado: {uploadForm.file.name} · {formatBytes(uploadForm.file.size)}</p>}
              <div className="archive-modal-actions"><button type="button" className="archive-button archive-button-secondary" onClick={() => setShowUpload(false)}>Cancelar</button><button className="archive-button" disabled={busy}>{busy ? 'Enviando…' : 'Enviar documento'}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
