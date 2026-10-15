-- 006_documents_postgres_storage.sql
-- Armazena o conteúdo dos novos documentos no PostgreSQL.
-- A coluna storage_path permanece para compatibilidade com documentos legados no Firebase.
ALTER TABLE employee_documents
  ADD COLUMN IF NOT EXISTS file_data BYTEA;

ALTER TABLE employee_documents
  ALTER COLUMN storage_path DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_documents_company_created
  ON employee_documents(company_id, created_at DESC);
