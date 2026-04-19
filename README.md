# Sistema de Gestão e Controle de Desembolso de Contratos

Aplicação web interna para fiscalização de contratos públicos no Judiciário Federal (JFAP/NUTEC), com foco em controle de contratos, empenhos, pagamentos mensais e aditivos conforme Leis 14.133/2021 e 8.666/1993.

## Stack

- Next.js 16 (App Router)
- TypeScript (strict mode)
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma ORM
- Auth.js v5 (NextAuth)
- Zod + React Hook Form
- Vitest
- Docker + Docker Compose

## Requisitos

- Node.js 20+
- npm 10+
- Docker e Docker Compose

## Primeiros passos

1. Instale dependencias:

```bash
npm install
```

2. Configure variaveis de ambiente:

```bash
cp .env.example .env.local
```

3. Suba o PostgreSQL com Docker:

```bash
docker compose up -d
```

4. Rode migrations e seed (primeira vez):

```bash
npm run db:migrate
npm run db:seed
```

5. Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse em `http://localhost:3000`. O Next.js roda no host (hot reload nativo) e o PostgreSQL roda em container.

## Validar imagem de produção localmente

Para testar a imagem standalone antes de fazer deploy:

```bash
docker compose up db -d
docker build -t contratosjus-app .
docker run --rm --network contratosjus_default \
  -e DATABASE_URL='postgresql://contratos:contratos@db:5432/contratos?schema=public' \
  -p 3000:3000 contratosjus-app
```

O entrypoint aplica `prisma migrate deploy` antes de iniciar o servidor.

## Scripts principais

- `npm run dev`: inicia o servidor de desenvolvimento
- `npm run build`: gera build de producao
- `npm run start`: inicia app em modo producao
- `npm run lint`: roda ESLint
- `npm run test`: roda testes unitarios (sem watch)
- `npm run test:watch`: roda testes em watch mode

## Prisma

- `npx prisma migrate dev`: cria/aplica migrations em desenvolvimento
- `npx prisma db seed`: popula dados iniciais
- `npx prisma studio`: abre interface visual do banco

## Estrutura do projeto

- `src/app/(auth)/`: rotas publicas de autenticacao
- `src/app/(dashboard)/`: rotas protegidas do sistema
- `src/actions/`: Server Actions (mutations e regras de dominio)
- `src/components/`: componentes de UI e layout
- `src/lib/`: auth, prisma client, utilitarios e validacoes
- `src/types/`: tipos compartilhados
- `prisma/`: schema, migrations e seed
- `tests/`: testes unitarios
- `docs/`: documentacao complementar

## Regras de negocio centrais

- Saldo contratual recalculado automaticamente: `valor global - total pago`
- Evolucao de status de pagamento: `Pendente -> Atestado -> Liquidado -> Pago`
- Bloqueios para contratos encerrados/expirados e inconsistencias de data
- Alertas para extrapolacao de valores e lacunas de registro mensal

## Boas praticas

- Nao commitar arquivos `.env`
- Usar `Server Components` por padrao e `Client Components` apenas quando necessario
- Compartilhar validacoes com Zod entre frontend e backend
- Criar testes para regras criticas (calculos e validacoes)

## Deploy

Para detalhes de deploy e operacao em producao, consulte `DEPLOY.md`.
