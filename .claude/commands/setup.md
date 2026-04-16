---
description: "Inicializa o projeto completo: Docker Compose, Next.js 16, Prisma, NextAuth, shadcn/ui, estrutura de pastas"
---

## Tarefa

Inicializar o projeto do zero seguindo o Plano de Desenvolvimento (Fase 0).

## Passos

1. Criar `docker-compose.yml` com serviços:
   - `app`: Next.js 16 (Dockerfile multi-stage)
   - `db`: PostgreSQL 16 (volume persistente `pgdata`)

2. Criar `Dockerfile` com multi-stage build (deps → builder → runner)

3. Inicializar Next.js 16 com TypeScript, App Router, TailwindCSS, `@/` imports

4. Instalar dependências:
   - `prisma @prisma/client`
   - `next-auth@beta` (Auth.js v5)
   - `bcryptjs @types/bcryptjs`
   - `zod`
   - `react-hook-form @hookform/resolvers`
   - shadcn/ui (via `npx shadcn@latest init`)

5. Configurar Prisma:
   - `npx prisma init`
   - Criar schema completo da Onda 1 (ver `.claude/skills/prisma-patterns/references/schema-onda1.md`)
   - Executar migration inicial

6. Criar estrutura de pastas conforme CLAUDE.md

7. Criar `.env.example` com todas as variáveis necessárias

8. Criar `.env.local` com valores de desenvolvimento

9. Configurar Vitest (`vitest.config.ts`)

10. Criar seed script (`prisma/seed.ts`) com 2 usuários:
    - Fiscal: fiscal@jfap.jus.br / SenhaForte@2026
    - Diretor: diretor@jfap.jus.br / SenhaForte@2026

## Critério de aceite

- `docker compose up -d` sobe app + banco sem erros
- `npm run dev` inicia em localhost:3000
- `npx prisma studio` mostra tabelas criadas
- `npx vitest run` executa sem erros
