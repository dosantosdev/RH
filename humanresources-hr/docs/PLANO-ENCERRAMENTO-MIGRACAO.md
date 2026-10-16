# Plano de encerramento da migração — revisão de 16/10/2026

Este documento substitui a avaliação vaga de “falta migrar mais telas” por critérios de conclusão verificáveis. Uma tela não é considerada migrada apenas por ler dados da API: precisa concluir o ciclo de leitura e escrita, validar permissões no servidor, preservar dados antigos e passar pelos testes aplicáveis.

## Critério de conclusão por domínio

Um domínio só passa para **concluído** quando:

- [ ] leitura vem da API autenticada e do banco;
- [ ] criar/editar/ativar/excluir ou as mutações aplicáveis aguardam confirmação do servidor;
- [ ] permissões são validadas no backend, com escopo da empresa obtido do token;
- [ ] falhas não são exibidas como sucesso e não apagam o cache legado;
- [ ] atualização da página confirma persistência;
- [ ] teste de isolamento entre empresas e perfis de acesso foi executado;
- [ ] a solução não depende de uma gravação genérica de lista inteira sem controle de concorrência, salvo como etapa temporária documentada.

## Macroetapas

| Macroetapa | Estado em 16/10/2026 | Critério para fechar |
|---|---|---|
| 1. Sessão, usuários, permissões e dados organizacionais | Em grande parte implementada; testes reais pendentes | Fluxos principais e 403 validados no banco real |
| 2. Leitura dos principais domínios pela API | Ampla cobertura implementada | Auditoria confirma ausência de leituras diretas críticas do localStorage |
| 3. Escritas de domínio pela API | Em andamento | Cada domínio possui mutações autenticadas, confirmadas e testadas |
| 4. Sair da ponte genérica JSONB/localStorage | Pendente em vários domínios | Tabelas/rotas de domínio e importação legada idempotente, sem depender de listas agregadas |
| 5. Testes de integração e build de produção | Pendente | Build completo e testes com PostgreSQL, perfis e múltiplas empresas aprovados |
| 6. Firebase Storage | Reservado para a última etapa | Migração e validação de documentos/binários após estabilizar banco e permissões |


## Evidência adicional de 16/10/2026 — Histórico salarial normalizado

O histórico salarial foi migrado de `app_records(salaries, salaryHistory)` para `salary_history`, com importação idempotente, preservação da cópia JSONB antiga, endpoints dedicados CRUD, bloqueio por empresa e leitura relacional também em `/api/me/financial-data`. A ponte genérica do frontend e as rotas genéricas de `app_records` foram impedidas de gravar novamente essa chave. A validação no PostgreSQL real, o build e os testes integrados continuam pendentes; portanto, o domínio ainda não deve ser marcado como aprovado para produção. Consulte `docs/MIGRACAO-SALARIOS-TABELA-RELACIONAL.md`.

## Evidência adicional de 15/10/2026 — Proventos e Descontos normalizados

O catálogo financeiro foi migrado de uma lista agregada JSONB para a tabela `financial_events`, com cópia idempotente dos dados antigos e bloqueio da ponte genérica para a chave correspondente. O endpoint mantém compatibilidade com a tela, mas persiste uma linha por evento. A validação SQL e funcional no PostgreSQL real continua pendente; por isso, este domínio ainda não deve ser considerado aprovado para produção. Consulte `docs/MIGRACAO-PROVENTOS-DESCONTOS-TABELA-RELACIONAL.md`.

## Evidência da entrega de 15/10/2026 — Folha de Pagamento

A Folha de Pagamento passou a usar endpoints dedicados para consultar e executar as mutações principais. As gravações são serializadas por empresa com lock transacional; operações com versão desatualizada recebem conflito, e o cache local é restaurado se a API falhar. A ponte genérica de escrita foi suprimida para a chave `payrolls` nesta tela, evitando que uma gravação atrasada sobrescreva a mutação dedicada. A persistência ainda é agregada em JSONB, os cálculos continuam no frontend e testes PostgreSQL reais permanecem pendentes. Detalhes em `docs/MIGRACAO-FOLHA-PERSISTENCIA-API-POSTGRES.md`.

## Evidência anterior

Proventos e Descontos agora usa `GET/PUT /api/financial-events`, com validação no servidor e atualização do cache somente depois da confirmação do PostgreSQL. Isso fecha o ciclo de API da tela, mas o catálogo ainda é uma lista JSONB agregada em `app_records` e não há teste de integração real nesta sessão. Por esse motivo, a tela está **migrada no fluxo de API, mas não concluída para produção**.

## Regra para o progresso numérico

A nota global só sobe quando uma macroetapa ou um domínio passa critérios verificáveis. Pequenas migrações de leitura não devem, sozinhas, inflar a nota. A avaliação de 6/10 feita anteriormente ficou repetida porque usava uma estimativa ampla sem mostrar os critérios que ainda impediam o encerramento. Após a migração do ciclo de mutações da Folha de Pagamento, a estimativa é **7/10**. O avanço se deve a operações dedicadas com controle de versão e transações, não apenas à leitura pela API. Normalização em tabelas próprias, validação dos cálculos no servidor e testes integrados continuam sendo pendências substanciais.

## Próxima sequência, sem repetir etapas já feitas

1. **Salários:** tabela `salary_history` e endpoints CRUD relacionais implementados; falta executar a migração e validar em PostgreSQL real.
2. **Folha de Pagamento:** endpoints dedicados de leitura e mutação implementados; faltam normalização, cálculos validados no servidor e testes reais.
3. **Proventos e Descontos:** tabela própria e persistência relacional implementadas nesta revisão; falta validar no PostgreSQL real e, depois, trocar o PUT de lista por operações CRUD por evento.
4. **Financeiro Avançado:** auditar férias, 13º e rescisões por CRUD completo.
5. **Inventário fechado:** auditar leituras/gravações restantes em `localStorage` e `app_records`, distinguindo cache temporário de fonte oficial.
6. **Validação final:** executar build, testes de API e integração no PostgreSQL real; corrigir falhas.
7. Integrar Firebase Storage por último.
