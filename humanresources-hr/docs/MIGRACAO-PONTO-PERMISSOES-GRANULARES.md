# Migração — permissões granulares do Ponto na API PostgreSQL

## O que mudou nesta etapa

- O backend de `app_records` deixou de aplicar a permissão central de Controle de Ponto indistintamente a todos os módulos separados.
- `timekeeping_bank_hours` exige permissões de Banco de Horas.
- `timekeeping_schedules` exige permissões de Jornadas e Escalas.
- `timekeeping_closings` exige permissões de Fechamento Mensal.
- `timekeeping_medical` exige permissões de Atestados.
- `timekeeping_clock` mantém a permissão de Controle de Ponto para preservar o modelo de autorização atual das batidas e ajustes.
- A ponte de compatibilidade no frontend aplica as mesmas permissões antes de enviar gravações e exclusões ao servidor.
- Foram reutilizadas permissões já presentes no catálogo e na migração `008_complete_permission_catalog.sql`; não foi necessária uma nova migração SQL.

## Atenção aos perfis personalizados

Os perfis personalizados precisam receber as permissões específicas na tela Perfis de Acesso. Ter apenas `ponto_controle_view` ou `ponto_controle_edit` já não concede acesso automaticamente a todos os domínios separados do Ponto. O perfil padrão `gestao_rh` recebe as permissões operacionais previstas na migração 008; revise os perfis personalizados antes de validar os módulos.

## Validação realizada

- Sintaxe do backend verificada com `node --check`.
- Verificação estática confirmou que frontend e backend usam o mesmo mapa de permissões por módulo.
- A validação funcional ainda deve ser executada com PostgreSQL real e perfis diferentes, incluindo respostas HTTP 403 para acessos não autorizados.
