-- Completa as permissões usadas pelo frontend que ainda não existiam na tabela permissions.
INSERT INTO permissions (key, label, category)
VALUES
  ('access_roles_view', 'Visualizar perfis de acesso', 'Perfis de Acesso'),
  ('access_roles_create', 'Criar perfis de acesso', 'Perfis de Acesso'),
  ('access_roles_edit', 'Editar perfis de acesso', 'Perfis de Acesso'),
  ('access_roles_delete', 'Excluir perfis de acesso', 'Perfis de Acesso'),
  ('ponto_bater', 'Registrar próprio ponto', 'Ponto'),
  ('ponto_espelho_view', 'Visualizar próprio espelho de ponto', 'Ponto'),
  ('ponto_controle_view', 'Visualizar controle de ponto', 'Ponto'),
  ('ponto_controle_edit', 'Ajustar registros de ponto', 'Ponto'),
  ('ponto_jornadas_view', 'Visualizar jornadas e escalas', 'Ponto'),
  ('ponto_jornadas_create', 'Cadastrar jornadas e escalas', 'Ponto'),
  ('ponto_jornadas_edit', 'Editar jornadas e escalas', 'Ponto'),
  ('ponto_jornadas_delete', 'Excluir jornadas e escalas', 'Ponto'),
  ('ponto_banco_horas_view', 'Visualizar banco de horas', 'Ponto'),
  ('ponto_banco_horas_manage', 'Gerenciar banco de horas', 'Ponto'),
  ('ponto_horas_extras_view', 'Visualizar horas extras', 'Ponto'),
  ('ponto_horas_extras_manage', 'Gerenciar horas extras', 'Ponto'),
  ('ponto_faltas_view', 'Visualizar faltas e atrasos', 'Ponto'),
  ('ponto_faltas_manage', 'Gerenciar faltas e atrasos', 'Ponto'),
  ('ponto_atestados_view', 'Visualizar atestados', 'Ponto'),
  ('ponto_atestados_manage', 'Gerenciar atestados', 'Ponto'),
  ('ponto_fechamento_view', 'Visualizar fechamento mensal', 'Ponto'),
  ('ponto_fechamento_manage', 'Gerenciar fechamento mensal', 'Ponto'),
  ('ponto_relatorios_view', 'Visualizar relatórios de ponto', 'Ponto'),
  ('profile_view', 'Visualizar meu perfil', 'Perfil'),
  ('password_change', 'Alterar senha', 'Perfil')
ON CONFLICT (key) DO UPDATE
SET label = EXCLUDED.label, category = EXCLUDED.category;

-- Atualiza apenas as permissões operacionais dos perfis padrão já existentes.
-- Não remove permissões personalizadas nem modifica perfis criados pela empresa.
INSERT INTO access_role_permissions (access_role_id, permission_id)
SELECT ar.id, p.id
FROM access_roles ar
JOIN permissions p ON p.key = ANY(ARRAY[
  'ponto_controle_view', 'ponto_controle_edit',
  'ponto_jornadas_view', 'ponto_jornadas_create', 'ponto_jornadas_edit', 'ponto_jornadas_delete',
  'ponto_banco_horas_view', 'ponto_banco_horas_manage',
  'ponto_horas_extras_view', 'ponto_horas_extras_manage',
  'ponto_faltas_view', 'ponto_faltas_manage',
  'ponto_atestados_view', 'ponto_atestados_manage',
  'ponto_fechamento_view', 'ponto_fechamento_manage', 'ponto_relatorios_view',
  'profile_view', 'password_change'
])
WHERE ar.name = 'gestao_rh'
ON CONFLICT DO NOTHING;

INSERT INTO access_role_permissions (access_role_id, permission_id)
SELECT ar.id, p.id
FROM access_roles ar
JOIN permissions p ON p.key = ANY(ARRAY[
  'ponto_bater', 'ponto_espelho_view', 'profile_view', 'password_change'
])
WHERE ar.name = 'funcionario'
ON CONFLICT DO NOTHING;
