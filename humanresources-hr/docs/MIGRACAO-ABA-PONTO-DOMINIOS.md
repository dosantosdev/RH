# Migração da aba Ponto — separação por domínio

## Alteração desta etapa

As chaves de Ponto deixam de gravar novos dados no agregado único `timekeeping` e passam a usar módulos separados na API autenticada `/api/app-records`:

- `timeClockRecords` → `timekeeping_clock`;
- `bankHoursEntries` → `timekeeping_bank_hours`;
- `workSchedules` e `employeeWorkSchedules` → `timekeeping_schedules`;
- `monthlyClosings` → `timekeeping_closings`;
- `medicalCertificates` → `timekeeping_medical`.

A tabela `app_records` e o escopo de empresa derivado do token continuam sendo utilizados. Não é necessária uma nova migração SQL para criar esses módulos, pois eles são valores de `module_key`, não tabelas novas.

## Compatibilidade e preservação dos dados antigos

Na primeira sincronização, a aplicação consulta o módulo legado `timekeeping`. Para cada chave:
1. Se o módulo novo já tiver o registro, o PostgreSQL novo prevalece.
2. Se ainda não tiver, mas o módulo antigo tiver, o conteúdo é copiado para o módulo específico.
3. Se não existir no banco, o valor local é enviado ao módulo específico.
4. O conteúdo antigo e o `localStorage` não são apagados automaticamente.

A cópia é idempotente e pode ser repetida. Não remova os registros antigos manualmente antes de validar a migração.

## Permissões

Os módulos separados continuam exigindo `ponto_controle_view` para leitura e `ponto_controle_edit` para escrita, inclusive no backend. Esta etapa separa os dados por domínio, mas ainda não cria permissões individuais para espelho, escalas, banco de horas, fechamento ou atestados.

## Como testar

1. Faça backup do projeto e do banco; preserve `server/.env`.
2. Extraia o ZIP e reinicie o backend.
3. Na pasta raiz, execute `npm run build`.
4. Entre com um usuário que possua acesso ao controle de ponto.
5. Abra Bater Ponto, Jornadas e Escalas, Banco de Horas, Atestados, Fechamento Mensal, Horas Extras, Faltas e Atrasos e Relatórios.
6. Crie ou edite um registro de teste, atualize a página e confirme que os dados permanecem.
7. Verifique na tabela `app_records` que as chaves foram copiadas para os módulos correspondentes.
8. Teste com um usuário sem `ponto_controle_view` e confirme que a API retorna `403`; teste gravação sem `ponto_controle_edit` e confirme que também é bloqueada.

## Limites restantes

- As telas ainda mantêm o contrato síncrono de `localStorage` como cache de compatibilidade.
- O banco utiliza `app_records`/JSONB; esta etapa não cria tabelas relacionais próprias para cada domínio de Ponto.
- A separação de permissões por tela e os testes no PostgreSQL real permanecem pendentes.
