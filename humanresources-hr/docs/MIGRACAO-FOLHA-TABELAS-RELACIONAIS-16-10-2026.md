# Folha de Pagamento — persistência relacional

Data: 16/10/2026

## O que mudou

- A API `/api/payrolls` passa a ler e persistir folhas em `payrolls` e seus funcionários/lançamentos em `payroll_items`, em vez de tratar `app_records(payroll, payrolls)` como fonte oficial.
- A migração `server/sql/012_payroll_relational_storage.sql` adiciona identificadores externos estáveis e campos JSONB de compatibilidade por folha/funcionário, importa os agregados legados de forma idempotente e mantém `app_records` como cópia para recuperação.
- Os campos comuns de folha e funcionário são persistidos nas colunas relacionais existentes; `data` conserva atributos específicos que a interface ainda utiliza.
- O endpoint `/api/me/financial-data` também consulta a estrutura relacional para Folha, evitando ler o agregado legado para esse domínio.
- A rota genérica `app_records` bloqueia GET/PUT/DELETE e importação da chave `payroll/payrolls`, direcionando o fluxo para `/api/payrolls`.
- A compatibilidade com IDs antigos de funcionários é preservada por `external_employee_id`; quando não há vínculo confiável, o JSON original permanece e o `employee_id` pode ficar nulo.

## Segurança e transações

- O escopo da empresa vem da sessão autenticada.
- As mutações continuam exigindo `finance_payroll_manage`; consulta exige `finance_payroll_view` ou a permissão de gestão.
- Um advisory lock por empresa serializa as mutações e as operações são executadas dentro de transação.
- A interface mantém o contrato de API e os IDs externos que já utiliza.

## Compatibilidade e recuperação

`app_records` não é apagado pela migração. A tabela relacional passa a ser a fonte oficial depois de aplicar a migration 012. Registros com competência inválida não são importados automaticamente e continuam preservados no JSONB legado para revisão. A migration reutiliza uma folha relacional da mesma competência quando ela está vazia, para evitar duplicidade. A coluna `data` mantém atributos não normalizados, portanto a migração reduz a dependência do agregado global, mas não elimina todo JSONB do domínio.

## Aplicação

1. Fazer backup do banco PostgreSQL.
2. Na pasta `server`, executar `npm run db:migrate`.
3. Conferir `schema_migrations` e a aplicação de `012_payroll_relational_storage.sql`.
4. Comparar a contagem de folhas e funcionários por folha entre o JSON legado e as tabelas novas.
5. Testar criação, edição, inclusão/remoção de proventos e descontos, fechamento, reabertura e exclusão de folha em aberto.
6. Testar usuário sem permissão, usuário de outra empresa e tentativa de gravação da chave antiga por `/api/records`.
7. Atualizar a página e confirmar que os dados persistem após novo login.

## Validação feita nesta entrega

- `node --check` nos arquivos JavaScript alterados.
- ESLint direcionado nos arquivos de rotas alterados.
- Integridade do ZIP de origem verificada.

## Validação ainda pendente

A migration SQL ainda não foi executada em um PostgreSQL real nesta sessão. Também faltam build de produção e testes integrados com duas empresas/perfis. O build não inicia no ambiente atual porque o pacote nativo opcional `@rolldown/binding-linux-x64-gnu` está ausente de `node_modules`.
