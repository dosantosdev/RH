# Migração — alteração de senha pela API

## O que mudou

- A tela `ChangePassword` agora chama `POST /api/auth/change-password`.
- O backend autentica a requisição com o token da sessão e identifica o usuário/empresa pelo token; o cliente não escolhe o usuário que será alterado.
- A senha atual é validada usando `bcrypt.compare`.
- A nova senha exige pelo menos 8 caracteres e precisa ser diferente da atual.
- O backend armazena somente o hash gerado por `bcrypt.hash` (12 rounds) em `users.password_hash`.
- A tela não compara nem grava senhas no `localStorage` e exibe os erros retornados pela API.
- Nenhuma migração SQL é necessária: o endpoint utiliza a coluna `users.password_hash` existente.

## Como validar

1. Inicie o PostgreSQL e o backend com as configurações locais.
2. Entre com um usuário de teste.
3. Tente alterar a senha com senha atual incorreta; a API deve rejeitar a solicitação.
4. Tente uma nova senha com menos de 8 caracteres; a API deve rejeitar a solicitação.
5. Altere para uma senha válida e confirme a mensagem de sucesso.
6. Saia e entre novamente usando a nova senha; confirme que a senha antiga deixou de funcionar.
7. Verifique que a tela não adiciona a senha a `loggedUser`, `currentUser` nem à lista `users` do `localStorage`.

## Limites da validação desta revisão

- Sintaxe dos arquivos JavaScript do servidor verificada com `node --check`.
- ESLint executado no componente `ChangePassword`.
- Build Vite não pôde ser concluído neste ambiente porque o pacote do ZIP não contém o binding nativo Linux do Rolldown/Vite. O build deve ser executado no ambiente Windows de desenvolvimento.
- Não foi feita conexão ao PostgreSQL real nesta sessão; os fluxos de senha precisam ser testados localmente.

