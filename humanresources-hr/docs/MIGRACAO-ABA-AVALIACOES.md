# Migração da aba Avaliações para PostgreSQL

## O que foi alterado
- As chaves `evaluations`, `evaluationModels` e `evaluationWorkflows` passaram a ser tratadas como um módulo dedicado (`evaluations`) na API `/api/app-records`.
- A inicialização autenticada sincroniza essas três listas com o PostgreSQL.
- Quando uma chave já existe no banco, o payload do banco prevalece no cache local.
- Quando só existe no navegador, a lista é enviada ao banco sem apagar o dado local.
- Gravações e remoções feitas pelas funções de armazenamento e por chamadas diretas ao `localStorage` também são encaminhadas ao módulo `evaluations`.
- O modelo de armazenamento das telas não foi alterado para assincronicidade nesta etapa, para preservar o contrato síncrono que os componentes atuais usam.

## Aplicação
Não há nova migração SQL nesta etapa: a aba utiliza `app_records`, criada nas etapas anteriores.
1. Faça backup da pasta atual.
2. Extraia este ZIP sobre o projeto, preservando `server/.env`.
3. Na pasta `server`, execute `npm run dev` (não é necessário executar `db:migrate` para esta etapa).
4. Na raiz, execute `npm run build` e depois `npm run dev`.
5. Entre com um usuário autenticado e teste modelos, avaliações, etapas, respostas e PDI.

## Limitações e segurança
- O `localStorage` continua como cache compatível; o PostgreSQL recebe as gravações de forma assíncrona. O console informa falhas de sincronização, então valide as operações antes de considerar a migração concluída.
- A integração usa o escopo da empresa resolvido pelo token no backend; não aceita `companyId` informado pela tela.
- Não foi possível validar o build completo neste ambiente porque o pacote `node_modules` fornecido não contém o binding nativo Linux exigido pelo Vite/Rolldown. O comando de build deve ser executado no computador de desenvolvimento.
- Esta etapa não converte ainda as avaliações para tabelas relacionais próprias. Os dados da aba ficam em JSONB na tabela `app_records`, separados no módulo `evaluations`.
