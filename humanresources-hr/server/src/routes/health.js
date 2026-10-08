import express from 'express'
import { pool } from '../db/pool.js'

const router = express.Router()

router.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    return res.json({
      status: 'ok',
      service: 'humanresources-hr-api',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch {
    return res.status(503).json({
      status: 'error',
      service: 'humanresources-hr-api',
      database: 'unavailable'
    })
  }
})

export default router
