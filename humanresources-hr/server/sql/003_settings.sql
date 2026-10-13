-- Configurações persistidas por empresa. O payload JSONB permite evoluir
-- as opções sem exigir uma coluna nova para cada preferência da interface.
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  setting_key VARCHAR(120) NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company
  ON company_settings(company_id);
