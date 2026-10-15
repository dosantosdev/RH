import express from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { authenticate, createToken } from '../middleware/auth.js'

const router = express.Router()

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}

    if (!username || !password) {
      return res.status(400).json({
        message: 'Usuário e senha são obrigatórios.'
      })
    }

    const result = await pool.query(
      `SELECT
        u.*,
        c.legal_name AS company_name,
        ar.name AS access_role_name,
        ar.display_name AS access_role_display_name,
        ar.active AS access_role_active
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       LEFT JOIN access_roles ar ON ar.id = u.access_role_id
       WHERE LOWER(u.username) = LOWER($1)
         AND u.active = TRUE
       LIMIT 1`,
      [username.trim()]
    )

    const user = result.rows[0]

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Usuário ou senha inválidos.' })
    }

    if (user.access_role_id && user.access_role_active === false) {
      return res.status(403).json({ message: 'O perfil de acesso deste usuário está inativo. Procure o administrador.' })
    }

    const permissionResult = await pool.query(
      `SELECT p.key
       FROM access_role_permissions arp
       JOIN permissions p ON p.id = arp.permission_id
       WHERE arp.access_role_id = $1`,
      [user.access_role_id]
    )

    const permissions = permissionResult.rows.map((row) => row.key)
    const isAdmin = user.access_role_name === 'admin'

    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    )

    const token = createToken({
      userId: user.id,
      companyId: user.company_id,
      employeeId: user.employee_id,
      accessRoleId: user.access_role_id,
      permissions,
      isAdmin
    })

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        companyId: user.company_id,
        companyName: user.company_name,
        employeeId: user.employee_id,
        accessRoleId: user.access_role_id,
        accessRoleName: user.access_role_name,
        accessRoleDisplayName: user.access_role_display_name,
        permissions,
        isAdmin
      }
    })
  } catch (error) {
    return next(error)
  }
})


// Altera a senha do próprio usuário sem expor o hash ao frontend.
router.post('/change-password', authenticate, async (req, res, next) => {
  const { currentPassword, newPassword } = req.body || {}

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    !currentPassword ||
    !newPassword
  ) {
    return res.status(400).json({
      message: 'Informe a senha atual e a nova senha.'
    })
  }

  if (newPassword.length < 8) {
    return res.status(400).json({
      message: 'A nova senha deve possuir pelo menos 8 caracteres.'
    })
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: 'A nova senha deve ser diferente da senha atual.'
    })
  }

  try {
    const result = await pool.query(
      `SELECT id, password_hash
       FROM users
       WHERE id = $1 AND company_id = $2 AND active = TRUE
       LIMIT 1`,
      [req.user.userId, req.user.companyId]
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(404).json({
        message: 'Usuário não encontrado ou inativo.'
      })
    }

    const currentPasswordIsValid = await bcrypt.compare(
      currentPassword,
      user.password_hash
    )

    if (!currentPasswordIsValid) {
      return res.status(400).json({
        message: 'A senha atual está incorreta.'
      })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await pool.query(
      `UPDATE users
       SET password_hash = $3, updated_at = NOW()
       WHERE id = $1 AND company_id = $2`,
      [user.id, req.user.companyId, passwordHash]
    )

    return res.json({
      message: 'Senha alterada com sucesso.'
    })
  } catch (error) {
    return next(error)
  }
})

export default router
