import express from 'express'
import crypto from 'node:crypto'
import multer from 'multer'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'
import {
  uploadFile,
  getFileUrl,
  deleteFile
} from '../services/firebaseStorage.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 10 * 1024 * 1024)
  }
})

router.use(authenticate)


// Lista centralizada do Arquivo. Todas as consultas são limitadas à empresa do token.
router.get(
  '/owners',
  requirePermission('documents_view'),
  async (req, res, next) => {
    try {
      const type = req.query.type === 'candidate' ? 'candidate' : 'employee'
      const table = type === 'candidate' ? 'candidates' : 'employees'
      const statusFilter = type === 'employee' ? "AND status <> 'terminated'" : ''
      const result = await pool.query(
        `SELECT id, name, email, cpf
         FROM ${table}
         WHERE company_id = $1 ${statusFilter}
         ORDER BY name
         LIMIT 1000`,
        [req.user.companyId]
      )
      return res.json(result.rows)
    } catch (error) {
      return next(error)
    }
  }
)

router.get(
  '/',
  requirePermission('documents_view'),
  async (req, res, next) => {
    try {
      const values = [req.user.companyId]
      const where = ['doc.company_id = $1']
      const { search, entityType, category, status } = req.query

      if (entityType === 'employee') where.push('doc.employee_id IS NOT NULL')
      if (entityType === 'candidate') where.push('doc.candidate_id IS NOT NULL')
      if (category) {
        values.push(category)
        where.push(`doc.category = $${values.length}`)
      }
      if (status === 'expired') where.push("doc.expires_at < CURRENT_DATE")
      if (status === 'expiring') where.push("doc.expires_at >= CURRENT_DATE AND doc.expires_at <= CURRENT_DATE + INTERVAL '30 days'")
      if (status === 'valid') where.push("(doc.expires_at IS NULL OR doc.expires_at > CURRENT_DATE + INTERVAL '30 days')")
      if (search) {
        values.push(`%${search}%`)
        where.push(`(
          doc.file_name ILIKE $${values.length}
          OR doc.document_type ILIKE $${values.length}
          OR doc.category ILIKE $${values.length}
          OR COALESCE(e.name, '') ILIKE $${values.length}
          OR COALESCE(c.name, '') ILIKE $${values.length}
        )`)
      }

      const result = await pool.query(
        `SELECT doc.*,
          e.name AS employee_name,
          c.name AS candidate_name,
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
         ORDER BY doc.created_at DESC
         LIMIT 500`,
        values
      )
      return res.json(result.rows)
    } catch (error) {
      return next(error)
    }
  }
)

// Upload genérico para a central Arquivo: funcionário ou candidato.
router.post(
  '/',
  requirePermission('documents_upload'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Selecione um arquivo para enviar.' })
      }

      const { entityType, entityId, category, documentType, expiresAt } = req.body || {}
      if (!['employee', 'candidate'].includes(entityType) || !entityId) {
        return res.status(400).json({ message: 'Selecione um funcionário ou candidato.' })
      }

      const table = entityType === 'employee' ? 'employees' : 'candidates'
      const owner = await pool.query(
        `SELECT id FROM ${table} WHERE id = $1 AND company_id = $2`,
        [entityId, req.user.companyId]
      )
      if (!owner.rowCount) {
        return res.status(404).json({ message: 'Cadastro vinculado não encontrado nesta empresa.' })
      }

      const documentId = crypto.randomUUID()
      const safeName = req.file.originalname.replace(/[^\w.\- ]/g, '_')
      const folder = entityType === 'employee' ? 'employees' : 'candidates'
      const storagePath = `companies/${req.user.companyId}/${folder}/${entityId}/documents/${documentId}-${safeName}`

      await uploadFile(req.file.buffer, req.file.mimetype, storagePath)

      const result = await pool.query(
        `INSERT INTO employee_documents
          (id, company_id, employee_id, candidate_id, category, document_type,
           file_name, storage_path, mime_type, size_bytes, expires_at, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          documentId,
          req.user.companyId,
          entityType === 'employee' ? entityId : null,
          entityType === 'candidate' ? entityId : null,
          category || 'Outros',
          documentType || 'Documento',
          req.file.originalname,
          storagePath,
          req.file.mimetype,
          req.file.size,
          expiresAt || null,
          req.user.userId
        ]
      )
      return res.status(201).json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  }
)

router.patch(
  '/:id',
  requirePermission('documents_edit'),
  async (req, res, next) => {
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
         RETURNING *`,
        [req.params.id, req.user.companyId, category ?? null, documentType ?? null,
          expiresAt === '' ? '__clear__' : (expiresAt ?? null), status ?? null, notes ?? null]
      )
      if (!result.rowCount) return res.status(404).json({ message: 'Documento não encontrado.' })
      return res.json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  }
)

router.get(
  '/employee/:employeeId',
  requirePermission('documents_view'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT *
         FROM employee_documents
         WHERE company_id = $1 AND employee_id = $2
         ORDER BY created_at DESC`,
        [req.user.companyId, req.params.employeeId]
      )
      return res.json(result.rows)
    } catch (error) {
      return next(error)
    }
  }
)

router.post(
  '/employee/:employeeId',
  requirePermission('documents_upload'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Arquivo não enviado.' })
      }

      const employee = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
        [req.params.employeeId, req.user.companyId]
      )

      if (!employee.rowCount) {
        return res.status(404).json({ message: 'Funcionário não encontrado.' })
      }

      const documentId = crypto.randomUUID()
      const safeName = req.file.originalname.replace(/[^\w.\- ]/g, '_')
      const storagePath =
        `companies/${req.user.companyId}/employees/${req.params.employeeId}/documents/` +
        `${documentId}-${safeName}`

      await uploadFile(
        req.file.buffer,
        req.file.mimetype,
        storagePath
      )

      const result = await pool.query(
        `INSERT INTO employee_documents
          (id, company_id, employee_id, category, document_type,
           file_name, storage_path, mime_type, size_bytes, expires_at, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          documentId,
          req.user.companyId,
          req.params.employeeId,
          req.body.category || 'Outros',
          req.body.documentType || 'Documento',
          req.file.originalname,
          storagePath,
          req.file.mimetype,
          req.file.size,
          req.body.expiresAt || null,
          req.user.userId
        ]
      )

      return res.status(201).json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  }
)

router.get(
  '/:id/download',
  requirePermission('documents_view'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT *
         FROM employee_documents
         WHERE id = $1 AND company_id = $2`,
        [req.params.id, req.user.companyId]
      )

      if (!result.rowCount) {
        return res.status(404).json({ message: 'Documento não encontrado.' })
      }

      const url = await getFileUrl(result.rows[0].storage_path)
      return res.json({ url, fileName: result.rows[0].file_name })
    } catch (error) {
      return next(error)
    }
  }
)

router.delete(
  '/:id',
  requirePermission('documents_delete'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT storage_path
         FROM employee_documents
         WHERE id = $1 AND company_id = $2`,
        [req.params.id, req.user.companyId]
      )

      if (!result.rowCount) {
        return res.status(404).json({ message: 'Documento não encontrado.' })
      }

      await deleteFile(result.rows[0].storage_path)

      await pool.query(
        'DELETE FROM employee_documents WHERE id = $1 AND company_id = $2',
        [req.params.id, req.user.companyId]
      )

      return res.status(204).end()
    } catch (error) {
      return next(error)
    }
  }
)

export default router
