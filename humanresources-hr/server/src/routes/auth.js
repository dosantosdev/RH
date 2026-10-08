import express from 'express'
import bcrypt from 'bcryptjs'
import { pool } from '../db/pool.js'
import { createToken } from '../middleware/auth.js'

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
        ar.display_name AS access_role_display_name
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

export default router
