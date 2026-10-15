# Migração — Organograma / Posições

Esta etapa migra a tela **Organograma (posições hierárquicas)** para a API autenticada e PostgreSQL, usando a versão de projeto enviada em 14/10/2026 às 17h08 como base.

## Alterações
- `server/sql/007_positions_metadata.sql`: adiciona `positions.metadata` em JSONB e índices para empresa, hierarquia e departamento.
- `server/src/routes/positions.js`: API autenticada para listar, criar, editar e excluir posições; aplica permissões `roles_view`, `roles_create`, `roles_edit` e `roles_delete`, valida os vínculos da empresa e impede excluir posições com subordinados ou funcionários vinculados.
- `server/src/server.js`: monta `/api/organization/positions`.
- `src/services/position.js`: adiciona funções assíncronas para API/PostgreSQL; mantém temporariamente as funções síncronas antigas porque a tela de Candidatos ainda importa `getPositions`.
- `src/pages/Organograma/Organograma/Organograma.jsx`: carrega posições, cargos, filiais, departamentos e funcionários da API; criação, edição e exclusão passam a aguardar confirmação do backend. Comparações de identificadores usam strings para suportar os UUIDs do PostgreSQL.

## Aplicação
1. Faça backup da pasta e do banco.
2. Extraia o ZIP sobre o projeto atual, preservando `server/.env`.
3. Dentro de `server`, execute `npm run db:migrate` e reinicie a API.
4. Na raiz do frontend, execute `npm install`, `npm run build` e `npm run dev`.
5. Teste listar, criar, editar e excluir uma posição de teste. Teste também a validação de hierarquia e confirme que uma posição vinculada a funcionário ou com subordinados não pode ser excluída.
6. Confirme que a posição permanece após recarregar a página.

## Observações
- Esta etapa migra a tela de posições do Organograma. O serviço local legado `getPositions` permanece temporariamente para a tela de Candidatos, que será tratada quando a aba de Recrutamento for migrada.
- A migração não importa automaticamente posições antigas que existam apenas no `localStorage`. Elas devem ser conferidas e importadas de forma controlada.
- A etapa foi verificada estaticamente; não foi executada contra o PostgreSQL da máquina de desenvolvimento nesta sessão.
