# Migração do catálogo de Proventos e Descontos para tabela relacional

Data: 15/10/2026

## O que mudou

- Criada a migração SQL `010_financial_events_normalized.sql`.
- A migração cria `financial_events`, com uma linha por evento e colunas próprias para empresa, identificador externo, nome, código, tipo, tipo de cálculo, valor padrão, observações e estado ativo.
- Os dados do array legado `app_records(financial_events, financialEvents)` são copiados com `ON CONFLICT DO NOTHING`; o registro agregado antigo é mantido como cópia de compatibilidade e recuperação.
- A rota `GET/PUT /api/financial-events` agora lê e grava linhas na tabela normalizada. O contrato JSON da tela e os IDs externos conhecidos são preservados.
- As gravações usam transação e advisory lock por empresa; a lista só é reconciliada depois da validação de todo o payload.
- A ponte genérica de `localStorage` não envia mais `financialEvents` para `app_records`.
- As rotas genéricas de gravação/importação/exclusão de `app_records` recusam a chave antiga `financial_events/financialEvents`, evitando que uma lista atrasada volte a ser fonte oficial.

## Preservação e compatibilidade

- A migração não exclui nem altera o registro agregado antigo.
- Propriedades extras dos eventos são mantidas no campo JSONB individual `payload`, enquanto os campos principais são colunas relacionais.
- IDs de evento são preservados como `external_id` textual para não quebrar referências existentes na interface.
- Se a tabela estiver vazia e o cache local tiver dados, a tela preserva o cache e permite que o usuário envie a lista pela rota dedicada ao salvar; os dados antigos em `app_records` também permanecem para recuperação.
- A tabela normalizada só passa a ser fonte oficial após aplicar a migração `010`.

## Validações realizadas

- `node --check` passou em `financialEvents.js`, `appRecords.js` e `storage.js`.
- ESLint direcionado aos três arquivos passou sem erros.
- A migração SQL foi revisada estaticamente, mas não foi executada: não há cliente PostgreSQL (`psql`) nem conexão a uma base real nesta sessão.
- O build do Vite foi tentado, mas falhou antes de compilar a aplicação porque o pacote nativo `@rolldown/binding-linux-x64-gnu` está ausente no `node_modules` recebido.

## Testes obrigatórios com PostgreSQL antes de produção

1. Fazer backup do banco.
2. Executar `npm run db:migrate` dentro de `server/`.
3. Confirmar que eventos existentes em `app_records` foram copiados para `financial_events`, mantendo o mesmo `external_id`.
4. Testar GET, criar, editar, desativar e excluir eventos com um usuário autorizado.
5. Confirmar HTTP 403 para usuário sem `finance_events_manage`.
6. Confirmar isolamento entre duas empresas.
7. Confirmar que chamadas genéricas a `app-records/financial_events/financialEvents` recebem HTTP 409 e não alteram a tabela.
8. Atualizar a página e confirmar persistência.

## Limitação

O catálogo ainda usa um endpoint `PUT` de lista completa por compatibilidade com a interface, mas os dados são armazenados como linhas individuais. Uma próxima melhoria é migrar para operações CRUD por evento e adicionar testes automatizados de concorrência.


> **Atualização em 16/10/2026:** o contrato de `PUT` descrito nesta etapa foi substituído por CRUD individual. Consulte `MIGRACAO-PROVENTOS-DESCONTOS-CRUD-INDIVIDUAL-16-10-2026.md`.
