# Migração — Bater Ponto para API/PostgreSQL

## O que mudou
- `GET /api/me/timekeeping/today` obtém o funcionário vinculado pelo token e retorna somente a marcação do próprio funcionário para a data atual.
- `POST /api/me/timekeeping/punch` registra a próxima batida no backend, exige `ponto_bater` (ou administrador), usa data/hora do servidor no fuso `America/Sao_Paulo` e não aceita `employeeId` do cliente.
- As atualizações do conjunto legado `timeClockRecords` são serializadas por bloqueio transacional advisory para reduzir o risco de sobrescrita concorrente.
- A tela Bater Ponto passou a carregar funcionário/registro e gravar batidas pela API, em vez de consultar diretamente `loggedUser`, `employees` e salvar batidas pelo serviço local.

## Testes manuais necessários
1. Iniciar PostgreSQL e backend com `server/.env` configurado.
2. Entrar com usuário vinculado a funcionário ativo e com permissão `ponto_bater`.
3. Abrir Bater Ponto e confirmar nome, vínculo e batida do dia carregados pela API.
4. Registrar entrada, atualizar a página e confirmar que a entrada continua presente.
5. Registrar as batidas seguintes na ordem: início de intervalo, retorno e saída.
6. Tentar registrar uma quinta batida; a API deve responder HTTP 409.
7. Testar usuário sem permissão e usuário sem vínculo; nenhuma batida deve ser gravada.
8. Confirmar que a rota não aceita employeeId enviado pelo navegador e retorna apenas o registro associado ao funcionário autenticado.

## Compatibilidade e limitações
- O armazenamento ainda usa o payload JSONB agregado `app_records` no módulo `timekeeping_clock`; tabelas relacionais específicas de batidas continuam pendentes.
- A rota lê o módulo legado `timekeeping` e o módulo dedicado `timekeeping_clock`, combina os registros sem apagar o legado e grava novas batidas no módulo `timekeeping_clock`.
- Registros antigos só serão associados automaticamente quando o `employeeId` salvo coincidir com o UUID do funcionário ou com `legacyId`, `legacy_id` ou `id` em `registration_data`. Dados que usem outro identificador legado precisam de uma importação/mapeamento explícito; não são apagados.
- O espelho mensal e os relatórios de Ponto ainda usam os serviços locais e precisam de uma etapa própria.
- O build completo e o teste integrado com o banco real ainda não foram executados neste ambiente.
- Firebase Storage continua fora do escopo desta etapa.
