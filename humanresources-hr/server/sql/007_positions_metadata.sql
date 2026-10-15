-- Metadados da posição (jornada específica e campos de evolução futura).
-- Mantém os campos relacionais normalizados nas colunas de positions.
ALTER TABLE positions
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_positions_company
  ON positions(company_id);

CREATE INDEX IF NOT EXISTS idx_positions_parent
  ON positions(company_id, parent_position_id);

CREATE INDEX IF NOT EXISTS idx_positions_department
  ON positions(company_id, department_id);
