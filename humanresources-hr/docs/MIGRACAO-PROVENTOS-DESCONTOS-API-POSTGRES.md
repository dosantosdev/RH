# Migração de Proventos e Descontos para API PostgreSQL

## O que mudou

- A tela `ProventosDescontos.jsx` consulta `GET /api/financial-events` para carregar o catálogo.
- Cadastro, edição, ativação/inativação e exclusão aguardam a confirmação de `PUT /api/financial-events` antes de atualizar a interface e o cache local.
- A identidade do usuário usada nos metadados vem da sessão da API (`getApiUser`), não da chave antiga `loggedUser`.
- A rota autentica o usuário, valida `finance_events_view` para leitura e `finance_events_manage` para gravação e sempre limita a consulta à empresa do token.
- O backend valida formato, tipos de evento, tipos de cálculo, IDs/códigos duplicados e tamanho máximo do payload.
- Falhas da API não são apresentadas como sucesso e os botões de alteração ficam indisponíveis enquanto a API não estiver pronta ou uma gravação estiver em andamento.

## Persistência nesta fase

O catálogo ainda é armazenado como uma lista JSONB em `app_records` (`module_key = financial_events`, `record_key = financialEvents`). A tela já utiliza API para o ciclo de leitura e gravação, mas esta entrega **não** é a normalização relacional definitiva. Como a gravação atual substitui a lista inteira, alterações simultâneas feitas por duas sessões podem causar conflito de última gravação; isso precisa ser resolvido antes de produção, idealmente com operações por evento em uma tabela relacional.

O cache `localStorage.financialEvents` só é atualizado depois da confirmação da API. Se o banco estiver vazio e houver dados locais, eles são preservados e exibidos com aviso; ao salvar, a lista será enviada ao endpoint autenticado. Nenhuma chave local é removida automaticamente.

## Validações realizadas nesta entrega

- `node --check` para a nova rota e para o registro da rota no servidor.
- Parser JSX e ESLint a executar conforme as dependências disponíveis no ZIP.
- Testes reais de PostgreSQL, concorrência, permissões por perfil e build completo ainda precisam ser executados no ambiente de desenvolvimento.

## Cenários manuais obrigatórios

1. Com `finance_events_view`, confirmar leitura e bloqueio de criar/editar/ativar/excluir.
2. Sem permissão de leitura, confirmar HTTP 403 em `GET /api/financial-events`.
3. Com `finance_events_manage`, cadastrar, editar, ativar/inativar e excluir; atualizar a página após cada operação.
4. Confirmar que o catálogo de uma empresa não aparece para usuário de outra empresa.
5. Simular falha de API e confirmar que a tela não informa sucesso nem grava a alteração apenas no cache.
6. Se houver catálogo local antigo e nenhum registro no banco, verificar o aviso de preservação e confirmar a migração por uma gravação autorizada.
