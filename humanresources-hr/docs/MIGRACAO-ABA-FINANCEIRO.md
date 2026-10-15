# Migração da aba Financeiro para PostgreSQL — etapa de persistência protegida

## Escopo desta etapa

As listas locais do Financeiro passam a sincronizar em módulos próprios da API autenticada `/api/app-records`, sem misturar dados financeiros ao estado genérico da aplicação:

- `salaryHistory` → módulo `salaries`;
- `payrolls` → módulo `payroll`;
- `financialEvents` → módulo `financial_events`;
- `financialVacations`, `financialThirteenths` e `financialTerminations` → módulo `financial_advanced`.

## Controle de acesso

A rota genérica agora aplica autorização no backend para esses quatro módulos. Leitura exige, respectivamente, `finance_salary_view`, `finance_payroll_view`, `finance_events_view` ou `finance_advanced_view`. Escrita e exclusão exigem a permissão de gerenciamento correspondente. Administradores continuam com acesso total. O frontend não é usado como barreira de segurança.

A sincronização só consulta módulos para os quais o usuário autenticado tenha permissão de leitura/gerenciamento. Usuários somente de leitura recebem o conteúdo do banco, mas não enviam alterações locais.

## Compatibilidade e preservação

- Os componentes e serviços síncronos existentes continuam usando `localStorage` como cache temporário.
- Nenhuma chave local é apagada automaticamente.
- Chaves financeiras deixam de ser sincronizadas pelo módulo genérico `client_state`.
- A migração usa `app_records`/JSONB como etapa de compatibilidade; não substitui as tabelas relacionais de folha/eventos financeiros existentes no schema.
- Dados financeiros existentes no navegador são enviados somente por usuários com permissão de gerenciamento.

## Aplicação e validação

1. Preserve `server/.env` e faça backup do banco.
2. Na pasta `server`, execute `npm run db:migrate` se houver migrações pendentes; esta etapa não adiciona uma nova migração SQL.
3. Reinicie o backend e saia/entre novamente para renovar o token com as permissões atuais.
4. Teste com perfis que tenham leitura, gerenciamento e sem permissão em cada módulo financeiro.
5. Confirme que usuário sem permissão recebe HTTP 403 no backend, mesmo acessando a API diretamente.
6. Com um perfil autorizado, teste salário, eventos financeiros, folha e eventos avançados; recarregue a página e confirme a persistência.

## Limitações

- O build e a integração real com o PostgreSQL precisam ser executados no ambiente de desenvolvimento.
- A estrutura permanece em JSONB nesta etapa; a conversão das telas para CRUD assíncrono nas tabelas relacionais de domínio será uma etapa posterior.
- Usuários antigos cujo token não contenha as permissões financeiras devem sair e entrar novamente.
