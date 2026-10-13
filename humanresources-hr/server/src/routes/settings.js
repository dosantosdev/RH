import express from 'express'
import { pool } from '../db/pool.js'
import { authenticate, requirePermission } from '../middleware/auth.js'

const router = express.Router()
router.use(authenticate)

router.get('/:key', requirePermission('system_settings'), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT setting_value, updated_at
       FROM company_settings
       WHERE company_id = $1 AND setting_key = $2`,
      [req.user.companyId, req.params.key]
    )
    if (!result.rowCount) return res.status(404).json({ message: 'Configuração ainda não cadastrada.' })
    return res.json({ key: req.params.key, value: result.rows[0].setting_value, updatedAt: result.rows[0].updated_at })
  } catch (error) { return next(error) }
})

router.put('/:key', requirePermission('system_settings'), async (req, res, next) => {
  try {
    if (!req.params.key || req.params.key.length > 120) {
      return res.status(400).json({ message: 'Identificador de configuração inválido.' })
    }
    if (req.body?.value === undefined) {
      return res.status(400).json({ message: 'Informe o valor da configuração.' })
    }
    const result = await pool.query(
      `INSERT INTO company_settings (company_id, setting_key, setting_value, updated_by)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (company_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value,
                     updated_by = EXCLUDED.updated_by,
                     updated_at = NOW()
       RETURNING setting_value, updated_at`,
      [req.user.companyId, req.params.key, JSON.stringify(req.body.value), req.user.userId || null]
    )
    return res.json({ key: req.params.key, value: result.rows[0].setting_value, updatedAt: result.rows[0].updated_at })
  } catch (error) { return next(error) }
})

export default router
