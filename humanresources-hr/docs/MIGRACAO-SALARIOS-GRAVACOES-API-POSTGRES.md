# Migração das gravações salariais para API autenticada

## Escopo desta etapa

A tela `src/pages/Financeiro/Salarios/Salarios.jsx` agora grava alterações pela API `/api/salaries` em vez de chamar diretamente os mutadores síncronos de `src/services/salary.js`.

- `POST /api/salaries`: cria um registro salarial.
- `PUT /api/salaries/:id`: altera salário, vigência, motivo e observações.
- `DELETE /api/salaries/:id`: remove um registro.
- `GET /api/salaries`: disponibiliza o histórico para clientes autorizados.

## Regras implementadas

- Leitura exige `finance_salary_view` ou `finance_salary_manage`; mutações exigem `finance_salary_manage`.
- O escopo de empresa vem da sessão autenticada, nunca de um `companyId` fornecido pelo navegador.
- O backend verifica se o funcionário pertence à empresa, inclusive aceitando os aliases legados armazenados no cadastro.
- Valores, data de vigência, motivo, observações, tamanho do histórico e duplicidade de vigência para o mesmo funcionário são validados.
- As mutações são serializadas por empresa usando advisory lock transacional do PostgreSQL. Isso evita que duas requisições simultâneas leiam a mesma lista JSONB e sobrescrevam uma à outra.
- A interface só atualiza `localStorage` depois de receber o histórico confirmado pela API e exibe erro se a operação falhar.
- IDs novos são UUIDs e as comparações na tela não convertem os IDs para números.

## Limitação que permanece

O histórico continua armazenado como lista JSONB em `app_records` (`module_key = salaries`, `record_key = salaryHistory`). O endpoint reduz o risco de concorrência e protege as operações, mas ainda não é a normalização relacional definitiva. A próxima etapa deve migrar o histórico para tabela própria e definir a estratégia idempotente de importação dos registros legados.

## Validações

Nesta entrega foram realizadas verificações estáticas e de sintaxe disponíveis no ambiente. Ainda é necessário testar com PostgreSQL real:
1. Criar, editar e excluir um registro e recarregar a tela.
2. Rejeitar usuário sem `finance_salary_manage` com HTTP 403.
3. Rejeitar funcionário de outra empresa.
4. Rejeitar salário/data/motivo inválidos e vigência duplicada.
5. Disparar duas gravações simultâneas e confirmar que ambas não se sobrescrevem.
6. Confirmar que o histórico legado com ID numérico continua visível e pode ser atualizado sem perder o vínculo do funcionário.

A migração técnica não substitui a homologação de regras trabalhistas e cálculos salariais.
