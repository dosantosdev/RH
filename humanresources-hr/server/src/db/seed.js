import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { pool } from './pool.js'

const companyName = process.env.COMPANY_NAME || 'Empresa Demo'
const username = process.env.ADMIN_USERNAME || 'admin'
const password = process.env.ADMIN_PASSWORD || 'change-this-password'

const permissionSeed = [
  ['system_settings', 'Gerenciar configurações do sistema', 'Configurações'],
  ['branches_view', 'Visualizar filiais', 'Organograma'],
  ['branches_create', 'Cadastrar filiais', 'Organograma'],
  ['branches_edit', 'Editar filiais', 'Organograma'],
  ['branches_delete', 'Excluir filiais', 'Organograma'],
  ['departments_view', 'Visualizar departamentos', 'Organograma'],
  ['departments_create', 'Cadastrar departamentos', 'Organograma'],
  ['departments_edit', 'Editar departamentos', 'Organograma'],
  ['departments_delete', 'Excluir departamentos', 'Organograma'],
  ['roles_view', 'Visualizar cargos', 'Organograma'],
  ['roles_create', 'Cadastrar cargos', 'Organograma'],
  ['roles_edit', 'Editar cargos', 'Organograma'],
  ['roles_delete', 'Excluir cargos', 'Organograma'],

  ['employees_view', 'Visualizar funcionários', 'Funcionários'],
  ['employees_create', 'Cadastrar funcionários', 'Funcionários'],
  ['employees_edit', 'Editar funcionários', 'Funcionários'],
  ['employees_delete', 'Excluir funcionários', 'Funcionários'],
  ['users_view', 'Visualizar usuários', 'Usuários'],
  ['users_create', 'Cadastrar usuários', 'Usuários'],
  ['users_edit', 'Editar usuários', 'Usuários'],
  ['users_delete', 'Desativar usuários', 'Usuários'],
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
  ['employee_requests_manage', 'Gerenciar solicitações', 'Portal do Funcionário'],
  ['trainings_view', 'Visualizar treinamentos', 'Treinamentos'],
  ['trainings_create', 'Criar treinamentos', 'Treinamentos'],
  ['trainings_edit', 'Editar treinamentos', 'Treinamentos'],
  ['trainings_delete', 'Excluir treinamentos', 'Treinamentos'],
  ['work_schedules_view', 'Visualizar jornadas e escalas', 'Ponto'],
  ['work_schedules_create', 'Criar jornadas e escalas', 'Ponto'],
  ['work_schedules_edit', 'Editar jornadas e escalas', 'Ponto'],
  ['work_schedules_delete', 'Excluir jornadas e escalas', 'Ponto'],
  ['evaluations_view', 'Visualizar avaliações', 'Avaliações'],
  ['evaluations_create', 'Criar avaliações', 'Avaliações'],
  ['evaluations_edit', 'Editar avaliações', 'Avaliações'],
  ['evaluations_delete', 'Excluir avaliações', 'Avaliações'],
  ['evaluation_models_view', 'Visualizar modelos de avaliação', 'Avaliações'],
  ['evaluation_models_create', 'Criar modelos de avaliação', 'Avaliações'],
  ['evaluation_models_edit', 'Editar modelos de avaliação', 'Avaliações'],
  ['evaluation_models_delete', 'Excluir modelos de avaliação', 'Avaliações'],
  ['evaluations_history_view', 'Visualizar histórico de avaliações', 'Avaliações'],
  ['evaluations_results_view', 'Visualizar resultados de avaliações', 'Avaliações'],
  ['evaluations_180_view', 'Visualizar avaliações 180 graus', 'Avaliações'],
  ['access_roles_view', 'Visualizar perfis de acesso', 'Perfis de Acesso'],
  ['access_roles_create', 'Criar perfis de acesso', 'Perfis de Acesso'],
  ['access_roles_edit', 'Editar perfis de acesso', 'Perfis de Acesso'],
  ['access_roles_delete', 'Excluir perfis de acesso', 'Perfis de Acesso'],
  ['ponto_bater', 'Registrar próprio ponto', 'Ponto'],
  ['ponto_espelho_view', 'Visualizar próprio espelho de ponto', 'Ponto'],
  ['ponto_controle_view', 'Visualizar controle de ponto', 'Ponto'],
  ['ponto_controle_edit', 'Ajustar registros de ponto', 'Ponto'],
  ['ponto_jornadas_view', 'Visualizar jornadas e escalas', 'Ponto'],
  ['ponto_jornadas_create', 'Cadastrar jornadas e escalas', 'Ponto'],
  ['ponto_jornadas_edit', 'Editar jornadas e escalas', 'Ponto'],
  ['ponto_jornadas_delete', 'Excluir jornadas e escalas', 'Ponto'],
  ['ponto_banco_horas_view', 'Visualizar banco de horas', 'Ponto'],
  ['ponto_banco_horas_manage', 'Gerenciar banco de horas', 'Ponto'],
  ['ponto_horas_extras_view', 'Visualizar horas extras', 'Ponto'],
  ['ponto_horas_extras_manage', 'Gerenciar horas extras', 'Ponto'],
  ['ponto_faltas_view', 'Visualizar faltas e atrasos', 'Ponto'],
  ['ponto_faltas_manage', 'Gerenciar faltas e atrasos', 'Ponto'],
  ['ponto_atestados_view', 'Visualizar atestados', 'Ponto'],
  ['ponto_atestados_manage', 'Gerenciar atestados', 'Ponto'],
  ['ponto_fechamento_view', 'Visualizar fechamento mensal', 'Ponto'],
  ['ponto_fechamento_manage', 'Gerenciar fechamento mensal', 'Ponto'],
  ['ponto_relatorios_view', 'Visualizar relatórios de ponto', 'Ponto'],
  ['profile_view', 'Visualizar meu perfil', 'Perfil'],
  ['password_change', 'Alterar senha', 'Perfil']
]

const roleSeed = [
  {
    name: 'admin',
    displayName: 'Administrador',
    description: 'Acesso total ao sistema',
    isSystem: true,
    permissions: permissionSeed.map(([key]) => key)
  },
  {
    name: 'gestao_rh',
    displayName: 'Gestão de RH',
    description: 'Gestão de Recursos Humanos',
    isSystem: true,
    permissions: [
      'branches_view', 'branches_create', 'branches_edit',
      'departments_view', 'departments_create', 'departments_edit',
      'roles_view', 'roles_create', 'roles_edit',
      'employees_view', 'employees_create', 'employees_edit',
      'users_view',
      'documents_view', 'documents_upload', 'documents_edit',
      'recruitment_view', 'recruitment_create', 'recruitment_edit',
      'recruitment_delete', 'recruitment_convert', 'reports_view',
      'finance_salary_view', 'finance_events_view', 'finance_events_manage',
      'finance_payroll_view', 'finance_advanced_view',
      'my_trainings_view', 'my_evaluations_view', 'my_evaluations_answer',
      'employee_requests_manage', 'trainings_view', 'trainings_create',
      'trainings_edit', 'work_schedules_view', 'work_schedules_create',
      'work_schedules_edit', 'evaluations_view', 'evaluations_create',
      'evaluations_edit', 'evaluation_models_view', 'evaluation_models_create',
      'evaluation_models_edit', 'evaluations_history_view',
      'evaluations_results_view', 'evaluations_180_view',
      'ponto_controle_view', 'ponto_controle_edit',
      'ponto_jornadas_view', 'ponto_jornadas_create', 'ponto_jornadas_edit', 'ponto_jornadas_delete',
      'ponto_banco_horas_view', 'ponto_banco_horas_manage',
      'ponto_horas_extras_view', 'ponto_horas_extras_manage',
      'ponto_faltas_view', 'ponto_faltas_manage',
      'ponto_atestados_view', 'ponto_atestados_manage',
      'ponto_fechamento_view', 'ponto_fechamento_manage', 'ponto_relatorios_view',
      'profile_view', 'password_change'
    ]
  },
  {
    name: 'funcionario',
    displayName: 'Funcionário',
    description: 'Acesso do funcionário aos recursos próprios',
    isSystem: true,
    permissions: [
      'my_trainings_view',
      'my_evaluations_view',
      'my_evaluations_answer',
      'employee_requests_create',
      'employee_requests_view_own',
      'ponto_bater', 'ponto_espelho_view',
      'profile_view', 'password_change'
    ]
  }
]

async function seedDatabase() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // companies.legal_name não possui UNIQUE no esquema atual. Por isso,
    // consultar antes de inserir evita criar uma empresa duplicada a cada seed.
    const existingCompany = await client.query(
      'SELECT id FROM companies WHERE legal_name = $1 ORDER BY created_at LIMIT 1',
      [companyName]
    )

    let companyId = existingCompany.rows[0]?.id

    if (!companyId) {
      const companyResult = await client.query(
        `INSERT INTO companies (legal_name, trade_name)
         VALUES ($1, $1)
         RETURNING id`,
        [companyName]
      )

      companyId = companyResult.rows[0]?.id
    }

    if (!companyId) {
      throw new Error('Não foi possível localizar ou criar a empresa inicial.')
    }

    for (const [key, label, category] of permissionSeed) {
      await client.query(
        `INSERT INTO permissions (key, label, category)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE
         SET label = EXCLUDED.label, category = EXCLUDED.category`,
        [key, label, category]
      )
    }

    const permissionRows = await client.query(
      'SELECT id, key FROM permissions'
    )
    const permissionIds = new Map(
      permissionRows.rows.map((row) => [row.key, row.id])
    )

    for (const role of roleSeed) {
      const roleResult = await client.query(
        `INSERT INTO access_roles
          (company_id, name, display_name, description, is_system, active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (company_id, name) DO UPDATE
         SET display_name = EXCLUDED.display_name,
             description = EXCLUDED.description,
             is_system = EXCLUDED.is_system,
             active = TRUE
         RETURNING id`,
        [
          companyId,
          role.name,
          role.displayName,
          role.description,
          role.isSystem
        ]
      )

      const roleId = roleResult.rows[0].id

      // Mantém os perfis idempotentes: atualiza o conjunto de permissões
      // para que rodar db:seed novamente não deixe permissões antigas extras.
      await client.query(
        'DELETE FROM access_role_permissions WHERE access_role_id = $1',
        [roleId]
      )

      for (const permissionKey of role.permissions) {
        const permissionId = permissionIds.get(permissionKey)
        if (!permissionId) continue

        await client.query(
          `INSERT INTO access_role_permissions (access_role_id, permission_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [roleId, permissionId]
        )
      }
    }

    const adminRole = await client.query(
      `SELECT id FROM access_roles
       WHERE company_id = $1 AND name = 'admin'
       LIMIT 1`,
      [companyId]
    )

    const hash = await bcrypt.hash(password, 12)

    await client.query(
      `INSERT INTO users
        (company_id, access_role_id, name, username, password_hash)
       VALUES ($1, $2, 'Administrador do sistema', $3, $4)
       ON CONFLICT (company_id, username) DO NOTHING`,
      [companyId, adminRole.rows[0].id, username, hash]
    )

    await client.query('COMMIT')
    console.log(`Database seeded. Company: ${companyId}. Admin: ${username}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

try {
  await seedDatabase()
} catch (error) {
  console.error('Database seed failed:', error)
  process.exitCode = 1
} finally {
  await pool.end()
}
