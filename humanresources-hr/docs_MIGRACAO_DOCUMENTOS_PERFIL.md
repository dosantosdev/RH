# Human Resources HR — integração de documentos do funcionário

## O que esta versão acrescenta
- Painel de documentos anexados no perfil do funcionário.
- Listagem de documentos já registrados na tabela `employee_documents`.
- Upload para a rota `/api/documents/employee/:employeeId`.
- Abertura do arquivo por link temporário gerado pela API.
- Exclusão com confirmação.
- Controles de interface respeitam `documents_view`, `documents_upload` e `documents_delete`.
- Usa as rotas existentes; não adiciona nem repete migrações SQL.

## Antes de testar
1. Faça backup do projeto.
2. Copie os arquivos do ZIP para a raiz do projeto preservando os caminhos.
3. Não substitua `server/.env`.
4. Reinicie o backend e frontend.
5. Abra o perfil de um funcionário e teste a listagem.

## Requisito importante
O upload/abertura/exclusão usa Firebase Storage por meio do backend existente. Para usar esses recursos, as variáveis `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` e `FIREBASE_STORAGE_BUCKET` precisam estar configuradas no `server/.env`. Se não estiverem, a API mostrará a mensagem de configuração ausente. Não compartilhe o `.env`.

## Validação
Não foram adicionadas migrações SQL. O frontend deve ser compilado localmente com `npm run build`. O teste integrado de upload exige Firebase Storage configurado.
