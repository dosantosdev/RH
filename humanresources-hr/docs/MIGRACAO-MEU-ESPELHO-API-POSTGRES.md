# Migração — Meu Espelho para API/PostgreSQL

## Escopo desta etapa
- `GET /api/me/timekeeping/period?startDate=AAAA-MM-DD&endDate=AAAA-MM-DD` valida o período, limita a consulta a 367 dias e deriva o funcionário do token autenticado.
- A API devolve somente as marcações daquele funcionário no período, as jornadas atribuídas a ele e as definições de jornada necessárias para o cálculo.
- A tela Meu Espelho deixou de consultar `loggedUser`, `employees` e os registros de ponto diretamente no `localStorage`.
- Os totais são calculados no frontend a partir das marcações e jornadas recebidas pela API. O acesso aos dados-fonte é autenticado e limitado à empresa do usuário.
- `workSchedule.js` e `timeClock.js` aceitam dados fornecidos pela API sem quebrar os demais componentes que ainda utilizam os contratos síncronos antigos.
- A comparação da vigência da jornada usa data local, evitando deslocamento de um dia ao converter meia-noite do Brasil para UTC.

## Testes manuais
1. Iniciar PostgreSQL e backend com `server/.env` configurado.
2. Entrar com usuário vinculado a funcionário e com permissão `ponto_espelho_view`.
3. Abrir Meu Espelho e confirmar nome, jornada, marcações e totais.
4. Alterar as datas e navegar para período anterior/próximo.
5. Confirmar que o backend rejeita datas inválidas, períodos invertidos e intervalos superiores a 367 dias.
6. Testar usuário sem vínculo e usuário sem permissão.
7. Atualizar a página e confirmar que os registros vêm do banco.
8. Comparar um período conhecido com o controle de ponto para validar horas previstas, trabalhadas, saldo, extras e déficit.

## Limitações
- A apuração usa as regras atuais do frontend para feriados e cálculos; nesta etapa, as entradas (marcações, funcionário e jornadas atribuídas) vêm da API.
- Se a empresa tiver configuração de feriados personalizada ou uma jornada não registrada em `timekeeping_schedules`, os totais precisam ser conferidos e a migração desses cadastros deve ser concluída.
- A persistência de batidas ainda utiliza o payload JSONB agregado `app_records`; tabelas relacionais específicas continuam pendentes.
- Build completo e testes integrados com PostgreSQL real precisam ser executados no Windows da usuária.
- Firebase Storage permanece para a última etapa.
