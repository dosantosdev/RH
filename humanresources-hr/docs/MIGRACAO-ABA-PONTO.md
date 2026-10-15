# Migração da aba Ponto para PostgreSQL

## Escopo desta etapa
Esta etapa separa as chaves persistidas pelas funcionalidades de Ponto em um módulo próprio (`timekeeping`) da API `/api/app-records`, usando a tabela `app_records` existente e o escopo da empresa associado ao token autenticado.

Chaves incluídas:
- `timeClockRecords`: batidas de ponto.
- `bankHoursEntries`: lançamentos de banco de horas.
- `workSchedules`: jornadas e escalas cadastradas.
- `employeeWorkSchedules`: vínculos de jornada por funcionário.
- `monthlyClosings`: registros de fechamento mensal.

## Comportamento
- A sincronização é iniciada junto com as outras sincronizações autenticadas da aplicação.
- Se a chave já existir no PostgreSQL, o payload do banco é carregado para o cache local.
- Se existir apenas no navegador, o payload é enviado ao PostgreSQL.
- As funções síncronas existentes continuam usando o cache local para evitar quebrar as telas atuais.
- A ponte de gravação encaminha futuras alterações dessas chaves para o módulo `timekeeping`.
- Não há exclusão automática do conteúdo local durante a sincronização.

## Aplicação
Não há nova migração SQL nesta etapa porque a tabela `app_records` já é usada pelas etapas anteriores. Preserve `server/.env`, instale dependências apenas se necessário e execute o frontend e backend normalmente.

## Limitações e validação
Esta é uma migração de persistência/sincronização para PostgreSQL com cache local de compatibilidade, não uma conversão das funcionalidades de Ponto para tabelas relacionais específicas. É necessário testar no ambiente da aplicação: batidas, jornadas, banco de horas, fechamento mensal, atualização da página e perfis de acesso. A sincronização depende de token válido e da rota `app-records` estar disponível.
