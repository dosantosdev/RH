# Migração para PostgreSQL — base consolidada

## O que esta revisão acrescenta

- Migração SQL `005_app_records.sql`, sem alterar as migrações `001` a `004`.
- Tabela `app_records`, com isolamento por empresa (`company_id`), JSONB e chave única por módulo/registro.
- API autenticada em `/api/app-records` para listar, consultar, salvar e excluir registros da empresa do usuário autenticado.
- Endpoint de importação legada por lotes (`POST /api/app-records/legacy-import`), restrito a administradores, com upsert idempotente e sem apagar dados que não vieram no lote.
- Serviços frontend `appRecords.js` e `legacyDataMigration.js`.
- A prévia da migração não envia nem exclui dados. A importação precisa ser chamada explicitamente pelo código chamador e não remove o `localStorage`.
- Chaves de sessão e a coleção `users` são excluídas da importação genérica. Usuários e credenciais exigem migração própria para preservar hashing de senha e vínculos.

## Aplicar

Na pasta `server`:

```bash
npm run db:migrate
```

A migração cria somente `app_records` e seu índice/trigger. Não é necessário recriar o banco. Faça backup antes de aplicar qualquer migração em produção.

## Autenticação e isolamento

Todas as rotas exigem token Bearer. O backend usa `companyId` obtido do token; o cliente não pode escolher a empresa de destino. A importação genérica exige usuário `admin`.

## Limitação importante desta entrega

**Esta revisão não conclui a conversão de todos os módulos legados.** Os serviços que ainda usam funções síncronas de `localStorage` precisam ser convertidos individualmente para chamadas assíncronas da API e as telas precisam aguardar as respostas. A camada JSONB é um destino de compatibilidade para a migração e não substitui as tabelas relacionais já existentes para funcionários, folha, ponto, avaliações, treinamentos, recrutamento e demais domínios.

Não use `app_records` para armazenar senhas, tokens, arquivos binários ou dados de autenticação. A importação genérica remove campos sensíveis conhecidos, mas isso não substitui a migração específica e validada de cada módulo.

## Validação feita nesta revisão

- ZIP de origem íntegro (`testzip` sem erros).
- Sintaxe Node verificada para os 17 arquivos JavaScript do servidor (`node --check`).
- Não foi possível validar integração real com PostgreSQL nesta sessão, pois não há conexão com o banco local do usuário.
- A compilação do frontend e os fluxos de tela não foram declarados como aprovados.

## Próximas conversões necessárias

1. Autenticação, usuários e perfis: usar somente `/api/auth`, `/api/users` e as rotas próprias, nunca importar senha em texto puro.
2. Funcionários, dependentes, documentos e organização: usar as rotas e tabelas relacionais já existentes.
3. Treinamentos, avaliações, ponto, folha, recrutamento, financeiro e relatórios: criar/adaptar rotas específicas e converter serviços/telas para `async/await`.
4. Configurações e chat: confirmar todos os caminhos de leitura e gravação na API.
5. Firebase Storage: configurar por último para os bytes dos arquivos; metadados permanecem no PostgreSQL.
