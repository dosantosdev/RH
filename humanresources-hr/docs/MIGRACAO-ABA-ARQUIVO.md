# Migração da aba Arquivo para PostgreSQL

## O que foi alterado
- A migração `006_documents_postgres_storage.sql` adiciona `employee_documents.file_data BYTEA` e permite `storage_path` nulo.
- Novos uploads da aba Arquivo e do painel de documentos do funcionário gravam o binário e os metadados diretamente no PostgreSQL.
- Listagens não retornam o binário, para evitar transferir documentos inteiros ao renderizar tabelas.
- O download entrega o binário autenticado e usa `Content-Disposition` com o nome do arquivo.
- Os endpoints mantêm isolamento por `company_id` vindo da sessão autenticada e as permissões `documents_view`, `documents_upload`, `documents_edit` e `documents_delete`.
- Documentos antigos que ainda tenham `storage_path` continuam com fallback de download/exclusão pelo Firebase. Novos uploads não exigem configuração Firebase.
- O front-end usa `apiDownload`/`openApiDocument` para abrir arquivos binários ou links de arquivos legados.

## Como aplicar
Na pasta `server`:
```powershell
npm run db:migrate
npm run dev
```
Na raiz do projeto:
```powershell
npm run build
npm run dev
```

## Teste recomendado
1. Entre na API pelo módulo Arquivo.
2. Envie um PDF pequeno de teste vinculado a um funcionário ou candidato.
3. Confirme que ele aparece na listagem, abra-o, atualize a tela e abra novamente.
4. Teste o painel Documentos dentro do perfil do funcionário.
5. Teste com um perfil sem `documents_view` e confirme que a API bloqueia a consulta.
6. Exclua apenas o documento de teste.

## Limites conhecidos
- Os documentos legados que só existem no Firebase não são copiados automaticamente para `file_data`; continuam dependentes da configuração Firebase até uma etapa de migração específica.
- O tamanho máximo continua sendo definido por `MAX_FILE_SIZE_BYTES` (padrão 10 MB).
- O build Vite não pôde ser validado neste ambiente porque o ZIP contém dependências nativas de Windows; é necessário executar `npm install` no seu Windows antes do teste local.
