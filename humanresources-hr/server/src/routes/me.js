import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

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


// Atualiza somente os campos editáveis do próprio perfil.
// O ID e a empresa vêm do token autenticado, nunca do corpo da requisição.
router.patch('/profile', requirePermission('profile_edit'), async (req, res, next) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''

  if (!name || !username) {
    return res.status(400).json({
      message: 'Nome e usuário são obrigatórios.'
    })
  }

  if (name.length > 120 || username.length > 80) {
    return res.status(400).json({
      message: 'Nome ou usuário excede o limite permitido.'
    })
  }

  try {
    const updatedResult = await pool.query(
      `UPDATE users
       SET name = $3, username = $4, updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND active = TRUE
       RETURNING id, name, username, email, company_id, employee_id`,
      [req.user.userId, req.user.companyId, name, username]
    )

    if (!updatedResult.rowCount) {
      return res.status(404).json({
        message: 'Usuário não encontrado ou inativo.'
      })
    }

    return res.json({
      user: updatedResult.rows[0],
      message: 'Perfil atualizado com sucesso.'
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Esse nome de usuário já está sendo utilizado nesta empresa.'
      })
    }

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
