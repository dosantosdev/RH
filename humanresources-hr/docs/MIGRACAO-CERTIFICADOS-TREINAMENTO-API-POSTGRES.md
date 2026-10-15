# Migração — certificados de treinamento via API PostgreSQL

## Implementado

- `GET /api/me/training-certificate` consulta um certificado pelo par participação/treinamento, após confirmar que a participação pertence ao funcionário autenticado.
- `POST /api/me/training-certificate` emite o certificado no servidor e persiste o registro em `app_records` no módulo `trainings`, registro `trainingCertificates`.
- A API verifica a empresa autenticada, o vínculo do funcionário, a conclusão do treinamento, 100% de progresso, aprovação na avaliação e conclusão de todos os conteúdos.
- A emissão é idempotente para o mesmo participante e treinamento: se o certificado já existe, ele é retornado em vez de gerar uma segunda numeração.
- `TrainingCertificate.jsx` passou a consultar e emitir certificados pela API; não chama mais o serviço local de certificados.
- A impressão do certificado continua no navegador, mas os dados oficiais e o número são os persistidos pelo servidor.

## Limitações conhecidas

- O armazenamento de certificados ainda usa um array JSONB em `app_records`; a normalização para uma tabela própria pode ser feita em etapa posterior.
- O serviço legado `src/services/trainingCertificate.js` permanece no projeto para compatibilidade com outros consumidores, mas a tela do portal não o utiliza.
- A validação funcional deve ser feita com PostgreSQL ativo e conta de funcionário real. Esta etapa não migra anexos/arquivos para Firebase Storage.

## Testes recomendados

1. Emitir um certificado para um treinamento concluído.
2. Fechar e reabrir a tela e confirmar que o mesmo número é carregado.
3. Tentar emitir novamente e confirmar que o certificado existente é reutilizado.
4. Tentar consultar/emitir usando participação de outro funcionário e confirmar HTTP 404.
5. Tentar emitir antes da conclusão e confirmar HTTP 409.
