# Validação das migrações no PostgreSQL 18.6 — ambiente de teste

Esta configuração cria um banco isolado para validar as migrations sem reutilizar o volume do `docker-compose.yml` principal (PostgreSQL 16). Não aponta para produção e não altera os dados do volume existente.

## 1. Iniciar PostgreSQL 18.6

Na raiz do projeto:

```powershell
docker compose -f docker-compose.postgres-test.yml up -d
docker compose -f docker-compose.postgres-test.yml ps
```

Aguarde o status `healthy` antes de continuar.

## 2. Configurar a conexão do backend

No PowerShell, a partir da pasta `server`:

```powershell
$env:DATABASE_URL = 'postgresql://hr_test:hr_test_local_only@localhost:5433/humanresources_hr_test'
npm run db:migrate
npm run db:verify
```

A variável de ambiente da sessão prevalece sobre o valor do arquivo `.env`. Não copie credenciais de teste para produção. O banco começa vazio; as migrations devem ser executadas antes da verificação.

## 3. O que `db:verify` confere

- As migrations `001_init.sql` a `015_repair_financial_events_catalog.sql` estão registradas em `schema_migrations`.
- As tabelas e colunas esperadas para catálogo financeiro, histórico salarial, folha, lançamentos da folha e financeiro avançado existem.
- Emite contagens de linhas para ajudar a revisar o estado do banco.

O comando é somente de leitura: não cria tabelas, não corrige schema e não modifica dados. Se falhar, deve-se corrigir a migração antes de considerar a etapa validada.

## 4. Limites conhecidos

- Este banco isolado não contém os dados reais da empresa; a validação de importação exige uma cópia de teste anonimizada ou um backup restaurado em ambiente seguro.
- O comando verifica a presença das migrações e das colunas essenciais, mas não substitui testes de API, permissões, isolamento entre empresas nem comparação das contagens de origem e destino.
- Para parar o container sem remover dados de teste: `docker compose -f docker-compose.postgres-test.yml down`.
- Para apagar permanentemente o volume isolado de teste, somente depois de confirmar que não precisa dos dados: `docker compose -f docker-compose.postgres-test.yml down -v`.
