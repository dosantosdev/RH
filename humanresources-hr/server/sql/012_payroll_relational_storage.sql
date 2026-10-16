-- 012_payroll_relational_storage.sql
-- Migra folhas de app_records para payrolls + payroll_items.
-- Os campos data preservam atributos legados que ainda não possuem colunas dedicadas.
-- A origem app_records é mantida como backup e a importação é idempotente.

ALTER TABLE payrolls
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE payroll_items
  ALTER COLUMN employee_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS external_employee_id TEXT,
  ADD COLUMN IF NOT EXISTS data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE payrolls
SET external_id = id::text
WHERE external_id IS NULL OR btrim(external_id) = '';

UPDATE payroll_items
SET external_id = COALESCE(NULLIF(external_id, ''), id::text)
WHERE external_id IS NULL OR btrim(external_id) = '';

ALTER TABLE payrolls ALTER COLUMN external_id SET NOT NULL;
ALTER TABLE payroll_items ALTER COLUMN external_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payrolls_company_external_id
  ON payrolls(company_id, external_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payroll_items_payroll_external_id
  ON payroll_items(payroll_id, external_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_company_competence
  ON payrolls(company_id, competence DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_items_employee_payroll
  ON payroll_items(employee_id, payroll_id);

-- Reaproveita uma linha relacional antiga da mesma competência quando ela ainda
-- não possui dados de domínio, em vez de criar uma folha duplicada.
WITH legacy_payrolls AS (
  SELECT
    ar.company_id,
    COALESCE(NULLIF(item->>'id', ''), md5(item::text)) AS external_id,
    (item->>'competence' || '-01')::date AS competence,
    CASE WHEN item->>'status' = 'closed' THEN 'closed' ELSE 'open' END AS status,
    item AS data,
    ar.created_by,
    ar.updated_by,
    ar.created_at,
    ar.updated_at
  FROM app_records ar
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(ar.payload) = 'array' THEN ar.payload ELSE '[]'::jsonb END
  ) AS expanded(item)
  WHERE ar.module_key = 'payroll'
    AND ar.record_key = 'payrolls'
    AND jsonb_typeof(item) = 'object'
    AND COALESCE(item->>'competence', '') ~ '^\d{4}-(0[1-9]|1[0-2])$'
    AND substring(item->>'competence', 1, 4)::integer BETWEEN 1 AND 9999
)
UPDATE payrolls existing
SET external_id = legacy.external_id,
    status = legacy.status,
    totals = COALESCE(legacy.data->'totals', '{}'::jsonb),
    data = legacy.data,
    created_by = COALESCE(existing.created_by, legacy.created_by),
    updated_by = COALESCE(legacy.updated_by, existing.updated_by),
    created_at = LEAST(existing.created_at, legacy.created_at),
    updated_at = GREATEST(existing.updated_at, legacy.updated_at)
FROM legacy_payrolls legacy
WHERE existing.company_id = legacy.company_id
  AND existing.competence = legacy.competence
  AND existing.data = '{}'::jsonb
  AND NOT EXISTS (
    SELECT 1 FROM payrolls conflicting
    WHERE conflicting.company_id = existing.company_id
      AND conflicting.external_id = legacy.external_id
      AND conflicting.id <> existing.id
  );

-- Importa cada folha como registro próprio. Registros sem competência válida
-- permanecem no JSONB legado para revisão manual, sem interromper a migração.
WITH legacy_payrolls AS (
  SELECT
    ar.company_id,
    COALESCE(NULLIF(item->>'id', ''), md5(item::text)) AS external_id,
    (item->>'competence' || '-01')::date AS competence,
    CASE WHEN item->>'status' = 'closed' THEN 'closed' ELSE 'open' END AS status,
    item AS data,
    ar.created_by,
    ar.updated_by,
    ar.created_at,
    ar.updated_at
  FROM app_records ar
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(ar.payload) = 'array' THEN ar.payload ELSE '[]'::jsonb END
  ) AS expanded(item)
  WHERE ar.module_key = 'payroll'
    AND ar.record_key = 'payrolls'
    AND jsonb_typeof(item) = 'object'
    AND COALESCE(item->>'competence', '') ~ '^\d{4}-(0[1-9]|1[0-2])$'
    AND substring(item->>'competence', 1, 4)::integer BETWEEN 1 AND 9999
)
INSERT INTO payrolls (
  company_id, external_id, competence, status, totals, data,
  created_by, updated_by, created_at, updated_at
)
SELECT
  company_id, external_id, competence, status,
  COALESCE(data->'totals', '{}'::jsonb), data,
  created_by, updated_by, created_at, updated_at
FROM legacy_payrolls legacy
WHERE NOT EXISTS (
  SELECT 1 FROM payrolls existing
  WHERE existing.company_id = legacy.company_id
    AND existing.competence = legacy.competence
)
ON CONFLICT (company_id, external_id) DO UPDATE
SET data = CASE
      WHEN payrolls.data = '{}'::jsonb THEN EXCLUDED.data
      ELSE payrolls.data
    END,
    updated_at = GREATEST(payrolls.updated_at, EXCLUDED.updated_at);

-- Recria os itens a partir do agregado legado quando este é a fonte completa.
DELETE FROM payroll_items item
USING payrolls parent
WHERE item.payroll_id = parent.id
  AND jsonb_typeof(parent.data->'employees') = 'array';

-- Importa os colaboradores de cada folha. employee_id é nulo quando a referência
-- legada não pode ser vinculada com segurança; o identificador original e o JSON
-- completo permanecem preservados para recuperação posterior.
INSERT INTO payroll_items (
  payroll_id, employee_id, external_id, external_employee_id,
  base_salary, earnings, deductions, inss, irrf, fgts, net_salary,
  overtime_minutes, overtime_amount, data, created_at, updated_at
)
SELECT
  p.id,
  matched_employee.id,
  COALESCE(NULLIF(employee_item->>'employeeId', ''), NULLIF(employee_item->>'id', ''), md5(employee_item::text)),
  NULLIF(employee_item->>'employeeId', ''),
  CASE WHEN COALESCE(employee_item->>'baseSalary', '') ~ '^-?[0-9]+([.][0-9]+)?$'
    THEN GREATEST(0, LEAST((employee_item->>'baseSalary')::numeric, 1000000000)) ELSE 0 END,
  COALESCE(earnings_total.amount, 0),
  COALESCE(deductions_total.amount, 0),
  CASE WHEN COALESCE(employee_item->>'inss', '') ~ '^-?[0-9]+([.][0-9]+)?$'
    THEN GREATEST(0, LEAST((employee_item->>'inss')::numeric, 1000000000)) ELSE 0 END,
  CASE WHEN COALESCE(employee_item->>'irrf', '') ~ '^-?[0-9]+([.][0-9]+)?$'
    THEN GREATEST(0, LEAST((employee_item->>'irrf')::numeric, 1000000000)) ELSE 0 END,
  CASE WHEN COALESCE(employee_item->>'fgts', '') ~ '^-?[0-9]+([.][0-9]+)?$'
    THEN GREATEST(0, LEAST((employee_item->>'fgts')::numeric, 1000000000)) ELSE 0 END,
  CASE WHEN COALESCE(employee_item->>'netSalary', '') ~ '^-?[0-9]+([.][0-9]+)?$'
    THEN GREATEST(0, LEAST((employee_item->>'netSalary')::numeric, 1000000000)) ELSE 0 END,
  CASE WHEN COALESCE(employee_item->>'overtimeMinutes', '') ~ '^\d+$'
    THEN LEAST((employee_item->>'overtimeMinutes')::integer, 1000000000) ELSE 0 END,
  CASE WHEN COALESCE(employee_item->>'overtimeAmount', '') ~ '^-?[0-9]+([.][0-9]+)?$'
    THEN GREATEST(0, LEAST((employee_item->>'overtimeAmount')::numeric, 1000000000)) ELSE 0 END,
  employee_item,
  p.created_at,
  p.updated_at
FROM payrolls p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(p.data->'employees') = 'array' THEN p.data->'employees' ELSE '[]'::jsonb END
) AS expanded(employee_item)
LEFT JOIN LATERAL (
  SELECT e.id
  FROM employees e
  WHERE e.company_id = p.company_id
    AND (
      e.id::text = employee_item->>'employeeId'
      OR e.registration_data->>'legacyId' = employee_item->>'employeeId'
      OR e.registration_data->>'legacy_id' = employee_item->>'employeeId'
      OR e.registration_data->>'idLegacy' = employee_item->>'employeeId'
      OR e.registration_data->>'id' = employee_item->>'employeeId'
    )
  ORDER BY CASE WHEN e.id::text = employee_item->>'employeeId' THEN 0 ELSE 1 END
  LIMIT 1
) matched_employee ON TRUE
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(CASE
    WHEN COALESCE(item->>'amount', '') ~ '^-?[0-9]+([.][0-9]+)?$'
      THEN GREATEST(0, LEAST((item->>'amount')::numeric, 1000000000))
    ELSE 0 END), 0) AS amount
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(employee_item->'earnings') = 'array' THEN employee_item->'earnings' ELSE '[]'::jsonb END
  ) AS earning(item)
) earnings_total ON TRUE
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(CASE
    WHEN COALESCE(item->>'amount', '') ~ '^-?[0-9]+([.][0-9]+)?$'
      THEN GREATEST(0, LEAST((item->>'amount')::numeric, 1000000000))
    ELSE 0 END), 0) AS amount
  FROM jsonb_array_elements(
    CASE WHEN jsonb_typeof(employee_item->'deductions') = 'array' THEN employee_item->'deductions' ELSE '[]'::jsonb END
  ) AS deduction(item)
) deductions_total ON TRUE
WHERE p.data ? 'employees'
  AND jsonb_typeof(employee_item) = 'object'
ON CONFLICT (payroll_id, external_id) DO NOTHING;
