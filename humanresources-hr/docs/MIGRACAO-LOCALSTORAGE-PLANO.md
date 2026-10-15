# Plano de migração do localStorage para PostgreSQL

## Regra de trabalho

Não apagar nem limpar chaves locais durante a migração. Cada área será conectada à API e validada (listar, criar, editar, excluir, permissões e isolamento por empresa) antes de considerar a etapa concluída. O `localStorage` poderá continuar existindo temporariamente como cache de compatibilidade, mas o PostgreSQL será a fonte oficial dos dados compartilhados.

## Inventário do ZIP de 13/10/2026

### API já existente no projeto
- Autenticação e sessão via API.
- Usuários e perfis de acesso.
- Funcionários: consulta, detalhe e cadastro/atualização no banco.
- Central de documentos/metadados e solicitações do funcionário.
- Chat com esquema SQL próprio.

### Migração iniciada nesta entrega
- Configurações de campos obrigatórios: persistência por empresa na tabela `company_settings`, via `/api/settings/required-fields`. A configuração local existente é usada apenas para a primeira cópia se ainda não houver valor no banco.

### Áreas conectadas nesta revisão
- Dashboard: identidade via `/api/me`; indicadores de aniversários, exames periódicos e Turnover via `/api/employees`. Ainda requer testes integrados no PostgreSQL real.

### Próximas áreas que ainda precisam ser conectadas e testadas
- Filiais, departamentos, cargos e posições do organograma.
- Busca, perfil, edição e exclusão de funcionários em todas as telas (algumas ainda leem dados locais).
- Recrutamento: vagas, candidatos, candidaturas, etapas e entrevistas.
- Treinamentos, participantes, avaliações de treinamento e certificados.
- Ponto: batidas, jornadas/escalas, banco de horas, horas extras, faltas/atrasos, fechamentos e relatórios.
- Avaliações: modelos, etapas, respostas, PDI, avaliação 180° e histórico.
- Financeiro: salários, proventos/descontos, folha, férias e demais eventos.
- Perfil, permissões, relatórios e outras preferências das configurações.

## Como validar esta etapa

1. Aplicar as alterações mantendo `server/.env` fora do ZIP/Git.
2. Com PostgreSQL ligado, executar em `server/`: `npm run db:migrate` e `npm run db:seed`.
3. Reiniciar a API e entrar com uma conta que tenha `system_settings` (o administrador tem acesso total).
4. Abrir Configurações > Campos obrigatórios e alterar uma opção.
5. Atualizar a página ou entrar novamente e confirmar que o valor continua igual.
6. Em PostgreSQL, conferir a existência de `company_settings` e um registro com `setting_key = 'required-fields'`.

Não executar uma limpeza geral do `localStorage`: outras áreas ainda dependem dele e serão migradas por etapas.
