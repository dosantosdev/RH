# Migração — Financeiro Avançado para API e persistência relacional

## Escopo

- Criada a tabela `financial_advanced_records` por empresa, tipo e identificador externo.
- Criada a migração `server/sql/014_financial_advanced_relational.sql`, com importação idempotente de férias, 13º e rescisões de `app_records`.
- Criada a API autenticada `/api/financial-advanced/:collection` para listar, criar, editar, excluir e importar registros legados.
- O backend exige `finance_advanced_view` para leitura e `finance_advanced_manage` para mutações; a empresa vem do token. IDs de funcionários são resolvidos dentro da empresa.
- A tela `GestaoFinanceira.jsx` carrega os três conjuntos pela API, aguarda a confirmação do servidor nas gravações e mostra uma ação explícita para importar registros locais que ainda não estejam confirmados no banco.
- A ponte genérica `app_records` não deve mais ler/gravar os três registros agregados como fonte oficial. O cache local é preservado para compatibilidade e relatórios legados.

## Estrutura

A tabela guarda colunas relacionais para `company_id`, `record_type`, `external_id`, `employee_id`, `employee_external_id`, `record_date`, `status` e auditoria. O campo `payload` continua existindo temporariamente para preservar os campos completos que a interface usa. Isso representa migração de persistência agregada para linhas por registro, mas ainda não é normalização de todos os campos financeiros.

## Validação recomendada

1. Fazer backup do PostgreSQL.
2. Executar `npm run db:migrate` na pasta `server/`.
3. Confirmar a contagem por tipo antes/depois da importação e inspecionar registros cujo funcionário legado não pôde ser associado.
4. Testar consulta com `finance_advanced_view`, gravação com `finance_advanced_manage` e resposta HTTP 403 sem essas permissões.
5. Testar funcionário inexistente/de outra empresa (HTTP 400), ID duplicado (HTTP 409), edição e exclusão.
6. Confirmar que registros permanecem após atualizar a página e entrar novamente.
7. Confirmar que a importação assistida não duplica registros nem apaga dados locais.

## Limitações conhecidas

- A migração SQL não foi executada em um PostgreSQL real nesta sessão.
- Os cálculos de férias, 13º e rescisão continuam no frontend e ainda precisam de validação legal/contábil antes de serem usados como cálculo oficial de folha.
- `payload` JSONB permanece como envelope temporário de compatibilidade.
- O build de produção e os testes integrados continuam pendentes porque o ambiente atual não possui o binding Linux do Rolldown.

## Validações estáticas desta entrega

- `node --check` executado em todos os arquivos JavaScript de `server/src`.
- Parser Babel validou a sintaxe dos arquivos JavaScript/JSX alterados.
- ESLint dos arquivos desta etapa passou sem erros.
- ESLint global ainda apresenta 20 erros e 14 avisos preexistentes em arquivos de outros módulos; a lista completa deve ser revisada antes de declarar a qualidade global aprovada.
- O build Vite não concluiu: o ambiente está com `rolldown` versão `1.0.0-rc.15`, mas falta o binding nativo `@rolldown/binding-linux-x64-gnu`. A tentativa de instalar a dependência no ambiente excedeu o tempo limite.
- Não há PostgreSQL local disponível nesta sessão; a migração 014 e os fluxos HTTP ainda precisam ser executados e testados no banco real.
