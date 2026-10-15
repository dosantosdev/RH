## Etapa mais recente — Dashboard via API PostgreSQL

- O Dashboard consulta a identidade em `/api/me` e os dados de funcionários em `/api/employees`.
- Aniversariantes, alertas de exames periódicos e Turnover deixaram de ler diretamente a chave `employees` do `localStorage`.
- Os indicadores de funcionários são condicionados às permissões `employees_view` e `dashboard_birthdays`.
- Datas de exame periódico são normalizadas para o formato esperado pelos cálculos.
- Detalhes: `MIGRACAO-DASHBOARD-API-POSTGRES.md`.

## Etapa mais recente — cadastro de funcionários pela API PostgreSQL

- O cadastro atualiza os catálogos organizacionais antes da validação e envia as relações de filial, departamento, cargo e posição.
- O backend valida se os IDs organizacionais pertencem à empresa do usuário autenticado e bloqueia CPF/RG duplicados com HTTP 409.
- O cache local permanece temporariamente para compatibilidade; não foi limpo nem usado como fonte oficial.
- Procedimento de teste: `MIGRACAO-CADASTRO-FUNCIONARIOS-API-POSTGRES.md`.

## Etapa mais recente — perfil próprio pela API

- A tela Meu Perfil consulta `GET /api/me` e grava nome/usuário em `PATCH /api/me/profile`.
- O backend identifica o usuário e a empresa pelo token, exige `profile_edit` e não permite alterar senha ou perfil de acesso nesta rota.
- A sessão local é atualizada apenas como compatibilidade temporária.
- Detalhes e testes: `MIGRACAO-PERFIL-API-POSTGRES.md`.

# Status consolidado — PostgreSQL

## Etapa mais recente — catálogos organizacionais

- APIs de Filiais, Departamentos e Cargos atualizam o cache compatível após operações de CRUD.
- Sincronização autenticada dos catálogos de Filiais, Departamentos, Cargos e Posições para as chaves locais legadas.
- Telas consumidoras de Ponto, Candidatos e formulário de funcionário reagem a atualizações dos catálogos.
- Detalhes e limitações: `MIGRACAO-CATALOGO-ORGANIZACAO-CACHE.md`.

## Integrado à API/PostgreSQL
- Alteração de senha do próprio usuário pela API autenticada, com validação da senha atual e armazenamento exclusivo de hash bcrypt em `users.password_hash` (ver `MIGRACAO-ALTERACAO-SENHA-API.md`).

- Autenticação, sessão e usuários por serviços/rotas específicos.
- Funcionários e dependentes; campos complementares ainda preservados em `employees.registration_data` quando aplicável.
- Filiais, departamentos, cargos e posições pelas APIs específicas já existentes.
- Configurações, Chat, documentos/metadados e solicitações do funcionário.
- Ponte JSONB para Treinamentos, Avaliações, Recrutamento, Financeiro e estado geral compatível.
- Ponto separado em módulos de persistência por domínio (`timekeeping_clock`, `timekeeping_bank_hours`, `timekeeping_schedules`, `timekeeping_closings`, `timekeeping_medical`), com migração compatível do módulo legado `timekeeping`.
- Controle de permissão no backend para Treinamentos, Avaliações, Recrutamento e módulos financeiros. O agregado legado de Ponto exige permissão de controle central.

## Pendências decisivas antes de produção

- Executar `npm run build` e testes funcionais no ambiente Windows da usuária.
- Testar CRUD e isolamento entre empresas no PostgreSQL real.
- Migrar listas agregadas JSONB para tabelas/rotas de domínio e adicionar filtros por usuário nos portais de autoatendimento.
- Criar permissões granulares por domínio do Ponto; nesta etapa os módulos separados ainda exigem as permissões centrais `ponto_controle_view` e `ponto_controle_edit`.
- Criar fluxo seguro de persistência para tokens dos links públicos de candidatura.
- Executar importação assistida dos dados que ainda existam apenas no navegador.
- Integrar Firebase Storage na etapa final, sem incluir credenciais no pacote.

## Segurança do pacote

- `server/.env` não deve ser incluído nem substituído.
- Não apagar `localStorage` durante a migração.
- O PostgreSQL prevalece quando já existe a mesma chave; os dados locais permanecem preservados como cache/recuperação.
