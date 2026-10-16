-- 011_salary_history_normalized.sql
-- Normaliza o histórico salarial em uma linha por alteração, mantendo app_records como backup.
CREATE TABLE IF NOT EXISTS salary_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  external_employee_id TEXT,
  employee_name VARCHAR(180) NOT NULL DEFAULT '',
  salary NUMERIC(14,2) NOT NULL CHECK (salary >= 0 AND salary <= 100000000),
  effective_date DATE NOT NULL,
  reason VARCHAR(120) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_salary_history_company_employee_date
  ON salary_history(company_id, employee_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS idx_salary_history_company_date
  ON salary_history(company_id, effective_date DESC);

DROP TRIGGER IF EXISTS trg_salary_history_updated_at ON salary_history;
CREATE TRIGGER trg_salary_history_updated_at
BEFORE UPDATE ON salary_history
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Importação idempotente do array legado. O array antigo não é removido.
-- Registros sem funcionário correspondente também são preservados, com employee_id nulo.
INSERT INTO salary_history (
  company_id, external_id, employee_id, external_employee_id, employee_name,
  salary, effective_date, reason, notes, payload, created_at, updated_at
)
SELECT
  ar.company_id,
  COALESCE(NULLIF(item->>'id', ''), md5(item::text)),
  matched_employee.id,
  NULLIF(item->>'employeeId', ''),
  LEFT(COALESCE(NULLIF(item->>'employeeName', ''), matched_employee.name, ''), 180),
  CASE
    WHEN COALESCE(item->>'salary', '') ~ '^[0-9]+([.][0-9]{1,2})?$' THEN
      CASE WHEN (item->>'salary')::numeric <= 100000000
        THEN (item->>'salary')::numeric ELSE 0 END
    ELSE 0
  END,
  (item->>'effectiveDate')::date,
  LEFT(COALESCE(NULLIF(item->>'reason', ''), 'Importado do histórico legado'), 120),
  COALESCE(item->>'notes', ''),
  item,
  ar.created_at,
  ar.updated_at
FROM app_records ar
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(ar.payload) = 'array' THEN ar.payload ELSE '[]'::jsonb END
) AS expanded(item)
LEFT JOIN LATERAL (
  SELECT e.id, e.name
  FROM employees e
  WHERE e.company_id = ar.company_id
    AND (
      e.id::text = item->>'employeeId'
      OR e.registration_data->>'legacyId' = item->>'employeeId'
      OR e.registration_data->>'legacy_id' = item->>'employeeId'
      OR e.registration_data->>'idLegacy' = item->>'employeeId'
      OR e.registration_data->>'id' = item->>'employeeId'
    )
  ORDER BY CASE WHEN e.id::text = item->>'employeeId' THEN 0 ELSE 1 END
  LIMIT 1
) matched_employee ON TRUE
WHERE ar.module_key = 'salaries'
  AND ar.record_key = 'salaryHistory'
  AND jsonb_typeof(item) = 'object'
  AND CASE
    WHEN COALESCE(item->>'salary', '') ~ '^[0-9]+([.][0-9]{1,2})?$' THEN
      (item->>'salary')::numeric BETWEEN 0 AND 100000000
    ELSE FALSE
  END
  AND CASE
    WHEN COALESCE(item->>'effectiveDate', '') ~ '^\d{4}-\d{2}-\d{2}$' THEN
      CASE
        WHEN substring(item->>'effectiveDate', 1, 4)::integer BETWEEN 1 AND 9999
          AND substring(item->>'effectiveDate', 6, 2)::integer BETWEEN 1 AND 12 THEN
          substring(item->>'effectiveDate', 9, 2)::integer BETWEEN 1 AND
            CASE substring(item->>'effectiveDate', 6, 2)::integer
              WHEN 1 THEN 31 WHEN 2 THEN
                CASE
                  WHEN (substring(item->>'effectiveDate', 1, 4)::integer % 400 = 0)
                    OR (substring(item->>'effectiveDate', 1, 4)::integer % 4 = 0
                        AND substring(item->>'effectiveDate', 1, 4)::integer % 100 <> 0)
                  THEN 29 ELSE 28 END
              WHEN 3 THEN 31 WHEN 4 THEN 30 WHEN 5 THEN 31 WHEN 6 THEN 30
              WHEN 7 THEN 31 WHEN 8 THEN 31 WHEN 9 THEN 30 WHEN 10 THEN 31
              WHEN 11 THEN 30 WHEN 12 THEN 31
            END
        ELSE FALSE
      END
    ELSE FALSE
  END
  AND NULLIF(item->>'reason', '') IS NOT NULL
ON CONFLICT (company_id, external_id) DO NOTHING;
