# Migração — links públicos de candidatura para PostgreSQL

## Implementado nesta etapa

- Links públicos são criados, listados, revogados e excluídos pela API autenticada.
- O PostgreSQL armazena o hash SHA-256 do token para validação pública e o token cifrado com AES-256-GCM para permitir que usuários autorizados copiem links existentes.
- A chave de cifragem deriva de `JWT_SECRET`; em produção, esse segredo deve ser forte, estável e mantido privado.
- A validação pública não exige login e verifica validade, revogação e status da vaga.
- O envio da candidatura grava o candidato em `app_records` no módulo `recruitment`, com bloqueio transacional para evitar sobrescrever candidaturas simultâneas.
- O ID da empresa é derivado do link guardado no banco, nunca enviado pelo formulário público.
- Criada a migração `009_recruitment_application_links.sql`.
- O corpo JSON da API foi elevado a 10 MB para suportar anexos enviados como data URI; o endpoint público limita a candidatura a 8 MB e o formulário limita o total dos anexos a 5 MB.

## Aplicação

Na pasta `server`, executar `npm run db:migrate` e reiniciar a API. A migração é aditiva e não remove registros existentes.

## Limitações e verificações pendentes

- Links antigos que existiam apenas no `localStorage` não são importados automaticamente. Gere novos links pela interface após aplicar a migração.
- A candidatura pública é gravada na lista JSONB `recruitmentCandidates`, ainda usada pelo módulo atual. A normalização para `candidates` e `applications` é uma etapa posterior.
- Testar com PostgreSQL real: gerar link, copiar/abrir em janela anônima, enviar candidatura, conferir persistência, revogar e validar resposta de link inválido/expirado.
- Revisar limite/rate limiting do endpoint público antes de produção e configurar `JWT_SECRET` forte. O endpoint usa tokens aleatórios de alta entropia, mas rate limiting ainda não está configurado.
