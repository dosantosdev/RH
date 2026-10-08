import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlDir = path.resolve(__dirname, '../sql')

await pool.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)

const files = (await fs.readdir(sqlDir))
  .filter((file) => file.endsWith('.sql'))
  .sort()

for (const filename of files) {
  const exists = await pool.query(
    'SELECT 1 FROM schema_migrations WHERE filename = $1',
    [filename]
  )

  if (exists.rowCount) continue

  const sql = await fs.readFile(path.join(sqlDir, filename), 'utf8')

  await pool.query('BEGIN')
  try {
    await pool.query(sql)
    await pool.query(
      'INSERT INTO schema_migrations (filename) VALUES ($1)',
      [filename]
    )
    await pool.query('COMMIT')
    console.log(`Migration applied: ${filename}`)
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }
}

await pool.end()
console.log('Database migrations completed.')
