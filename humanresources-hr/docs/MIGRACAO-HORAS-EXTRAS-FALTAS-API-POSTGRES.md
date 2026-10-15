# Migração de Horas Extras e Faltas/Atrasos para API PostgreSQL

## O que mudou

- `HorasExtras.jsx` agora carrega funcionários, filiais, marcações e jornadas de `GET /api/me/timekeeping/overtime-data`.
- `FaltasAtrasos.jsx` agora carrega os mesmos dados e os atestados aprovados de `GET /api/me/timekeeping/absence-data`.
- As telas não usam mais `getEmployees()`, `useOrganizationCache()` nem a consulta local de atestados como fonte para a apuração.
- A apuração passa explicitamente os dados recebidos à função `calculateTimeClockPeriod`, mantendo as regras atuais de jornada, feriados, saldo e ocorrências.
- Os filtros e os detalhes comparam identificadores como texto, compatível com UUIDs do PostgreSQL e IDs legados.
- Ambas as telas apresentam estados de carregamento e erro e rejeitam períodos inválidos ou superiores a 367 dias.

## Segurança das rotas

- `GET /api/me/timekeeping/overtime-data` exige `ponto_horas_extras_view` e não inclui atestados na resposta.
- `GET /api/me/timekeeping/absence-data` exige `ponto_faltas_view` e inclui somente atestados com período sobreposto ao intervalo consultado.
- A empresa é obtida da sessão autenticada no servidor; o cliente não informa `company_id`.
- IDs de funcionários legados são normalizados para o ID atual antes de devolver marcações, escalas e atestados.

## Persistência e limitações

Esta etapa migra a **leitura usada pelas apurações** para a API. Os registros de ponto, jornadas e atestados ainda são armazenados em listas JSONB de `app_records` por meio da camada de compatibilidade. Isso não equivale à normalização relacional completa e não migra as mutações destas telas para endpoints próprios.

## Validação executada

- `node --check server/src/routes/me.js`.
- ESLint direcionado aos dois componentes React e à rota `server/src/routes/me.js`.
- Verificação de sintaxe JSX/JavaScript com parser Babel.
- O build Vite foi tentado, mas não concluiu: o `node_modules` que veio no ZIP não contém o binding nativo opcional `@rolldown/binding-linux-x64-gnu`. Reinstale as dependências com `npm install`/`npm ci` no ambiente de desenvolvimento e execute `npm run build`.
- Não foi possível validar as rotas contra o PostgreSQL real nesta sessão. Ainda precisam ser testados login, permissões 403, isolamento entre empresas, UUIDs, dados vazios e períodos com atestados.

## Teste manual recomendado

1. Entre com um perfil que tenha `ponto_horas_extras_view` e confira que Horas Extras carrega dados sem precisar de `ponto_controle_view`.
2. Remova essa permissão e confirme que a API responde 403.
3. Repita para Faltas e Atrasos com `ponto_faltas_view`.
4. Confirme que atestados aprovados justificam ausências apenas dentro das datas cobertas e que a tela de Horas Extras não recebe a lista de atestados.
5. Troque o período, filtre por filial e funcionário e atualize a página para verificar que os dados continuam vindo da API.
