import express from 'express'
import crypto from 'node:crypto'
import multer from 'multer'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import { getFileUrl, deleteFile } from '../services/firebaseStorage.js'

const router = express.Router()

const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }
})

router.use(authenticate)

const DOCUMENT_COLUMNS = `
  doc.id, doc.company_id, doc.employee_id, doc.candidate_id, doc.category,
  doc.document_type, doc.file_name, doc.storage_path, doc.mime_type,
  doc.size_bytes, doc.expires_at, doc.status, doc.uploaded_by, doc.metadata,
  doc.created_at
`

function safeFileName(value) {
  return String(value || 'documento')
    .replace(/[\\r\\n"]/g, '_')
    .replace(/[\\/\\\\]/g, '_')
    .slice(0, 240)
}

function contentDisposition(fileName, mimeType) {
  const safe = safeFileName(fileName)
  const safeInlineTypes = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp'
  ])
  const disposition = safeInlineTypes.has(String(mimeType || '').toLowerCase())
    ? 'inline'
    : 'attachment'
  return `${disposition}; filename="${safe.replace(/[^\\x20-\\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(safe)}`
}

async function findOwner(entityType, entityId, companyId) {
  const table = entityType === 'candidate' ? 'candidates' : 'employees'
  const result = await pool.query(
    `SELECT id FROM ${table} WHERE id = $1 AND company_id = $2`,
    [entityId, companyId]
  )
  return result.rowCount > 0
}

async function insertDocument({
  req, entityType, entityId, category, documentType, expiresAt
}) {
  if (!req.file) {
    const error = new Error('Selecione um arquivo para enviar.')
    error.status = 400
    throw error
  }

  if (!['employee', 'candidate'].includes(entityType) || !entityId) {
    const error = new Error('Selecione um funcionário ou candidato.')
    error.status = 400
    throw error
  }

  if (!await findOwner(entityType, entityId, req.user.companyId)) {
    const error = new Error('Cadastro vinculado não encontrado nesta empresa.')
    error.status = 404
    throw error
  }

  const documentId = crypto.randomUUID()
  const result = await pool.query(
    `INSERT INTO employee_documents
      (id, company_id, employee_id, candidate_id, category, document_type,
       file_name, storage_path, file_data, mime_type, size_bytes, expires_at, uploaded_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,$8,$9,$10,$11,$12)
     RETURNING id, company_id, employee_id, candidate_id, category, document_type,
       file_name, storage_path, mime_type, size_bytes, expires_at, status,
       uploaded_by, metadata, created_at`,
    [
      documentId,
      req.user.companyId,
      entityType === 'employee' ? entityId : null,
      entityType === 'candidate' ? entityId : null,
      category || 'Outros',
      documentType || 'Documento',
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype || 'application/octet-stream',
      req.file.size,
      expiresAt || null,
      req.user.userId
    ]
  )
  return result.rows[0]
}

// Lista os cadastros que podem receber documentos.
router.get('/owners', requirePermission('documents_view'), async (req, res, next) => {
  try {
    const type = req.query.type === 'candidate' ? 'candidate' : 'employee'
    const table = type === 'candidate' ? 'candidates' : 'employees'
    const statusFilter = type === 'employee' ? "AND status <> 'terminated'" : ''
    const result = await pool.query(
      `SELECT id, name, email, cpf FROM ${table}
       WHERE company_id = $1 ${statusFilter}
       ORDER BY name LIMIT 1000`,
      [req.user.companyId]
    )
    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

// Lista central de documentos. O conteúdo binário nunca é enviado na listagem.
router.get('/', requirePermission('documents_view'), async (req, res, next) => {
  try {
    const values = [req.user.companyId]
    const where = ['doc.company_id = $1']
    const { search, entityType, category, status } = req.query

    if (entityType === 'employee') where.push('doc.employee_id IS NOT NULL')
    if (entityType === 'candidate') where.push('doc.candidate_id IS NOT NULL')
    if (entityType === 'unassigned') where.push('doc.employee_id IS NULL AND doc.candidate_id IS NULL')
    if (category) {
      values.push(category)
      where.push(`doc.category = $${values.length}`)
    }
    if (status === 'expired') where.push("doc.expires_at < CURRENT_DATE")
    if (status === 'expiring') where.push("doc.expires_at >= CURRENT_DATE AND doc.expires_at <= CURRENT_DATE + INTERVAL '30 days'")
    if (status === 'valid') where.push("(doc.expires_at IS NULL OR doc.expires_at > CURRENT_DATE + INTERVAL '30 days')")
    if (status === 'no_expiry') where.push('doc.expires_at IS NULL')
    if (search) {
      values.push(`%${String(search).slice(0, 120)}%`)
      where.push(`(
        doc.file_name ILIKE $${values.length}
        OR doc.document_type ILIKE $${values.length}
        OR doc.category ILIKE $${values.length}
        OR COALESCE(e.name, '') ILIKE $${values.length}
        OR COALESCE(c.name, '') ILIKE $${values.length}
      )`)
    }

    const result = await pool.query(
      `SELECT ${DOCUMENT_COLUMNS},
        e.name AS employee_name, c.name AS candidate_name,
        CASE WHEN doc.employee_id IS NOT NULL THEN 'employee'
             WHEN doc.candidate_id IS NOT NULL THEN 'candidate'
             ELSE 'unassigned' END AS entity_type,
        CASE WHEN doc.expires_at IS NULL THEN 'no_expiry'
             WHEN doc.expires_at < CURRENT_DATE THEN 'expired'
             WHEN doc.expires_at <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
             ELSE 'valid' END AS expiry_status
       FROM employee_documents doc
       LEFT JOIN employees e ON e.id = doc.employee_id AND e.company_id = doc.company_id
       LEFT JOIN candidates c ON c.id = doc.candidate_id AND c.company_id = doc.company_id
       WHERE ${where.join(' AND ')}
       ORDER BY doc.created_at DESC LIMIT 500`,
      values
    )
    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

// Uploads novos são gravados integralmente no PostgreSQL; não dependem do Firebase.
router.post('/', requirePermission('documents_upload'), upload.single('file'), async (req, res, next) => {
  try {
    const document = await insertDocument({
      req,
      entityType: req.body?.entityType,
      entityId: req.body?.entityId,
      category: req.body?.category,
      documentType: req.body?.documentType,
      expiresAt: req.body?.expiresAt || null
    })
    return res.status(201).json(document)
  } catch (error) {
    return next(error)
  }
})

router.patch('/:id', requirePermission('documents_edit'), async (req, res, next) => {
  try {
    const { category, documentType, expiresAt, status, notes } = req.body || {}
    const result = await pool.query(
      `UPDATE employee_documents
       SET category = COALESCE($3, category),
           document_type = COALESCE($4, document_type),
           expires_at = CASE WHEN $5::text = '__clear__' THEN NULL
                             WHEN $5::text IS NULL THEN expires_at
                             ELSE $5::date END,
           status = COALESCE($6, status),
           metadata = CASE WHEN $7::text IS NULL THEN metadata
                           ELSE metadata || jsonb_build_object('notes', $7::text) END
       WHERE id = $1 AND company_id = $2
       RETURNING id, company_id, employee_id, candidate_id, category, document_type,
         file_name, storage_path, mime_type, size_bytes, expires_at, status,
         uploaded_by, metadata, created_at`,
      [req.params.id, req.user.companyId, category ?? null, documentType ?? null,
        expiresAt === '' ? '__clear__' : (expiresAt ?? null), status ?? null, notes ?? null]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Documento não encontrado.' })
    return res.json(result.rows[0])
  } catch (error) {
    return next(error)
  }
})

router.get('/employee/:employeeId', requirePermission('documents_view'), async (req, res, next) => {
  try {
    const employee = await pool.query(
      'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
      [req.params.employeeId, req.user.companyId]
    )
    if (!employee.rowCount) return res.status(404).json({ message: 'Funcionário não encontrado.' })

    const result = await pool.query(
      `SELECT id, company_id, employee_id, candidate_id, category, document_type,
        file_name, storage_path, mime_type, size_bytes, expires_at, status,
        uploaded_by, metadata, created_at
       FROM employee_documents
       WHERE company_id = $1 AND employee_id = $2
       ORDER BY created_at DESC`,
      [req.user.companyId, req.params.employeeId]
    )
    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

router.post('/employee/:employeeId', requirePermission('documents_upload'), upload.single('file'), async (req, res, next) => {
  try {
    const document = await insertDocument({
      req,
      entityType: 'employee',
      entityId: req.params.employeeId,
      category: req.body?.category,
      documentType: req.body?.documentType,
      expiresAt: req.body?.expiresAt || null
    })
    return res.status(201).json(document)
  } catch (error) {
    return next(error)
  }
})

// Retorna o binário do PostgreSQL. Registros antigos sem file_data ainda tentam abrir no Firebase.
router.get('/:id/download', requirePermission('documents_view'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT file_data, storage_path, file_name, mime_type
       FROM employee_documents
       WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.companyId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Documento não encontrado.' })

    const document = result.rows[0]
    if (document.file_data) {
      res.setHeader('Content-Type', document.mime_type || 'application/octet-stream')
      res.setHeader('Content-Length', document.file_data.length)
      res.setHeader('Content-Disposition', contentDisposition(document.file_name, document.mime_type))
      res.setHeader('X-Content-Type-Options', 'nosniff')
      return res.status(200).send(document.file_data)
    }

    if (document.storage_path) {
      const url = await getFileUrl(document.storage_path)
      return res.json({ url, fileName: document.file_name, legacyStorage: true })
    }

    return res.status(404).json({ message: 'O conteúdo deste documento não está armazenado no PostgreSQL.' })
  } catch (error) {
    return next(error)
  }
})

router.delete('/:id', requirePermission('documents_delete'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT file_data, storage_path FROM employee_documents
       WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.companyId]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Documento não encontrado.' })

    // Mantém a remoção de arquivos legados, quando ainda existirem no Firebase.
    const document = result.rows[0]
    if (!document.file_data && document.storage_path) {
      await deleteFile(document.storage_path)
    }

    await pool.query(
      'DELETE FROM employee_documents WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.companyId]
    )
    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

export default router
