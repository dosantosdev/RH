import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlDir = path.resolve(__dirname, '../../sql')

async function runMigrations() {
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
    const client = await pool.connect()

    try {
      const exists = await client.query(
        'SELECT 1 FROM schema_migrations WHERE filename = $1',
        [filename]
      )

      if (exists.rowCount) {
        continue
      }

      const sql = await fs.readFile(path.join(sqlDir, filename), 'utf8')

      // BEGIN, migration SQL, registro e COMMIT devem usar a mesma conexão.
      await client.query('BEGIN')

      try {
        await client.query(sql)
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        )
        await client.query('COMMIT')
        console.log(`Migration applied: ${filename}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    } finally {
      client.release()
    }
  }

  console.log('Database migrations completed.')
}

try {
  await runMigrations()
} catch (error) {
  console.error('Database migration failed:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
