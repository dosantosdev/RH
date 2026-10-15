# Migração inicial de Salários para API PostgreSQL

## O que mudou nesta etapa

- Foi adicionada a rota autenticada `GET /api/me/financial-data`.
- A rota identifica a empresa pelo token, não aceita `companyId` do cliente e só devolve os módulos financeiros permitidos ao usuário.
- Os dados de funcionários são retornados somente quando o usuário tem acesso a Salários, Folha ou Gestão Financeira avançada; a resposta usa campos limitados e não inclui CPF.
- A tela `Salarios.jsx` consulta a API antes de considerar os dados carregados e atualiza o cache de compatibilidade com o histórico retornado pelo PostgreSQL.
- Se a API falhar, a tela exibe um aviso explícito de que o cache pode estar desatualizado.
- A identidade de quem registra uma alteração salarial passa a vir de `getApiUser()`, não da sessão legada `loggedUser`.
- A comparação entre IDs de funcionários no serviço de salários agora aceita UUIDs do PostgreSQL, evitando que `Number(UUID)` impeça a associação do histórico ao funcionário.

## Segurança e compatibilidade

- A rota verifica permissões específicas para cada módulo: `finance_salary_view/manage`, `finance_payroll_view/manage`, `finance_events_view/manage` e `finance_advanced_view/manage`.
- Os dados continuam compatíveis com os serviços síncronos existentes. A gravação de alterações salariais ainda passa pelo mecanismo de compatibilidade `app_records`/JSONB, não por CRUD relacional dedicado.
- O cache local não é apagado automaticamente.
- O usuário precisa ter permissão `finance_salary_view` para abrir a tela; a API reforça essa permissão no servidor.

## Validação realizada

- Sintaxe do backend verificada com `node --check`.
- Build do frontend e parse JSX verificados quando o ambiente fornecido permite.
- A integração real com PostgreSQL e os testes de autorização por perfis diferentes ainda precisam ser executados no ambiente da aplicação.

## Próximos passos

1. Migrar as telas de Folha e Proventos/Descontos para carregamento assíncrono da API.
2. Migrar as operações de gravação para fluxos assíncronos que aguardem confirmação do servidor.
3. Rever Gestão Financeira avançada e os cálculos que dependem de dados de Ponto.
4. Planejar a normalização dos módulos financeiros em tabelas relacionais e realizar testes integrados.
