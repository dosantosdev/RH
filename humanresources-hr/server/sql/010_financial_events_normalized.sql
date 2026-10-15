-- 010_financial_events_normalized.sql
-- Migra o catálogo agregado para linhas próprias, preservando o registro legado.
-- A importação é idempotente: não sobrescreve eventos que já tenham sido migrados.
CREATE TABLE IF NOT EXISTS financial_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  code TEXT,
  event_type TEXT NOT NULL,
  calculation_type TEXT NOT NULL,
  default_value NUMERIC(18, 4),
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, external_id),
  CONSTRAINT financial_events_type_check CHECK (event_type IN ('provento', 'desconto')),
  CONSTRAINT financial_events_calculation_check CHECK (
    calculation_type IN ('valor_fixo', 'percentual_salario', 'hora', 'manual')
  )
);

CREATE INDEX IF NOT EXISTS idx_financial_events_company_type
  ON financial_events(company_id, event_type, active);

CREATE INDEX IF NOT EXISTS idx_financial_events_company_name
  ON financial_events(company_id, lower(name));

DROP TRIGGER IF EXISTS trg_financial_events_updated_at ON financial_events;
CREATE TRIGGER trg_financial_events_updated_at
BEFORE UPDATE ON financial_events
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Copia o array legado para linhas. app_records é mantido como backup de compatibilidade.
INSERT INTO financial_events (
  company_id, external_id, name, code, event_type, calculation_type,
  default_value, notes, active, payload, created_by, updated_by
)
SELECT
  ar.company_id,
  COALESCE(NULLIF(item->>'id', ''), md5(item::text)),
  COALESCE(item->>'name', ''),
  NULLIF(upper(trim(item->>'code')), ''),
  item->>'type',
  item->>'calculationType',
  CASE
    WHEN COALESCE(item->>'defaultValue', '') ~ '^-?[0-9]+([.][0-9]+)?$'
      AND abs((item->>'defaultValue')::numeric) <= 1000000000
      THEN (item->>'defaultValue')::numeric
    ELSE NULL
  END,
  COALESCE(item->>'notes', ''),
  CASE lower(COALESCE(item->>'active', 'true'))
    WHEN 'false' THEN FALSE
    WHEN '0' THEN FALSE
    WHEN 'no' THEN FALSE
    ELSE TRUE
  END,
  item,
  ar.created_by,
  ar.updated_by
FROM app_records ar
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(ar.payload) = 'array' THEN ar.payload ELSE '[]'::jsonb END
) AS expanded(item)
WHERE ar.module_key = 'financial_events'
  AND ar.record_key = 'financialEvents'
  AND item->>'type' IN ('provento', 'desconto')
  AND item->>'calculationType' IN ('valor_fixo', 'percentual_salario', 'hora', 'manual')
ON CONFLICT (company_id, external_id) DO NOTHING;
