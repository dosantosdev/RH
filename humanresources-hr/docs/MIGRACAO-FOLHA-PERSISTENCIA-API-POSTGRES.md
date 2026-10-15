# Folha de Pagamento — mutações pela API PostgreSQL

Data: 15/10/2026

## O que mudou

- Criada a rota autenticada `server/src/routes/payrolls.js`, registrada em `/api/payrolls`.
- A tela `src/pages/Financeiro/Folha/Folha.jsx` carrega as folhas pelo endpoint dedicado `GET /api/payrolls`.
- Criar, editar/recalcular, incluir/remover proventos e descontos, fechar, reabrir e excluir folha passam por endpoints dedicados.
- As operações de escrita exigem `finance_payroll_manage`; a leitura exige `finance_payroll_view` ou `finance_payroll_manage`. Administradores continuam autorizados pela regra de permissões do servidor.
- O escopo da empresa vem da sessão autenticada. O servidor valida competência, status, valores básicos e vínculos de funcionários à empresa.
- As mutações são serializadas por empresa com advisory lock transacional e `SELECT ... FOR UPDATE` no registro agregado. Para edição, fechamento, reabertura e exclusão, a versão `updatedAt` é comparada; uma edição concorrente desatualizada recebe HTTP 409.
- A tela restaura o cache local se a API recusar a operação e só apresenta sucesso após a confirmação do servidor.
- A gravação do cache `payrolls` foi excluída da ponte genérica de `app_records` para evitar que um debounce legado sobrescreva uma operação concluída pela rota dedicada.

## Limite conhecido

A persistência ainda é uma lista agregada em JSONB (`app_records`, módulo `payroll`, chave `payrolls`). Esta etapa estabelece contratos de domínio e controle transacional, mas não normaliza cada folha e seus itens em tabelas relacionais próprias. Essa normalização e uma estratégia de importação idempotente continuam pendentes.

Os cálculos permanecem no serviço existente do frontend. Os endpoints validam o estado e as transições, mas ainda não recalculam todos os valores financeiros no servidor. Não tratar esta entrega como validação contábil/legal da folha.

## Validações feitas nesta etapa

- `node --check` para a rota nova e o registro no servidor.
- Parser Babel para validar JSX da tela.
- ESLint direcionado à tela e ao serviço de cache.
- Build completo e testes integrados com PostgreSQL real continuam pendentes neste ambiente.

## Testes necessários antes de produção

1. Criar uma folha e atualizar a página para confirmar persistência.
2. Tentar criar uma segunda folha para a mesma competência e confirmar HTTP 409.
3. Alterar/recalcular uma folha em aberto e confirmar persistência.
4. Tentar editar uma folha fechada e confirmar HTTP 409.
5. Fechar e reabrir uma folha e confirmar histórico e status após novo login.
6. Tentar operar com usuário sem `finance_payroll_manage` e confirmar HTTP 403.
7. Tentar usar funcionário de outra empresa e confirmar rejeição.
8. Simular duas sessões alterando a mesma versão e confirmar que a segunda operação desatualizada recebe HTTP 409.
9. Confirmar que não existe gravação genérica paralela em `/api/app-records/payroll/payrolls` originada pelas mutações desta tela.
