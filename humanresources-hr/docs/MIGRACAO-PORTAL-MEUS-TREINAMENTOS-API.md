# Migração — portal Meus Treinamentos para API PostgreSQL

## Esta etapa

- Criada a rota autenticada `GET /api/me/training-data`.
- A rota resolve o funcionário pelo vínculo do token, limita a consulta à empresa autenticada e retorna somente treinamentos atribuídos a esse funcionário.
- A resposta inclui os treinamentos atribuídos, o registro de participação do próprio funcionário, as avaliações desses treinamentos e os certificados relacionados.
- `src/pages/MeusTreinamentos/MeusTreinamentos.jsx` carrega a tela pela API e exibe estados de carregamento, erro e nova tentativa.
- A tela deixa de usar os serviços locais como fonte inicial de dados. O cache local recebe apenas o conjunto já filtrado pelo servidor para manter compatibilidade temporária com componentes síncronos existentes.

## Limite conhecido desta etapa

A gravação de progresso, tentativas de avaliação e emissão de certificados ainda precisa ser migrada para endpoints próprios e autorizados. Não se deve considerar a persistência de todas as interações do portal concluída nesta etapa. O cache é apenas compatibilidade temporária e não deve ser tratado como fonte de verdade.

## Validação

- Verificação de sintaxe do arquivo de rota com `node --check`.
- Conferência estática de que a tela consulta `/me/training-data` e não importa os serviços locais para a carga inicial.
- Teste funcional com PostgreSQL real ainda pendente.
