# Migração PostgreSQL — Etapa 2

Esta etapa integra **Filiais** e **Departamentos** com a API autenticada e o PostgreSQL.

## Arquivos alterados
- `server/sql/003_org_metadata.sql`: guarda campos adicionais dos formulários em JSONB sem perder endereço, cidade, estado e descrição.
- `server/src/routes/organization.js`: endpoints de listagem, criação, edição e exclusão, filtrados pela empresa autenticada e protegidos por permissões.
- `server/src/server.js`: registra `/api/organization`.
- `server/src/db/seed.js`: registra permissões de estrutura organizacional e as concede ao perfil Gestão de RH.
- `src/pages/Organograma/Filiais/Filiais.jsx`: passa a usar a API.
- `src/pages/Organograma/Departamentos/Departamentos.jsx`: passa a usar a API para departamentos e filiais.

## Aplicação
1. Faça backup do projeto e mantenha `server/.env` fora de qualquer ZIP/commit.
2. Extraia os arquivos deste pacote na raiz do projeto, preservando os caminhos.
3. No terminal, dentro de `server`, execute `npm run db:migrate` e depois `npm run db:seed`.
4. Reinicie a API e saia/entre novamente no sistema para renovar o token e as permissões.
5. Teste criar, listar, editar e excluir uma filial. Depois crie um departamento vinculado à filial, edite-o e confira após atualizar a página.
6. Confirme que um usuário sem as permissões adequadas recebe acesso negado.

## Observações
- Os registros antigos de filiais/departamentos que só existiam no `localStorage` não são enviados automaticamente ao banco. Recrie os cadastros de teste no banco ou faça uma migração de dados revisada antes de excluir o armazenamento antigo.
- A tela de **Cargos** ainda usa armazenamento local nesta etapa e será integrada na próxima etapa, junto com a revisão dos relacionamentos dos cargos/posições.
- Não foi possível validar o build do frontend neste ambiente porque o ZIP contém dependências `node_modules` sem o binding nativo Linux exigido pelo Vite/Rolldown. No seu Windows, execute `npm install` na raiz do frontend se necessário e depois `npm run build`.
