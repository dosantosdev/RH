# Migração — sincronização dos catálogos organizacionais

## Escopo desta etapa

- As APIs de Filiais, Departamentos e Cargos agora atualizam o cache local compatível depois de listar, criar, editar ou excluir registros.
- A sincronização de inicialização consulta as APIs de Filiais, Departamentos, Cargos e Posições e atualiza as chaves legadas `branches`, `departments`, `roles` e `positions`.
- O serviço de Posições atualiza o cache após operações na API do Organograma.
- As telas legadas do formulário de funcionário, Candidatos e telas de Ponto que usam os catálogos reagem ao evento `hr:organization-cache-updated`.
- As chaves de catálogos permanecem excluídas da ponte genérica `app_records`, porque já têm APIs e tabelas de domínio.

## Segurança e preservação

- As APIs continuam responsáveis pela autenticação, autorização e isolamento por empresa.
- A sincronização usa os registros retornados pela API autenticada. Se uma API falhar ou negar acesso, o cache existente não é apagado automaticamente.
- Esta etapa não importa automaticamente registros que existam apenas no navegador para as tabelas relacionais. Essa importação deve ser assistida, com revisão de IDs e vínculos para evitar duplicações e referências inválidas.
- O `server/.env` não deve ser incluído no ZIP compartilhado.

## Validação realizada

- ESLint nos arquivos alterados: aprovado.
- Build Vite: não concluído neste ambiente, porque o pacote recebido não contém o binding nativo Linux do Rolldown. Reinstalar dependências no Windows e executar `npm run build`.
- Testes integrados com PostgreSQL: pendentes no ambiente da usuária.

## Testes manuais recomendados

1. Entrar com usuário autorizado para visualizar os catálogos.
2. Criar ou editar uma filial, departamento ou cargo e confirmar que formulários de funcionário e telas relacionadas refletem o dado sem limpar manualmente o navegador.
3. Criar/editar/excluir uma posição no Organograma e confirmar a atualização no formulário do funcionário e em Candidatos.
4. Entrar com usuário sem permissão e confirmar que as APIs retornam acesso negado.
5. Confirmar no PostgreSQL que as alterações persistem após reiniciar a API.
