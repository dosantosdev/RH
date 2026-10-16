-- 014_financial_advanced_relational.sql
-- Normaliza os registros de férias, 13º salário e rescisões em linhas próprias.
-- O payload JSONB permanece apenas como envelope de compatibilidade com a UI.

CREATE TABLE IF NOT EXISTS financial_advanced_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  record_type VARCHAR(24) NOT NULL CHECK (record_type IN ('vacation', 'thirteenth', 'termination')),
  external_id VARCHAR(180) NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_external_id VARCHAR(180),
  record_date DATE,
  status VARCHAR(40) NOT NULL DEFAULT 'draft',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, record_type, external_id)
);

CREATE INDEX IF NOT EXISTS idx_financial_advanced_company_type_date
  ON financial_advanced_records(company_id, record_type, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_advanced_company_employee
  ON financial_advanced_records(company_id, employee_id, record_type);

DROP TRIGGER IF EXISTS trg_financial_advanced_records_updated_at ON financial_advanced_records;
CREATE TRIGGER trg_financial_advanced_records_updated_at
BEFORE UPDATE ON financial_advanced_records
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Importação idempotente dos arrays legados. IDs antigos são preservados; quando
-- ausentes, usa-se um ID determinístico para não duplicar registros em reexecuções.
WITH legacy AS (
  SELECT ar.company_id, ar.record_key, entry.item AS payload
  FROM app_records ar
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(ar.payload) = 'array' THEN ar.payload ELSE '[]'::jsonb END
  ) AS entry(item)
  WHERE ar.module_key = 'financial_advanced'
    AND ar.record_key IN ('financialVacations', 'financialThirteenths', 'financialTerminations')
    AND jsonb_typeof(entry.item) = 'object'
), mapped AS (
  SELECT
    company_id,
    CASE record_key
      WHEN 'financialVacations' THEN 'vacation'
      WHEN 'financialThirteenths' THEN 'thirteenth'
      ELSE 'termination'
    END AS record_type,
    COALESCE(NULLIF(payload->>'id', ''), 'legacy-' || md5(payload::text)) AS external_id,
    NULLIF(payload->>'employeeId', '') AS employee_external_id,
    CASE
      WHEN record_key = 'financialVacations'
        AND (payload->>'startDate') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN (payload->>'startDate')::date
      WHEN record_key = 'financialThirteenths'
        AND (payload->>'year') ~ '^[0-9]{4}$'
        THEN ((payload->>'year') || '-12-31')::date
      WHEN record_key = 'financialTerminations'
        AND (payload->>'dismissalDate') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN (payload->>'dismissalDate')::date
      ELSE NULL
    END AS record_date,
    COALESCE(NULLIF(payload->>'status', ''), 'draft') AS status,
    payload
  FROM legacy
), resolved AS (
  SELECT
    mapped.*,
    employee.id AS employee_id
  FROM mapped
  LEFT JOIN LATERAL (
    SELECT e.id
    FROM employees e
    WHERE e.company_id = mapped.company_id
      AND mapped.employee_external_id IS NOT NULL
      AND (
        e.id::text = mapped.employee_external_id
        OR e.registration_data->>'legacyId' = mapped.employee_external_id
        OR e.registration_data->>'legacy_id' = mapped.employee_external_id
        OR e.registration_data->>'idLegacy' = mapped.employee_external_id
        OR e.registration_data->>'id' = mapped.employee_external_id
      )
    ORDER BY CASE WHEN e.id::text = mapped.employee_external_id THEN 0 ELSE 1 END
    LIMIT 1
  ) employee ON TRUE
)
INSERT INTO financial_advanced_records (
  company_id, record_type, external_id, employee_id, employee_external_id,
  record_date, status, payload
)
SELECT company_id, record_type, external_id, employee_id, employee_external_id,
       record_date, status, payload
FROM resolved
ON CONFLICT (company_id, record_type, external_id) DO NOTHING;
