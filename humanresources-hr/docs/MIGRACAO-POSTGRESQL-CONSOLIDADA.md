# Migração consolidada para PostgreSQL — revisão de 15/10/2026

## Base e objetivo

Esta entrega parte do ZIP mais recente enviado pela usuária e consolida a ponte de persistência para as abas que ainda dependem do contrato síncrono do `localStorage`. O PostgreSQL é a fonte oficial para chaves já existentes no banco; o `localStorage` permanece como cache de compatibilidade, sem limpeza automática.

## Migrações recentes de leitura do Ponto

- Fechamento Mensal: consulta funcionários, filiais, marcações e jornadas por endpoint autenticado com permissão própria.
- Horas Extras: consulta dados pela API com `ponto_horas_extras_view`.
- Faltas e Atrasos: consulta dados pela API com `ponto_faltas_view`; os atestados são enviados somente a este domínio.
- Os endpoints limitam o escopo pela empresa do token e aceitam períodos de até 367 dias. A camada de registros de ponto ainda utiliza JSONB agregado, e a escrita de fechamento precisa de validação adicional.

## Áreas contempladas pela ponte

- Estado geral compatível (`client_state`), sem credenciais, sessão ou chaves com dados pessoais que já possuem APIs específicas.
- Treinamentos: treinamentos, participantes, avaliações de treinamento e certificados (`trainings`).
- Avaliações: avaliações, modelos e fluxos (`evaluations`).
- Ponto: batidas, jornadas, escalas atribuídas, banco de horas, fechamentos mensais e atestados médicos (`timekeeping`).
- Recrutamento: vagas, candidatos, etapas e entrevistas (`recruitment`). Os links públicos com tokens continuam fora da sincronização genérica.
- Financeiro: histórico salarial (`salaries`), folha (`payroll`), proventos/descontos (`financial_events`) e férias/13º/rescisões (`financial_advanced`).
- APIs específicas já existentes para autenticação/usuários, funcionários/dependentes, filiais/departamentos/cargos/posições, documentos, solicitações, configurações e chat são preservadas.

## Segurança ajustada nesta revisão

- A rota `/api/app-records` verifica permissões de leitura e gravação para Treinamentos, Avaliações, Recrutamento e módulos financeiros.
- O agregado legado `timekeeping` contém dados de várias telas. Até separar cada conjunto em uma rota/tabela por domínio, ele exige `ponto_controle_view` para leitura e `ponto_controle_edit` para gravação; permissões de acesso apenas ao espelho individual não autorizam baixar todo o conjunto.
- O frontend não sincroniza módulos dedicados para usuários sem permissão de leitura e não envia alterações desses módulos sem permissão de gerenciamento.
- Chaves `employees`, `branches`, `departments` e `positions` foram excluídas da ponte genérica, pois já possuem rotas de domínio.
- A sincronização não remove registros locais. Quando uma chave já existe no PostgreSQL, a versão do banco prevalece no cache.
- O backend determina a empresa pelo token; o cliente não escolhe `company_id`.

## Limitações que permanecem explícitas

- Esta ainda é uma camada de compatibilidade com JSONB em `app_records`, não a normalização relacional definitiva de cada aba.
- Treinamentos e Avaliações armazenam listas agregadas. A autorização impede acesso de perfis sem permissão de gestão/visualização da área, mas a experiência de autoatendimento do funcionário exige endpoints filtrados por usuário antes de habilitar sincronização individual dessas listas.
- O módulo agregado de Ponto precisa ser dividido por domínio para permitir que as permissões específicas de jornadas, atestados, banco de horas e espelho sejam aplicadas isoladamente.
- Os links públicos de candidatura ainda precisam de uma implementação própria com tokens protegidos no backend.
- A importação legada é assistida, exclusiva para administrador, e não limpa o navegador.
- O armazenamento binário de documentos no Firebase permanece pendente, conforme planejado para a última etapa.

## Aplicação

1. Faça backup do projeto e do banco PostgreSQL.
2. Extraia o ZIP e preserve o arquivo local `server/.env`; ele não deve ser compartilhado.
3. Na pasta `server`, execute `npm install` se necessário e `npm run db:migrate`.
4. Inicie o backend e, na raiz do frontend, execute `npm install`, `npm run build` e `npm run dev`.
5. Teste com administrador, Gestão de RH e Funcionário. Valide listar/criar/editar/excluir, atualização da página, isolamento entre empresas e bloqueio HTTP 403 para módulos sem permissão.
6. Não considere a migração concluída em produção até executar os testes integrados com o banco real e verificar as listas de autoatendimento.

## Validações desta revisão

- `node --check` nos arquivos JavaScript do servidor e no serviço `src/services/storage.js`.
- O build Vite não foi executado nesta sessão porque as dependências não estavam instaladas no ambiente de validação.
- Não houve conexão com o PostgreSQL real da usuária; testes funcionais e de isolamento por empresa continuam pendentes.
