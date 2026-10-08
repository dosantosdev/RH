import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import authRoutes from './routes/auth.js'
import employeeRoutes from './routes/employees.js'
import documentRoutes from './routes/documents.js'
import requestRoutes from './routes/requests.js'
import healthRoutes from './routes/health.js'
import meRoutes from './routes/me.js'
import { pool } from './db/pool.js'

const app = express()
const port = Number(process.env.PORT || 3333)

app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((value) => value.trim())
    : true
}))
app.use(express.json({ limit: '2mb' }))

app.get('/', (_req, res) => {
  res.json({
    name: 'Human Resources HR API',
    status: 'online',
    version: '1.0.0'
  })
})

app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/employees', employeeRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/employee-requests', requestRoutes)
app.use('/api/me', meRoutes)

app.use((error, _req, res, _next) => {
  console.error(error)

  return res.status(500).json({
    message: 'Ocorreu um erro interno no servidor.',
    ...(process.env.NODE_ENV !== 'production'
      ? { detail: error.message }
      : {})
  })
})

const server = app.listen(port, () => {
  console.log(`Human Resources HR API running on http://localhost:${port}`)
})

async function shutdown(signal) {
  console.log(`${signal} received. Closing server...`)
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
