# Migração — identificação do funcionário na navegação

## Alterações
- `Navbar.jsx` consulta `GET /api/me` pela sessão autenticada para obter o nome e o vínculo do funcionário.
- A barra de navegação deixou de procurar o funcionário na chave `employees` do `localStorage`.
- Em caso de indisponibilidade da API, a navegação permanece renderizada com o nome público da sessão como fallback.
- A foto continua usando o campo de sessão já disponível; migração de arquivos para Firebase Storage permanece pendente.
- Nenhum dado local é apagado.

## Testes manuais
1. Entrar com um usuário vinculado a um funcionário e conferir o nome na barra.
2. Alterar o nome do funcionário no PostgreSQL e recarregar a aplicação para confirmar a atualização.
3. Entrar com usuário sem funcionário vinculado e conferir o fallback para o nome do usuário.
4. Simular indisponibilidade da API e confirmar que a barra continua utilizável.
5. Confirmar que `Navbar.jsx` não consulta a chave local `employees`.

## Limitações
- A alteração remove somente a dependência da lista local para o nome/vínculo na navegação.
- A sessão local continua existindo para compatibilidade com o mecanismo de autenticação e permissões legado.
- Build completo e testes integrados com PostgreSQL real devem ser executados no ambiente Windows.
