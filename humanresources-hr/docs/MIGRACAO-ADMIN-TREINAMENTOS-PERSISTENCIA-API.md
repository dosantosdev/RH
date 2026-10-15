# Migração — persistência administrativa de Treinamentos

## O que mudou

- `setStored` e `removeStored` agora espelham as quatro listas do módulo `trainings` na API autenticada, usando os registros `trainings`, `trainingParticipants`, `trainingAssessments` e `trainingCertificates`.
- As escritas por chave são serializadas para preservar a ordem das alterações realizadas rapidamente.
- A gravação usa o endpoint existente `/api/app-records/trainings/:recordKey`, com o escopo da empresa obtido pelo token e autorização de gerenciamento aplicada no servidor.
- `flushTrainingDataWrites()` permite que a tela administrativa aguarde as gravações iniciadas pelo cache compatível.
- A tela principal de Treinamentos aguarda a persistência de criar, editar e excluir antes de confirmar a operação; erros de API são apresentados na interface.
- As alterações em conteúdos, avaliações e participantes que usam `setStored` também passam a ser espelhadas no PostgreSQL sem alterar o contrato síncrono legado.

## Importante

O `localStorage` continua sendo cache de compatibilidade, mas as gravações administrativas autenticadas agora são enviadas ao PostgreSQL. A API continua armazenando cada lista como payload JSONB; esta etapa não normaliza os dados em tabelas relacionais. É necessário testar com PostgreSQL real, especialmente edição de conteúdos e avaliações, remoção de treinamento e contas com permissões diferentes.

## Testes recomendados

1. Criar um treinamento e confirmar que aparece no registro `trainings` do módulo `trainings` no PostgreSQL.
2. Editar o treinamento e recarregar a tela.
3. Adicionar/editar conteúdo e salvar uma avaliação.
4. Excluir um treinamento e confirmar que as listas dependentes foram atualizadas no banco.
5. Retirar permissão de gerenciamento do usuário e confirmar que a API retorna HTTP 403.
