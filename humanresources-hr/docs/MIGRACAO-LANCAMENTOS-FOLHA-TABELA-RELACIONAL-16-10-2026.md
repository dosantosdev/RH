# Migração dos lançamentos da Folha para tabela relacional — 16/10/2026

## O que mudou

- Criada a tabela `payroll_item_entries`, uma linha por provento ou desconto lançado para um funcionário dentro de uma folha.
- Criada a migração `server/sql/013_payroll_item_entries_normalized.sql`, que importa os arrays `earnings` e `deductions` existentes em `payroll_items.data`.
- A importação é idempotente, preserva o JSONB original e não remove os registros de `app_records`.
- A API `/api/payrolls` grava os lançamentos em linhas próprias dentro da mesma transação que grava a folha e os itens dos funcionários.
- A leitura recompõe `earnings` e `deductions` a partir das linhas relacionais, mantendo o contrato que a interface já utiliza.
- Valores de lançamento acima de R$ 1.000.000.000 ou inválidos são rejeitados pela validação da API.

## Compatibilidade e segurança

- Os IDs originais dos lançamentos permanecem no `payload`; `external_id` recebe um sufixo de ordenação para permitir itens repetidos sem colisão.
- `payroll_items.data` e a origem agregada em `app_records` permanecem como cópias de compatibilidade/recuperação nesta fase.
- As gravações usam a transação e o bloqueio já existentes na rota de Folha; se uma operação falhar, folha, itens e lançamentos sofrem rollback em conjunto.
- A migração deve ser executada após backup do banco com `npm run db:migrate` dentro de `server/`.

## Validações desta entrega

- Sintaxe JavaScript do backend validada com `node --check`.
- A sintaxe JSX da aplicação e o lint direcionado devem ser executados no ambiente do projeto; o build de produção depende do binding nativo do Rolldown compatível com o sistema operacional.
- Não foi possível confirmar a migração em PostgreSQL real nesta sessão. Antes de considerar o módulo pronto para produção, validar contagens importadas, múltiplas empresas, perfis de permissão, fechar/reabrir folha, adicionar/remover lançamentos e persistência após novo login.

## Limitações conhecidas

- A folha e seus itens ainda guardam propriedades complementares em JSONB para compatibilidade.
- O cálculo legal de INSS/IRRF e a validação de todos os totais ainda precisam ser consolidados e testados no servidor antes do fechamento final da migração.
