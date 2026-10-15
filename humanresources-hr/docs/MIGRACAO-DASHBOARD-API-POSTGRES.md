# Migração — Dashboard para API PostgreSQL

## Alterações
- O Dashboard carrega a identidade do usuário autenticado com `GET /api/me`.
- Os funcionários usados nos indicadores são consultados em `GET /api/employees` e normalizados por `services/employeeApi.js`.
- Aniversariantes, alertas de exames periódicos e Turnover não leem mais a lista `employees` diretamente do `localStorage`.
- Os indicadores que expõem dados de funcionários são apresentados somente para usuários com `employees_view`; aniversariantes também exigem `dashboard_birthdays`.
- A foto pode continuar sendo exibida se já estiver presente no `registration_data` legado. A migração de arquivos para Firebase Storage continua pendente.
- Erros da API são apresentados no Dashboard/Turnover em vez de aparentar uma lista vazia como se não existissem registros.

## Testes manuais
1. Entrar com um usuário que possua `employees_view` e conferir a saudação, aniversariantes, exames periódicos e Turnover.
2. Conferir que a lista é atualizada após cadastrar ou editar funcionários no PostgreSQL e recarregar o Dashboard.
3. Testar dados com datas `DD/MM/YYYY` e `YYYY-MM-DD`, principalmente nascimento, admissão, desligamento e exame periódico.
4. Entrar com usuário sem `employees_view` e confirmar que os indicadores pessoais não fazem requisições à lista de funcionários.
5. Simular API indisponível e confirmar que a interface apresenta mensagem de erro.
6. Validar que o filtro por empresa continua aplicado pela API.

## Limitações
- O ESLint dos arquivos alterados foi executado sem erros; há três avisos de dependências de `useMemo` preexistentes no componente Turnover.
- O build Vite não foi concluído neste ambiente porque falta o binding nativo `@rolldown/binding-linux-x64-gnu`. Execute `npm install` no Windows e rode `npm run build`.
- Testes integrados com o PostgreSQL real ainda precisam ser executados.
- Não houve exclusão ou importação automática de dados do `localStorage`.
