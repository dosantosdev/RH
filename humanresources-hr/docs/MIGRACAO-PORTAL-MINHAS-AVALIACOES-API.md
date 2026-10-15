# Migração — portal Minhas Avaliações/PDI para API PostgreSQL

## Alterações

- A tela `MinhasAvaliacoes.jsx` consulta `GET /api/me/evaluation-workflows` quando há sessão autenticada na API.
- A API limita o retorno a avaliações do funcionário vinculado, avaliações nas quais o usuário é responsável explícito pelo PDI (por usuário ou funcionário) e usuários administrativos com permissão de gerenciamento.
- O início, salvamento e conclusão do PDI são enviados para `POST /api/me/evaluation-workflows/:workflowId/pdi`.
- O servidor valida o vínculo do funcionário/empresa, verifica se o usuário é responsável explícito pelo PDI ou possui permissão administrativa, valida perguntas obrigatórias e grava o resultado no PostgreSQL dentro de transação.
- A gravação usa bloqueio transacional para evitar sobrescritas concorrentes do array legado `evaluationWorkflows`.
- A resposta do servidor atualiza o cache local apenas para manter compatibilidade com componentes existentes; o cache não é a fonte de verdade para estas operações autenticadas.

## Limites desta etapa

- A estrutura de avaliações continua armazenada em `app_records` como JSONB agregado; a normalização para tabelas relacionais fica para etapa posterior.
- Workflows cujo responsável hierárquico ainda não foi gravado em `pdi.responsibleUserId` podem exigir revisão da atribuição antes que o servidor permita a gravação.
- O portal `Meus Treinamentos` ainda precisa da sua migração dedicada de leitura e gravação pela API.
- O fluxo administrativo de Avaliações (criação de modelos/workflows e etapas que não sejam PDI) continua usando os serviços legados e não é considerado migrado por esta etapa.

## Validação necessária

Testar com PostgreSQL real: funcionário sem vínculo, funcionário avaliado, responsável atribuído, usuário sem permissão (esperado HTTP 403), salvamento de respostas, tentativa de concluir com pergunta obrigatória vazia, conclusão bem-sucedida e persistência após reiniciar a API.
