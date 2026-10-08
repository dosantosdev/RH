# Human Resources HR — Fundação PostgreSQL + API + Google/Firebase

Esta etapa cria a fundação de infraestrutura para o sistema funcionar como:

- Web (React/Vite)
- Desktop (Electron, futuramente)
- Mobile/portal do funcionário (futuramente)
- uma única API
- um único PostgreSQL como banco principal
- Firebase/Google Storage para arquivos

## O que esta etapa faz

### PostgreSQL

A migration `server/sql/001_init.sql` cria uma estrutura multiempresa para:

- empresas e filiais;
- departamentos, cargos e posições do organograma;
- usuários, perfis e permissões;
- funcionários e dependentes;
- documentos;
- vagas, candidatos, candidaturas, etapas e entrevistas;
- treinamentos e certificados;
- ponto;
- folha;
- férias;
- avaliações;
- eventos financeiros;
- solicitações do funcionário;
- auditoria.

O PostgreSQL guarda dados e metadados. O arquivo físico de um documento fica no Storage.

### API

A API Node/Express já possui:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/me`
- `GET /api/me/documents`
- `GET /api/me/payrolls`
- `GET /api/employees`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PATCH /api/employees/:id`
- `GET /api/documents/employee/:employeeId`
- `POST /api/documents/employee/:employeeId`
- `GET /api/documents/:id/download`
- `DELETE /api/documents/:id`
- `GET /api/employee-requests/mine`
- `POST /api/employee-requests/mine`
- `GET /api/employee-requests`
- `PATCH /api/employee-requests/:id`

A autorização acontece no backend. O frontend não é considerado uma barreira de segurança.

## Instalação local

### 1. Subir PostgreSQL

Com Docker:

```bash
docker compose up -d
```

Ou use uma instalação PostgreSQL local/gerenciada e ajuste `DATABASE_URL`.

### 2. Configurar API

Entre em `server/`:

```bash
cd server
copy .env.example .env
```

No Linux/macOS:

```bash
cp .env.example .env
```

Altere pelo menos:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_PASSWORD`

### 3. Instalar dependências

```bash
npm install
```

### 4. Criar estrutura e administrador

```bash
npm run db:setup
```

### 5. Iniciar API

```bash
npm run dev
```

A API ficará em:

```text
http://localhost:3333
```

### 6. Configurar frontend

Na raiz do React:

```text
.env
VITE_API_URL=http://localhost:3333/api
```

O cliente preparado está em:

```text
src/services/api.js
src/config/api.js
```

Ele não substitui ainda o `localStorage` dos módulos existentes. Esta é uma decisão proposital: primeiro criamos a fundação; depois migramos cada módulo de forma controlada.

## Firebase Storage

Para documentos, configure no `server/.env`:

```text
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_STORAGE_BUCKET=
```

A conta de serviço do Google **não deve ser colocada no frontend nem commitada no Git**.

O backend usa Firebase Admin SDK para enviar arquivos ao Storage e gerar URLs temporárias de leitura.

## Arquitetura

```text
                    WEB
                     │
                  React
                     │
                     ▼
                   API
                     │
             ┌───────┴────────┐
             │                │
        PostgreSQL      Firebase Storage
             │                │
          dados             arquivos
             │
      ┌──────┼────────┐
      │      │        │
    Web   Desktop   Mobile
```

Web, Desktop e Mobile não terão bancos separados.

## Portal do funcionário

A API já possui uma primeira base para o futuro aplicativo/portal:

- identidade do usuário;
- permissões;
- perfil do funcionário;
- documentos próprios;
- holerites fechados;
- solicitações próprias.

Isso permite evoluir para:

- visualizar holerites;
- solicitar uniforme;
- solicitar EPI;
- enviar documentos;
- acompanhar solicitações;
- consultar ponto;
- consultar férias;
- consultar treinamentos.

A regra é sempre aplicada no backend: funcionário só acessa os próprios dados.

## Multiempresa

A estrutura utiliza `company_id` nas entidades principais.

Isso prepara o sistema para SaaS:

```text
Empresa A
 ├── usuários
 ├── funcionários
 ├── documentos
 └── financeiro

Empresa B
 ├── usuários
 ├── funcionários
 ├── documentos
 └── financeiro
```

As consultas da API utilizam a empresa presente no token, evitando depender de IDs enviados pelo frontend.

## Segurança

Antes de produção:

- trocar `JWT_SECRET`;
- usar HTTPS;
- configurar CORS somente para domínios reais;
- usar senha administrativa forte;
- configurar backup do PostgreSQL;
- configurar políticas de retenção do Storage;
- configurar logs/auditoria;
- nunca enviar credenciais de PostgreSQL ao frontend;
- nunca colocar service account do Firebase no React;
- revisar permissões por perfil;
- configurar rate limiting na API;
- configurar proteção contra brute force no login.

## Próxima etapa

A próxima etapa planejada é a aba **Arquivo**, já consumindo esta fundação:

```text
Funcionário
    ↓
metadados do documento → PostgreSQL
arquivo físico          → Firebase Storage
```

Depois disso, a migração do `localStorage` será feita módulo por módulo.

## Importante

Esta etapa **não migra automaticamente os dados atuais do localStorage para PostgreSQL**. Isso será feito em uma etapa própria de migração, porque precisamos mapear os formatos atuais de cada módulo antes de inserir dados reais no banco.

Também não substitui ainda o login atual do React. A API já tem autenticação própria preparada para a transição.
