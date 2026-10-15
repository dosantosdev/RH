# Migração — persistência administrativa de Avaliações

## Implementado

- As listas `evaluations`, `evaluationModels` e `evaluationWorkflows` continuam usando o contrato síncrono de cache para compatibilidade, mas alterações via `setStored` agora também entram em uma fila de gravação autenticada no módulo PostgreSQL `evaluations`.
- A fila serializa gravações por chave, limita payloads a 256 KB e registra falhas de persistência para que a interface não apresente sucesso silenciosamente.
- `flushEvaluationDataWrites()` aguarda as gravações iniciadas e propaga falhas registradas.
- A tela principal de Avaliações aguarda a persistência ao criar um workflow.
- A tela de Modelos de Avaliação aguarda a persistência ao salvar e excluir modelos, apresentando erro se a API não confirmar.
- O backend continua aplicando as permissões `evaluations_view` e `evaluations_create/edit/delete` ao módulo `app_records`.

## Limitações

- As listas continuam em JSONB agregado em `app_records`; não foram normalizadas em tabelas de domínio.
- Operações de workflow que ainda não chamam `flushEvaluationDataWrites` podem continuar sendo sincronizadas em segundo plano pelo bridge compatível. A migração completa de todas as mutações administrativas e o teste funcional com PostgreSQL continuam necessários.
- O `localStorage` permanece como cache de compatibilidade; não foi apagado.

## Testes recomendados

1. Criar um modelo, recarregar a tela e confirmar que o modelo persiste.
2. Editar um modelo e verificar que as perguntas/etapas continuam presentes após login novamente.
3. Criar uma avaliação para um funcionário e confirmar a persistência do workflow.
4. Desconectar a API durante uma gravação e confirmar que a interface mostra a falha em vez de exibir sucesso.
5. Testar usuários sem permissões e confirmar respostas HTTP 403 no servidor.
