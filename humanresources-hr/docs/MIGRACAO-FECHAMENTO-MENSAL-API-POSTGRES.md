# Migração — leitura do Fechamento Mensal pela API PostgreSQL

## Implementado

- Criado `GET /api/me/timekeeping/closing-data`, protegido por `ponto_fechamento_view`.
- O backend valida o período (1 a 367 dias), limita funcionários e registros à empresa da sessão e converte IDs legados de funcionários para os IDs canônicos do PostgreSQL.
- A tela Fechamento Mensal deixou de usar `getEmployees()` e o cache de filiais como fonte inicial dos dados de cálculo.
- A apuração de horas utiliza registros de ponto e jornadas retornados pela API, passados explicitamente a `calculateTimeClockPeriod`.
- IDs de funcionários e filiais são comparados como strings, compatíveis com UUIDs do PostgreSQL.
- A tela apresenta estado de carregamento e erro e impede iniciar/fechar operações enquanto os dados da competência não foram carregados.
- O usuário que fecha a competência é obtido da sessão da API, sem leitura direta de `loggedUser` no localStorage.

## Limitações

- O estado do fechamento (aberto, em conferência, fechado) continua usando o serviço compatível de `monthlyClosing`, cuja persistência é enviada pela ponte existente para `timekeeping_closings`.
- O payload ainda usa JSONB em `app_records`. A validação funcional deve ser executada com PostgreSQL real e perfis distintos, incluindo um usuário sem `ponto_fechamento_view`.
- A tela não deve ser considerada totalmente migrada até testar criar, revisar, fechar e reabrir uma competência.

## Testes recomendados

1. Abrir uma competência e comparar totais com as marcações e jornadas cadastradas no PostgreSQL.
2. Alterar a competência e verificar que os dados são recarregados.
3. Criar/iniciar conferência/fechar/reabrir e confirmar persistência após recarregar.
4. Tentar acessar com perfil sem `ponto_fechamento_view` e confirmar HTTP 403.
