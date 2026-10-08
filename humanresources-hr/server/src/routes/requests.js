import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/mine', async (req, res, next) => {
  try {
    if (!req.user.employeeId) {
      return res.json([])
    }

    const result = await pool.query(
      `SELECT *
       FROM employee_requests
       WHERE company_id = $1 AND employee_id = $2
       ORDER BY created_at DESC`,
      [req.user.companyId, req.user.employeeId]
    )

    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

router.post('/mine', async (req, res, next) => {
  try {
    if (!req.user.employeeId) {
      return res.status(400).json({
        message: 'Usuário não está vinculado a um funcionário.'
      })
    }

    const { type, description } = req.body || {}

    if (!type) {
      return res.status(400).json({ message: 'Tipo da solicitação é obrigatório.' })
    }

    const result = await pool.query(
      `INSERT INTO employee_requests
        (company_id, employee_id, type, description)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [
        req.user.companyId,
        req.user.employeeId,
        type,
        description || null
      ]
    )

    return res.status(201).json(result.rows[0])
  } catch (error) {
    return next(error)
  }
})

router.get(
  '/',
  requirePermission('employee_requests_manage'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT er.*, e.name AS employee_name
         FROM employee_requests er
         JOIN employees e ON e.id = er.employee_id
         WHERE er.company_id = $1
         ORDER BY er.created_at DESC`,
        [req.user.companyId]
      )

      return res.json(result.rows)
    } catch (error) {
      return next(error)
    }
  }
)

router.patch(
  '/:id',
  requirePermission('employee_requests_manage'),
  async (req, res, next) => {
    try {
      const { status, response } = req.body || {}

      const result = await pool.query(
        `UPDATE employee_requests
         SET status = COALESCE($3, status),
             response = COALESCE($4, response),
             updated_at = NOW()
         WHERE id = $1 AND company_id = $2
         RETURNING *`,
        [req.params.id, req.user.companyId, status || null, response || null]
      )

      if (!result.rowCount) {
        return res.status(404).json({ message: 'Solicitação não encontrada.' })
      }

      return res.json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  }
)

export default router
