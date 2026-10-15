# Migração — persistência do progresso e das avaliações de treinamento

## Implementado

- `PATCH /api/me/training-progress`: valida o funcionário da sessão, a participação, o treinamento e os IDs dos conteúdos antes de salvar o progresso em PostgreSQL (`app_records`).
- `POST /api/me/training-attempt`: valida a participação do funcionário, recupera o gabarito do banco, confere respostas e limite de tentativas, calcula nota e aprovação no servidor e persiste a tentativa.
- `POST /api/me/training-complete`: só conclui quando todos os conteúdos estão concluídos e a avaliação foi aprovada.
- As operações usam transação e bloqueio da linha de participantes para reduzir sobrescritas concorrentes.
- `TrainingProgress.jsx` e `TrainingTakeAssessment.jsx` passaram a usar `apiRequest` nas gravações. Erros do servidor são exibidos na interface.

## Importante

Os registros de treinamento ainda estão armazenados como arrays JSONB em `app_records`; esta etapa migra a persistência das operações para a API, não normaliza o esquema em tabelas relacionais. O cadastro administrativo de treinamentos/avaliações e a emissão de certificados ainda precisam ser migrados. O portal deve ser validado com um usuário funcionário real e PostgreSQL ativo antes de considerar a etapa concluída.

## Testes recomendados

1. Marcar/desmarcar conteúdo e recarregar a página.
2. Enviar uma avaliação e verificar que a tentativa persiste após sair e entrar novamente.
3. Enviar respostas incompletas e conferir HTTP 400.
4. Tentar acessar uma participação de outro funcionário e conferir HTTP 404.
5. Tentar concluir sem 100% de progresso ou sem aprovação e conferir HTTP 409.
