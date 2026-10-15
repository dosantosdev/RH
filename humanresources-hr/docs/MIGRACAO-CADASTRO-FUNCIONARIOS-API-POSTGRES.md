# Migração — cadastro de funcionários para PostgreSQL

## Alterações desta etapa
- O formulário sincroniza os catálogos organizacionais com o PostgreSQL antes de validar o cadastro.
- Os IDs de filial, departamento, cargo e posição são enviados como relações do funcionário, além de permanecerem no `registrationData` durante a compatibilidade.
- A validação do cargo compara IDs como texto para compatibilidade com UUIDs normalizados.
- O backend verifica se as relações pertencem à mesma empresa autenticada e se departamento/posição correspondem à filial e ao cargo selecionados antes de criar o funcionário.
- O backend rejeita cadastros com CPF ou RG já utilizado na mesma empresa, respondendo HTTP 409.
- O cache local de funcionários continua sendo atualizado temporariamente para compatibilidade com telas ainda não migradas; não é fonte oficial.

## Testes manuais pendentes
1. Entrar com usuário que tenha `employees_create` e permissões de consulta dos catálogos necessários.
2. Cadastrar funcionário selecionando filial, departamento, cargo e posição existentes.
3. Confirmar no PostgreSQL se `branch_id`, `department_id`, `role_id` e `position_id` foram persistidos.
4. Tentar cadastrar CPF já utilizado e confirmar HTTP 409 sem criar duplicata.
5. Tentar enviar ID de catálogo inexistente ou de outra empresa e confirmar HTTP 400.
6. Atualizar a tela, consultar o funcionário pela busca e confirmar os dados relacionais.
7. Testar um cadastro sem campos relacionais opcionais, se permitido pelas regras da empresa.

## Limitações
- A verificação de duplicidade é validada no backend, mas não há índice único por CPF/RG nesta etapa; cadastros simultâneos ainda exigem atenção e eventual constraint dedicada após limpeza dos dados históricos.
- O build e os testes integrados dependem da execução no ambiente com PostgreSQL configurado.
- A importação em massa dos registros legados e o Firebase Storage permanecem pendentes.
