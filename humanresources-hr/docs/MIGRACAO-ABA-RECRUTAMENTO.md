# Migração da aba Recrutamento para PostgreSQL

## O que foi alterado
- As listas `recruitmentVacancies`, `recruitmentCandidates`, `recruitmentStages` e `recruitmentInterviews` são sincronizadas no módulo dedicado `recruitment` da API autenticada `/api/app-records`.
- A sincronização ocorre junto às demais sincronizações após autenticação.
- Se uma chave já existe no PostgreSQL, seu conteúdo é carregado para o cache local; se só existe no navegador, é enviado ao banco.
- Gravações e remoções futuras nessas quatro chaves são encaminhadas ao módulo `recruitment`.
- Os dados locais não são apagados automaticamente e continuam servindo de cache de compatibilidade para as telas síncronas.
- `recruitmentApplicationLinks` permanece fora da sincronização: os links públicos contêm tokens de acesso e precisam de um fluxo próprio para persistência segura.

## Aplicação
Não há nova migração SQL nesta etapa; é utilizada a tabela `app_records` existente.
1. Preserve `server/.env`.
2. Na pasta `server`, execute `npm run db:migrate` caso ainda não tenha aplicado as migrações anteriores e inicie a API.
3. Na raiz, execute `npm install` se necessário, depois `npm run build` e `npm run dev`.
4. Entre com usuário autenticado e teste criar/editar/excluir vagas, candidatos, etapas e entrevistas.
5. Atualize a página e confirme que os registros continuam disponíveis.
6. Teste a candidatura pública separadamente; os links públicos permanecem no armazenamento local nesta etapa.

## Limitações e validação
- Esta é uma migração de persistência para `app_records`/JSONB com cache local, não a conversão para tabelas relacionais específicas de recrutamento.
- A sincronização não remove dados do `localStorage`.
- Registros acima de 200 KB são ignorados na importação inicial desta rotina, com aviso no console.
- Não foi possível validar contra o PostgreSQL real nesta sessão; valide os fluxos no ambiente local antes de considerar a etapa concluída.
