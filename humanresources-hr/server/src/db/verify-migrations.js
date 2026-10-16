import 'dotenv/config'
import { pool } from './pool.js'

const requiredMigrations = [
  '001_init.sql',
  '002_chat.sql',
  '003_settings.sql',
  '004_org_metadata.sql',
  '005_app_records.sql',
  '006_documents_postgres_storage.sql',
  '007_positions_metadata.sql',
  '008_complete_permission_catalog.sql',
  '009_recruitment_application_links.sql',
  '010_financial_events_normalized.sql',
  '011_salary_history_normalized.sql',
  '012_payroll_relational_storage.sql',
  '013_payroll_item_entries_normalized.sql',
  '014_financial_advanced_relational.sql',
  '015_repair_financial_events_catalog.sql',
  '016_align_schedule_permissions.sql'
]

const requiredColumns = {
  financial_events: [
    'company_id',
    'external_id',
    'event_type',
    'calculation_type',
    'active'
  ],
  financial_event_transactions: ['company_id', 'type', 'amount'],
  salary_history: [
    'company_id',
    'external_id',
    'employee_id',
    'salary',
    'effective_date'
  ],
  payrolls: ['company_id', 'external_id', 'competence', 'status', 'data'],
  payroll_items: ['payroll_id', 'external_id', 'employee_id', 'data'],
  payroll_item_entries: [
    'payroll_item_id',
    'entry_type',
    'external_id',
    'amount'
  ],
  financial_advanced_records: [
    'company_id',
    'record_type',
    'external_id',
    'payload'
  ]
}

async function verifyMigrations() {
  const appliedResult = await pool.query(
    'SELECT filename, applied_at FROM schema_migrations ORDER BY filename'
  )

  const applied = new Map(
    appliedResult.rows.map((row) => [row.filename, row.applied_at])
  )

  const missingMigrations = requiredMigrations.filter(
    (filename) => !applied.has(filename)
  )

  const tableNames = Object.keys(requiredColumns)

  const columnsResult = await pool.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1::text[])`,
    [tableNames]
  )

  const columnsByTable = new Map()

  for (const row of columnsResult.rows) {
    if (!columnsByTable.has(row.table_name)) {
      columnsByTable.set(row.table_name, new Set())
    }

    columnsByTable.get(row.table_name).add(row.column_name)
  }

  const schemaProblems = []

  for (const [tableName, columns] of Object.entries(requiredColumns)) {
    const existingColumns = columnsByTable.get(tableName) ?? new Set()

    for (const columnName of columns) {
      if (!existingColumns.has(columnName)) {
        schemaProblems.push(`${tableName}.${columnName}`)
      }
    }
  }

  const counts = {}

  for (const tableName of tableNames) {
    const result = await pool.query(
      `SELECT COUNT(*)::integer AS count
         FROM public."${tableName}"`
    )

    counts[tableName] = result.rows[0].count
  }

  const report = {
    status:
      missingMigrations.length === 0 && schemaProblems.length === 0
        ? 'ok'
        : 'failed',
    database: (await pool.query('SELECT current_database() AS name')).rows[0]
      .name,
    appliedMigrations: applied.size,
    expectedMigrations: requiredMigrations.length,
    missingMigrations,
    missingColumns: schemaProblems,
    rowCounts: counts
  }

  console.log(JSON.stringify(report, null, 2))

  if (report.status !== 'ok') {
    throw new Error(
      'A verificação do schema falhou. Corrija as migrações ausentes ou colunas indicadas no relatório.'
    )
  }

  console.log('PostgreSQL migration verification passed.')
}

try {
  await verifyMigrations()
} catch (error) {
  console.error('PostgreSQL migration verification failed:', error.message)

  process.exitCode = 1
} finally {
  await pool.end()
}
