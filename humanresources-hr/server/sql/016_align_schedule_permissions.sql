
-- Alinha as permissões antigas de Jornadas e Escalas
-- ao catálogo oficial ponto_jornadas_*.
--
-- A transação é controlada pelo migrate.js.
-- Não adicionar BEGIN ou COMMIT neste arquivo.

INSERT INTO permissions (key, label, category)
VALUES
  ('ponto_jornadas_view', 'Visualizar jornadas e escalas', 'Ponto'),
  ('ponto_jornadas_create', 'Cadastrar jornadas e escalas', 'Ponto'),
  ('ponto_jornadas_edit', 'Editar jornadas e escalas', 'Ponto'),
  ('ponto_jornadas_delete', 'Excluir jornadas e escalas', 'Ponto')
ON CONFLICT (key) DO UPDATE
SET
  label = EXCLUDED.label,
  category = EXCLUDED.category;

-- Concede as permissões oficiais equivalentes aos perfis
-- que ainda possuem associações com as permissões antigas.
INSERT INTO access_role_permissions (
  access_role_id,
  permission_id
)
SELECT
  old_link.access_role_id,
  new_permission.id
FROM access_role_permissions AS old_link
JOIN permissions AS old_permission
  ON old_permission.id = old_link.permission_id
JOIN permissions AS new_permission
  ON new_permission.key = CASE old_permission.key
    WHEN 'work_schedules_view' THEN 'ponto_jornadas_view'
    WHEN 'work_schedules_create' THEN 'ponto_jornadas_create'
    WHEN 'work_schedules_edit' THEN 'ponto_jornadas_edit'
    WHEN 'work_schedules_delete' THEN 'ponto_jornadas_delete'
  END
WHERE old_permission.key IN (
  'work_schedules_view',
  'work_schedules_create',
  'work_schedules_edit',
  'work_schedules_delete'
)
ON CONFLICT DO NOTHING;
