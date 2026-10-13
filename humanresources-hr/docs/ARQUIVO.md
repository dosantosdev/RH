HUMAN RESOURCES HR — ABA ARQUIVO (PRIMEIRA ETAPA COM API)

Use este ZIP sobre a versão atual do projeto enviada em 13/10/2026.

ARQUIVOS CRIADOS
- src/pages/Arquivo/Arquivo.jsx
- src/pages/Arquivo/arquivo.css

ARQUIVOS SUBSTITUÍDOS
- src/App.jsx
  Adiciona a rota protegida /arquivo.
- src/components/layout/Navbar.jsx
  O link Arquivo deixa de ser um placeholder e abre a nova página.
- src/data/permissions.js
  Inclui as permissões de visualização, envio, edição e exclusão de documentos.
- src/services/accessRoles.js
  Adiciona as permissões do Arquivo ao perfil padrão e à atualização compatível
  do perfil Gestão de RH existente.
- server/src/routes/documents.js
  Adiciona listagem centralizada, listagem segura de cadastros vinculáveis,
  upload para funcionário/candidato e edição de metadados.

O QUE A ABA OFERECE
- Painel de documentos vindos da API/PostgreSQL.
- Indicadores: total, vencidos, vencendo em até 30 dias e sem validade.
- Busca e filtros por vínculo, validade e categoria.
- Upload de documentos para funcionário ou candidato.
- Registro de categoria, tipo e data de validade.
- Abertura por URL temporária protegida pela API.
- Exclusão com confirmação.
- Isolamento de dados por company_id no backend.
- Tela de conexão/login própria da API para esta fase de transição.

IMPORTANTE SOBRE A FASE ATUAL
1. A aplicação antiga continua usando localStorage nos demais módulos.
   Esta página do Arquivo usa a API e NÃO importa os documentos antigos do
   localStorage automaticamente.
2. O Docker/PostgreSQL/API precisam estar iniciados para a página carregar.
3. O usuário usado no formulário é o usuário cadastrado na API (criado por
   server/.env e npm run db:setup), não necessariamente o usuário do login
   antigo do React.
4. Upload/abertura/exclusão de arquivos exige as credenciais do Firebase
   Storage configuradas em server/.env. Sem isso, a API informa erro.
5. A API deve ser reiniciada depois de substituir server/src/routes/documents.js.
6. Não coloque credenciais reais no frontend nem no Git.
7. A exclusão remove o registro e tenta excluir o arquivo no Storage; use com
   cuidado em ambiente real.
8. A integração e a segurança devem ser testadas localmente quando o Docker
   estiver disponível. Este pacote não foi validado contra um PostgreSQL ativo
   nesta execução, pois o ambiente de desenvolvimento ainda não está iniciado.

PRÓXIMO PASSO QUANDO ESTIVER EM CASA
- Iniciar Docker/PostgreSQL.
- Executar npm run db:setup dentro de server, caso ainda não tenha sido feito.
- Configurar Firebase Storage no server/.env.
- Iniciar API e frontend.
- Fazer login da API na tela Arquivo.
- Testar upload, listagem, abertura, filtros e exclusão com documentos de teste.
