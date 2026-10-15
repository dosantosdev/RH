# Migração — identidade da sessão na gestão de usuários

## Alteração
- A tela de gestão de usuários continua carregando, criando, editando e desativando contas por meio dos serviços da API.
- A prevenção de desativação da própria conta agora usa `getApiUser()` da sessão autenticada da API, em vez de interpretar diretamente a chave legada `loggedUser`.
- A verificação compara os IDs como strings, compatível com IDs UUID do PostgreSQL.
- Nenhum dado do navegador foi removido e nenhuma permissão de backend foi alterada nesta etapa.

## Testes manuais
1. Entrar pela API como administrador/usuário com permissões de gestão.
2. Abrir Gestão de Usuários e tentar desativar a própria conta: a interface deve bloquear a ação.
3. Desativar outro usuário de teste com permissão `users_delete`.
4. Confirmar que a lista continua sendo carregada pela API.

## Limitações
- A proteção da interface não substitui as permissões e validações do backend.
- Build completo e testes integrados no PostgreSQL real ainda precisam ser executados.
