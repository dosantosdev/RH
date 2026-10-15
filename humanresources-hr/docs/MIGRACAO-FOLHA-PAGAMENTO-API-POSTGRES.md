# Migração da Folha de Pagamento para API/PostgreSQL

## Escopo desta etapa

- A tela `src/pages/Financeiro/Folha/Folha.jsx` consulta `GET /api/me/financial-data` ao abrir e ao trocar a competência.
- A resposta autenticada é usada para hidratar o cache compatível de funcionários, folhas, eventos financeiros e histórico salarial.
- Quando o PostgreSQL retorna uma lista vazia mas há dados locais existentes, o cache não é apagado silenciosamente; a interface informa que pode ser necessária uma importação.
- A tela exibe estados de carregamento, erro de API e aviso de dados legados.
- A identificação do usuário que cria a folha passa a usar `getApiUser()`, evitando depender do objeto antigo `loggedUser`.
- A rota `GET /api/me/financial-data` normaliza os IDs dos funcionários também dentro de `payrolls[].employees[]`, incluindo referências numéricas legadas.
- O serviço `src/services/payroll.js` compara IDs de funcionários como strings para dar suporte a UUIDs do PostgreSQL.

## Limitações que permanecem

- A criação, recálculo, fechamento, reabertura, exclusão e lançamento de itens ainda usam o contrato síncrono do serviço `payroll.js` e a ponte de persistência compatível em `app_records`.
- Esta etapa não implementa endpoints transacionais dedicados para cada mutação da folha.
- Os cálculos tributários e trabalhistas devem ser validados antes de qualquer uso operacional real. A migração técnica não equivale a homologação de folha de pagamento.
- A validação com banco PostgreSQL real e os testes ponta a ponta continuam pendentes.

## Testes recomendados

1. Abrir a folha com usuário que tenha `finance_payroll_view` e conferir a competência atual.
2. Trocar competência e conferir que a folha correspondente é atualizada sem recarregar a página.
3. Criar e editar uma folha usando funcionários cujos IDs são UUIDs.
4. Confirmar que folhas e eventos legados com IDs numéricos continuam vinculados aos funcionários corretos.
5. Simular erro de API e conferir que a tela avisa sobre a possibilidade de dados desatualizados.
6. Verificar que usuários sem permissão financeira não conseguem obter os dados pela API.
7. Confirmar no PostgreSQL que as alterações de folha são persistidas e que a resposta de gravação é tratada corretamente.

