-- 005_app_records.sql
-- Armazenamento JSONB temporário/compatível para dados de módulos em migração.
-- Os registros são isolados por empresa e identificados pelo módulo + chave.
CREATE TABLE IF NOT EXISTS app_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_key VARCHAR(80) NOT NULL,
  record_key VARCHAR(180) NOT NULL,
  payload JSONB NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, module_key, record_key)
);

CREATE INDEX IF NOT EXISTS idx_app_records_company_module_updated
  ON app_records(company_id, module_key, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_records_payload_gin
  ON app_records USING GIN (payload);

DROP TRIGGER IF EXISTS trg_app_records_updated_at ON app_records;
CREATE TRIGGER trg_app_records_updated_at
BEFORE UPDATE ON app_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
