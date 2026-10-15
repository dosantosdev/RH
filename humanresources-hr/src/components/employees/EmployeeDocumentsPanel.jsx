import { useCallback, useEffect, useState } from 'react'
import { apiRequest, openApiDocument } from '../../services/api'
import { hasPermission } from '../../services/permissions'
import './EmployeeDocumentsPanel.css'

const CATEGORIES = ['Pessoal', 'Admissional', 'Contratual', 'Médico', 'CNH', 'Certificados', 'Outros']

function formatDate(value) {
  if (!value) return 'Sem vencimento'
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('pt-BR')
}

function formatSize(bytes) {
  const size = Number(bytes || 0)
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function EmployeeDocumentsPanel({ employee }) {
  const employeeId = employee?.databaseId || employee?.id
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('Pessoal')
  const [documentType, setDocumentType] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [file, setFile] = useState(null)

  const canView = hasPermission('documents_view')
  const canUpload = hasPermission('documents_upload')
  const canDelete = hasPermission('documents_delete')

  const loadDocuments = useCallback(async () => {
    if (!employeeId || employeeId === 'undefined' || employeeId === 'null') {
      setError('Não foi possível identificar o funcionário para consultar documentos.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const rows = await apiRequest(`/documents/employee/${encodeURIComponent(employeeId)}`)
      setDocuments(Array.isArray(rows) ? rows : [])
    } catch (err) {
      setError(err.message || 'Não foi possível carregar os documentos.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    if (canView) loadDocuments()
    else setLoading(false)
  }, [canView, loadDocuments])

  async function handleUpload(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!file) {
      setError('Selecione um arquivo antes de enviar.')
      return
    }
    if (!documentType.trim()) {
      setError('Informe o tipo de documento.')
      return
    }
    const body = new FormData()
    body.append('file', file)
    body.append('category', category)
    body.append('documentType', documentType.trim())
    if (expiresAt) body.append('expiresAt', expiresAt)

    setBusy(true)
    try {
      await apiRequest(`/documents/employee/${encodeURIComponent(employeeId)}`, {
        method: 'POST',
        body
      })
      setFile(null)
      setDocumentType('')
      setExpiresAt('')
      const input = document.getElementById(`employee-document-file-${employeeId}`)
      if (input) input.value = ''
      setMessage('Documento enviado e salvo com sucesso.')
      await loadDocuments()
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o documento.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDownload(documentId) {
    setError('')
    try {
      await openApiDocument(`/documents/${encodeURIComponent(documentId)}/download`)
    } catch (err) {
      setError(err.message || 'Não foi possível abrir o documento.')
    }
  }

  async function handleDelete(documentId) {
    if (!window.confirm('Deseja realmente excluir este documento?')) return
    setError('')
    setMessage('')
    try {
      await apiRequest(`/documents/${encodeURIComponent(documentId)}`, { method: 'DELETE' })
      setDocuments((current) => current.filter((item) => item.id !== documentId))
      setMessage('Documento excluído.')
    } catch (err) {
      setError(err.message || 'Não foi possível excluir o documento.')
    }
  }

  if (!canView) return null

  return (
    <section className="employee-documents-panel">
      <header className="employee-documents-heading">
        <div>
          <h2>Documentos anexados</h2>
          <p>Arquivos vinculados a este funcionário e armazenados no PostgreSQL.</p>
        </div>
        <button type="button" onClick={loadDocuments} disabled={loading || busy}>Atualizar</button>
      </header>

      {error && <p className="employee-documents-alert error" role="alert">{error}</p>}
      {message && <p className="employee-documents-alert success" role="status">{message}</p>}

      {canUpload && (
        <form className="employee-documents-form" onSubmit={handleUpload}>
          <label>
            Categoria
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Tipo de documento
            <input value={documentType} onChange={(event) => setDocumentType(event.target.value)} placeholder="Ex.: RG, contrato, exame admissional" maxLength={120} />
          </label>
          <label>
            Data de vencimento (opcional)
            <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
          </label>
          <label className="employee-documents-file">
            Arquivo (máximo configurado no servidor)
            <input id={`employee-document-file-${employeeId}`} type="file" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Enviando...' : 'Enviar documento'}</button>
        </form>
      )}

      <div className="employee-documents-list">
        {loading ? <p>Carregando documentos...</p> : documents.length === 0 ? (
          <p className="employee-documents-empty">Nenhum documento anexado a este funcionário.</p>
        ) : documents.map((doc) => (
          <article className="employee-document-row" key={doc.id}>
            <div className="employee-document-main">
              <strong>{doc.file_name}</strong>
              <span>{doc.category} · {doc.document_type}</span>
              <small>{formatSize(doc.size_bytes)} · Enviado em {formatDate(doc.created_at)}</small>
              {doc.expires_at && <small>Vencimento: {formatDate(doc.expires_at)}</small>}
            </div>
            <div className="employee-document-actions">
              <button type="button" onClick={() => handleDownload(doc.id)}>Abrir</button>
              {canDelete && <button type="button" className="danger" onClick={() => handleDelete(doc.id)}>Excluir</button>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
