# Inventário estático de `localStorage` — 15/10/2026

Este inventário é uma busca estática por ocorrências de `localStorage.` em arquivos JavaScript/JSX sob `src/`. Ele não classifica automaticamente cada ocorrência como defeito: várias são caches de compatibilidade, sessão ou mecanismos de migração e devem ser revisadas antes de qualquer remoção.

**Resultado da busca:** 119 ocorrências em 26 arquivos.

## Arquivos com mais ocorrências

| Arquivo | Ocorrências | Revisão recomendada |
|---|---:|---|
| `src/services/storage.js` | 37 | Ponte de compatibilidade; retirar apenas por domínio após migração e testes. |
| `src/services/auth.js` | 9 | Sessão/autenticação; revisar segurança e contrato antes de alterar. |
| `src/pages/Profile/Profile.jsx` | 8 | Revisar leitura/gravação e dependência funcional. |
| `src/services/api.js` | 7 | Sessão/autenticação; revisar segurança e contrato antes de alterar. |
| `src/pages/Financeiro/Folha/Folha.jsx` | 6 | Financeiro; conferir se é cache ou fonte de dados ainda ativa. |
| `src/services/workSchedule.js` | 6 | Ponto; migrar após validar rotas e gravações por domínio. |
| `src/pages/MeusTreinamentos/MeusTreinamentos.jsx` | 5 | Revisar leitura/gravação e dependência funcional. |
| `src/services/requiredFields.js` | 5 | Revisar leitura/gravação e dependência funcional. |
| `src/services/evaluationAccess.js` | 4 | Revisar leitura/gravação e dependência funcional. |
| `src/services/medicalCertificates.js` | 4 | Ponto; migrar após validar rotas e gravações por domínio. |
| `src/services/bankHours.js` | 4 | Ponto; migrar após validar rotas e gravações por domínio. |
| `src/services/legacyDataMigration.js` | 4 | Revisar leitura/gravação e dependência funcional. |
| `src/components/layout/Navbar.jsx` | 3 | Revisar leitura/gravação e dependência funcional. |
| `src/main.jsx` | 2 | Sessão/autenticação; revisar segurança e contrato antes de alterar. |
| `src/pages/Avaliacoes/MinhasAvaliacoes.jsx` | 2 | Revisar leitura/gravação e dependência funcional. |
| `src/pages/Financeiro/ProventosDescontos/ProventosDescontos.jsx` | 2 | Financeiro; conferir se é cache ou fonte de dados ainda ativa. |
| `src/pages/Login/Login.jsx` | 2 | Sessão/autenticação; revisar segurança e contrato antes de alterar. |
| `src/pages/Ponto/JornadasEscalas/JornadasEscalas.jsx` | 1 | Ponto; migrar após validar rotas e gravações por domínio. |
| `src/pages/Chat/Chat.jsx` | 1 | Revisar leitura/gravação e dependência funcional. |
| `src/pages/AccessRoles/AccessRoles.jsx` | 1 | Revisar leitura/gravação e dependência funcional. |
| `src/services/permissions.js` | 1 | Sessão/autenticação; revisar segurança e contrato antes de alterar. |
| `src/services/training.js` | 1 | Revisar leitura/gravação e dependência funcional. |
| `src/services/overtime.js` | 1 | Ponto; migrar após validar rotas e gravações por domínio. |
| `src/services/financialEvents.js` | 1 | Financeiro; conferir se é cache ou fonte de dados ainda ativa. |
| `src/components/ProtectedRoute.jsx` | 1 | Sessão/autenticação; revisar segurança e contrato antes de alterar. |
| `src/components/layout/WorkspaceHost.jsx` | 1 | Revisar leitura/gravação e dependência funcional. |

## Ordem recomendada para reduzir a ponte sem quebrar o sistema

1. Confirmar no PostgreSQL real as tabelas e rotas já migradas; não apagar chaves locais antes disso.
2. Migrar o Financeiro restante para tabelas de domínio e impedir escritas genéricas paralelas (o catálogo `financialEvents` já recebeu essa proteção nesta revisão).
3. Auditar perfil, jornadas, banco de horas e atestados, distinguindo cache de dados oficiais.
4. Revisar autenticação/sessão separadamente; não remover essas chaves como parte de uma limpeza geral.
5. Só depois de testes de persistência, múltiplas empresas e perfis, reduzir a ponte genérica e planejar a integração de Firebase Storage.

## Regra de segurança

Não executar `localStorage.clear()` nem remover em lote as chaves atuais. O projeto ainda utiliza armazenamento local em fluxos compatíveis e alguns dados podem não ter sido importados para o PostgreSQL.
