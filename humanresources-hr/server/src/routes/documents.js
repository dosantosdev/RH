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
