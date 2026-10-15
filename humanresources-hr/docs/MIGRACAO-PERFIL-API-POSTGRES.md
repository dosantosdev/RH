# Migração — perfil do usuário para PostgreSQL

## Escopo
- A tela `Profile` carrega os dados do usuário autenticado por `GET /api/me`.
- A edição do próprio nome e nome de acesso usa `PATCH /api/me/profile`.
- O backend deriva usuário e empresa do token, exige `profile_edit`, limita tamanhos e trata conflito de nome de usuário.
- A senha e os campos de permissão/perfil de acesso não podem ser alterados por este endpoint.
- A sessão local é atualizada somente como compatibilidade temporária; o PostgreSQL é a fonte oficial.
- A foto antiga do avatar pode ser exibida a partir do cache legado durante a transição; nome, usuário e vínculo vêm da API.
- `showToast` agora possui referência estável, evitando recarregamentos repetidos do perfil em efeitos React.

## Testes manuais
1. Entrar pela API com usuário que possua `profile_view` e `profile_edit`.
2. Abrir Meu Perfil e confirmar que nome, usuário e vínculo são carregados pela API.
3. Salvar nome e usuário válidos e recarregar a página.
4. Testar campos vazios e nome de usuário já existente; a API deve rejeitar sem perder os dados anteriores.
5. Entrar com usuário sem `profile_edit`; a API deve responder 403 ao tentar atualizar o perfil.
6. Confirmar que a alteração não permite mudar o ID do usuário, empresa, perfil de acesso ou senha.

## Limitações
- A verificação de sintaxe e lint é estática; teste integrado com o PostgreSQL real ainda é necessário.
- Dados locais antigos não são apagados automaticamente.
- Firebase Storage permanece fora do escopo desta etapa.
