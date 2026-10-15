# Migração da aba Treinamentos para PostgreSQL

## O que foi alterado

- As quatro listas usadas pela aba Treinamentos (`trainings`, `trainingParticipants`, `trainingAssessments` e `trainingCertificates`) agora são sincronizadas em um módulo PostgreSQL separado chamado `trainings`, usando a API autenticada `/api/app-records`.
- A sincronização é executada quando o aplicativo navega com uma sessão autenticada.
- Se a chave já existe no PostgreSQL, o valor do banco é carregado para o cache local. Se só existir localmente, é importada para o banco.
- As alterações feitas pelos serviços existentes continuam compatíveis com os componentes atuais e são enviadas para o PostgreSQL.
- As quatro listas foram excluídas da sincronização genérica `client_state` para evitar duplicação entre módulos.
- O conteúdo do navegador é mantido como cache de compatibilidade; não é apagado automaticamente.

## Chaves abrangidas

- `trainings`: configurações, conteúdo, questões e dados dos treinamentos.
- `trainingParticipants`: inscrições, progresso, tentativas e resultados.
- `trainingAssessments`: configurações das avaliações dos treinamentos.
- `trainingCertificates`: registros de certificados.

## Aplicação

1. Preserve o `server/.env` local.
2. Execute `npm run db:migrate` na pasta `server` se ainda não tiver aplicado todas as migrações anteriores.
3. Inicie o backend e o frontend normalmente.
4. Faça login com um usuário autorizado e abra Treinamentos.
5. Teste criação/edição de treinamento, participantes, avaliação, progresso e certificado.
6. Atualize a página e confirme que os dados continuam disponíveis.

## Limites conhecidos

Esta etapa usa a tabela genérica `app_records` com escopo por empresa, em vez de converter cada objeto do módulo para as tabelas relacionais `trainings`, `employee_trainings` e `certificates`. Isso mantém a compatibilidade com os formatos de dados existentes e permite migrar a aba por etapas, mas não substitui uma normalização futura dessas tabelas. O conteúdo binário de certificados/documentos continua fora deste módulo e deve seguir o fluxo da aba Arquivo.

As chamadas de persistência são assíncronas. Verifique o console do navegador e a resposta da API ao testar. Não limpe o `localStorage` durante a validação.
