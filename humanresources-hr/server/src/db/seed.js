import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from './pool.js'

const companyName = process.env.COMPANY_NAME || 'Empresa Demo'
const username = process.env.ADMIN_USERNAME || 'admin'
const password = process.env.ADMIN_PASSWORD || 'change-this-password'

const permissionSeed = [
  ['employees_view', 'Visualizar funcionários', 'Funcionários'],
  ['employees_create', 'Cadastrar funcionários', 'Funcionários'],
  ['employees_edit', 'Editar funcionários', 'Funcionários'],
  ['employees_delete', 'Excluir funcionários', 'Funcionários'],
  ['users_view', 'Visualizar usuários', 'Usuários'],
  ['users_create', 'Cadastrar usuários', 'Usuários'],
  ['users_edit', 'Editar usuários', 'Usuários'],
  ['users_delete', 'Excluir usuários', 'Usuários'],
  ['documents_view', 'Visualizar documentos', 'Arquivo'],
  ['documents_upload', 'Enviar documentos', 'Arquivo'],
  ['documents_edit', 'Editar documentos', 'Arquivo'],
  ['documents_delete', 'Excluir documentos', 'Arquivo'],
  ['recruitment_view', 'Visualizar recrutamento', 'Recrutamento'],
  ['recruitment_create', 'Criar vagas', 'Recrutamento'],
  ['recruitment_edit', 'Editar vagas', 'Recrutamento'],
  ['recruitment_delete', 'Excluir vagas', 'Recrutamento'],
  ['recruitment_convert', 'Transformar candidato em funcionário', 'Recrutamento'],
  ['reports_view', 'Visualizar relatórios', 'Relatórios'],
  ['finance_salary_view', 'Visualizar informações salariais', 'Financeiro'],
  ['finance_salary_manage', 'Gerenciar salários', 'Financeiro'],
  ['finance_events_view', 'Visualizar eventos financeiros', 'Financeiro'],
  ['finance_events_manage', 'Gerenciar eventos financeiros', 'Financeiro'],
  ['finance_payroll_view', 'Visualizar folha', 'Financeiro'],
  ['finance_payroll_manage', 'Gerenciar folha', 'Financeiro'],
  ['finance_advanced_view', 'Visualizar gestão financeira', 'Financeiro'],
  ['finance_advanced_manage', 'Gerenciar gestão financeira', 'Financeiro'],
  ['my_trainings_view', 'Visualizar meus treinamentos', 'Funcionário'],
  ['my_evaluations_view', 'Visualizar minhas avaliações', 'Funcionário'],
  ['my_evaluations_answer', 'Responder minhas avaliações', 'Funcionário'],
  ['employee_requests_create', 'Criar solicitações', 'Portal do Funcionário'],
  ['employee_requests_view_own', 'Visualizar próprias solicitações', 'Portal do Funcionário'],
  ['employee_requests_manage', 'Gerenciar solicitações', 'Portal do Funcionário']
]

await pool.query('BEGIN')

try {
  const company = await pool.query(
    `INSERT INTO companies (legal_name, trade_name)
     VALUES ($1, $1)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [companyName]
  )

  let companyId = company.rows[0]?.id

  if (!companyId) {
    const existing = await pool.query(
      'SELECT id FROM companies WHERE legal_name = $1 LIMIT 1',
      [companyName]
    )
    companyId = existing.rows[0].id
  }

  for (const [key, label, category] of permissionSeed) {
    await pool.query(
      `INSERT INTO permissions (key, label, category)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE
       SET label = EXCLUDED.label, category = EXCLUDED.category`,
      [key, label, category]
    )
  }

  const roleResult = await pool.query(
    `INSERT INTO access_roles
      (company_id, name, display_name, description, is_system)
     VALUES ($1, 'admin', 'Administrador', 'Acesso total ao sistema', TRUE)
     ON CONFLICT (company_id, name) DO UPDATE
     SET display_name = EXCLUDED.display_name
     RETURNING id`,
    [companyId]
  )

  const roleId = roleResult.rows[0].id

  await pool.query(
    `INSERT INTO access_role_permissions (access_role_id, permission_id)
     SELECT $1, id FROM permissions
     ON CONFLICT DO NOTHING`,
    [roleId]
  )

  const hash = await bcrypt.hash(password, 12)

  await pool.query(
    `INSERT INTO users
      (company_id, access_role_id, name, username, password_hash)
     VALUES ($1, $2, 'Administrador do sistema', $3, $4)
     ON CONFLICT (company_id, username) DO NOTHING`,
    [companyId, roleId, username, hash]
  )

  await pool.query('COMMIT')
  console.log(`Database seeded. Company: ${companyId}. Admin: ${username}`)
} catch (error) {
  await pool.query('ROLLBACK')
  throw error
} finally {
  await pool.end()
}
