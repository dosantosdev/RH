# Migração do histórico salarial para tabela relacional

Data: 16/10/2026

## Alterações

- Criada a migração `server/sql/011_salary_history_normalized.sql`.
- Criada a tabela `salary_history`, com uma linha por alteração salarial, escopo por empresa, funcionário vinculado quando identificável, salário, data de vigência, motivo, observações, auditoria e `payload` de compatibilidade.
- A migração importa o array legado `app_records(salaries, salaryHistory)` de forma idempotente e mantém a lista antiga intacta como backup.
- O endpoint `/api/salaries` passou a ler, criar, editar e excluir registros diretamente em `salary_history`.
- As operações de escrita usam transação e advisory lock por empresa; a aplicação verifica duplicidade por funcionário/data e confirma as alterações antes de retornar o histórico.
- O endpoint `/api/me/financial-data` agora lê o histórico salarial e os eventos financeiros de suas tabelas relacionais próprias.
- `salaryHistory` foi incluído nas chaves que não podem ser sincronizadas novamente pela ponte genérica do frontend.
- As rotas genéricas de `app_records` recusam leitura/escrita pontual e importação legada da chave `salaries/salaryHistory`, evitando que dados antigos sobrescrevam a tabela oficial. A listagem genérica também oculta essa chave.

## Preservação de dados

- O registro legado em `app_records` não é apagado nem alterado pela migração.
- IDs externos são preservados; IDs de funcionários antigos são resolvidos para UUID quando há correspondência dentro da mesma empresa.
- Registros cujo funcionário não pôde ser identificado permanecem na tabela com `employee_id` nulo e o identificador antigo em `external_employee_id`. Esses registros podem ser consultados, mas não editados até o vínculo ser corrigido.
- Linhas sem data, salário ou motivo válidos não são importadas automaticamente; continuam no registro JSONB antigo para recuperação manual.

## Validações desta sessão

- `node --check` passou em `salaries.js`, `me.js`, `appRecords.js` e `storage.js`.
- A migração SQL foi revisada estaticamente, mas não executada contra PostgreSQL real nesta sessão.
- O build de produção e os testes integrados continuam pendentes até que o ambiente tenha a dependência nativa correta do Rolldown e uma base de teste disponível.

## Checklist obrigatório antes de produção

1. Fazer backup do PostgreSQL.
2. Executar `npm run db:migrate` em `server/`.
3. Conferir contagens e IDs antes/depois da importação; verificar também os registros legados sem funcionário vinculado.
4. Testar GET/POST/PUT/DELETE com usuário autorizado e resposta 403 sem permissão.
5. Testar empresa A tentando acessar ID de registro da empresa B (deve resultar em 404 sem alterar dados).
6. Testar conflito de dois registros do mesmo funcionário na mesma data.
7. Confirmar que as rotas genéricas `app-records/salaries/salaryHistory` recusam gravações e que a atualização da página lê a tabela `salary_history`.
8. Testar o cálculo de folha usando salários importados, incluindo datas históricas e funcionários sem vínculo.
