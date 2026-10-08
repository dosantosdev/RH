import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get('/', async (req, res, next) => {
  try {
    const userResult = await pool.query(
      `SELECT
        u.id, u.name, u.username, u.email, u.company_id,
        u.employee_id, ar.name AS access_role_name,
        ar.display_name AS access_role_display_name,
        e.name AS employee_name, e.status AS employee_status
       FROM users u
       LEFT JOIN access_roles ar ON ar.id = u.access_role_id
       LEFT JOIN employees e ON e.id = u.employee_id
       WHERE u.id = $1 AND u.company_id = $2`,
      [req.user.userId, req.user.companyId]
    )

    if (!userResult.rowCount) {
      return res.status(404).json({ message: 'Usuário não encontrado.' })
    }

    return res.json({
      user: userResult.rows[0],
      permissions: req.user.permissions || [],
      isAdmin: Boolean(req.user.isAdmin)
    })
  } catch (error) {
    return next(error)
  }
})

router.get('/documents', async (req, res, next) => {
  try {
    if (!req.user.employeeId) return res.json([])

    const result = await pool.query(
      `SELECT id, category, document_type, file_name,
              mime_type, size_bytes, expires_at, status, created_at
       FROM employee_documents
       WHERE company_id = $1 AND employee_id = $2
       ORDER BY created_at DESC`,
      [req.user.companyId, req.user.employeeId]
    )

    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

router.get('/payrolls', async (req, res, next) => {
  try {
    if (!req.user.employeeId) return res.json([])

    const result = await pool.query(
      `SELECT
        p.id, p.competence, p.status,
        pi.base_salary, pi.earnings, pi.deductions,
        pi.inss, pi.irrf, pi.fgts, pi.net_salary,
        pi.overtime_minutes, pi.overtime_amount
       FROM payrolls p
       JOIN payroll_items pi ON pi.payroll_id = p.id
       WHERE p.company_id = $1
         AND pi.employee_id = $2
         AND p.status = 'closed'
       ORDER BY p.competence DESC`,
      [req.user.companyId, req.user.employeeId]
    )

    return res.json(result.rows)
  } catch (error) {
    return next(error)
  }
})

export default router
