# Migração — Perfis de acesso para API/PostgreSQL

## O que mudou

- A tela `src/pages/AccessRoles/AccessRoles.jsx` agora lista, cria, edita e exclui perfis usando a API autenticada `/api/access-roles`.
- Os perfis e suas permissões são gravados nas tabelas `access_roles`, `permissions` e `access_role_permissions`, com escopo de empresa derivado do token.
- O cache `accessRoles` é atualizado após uma resposta bem-sucedida para manter compatibilidade com componentes legados que ainda consultam esse catálogo.
- O backend valida as permissões enviadas, protege o perfil `admin` e impede excluir perfis vinculados a usuários.
- O login recusa autenticação de usuários cujo perfil de acesso esteja inativo.
- A migração SQL `008_complete_permission_catalog.sql` preenche permissões que existiam na interface, mas ainda não estavam cadastradas no PostgreSQL, incluindo permissões de Ponto, Perfil e Perfis de Acesso.

## Como aplicar

1. Faça backup do projeto e do banco.
2. Preserve `server/.env`.
3. Na pasta `server`, execute `npm run db:migrate`.
4. Reinicie a API e faça login com um usuário autorizado a administrar perfis.
5. Abra Configurações/Perfis de Acesso e teste listar, criar, editar e excluir um perfil de teste.

## Validação funcional necessária

- Confirmar que um perfil novo continua disponível após atualizar a página e reiniciar a API.
- Confirmar que a alteração de permissões afeta o próximo login do usuário vinculado.
- Confirmar que a API retorna `403` para usuários sem a permissão correspondente.
- Confirmar que o perfil `admin` não pode ser excluído nem perder seu nome, estado ativo ou acesso total.
- Confirmar que um perfil vinculado a usuários não pode ser excluído.

## Limitações

- As permissões contidas em um token já emitido permanecem válidas até expiração; faça novo login após alterar permissões de um perfil para validar o conjunto atualizado.
- O cache local permanece por compatibilidade e não deve ser tratado como fonte oficial.
- O build Vite não pôde ser executado neste ambiente porque o ZIP contém dependências nativas incompatíveis com Linux. É necessário validar no Windows de desenvolvimento.
