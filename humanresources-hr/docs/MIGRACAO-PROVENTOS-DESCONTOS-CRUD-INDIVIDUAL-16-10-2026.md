# Migração de Proventos e Descontos para operações por evento

Data: 16/10/2026

## Objetivo

Remover a substituição de todo o catálogo por um único `PUT /api/financial-events`. A tabela relacional `financial_events` já existia; esta etapa muda as mutações para operar em um evento por vez, reduzindo o risco de uma sessão apagar alterações de outra.

## Alterações

- `GET /api/financial-events`: continua retornando os eventos da empresa autenticada.
- `POST /api/financial-events`: cria um evento, verifica permissão, ID e código duplicados no escopo da empresa e grava uma linha.
- `PATCH /api/financial-events/:id`: atualiza somente o evento indicado, preserva propriedades legadas do payload e valida código duplicado.
- `DELETE /api/financial-events/:id`: exclui somente o evento indicado dentro da empresa autenticada.
- `POST /api/financial-events/import-legacy`: importação assistida e idempotente do cache local. Insere apenas IDs ausentes, não substitui registros existentes e não apaga o cache.
- `PUT /api/financial-events`: retorna HTTP 409 para impedir a substituição de catálogo inteiro.
- A tela `ProventosDescontos.jsx` usa POST/PATCH/DELETE e atualiza o cache apenas depois da confirmação do servidor.
- Se o banco estiver vazio e houver cache local, a tela exige confirmação explícita antes de importar, pois o cache do navegador pode pertencer a outra empresa.

## Segurança e integridade

- Todas as rotas exigem autenticação e a permissão `finance_events_manage` para mutações.
- O escopo da empresa vem do token, nunca de um `companyId` enviado pelo cliente.
- Um advisory lock por empresa serializa mutações e a verificação de códigos duplicados.
- A importação não apaga nem substitui eventos existentes; duplicidades de código geram conflito e precisam ser resolvidas antes de prosseguir.
- O catálogo antigo em `app_records` continua preservado como fonte de recuperação; a ponte genérica já bloqueia a escrita dessa chave.

## Validação executada nesta entrega

- `node --check` passou nos 23 arquivos JavaScript do backend.
- O parser TypeScript foi usado para analisar sintaticamente o JSX alterado; não reportou erros.
- Busca estática confirmou que a tela não usa mais `PUT /api/financial-events`.
- ZIP verificado quanto à integridade.

## Validação pendente

- Executar as migrações `010_financial_events_normalized.sql` e demais migrações pendentes em um PostgreSQL real, após backup.
- Testar criação, edição, ativação/inativação, exclusão, código duplicado, 403, isolamento entre empresas e importação legada.
- Executar build e lint no ambiente com dependências instaladas.
- Conferir persistência após atualizar a página e após novo login.

Esta entrega melhora o caminho de escrita, mas não marca o módulo como aprovado para produção até a validação real.
