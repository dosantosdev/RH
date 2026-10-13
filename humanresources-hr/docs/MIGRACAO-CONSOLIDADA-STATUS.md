# Status da migração PostgreSQL — Human Resources HR

## Migrações SQL existentes

- `001_init.sql`: estrutura inicial, incluindo `employee_dependents`.
- `002_chat.sql`: Chat.
- `003_settings.sql`: Configurações.
- `004_org_metadata.sql`: metadados adicionais do Organograma.

Não foi criada uma nova migração SQL nesta etapa, porque a tabela `employee_dependents` já existe em `001_init.sql`.

## Integrado à API/PostgreSQL

- Autenticação e usuários (integração existente nesta base).
- Settings e Chat (estrutura existente nesta base).
- Filiais, departamentos e cargos (integração existente nesta base).
- Busca, consulta, atualização e exclusão de funcionários (integração existente nesta base).
- Dependentes: cadastro/atualização dos dependentes durante criação/edição do funcionário e leitura no perfil. Os dependentes são persistidos em `employee_dependents`, com operações vinculadas ao funcionário da empresa autenticada.
- Os campos complementares do formulário de funcionário continuam preservados em `employees.registration_data` enquanto a migração individual desses campos não é concluída.

## Testes realizados neste pacote

- `node --check server/src/routes/employees.js`: passou.
- `node --check server/src/server.js`: passou.
- Não foi executado `npm run build` neste ambiente. Executar no computador de desenvolvimento.
- Não foi executado teste integrado contra o PostgreSQL local do usuário.

## Pendências

- Testar build e CRUD de funcionário/dependentes no ambiente local.
- Migrar outros campos complementares para tabelas normalizadas quando necessário, sem remover o conteúdo legado de `registration_data` antes da validação.
- Migrar treinamentos, certificados, avaliações/PDI, ponto, folha/financeiro, recrutamento e relatórios para a API.
- Criar ferramenta segura para importar registros que ainda existam apenas no `localStorage`, com conferência de duplicidades.

## Teste manual recomendado

1. Abrir um funcionário salvo no PostgreSQL.
2. Editar o perfil, marcar que possui dependentes e preencher nome, CPF, nascimento e RG de um dependente.
3. Salvar e recarregar a página.
4. Confirmar que o dependente continua aparecendo.
5. Editar ou remover o dependente e salvar novamente.
6. Confirmar que não há dependentes sendo alterados ao editar outro funcionário.
