# Estrutura atual do projeto

## Organização

```text
src/
├── assets/                 # Imagens e recursos estáticos
├── components/             # Componentes reutilizáveis
│   ├── branches/
│   ├── employees/
│   │   └── sections/       # Seções independentes do cadastro
│   ├── layout/
│   ├── roles/
│   ├── ui/
│   └── users/
├── data/                   # Dados iniciais e configurações estáticas
├── hooks/                  # Hooks personalizados
├── pages/                  # Páginas ligadas às rotas
├── services/               # Regras de acesso e persistência
├── styles/                 # Estilos compartilhados
└── utils/                  # Máscaras, datas e funções auxiliares
```

## Responsabilidades

### `components`
Responsáveis principalmente pela apresentação e interação da interface.

### `hooks`
Concentram comportamentos reutilizáveis do React, como o formulário de funcionário e os toasts.

### `services`
Concentram operações e regras que não precisam ficar dentro dos componentes.

- `employee.js`: leitura, criação, atualização e exclusão de funcionários.
- `employeeValidation.js`: validações do cadastro de funcionário.
- `dashboard.js`: dados calculados para os cards do dashboard.
- `permissions.js`: autorização baseada no cargo do usuário.
- `storage.js`: acesso seguro ao `localStorage`.

### `utils`
Funções pequenas e reutilizáveis, sem dependência da interface.

- `masks.js`: máscaras dos campos.
- `date.js`: leitura e cálculo de datas no padrão brasileiro.
- `employeeHelpers.js`: comportamento do formulário.

## Regra para novas funcionalidades

Quando uma funcionalidade crescer, evitar colocar toda a lógica dentro de uma página.

Preferir:

1. Página → coordena a funcionalidade.
2. Componente → apresenta a interface.
3. Hook → concentra estado/comportamento reutilizável.
4. Service → concentra persistência e regras de negócio.
5. Util → funções puras e pequenas.

## Persistência atual

O projeto ainda utiliza `localStorage`.

Essa decisão foi mantida para não introduzir uma mudança estrutural grande neste momento.

No futuro, o acesso aos dados poderá ser substituído por uma API/banco sem precisar espalhar chamadas de armazenamento pelos componentes.

## Próximas evoluções planejadas

- TanStack Query para estado assíncrono, cache e sincronização.
- Firebase para infraestrutura/hospedagem conforme a arquitetura evoluir.
- Tailwind CSS para novas áreas ou uma futura padronização visual.
- Framer Motion para animações pontuais.
- Next.js como possibilidade de migração futura.
- Vercel como possibilidade de deploy.


## Fundação de infraestrutura

A partir desta etapa, o projeto possui uma API Node/Express e uma estrutura PostgreSQL multiempresa em `server/`. O frontend possui um cliente HTTP em `src/services/api.js`, preparado para a migração gradual do localStorage. Documentos físicos serão armazenados no Firebase Storage e seus metadados no PostgreSQL. Web, Desktop e Mobile consumirão a mesma API.
