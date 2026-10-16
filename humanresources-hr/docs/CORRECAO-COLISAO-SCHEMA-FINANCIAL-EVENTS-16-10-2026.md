# Correção da colisão de schema — `financial_events`

## Problema identificado

A migration `001_init.sql` já cria uma tabela `financial_events` para lançamentos transacionais, com colunas como `employee_id`, `competence`, `type`, `description`, `amount` e `data`. A migration `010_financial_events_normalized.sql` tentava criar a tabela de catálogo usando o mesmo nome, com colunas como `external_id`, `event_type`, `calculation_type` e `active`.

Em PostgreSQL, `CREATE TABLE IF NOT EXISTS` não altera uma tabela que já existe. Em uma instalação nova, a criação dos índices da migration 010 falharia porque `event_type` não existiria. Isso impedia a sequência financeira de avançar de forma confiável.

## Correção aplicada

- A migration 010 verifica o schema existente antes de criar o catálogo.
- Se encontrar a tabela antiga sem `event_type`, renomeia-a para `financial_event_transactions`, preservando seus dados.
- Em seguida, cria `financial_events` com o schema do catálogo.
- A migration 015 repete a reparação para instalações nas quais a migration 010 já tenha sido registrada anteriormente e, por isso, não será executada novamente pelo runner.
- A importação do catálogo legado permanece idempotente e não apaga `app_records`.
- Se o nome de destino `financial_event_transactions` já existir ao mesmo tempo que a tabela antiga incompatível, a migration para com erro explícito em vez de sobrescrever dados.

## Validação

Verificações estáticas realizadas em 16/10/2026:

- `npm run lint`: 0 erros e 12 avisos de dependências de hooks.
- `node --check` em todos os arquivos JS do backend: sem erros.
- Parser Babel em 163 arquivos JS/JSX de frontend e backend: sem erros de sintaxe.
- Build Vite: continua bloqueado neste ambiente pela ausência de `@rolldown/binding-linux-x64-gnu`.
- PostgreSQL real: não disponível nesta sessão; as migrations 010–015 ainda precisam ser executadas em banco de teste antes de considerar a correção validada.

## Aplicação segura

1. Fazer backup do banco.
2. Executar `npm run db:migrate` na pasta `server/` em ambiente de teste.
3. Conferir a existência de `financial_event_transactions` (se havia a tabela antiga), `financial_events`, seus índices e gatilhos.
4. Comparar a quantidade de eventos importados com o array legado em `app_records`.
5. Testar listagem, cadastro, edição, ativação/inativação e exclusão com duas empresas e perfis distintos.

Não remover `financial_event_transactions` nem os dados legados durante esta etapa.
