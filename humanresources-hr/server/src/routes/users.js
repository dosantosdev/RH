import express from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

function normalizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    email: row.email,
    companyId: row.company_id,
    employeeId: row.employee_id,
    accessRoleId: row.access_role_id,
    accessRoleName: row.access_role_name,
    accessRoleDisplayName: row.access_role_display_name,
    active: row.active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at
  }
}

const userSelect = `
  SELECT
    u.id, u.name, u.username, u.email, u.company_id, u.employee_id,
    u.access_role_id, u.active, u.last_login_at, u.created_at,
    ar.name AS access_role_name,
    ar.display_name AS access_role_display_name
  FROM users u
  LEFT JOIN access_roles ar ON ar.id = u.access_role_id
`

router.get('/access-roles', requirePermission('users_view'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, display_name, description, active, is_system
       FROM access_roles
       WHERE active = TRUE
         AND (company_id = $1 OR company_id IS NULL)
       ORDER BY CASE name
         WHEN 'admin' THEN 1
         WHEN 'gestao_rh' THEN 2
         WHEN 'funcionario' THEN 3
         ELSE 4
       END, display_name`,
      [req.user.companyId]
    )

    return res.json(result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      active: row.active,
      isSystem: row.is_system
    })))
  } catch (error) {
    return next(error)
  }
})

router.get('/', requirePermission('users_view'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `${userSelect}
       WHERE u.company_id = $1
       ORDER BY u.name`,
      [req.user.companyId]
    )

    return res.json(result.rows.map(normalizeUser))
  } catch (error) {
    return next(error)
  }
})

router.post('/', requirePermission('users_create'), async (req, res, next) => {
  const {
    name,
    username,
    password,
    email,
    accessRoleId,
    employeeId,
    active = true
  } = req.body || {}

  if (!name?.trim() || !username?.trim() || !password) {
    return res.status(400).json({
      message: 'Nome, usuário e senha são obrigatórios.'
    })
  }

  if (String(password).length < 8) {
    return res.status(400).json({
      message: 'A senha deve ter pelo menos 8 caracteres.'
    })
  }

  if (!accessRoleId) {
    return res.status(400).json({
      message: 'Selecione um perfil de acesso.'
    })
  }

  try {
    const roleResult = await pool.query(
      `SELECT id, name FROM access_roles
       WHERE id = $1 AND active = TRUE
         AND (company_id = $2 OR company_id IS NULL)
       LIMIT 1`,
      [accessRoleId, req.user.companyId]
    )

    if (!roleResult.rowCount) {
      return res.status(400).json({
        message: 'O perfil selecionado não pertence à empresa ou está inativo.'
      })
    }

    if (employeeId) {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
        [employeeId, req.user.companyId]
      )

      if (!employeeResult.rowCount) {
        return res.status(400).json({
          message: 'O funcionário selecionado não pertence à empresa.'
        })
      }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const result = await pool.query(
      `INSERT INTO users
        (company_id, access_role_id, employee_id, name, username, email, password_hash, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        req.user.companyId,
        accessRoleId,
        employeeId || null,
        name.trim(),
        username.trim(),
        email?.trim() || null,
        passwordHash,
        Boolean(active)
      ]
    )

    const created = await pool.query(
      `${userSelect}
       WHERE u.id = $1 AND u.company_id = $2`,
      [result.rows[0].id, req.user.companyId]
    )

    return res.status(201).json(normalizeUser(created.rows[0]))
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Já existe um usuário com esse nome de acesso nesta empresa.'
      })
    }

    return next(error)
  }
})

router.patch('/:id', requirePermission('users_edit'), async (req, res, next) => {
  const {
    name,
    username,
    password,
    email,
    accessRoleId,
    employeeId,
    active
  } = req.body || {}

  if (password && String(password).length < 8) {
    return res.status(400).json({
      message: 'A nova senha deve ter pelo menos 8 caracteres.'
    })
  }

  if (req.params.id === req.user.userId && active === false) {
    return res.status(400).json({
      message: 'Não é permitido desativar o próprio usuário.'
    })
  }

  try {
    if (accessRoleId) {
      const roleResult = await pool.query(
        `SELECT id FROM access_roles
         WHERE id = $1 AND active = TRUE
           AND (company_id = $2 OR company_id IS NULL)
         LIMIT 1`,
        [accessRoleId, req.user.companyId]
      )

      if (!roleResult.rowCount) {
        return res.status(400).json({
          message: 'O perfil selecionado não pertence à empresa ou está inativo.'
        })
      }
    }

    if (employeeId) {
      const employeeResult = await pool.query(
        'SELECT id FROM employees WHERE id = $1 AND company_id = $2',
        [employeeId, req.user.companyId]
      )

      if (!employeeResult.rowCount) {
        return res.status(400).json({
          message: 'O funcionário selecionado não pertence à empresa.'
        })
      }
    }

    const passwordHash = password
      ? await bcrypt.hash(password, 12)
      : null

    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($3, name),
           username = COALESCE($4, username),
           email = CASE WHEN $5::boolean THEN $6 ELSE email END,
           access_role_id = COALESCE($7, access_role_id),
           employee_id = CASE WHEN $8::boolean THEN $9::uuid ELSE employee_id END,
           active = COALESCE($10, active),
           password_hash = COALESCE($11, password_hash),
           updated_at = NOW()
       WHERE id = $1 AND company_id = $2
       RETURNING id`,
      [
        req.params.id,
        req.user.companyId,
        name?.trim() || null,
        username?.trim() || null,
        email !== undefined,
        email?.trim() || null,
        accessRoleId || null,
        employeeId !== undefined,
        employeeId || null,
        active === undefined ? null : Boolean(active),
        passwordHash
      ]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Usuário não encontrado.' })
    }

    const updated = await pool.query(
      `${userSelect}
       WHERE u.id = $1 AND u.company_id = $2`,
      [req.params.id, req.user.companyId]
    )

    return res.json(normalizeUser(updated.rows[0]))
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        message: 'Já existe um usuário com esse nome de acesso nesta empresa.'
      })
    }

    return next(error)
  }
})

// Desativa em vez de excluir fisicamente, preservando referências e auditoria.
router.delete('/:id', requirePermission('users_delete'), async (req, res, next) => {
  if (req.params.id === req.user.userId) {
    return res.status(400).json({
      message: 'Não é permitido desativar o próprio usuário.'
    })
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET active = FALSE, updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND active = TRUE
       RETURNING id`,
      [req.params.id, req.user.companyId]
    )

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Usuário não encontrado ou já está inativo.'
      })
    }

    return res.status(204).end()
  } catch (error) {
    return next(error)
  }
})

export default router
