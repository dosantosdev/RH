import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.get(
  '/',
  requirePermission('employees_view'),
  async (req, res, next) => {
    try {
      const { status, search } = req.query
      const values = [req.user.companyId]
      const where = ['e.company_id = $1']

      if (status) {
        values.push(status)
        where.push(`e.status = $${values.length}`)
      }

      if (search) {
        values.push(`%${search}%`)
        where.push(`(
          e.name ILIKE $${values.length}
          OR COALESCE(e.cpf, '') ILIKE $${values.length}
          OR COALESCE(e.email, '') ILIKE $${values.length}
        )`)
      }

      const result = await pool.query(
        `SELECT
          e.*,
          b.name AS branch_name,
          d.name AS department_name,
          r.name AS role_name
         FROM employees e
         LEFT JOIN branches b ON b.id = e.branch_id
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN roles r ON r.id = e.role_id
         WHERE ${where.join(' AND ')}
         ORDER BY e.name`,
        values
      )

      return res.json(result.rows)
    } catch (error) {
      return next(error)
    }
  }
)

router.get(
  '/:id',
  requirePermission('employees_view'),
  async (req, res, next) => {
    try {
      const result = await pool.query(
        `SELECT e.*,
          b.name AS branch_name,
          d.name AS department_name,
          r.name AS role_name
         FROM employees e
         LEFT JOIN branches b ON b.id = e.branch_id
         LEFT JOIN departments d ON d.id = e.department_id
         LEFT JOIN roles r ON r.id = e.role_id
         WHERE e.id = $1 AND e.company_id = $2`,
        [req.params.id, req.user.companyId]
      )

      if (!result.rowCount) {
        return res.status(404).json({ message: 'Funcionário não encontrado.' })
      }

      return res.json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  }
)

router.post(
  '/',
  requirePermission('employees_create'),
  async (req, res, next) => {
    try {
      const {
        name,
        cpf,
        rg,
        email,
        phone,
        birthDate,
        admissionDate,
        branchId,
        departmentId,
        roleId,
        positionId,
        status = 'active',
        registrationData = {}
      } = req.body || {}

      if (!name?.trim()) {
        return res.status(400).json({ message: 'Nome é obrigatório.' })
      }

      const result = await pool.query(
        `INSERT INTO employees
          (company_id, branch_id, department_id, role_id, position_id,
           name, cpf, rg, email, phone, birth_date, admission_date,
           status, registration_data)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          req.user.companyId,
          branchId || null,
          departmentId || null,
          roleId || null,
          positionId || null,
          name.trim(),
          cpf || null,
          rg || null,
          email || null,
          phone || null,
          birthDate || null,
          admissionDate || null,
          status,
          registrationData
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
  requirePermission('employees_edit'),
  async (req, res, next) => {
    try {
      const {
        name,
        cpf,
        rg,
        email,
        phone,
        birthDate,
        admissionDate,
        branchId,
        departmentId,
        roleId,
        positionId,
        status,
        registrationData
      } = req.body || {}

      const result = await pool.query(
        `UPDATE employees
         SET name = COALESCE($3, name),
             cpf = COALESCE($4, cpf),
             rg = COALESCE($5, rg),
             email = COALESCE($6, email),
             phone = COALESCE($7, phone),
             birth_date = COALESCE($8, birth_date),
             admission_date = COALESCE($9, admission_date),
             branch_id = COALESCE($10, branch_id),
             department_id = COALESCE($11, department_id),
             role_id = COALESCE($12, role_id),
             position_id = COALESCE($13, position_id),
             status = COALESCE($14, status),
             registration_data = COALESCE($15, registration_data),
             updated_at = NOW()
         WHERE id = $1 AND company_id = $2
         RETURNING *`,
        [
          req.params.id,
          req.user.companyId,
          name ?? null,
          cpf ?? null,
          rg ?? null,
          email ?? null,
          phone ?? null,
          birthDate ?? null,
          admissionDate ?? null,
          branchId ?? null,
          departmentId ?? null,
          roleId ?? null,
          positionId ?? null,
          status ?? null,
          registrationData ?? null
        ]
      )

      if (!result.rowCount) {
        return res.status(404).json({ message: 'Funcionário não encontrado.' })
      }

      return res.json(result.rows[0])
    } catch (error) {
      return next(error)
    }
  }
)

export default router
