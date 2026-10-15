# Migração — Relatórios de Ponto para API/PostgreSQL

## O que mudou
- A tela `src/pages/Ponto/Relatorios/Relatorios.jsx` deixou de ler funcionários, marcações e atestados diretamente do `localStorage`.
- A rota autenticada `GET /api/me/timekeeping/report-data?startDate=AAAA-MM-DD&endDate=AAAA-MM-DD` retorna funcionários e filiais da empresa autenticada, marcações do período, jornadas e atestados relacionados ao período.
- A rota exige `ponto_controle_view`, valida o intervalo de datas e limita o relatório a 367 dias.
- O backend normaliza identificadores legados conhecidos para UUIDs do PostgreSQL sem excluir nem reescrever os registros antigos.
- Os cálculos de ponto existentes continuam no frontend, agora usando os dados recebidos pela API.

## Testes manuais
1. Iniciar PostgreSQL e backend com `server/.env` configurado.
2. Entrar com usuário que tenha permissão `ponto_controle_view`.
3. Abrir Ponto > Relatórios e confirmar funcionários, filiais e dados do período.
4. Alternar entre Resumo de ponto, Faltas e atrasos, Horas extras, Atestados e Relatório completo.
5. Alterar filial, funcionário e intervalo de datas; conferir os totais.
6. Testar datas inválidas, intervalo invertido e intervalo acima de 367 dias.
7. Testar usuário sem permissão e verificar resposta 403.
8. Comparar um período conhecido com Meu Espelho/Controle de Ponto e confirmar a correspondência dos totais.

## Limitações ainda existentes
- A rota retorna registros da empresa autenticada para um usuário com permissão de controle de Ponto; permissões granulares de relatório ainda precisam ser modeladas.
- Os dados de batidas, jornadas e atestados continuam armazenados em payloads JSONB agregados de `app_records`; a migração para tabelas relacionais próprias continua pendente.
- O mapeamento automático de IDs legados cobre `legacyId`, `legacy_id` e `id` em `registration_data`. Outros formatos antigos precisam de importação assistida.
- Build completo e testes integrados com PostgreSQL real precisam ser executados no Windows.
- Firebase Storage permanece para a última etapa.
