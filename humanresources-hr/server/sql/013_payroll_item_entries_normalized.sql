-- 013_payroll_item_entries_normalized.sql
-- Normaliza cada provento/desconto lançado na folha em uma linha própria.
-- O JSONB em payroll_items.data continua preservado para compatibilidade e recuperação.

CREATE TABLE IF NOT EXISTS payroll_item_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_item_id UUID NOT NULL REFERENCES payroll_items(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('earning', 'deduction')),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  event_code VARCHAR(80),
  event_name VARCHAR(180),
  amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0 AND amount <= 1000000000),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payroll_item_id, entry_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_item_entries_item_type_order
  ON payroll_item_entries(payroll_item_id, entry_type, sort_order);

CREATE INDEX IF NOT EXISTS idx_payroll_item_entries_event_code
  ON payroll_item_entries(event_code)
  WHERE event_code IS NOT NULL;

DROP TRIGGER IF EXISTS trg_payroll_item_entries_updated_at ON payroll_item_entries;
CREATE TRIGGER trg_payroll_item_entries_updated_at
BEFORE UPDATE ON payroll_item_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Importação idempotente dos arrays legados de cada funcionário da folha.
-- A linha original continua em payroll_items.data e em app_records como backup.
WITH legacy_entries AS (
  SELECT
    pi.id AS payroll_item_id,
    'earning'::varchar(20) AS entry_type,
    expanded.ordinality::integer - 1 AS sort_order,
    expanded.item AS payload
  FROM payroll_items pi
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(pi.data->'earnings') = 'array'
      THEN pi.data->'earnings' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS expanded(item, ordinality)
  WHERE jsonb_typeof(expanded.item) = 'object'

  UNION ALL

  SELECT
    pi.id AS payroll_item_id,
    'deduction'::varchar(20) AS entry_type,
    expanded.ordinality::integer - 1 AS sort_order,
    expanded.item AS payload
  FROM payroll_items pi
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(pi.data->'deductions') = 'array'
      THEN pi.data->'deductions' ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS expanded(item, ordinality)
  WHERE jsonb_typeof(expanded.item) = 'object'
)
INSERT INTO payroll_item_entries (
  payroll_item_id, external_id, entry_type, sort_order,
  event_code, event_name, amount, payload, created_at, updated_at
)
SELECT
  legacy.payroll_item_id,
  COALESCE(
    NULLIF(legacy.payload->>'id', ''),
    NULLIF(legacy.payload->>'financialEventId', ''),
    md5(legacy.payload::text)
  ) || ':' || legacy.sort_order::text,
  legacy.entry_type,
  legacy.sort_order,
  NULLIF(LEFT(COALESCE(legacy.payload->>'eventCode', legacy.payload->>'code', ''), 80), ''),
  NULLIF(LEFT(COALESCE(legacy.payload->>'eventName', legacy.payload->>'name', ''), 180), ''),
  CASE
    WHEN COALESCE(legacy.payload->>'amount', '') ~ '^[0-9]+([.][0-9]{1,2})?$'
      AND (legacy.payload->>'amount')::numeric <= 1000000000
      THEN (legacy.payload->>'amount')::numeric
    ELSE 0
  END,
  legacy.payload,
  pi.created_at,
  pi.updated_at
FROM legacy_entries legacy
JOIN payroll_items pi ON pi.id = legacy.payroll_item_id
ON CONFLICT (payroll_item_id, entry_type, external_id) DO NOTHING;
