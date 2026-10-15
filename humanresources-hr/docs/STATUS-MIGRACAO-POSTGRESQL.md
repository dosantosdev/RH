# Migração consolidada para PostgreSQL — andamento

## Base utilizada
Versão enviada em 14/10/2026 às 12:23 (`humanresources-hr(20261014-122339).zip`).

## Alteração implementada nesta revisão
- O backend agora monta a rota `server/src/routes/chat.js` em `/api/chat`.
- A rota usa o middleware `authenticate` e consulta as tabelas `chat_conversations`, `chat_participants` e `chat_messages`, criadas pela migração existente `002_chat.sql`.
- As migrações `001` a `004` foram preservadas sem renumeração ou alteração.
- Nenhum arquivo `.env` foi incluído no pacote.

## O que ainda não está migrado
A aplicação ainda possui módulos frontend que leem e gravam dados em `localStorage`. Esta entrega não deve ser interpretada como a migração completa de todos os módulos. A conversão exige adaptar cada serviço e tela para chamadas assíncronas à API e mapear os dados legados às tabelas adequadas, com testes por fluxo. Não foi apagado nem convertido automaticamente nenhum dado do navegador.

## Armazenamento de arquivos
A integração com Firebase Storage permanece pendente, conforme solicitado. Não se deve considerar upload de arquivos concluído nesta fase.

## Validação
A rota do chat foi conectada ao servidor. Para validar o comportamento funcional, é necessário iniciar o PostgreSQL, executar as migrações existentes e testar a API autenticada com usuários reais da base.
