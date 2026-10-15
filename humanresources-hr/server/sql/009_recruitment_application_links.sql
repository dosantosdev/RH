-- Tokens de candidatura persistidos com hash para validação e token cifrado
-- para que o RH autorizado possa copiar links já existentes.
CREATE TABLE IF NOT EXISTS recruitment_application_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  token_ciphertext TEXT NOT NULL,
  vacancy_id VARCHAR(180) NOT NULL,
  vacancy_snapshot JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_application_links_company_created
  ON recruitment_application_links(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recruitment_application_links_expiry
  ON recruitment_application_links(expires_at)
  WHERE revoked_at IS NULL;
