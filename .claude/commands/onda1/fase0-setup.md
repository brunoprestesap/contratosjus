---
description: "Onda 1 / Fase 0 — Setup completo: Docker Compose, Next.js 16, Prisma, NextAuth, shadcn/ui, Vitest"
---

# Fase 0 — Setup do Projeto

Inicializar todo o projeto do zero. Ao final desta fase, `docker compose up` deve subir a aplicação funcional.

## 1. Docker Compose

Criar `docker-compose.yml`:
- Serviço `db`: PostgreSQL 16, volume persistente `pgdata`, porta 5432 interna
- Serviço `app`: build do Dockerfile, porta 3000, depende de `db`, variáveis via `.env`

Criar `docker-compose.prod.yml` (produção com restart always).

Criar `Dockerfile` multi-stage:
- Stage `deps`: instala node_modules
- Stage `builder`: executa `npm run build`
- Stage `runner`: copia build, roda `npm start`

## 2. Next.js 16

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

## 3. Dependências

```bash
npm install prisma @prisma/client
npm install next-auth@beta @auth/prisma-adapter
npm install bcryptjs && npm install -D @types/bcryptjs
npm install zod
npm install react-hook-form @hookform/resolvers
npm install date-fns
npm install sonner
npm install -D vitest @vitejs/plugin-react
```

## 4. shadcn/ui

```bash
npx shadcn@latest init
```

Instalar componentes necessários para Onda 1:
```bash
npx shadcn@latest add button input label card table form select dialog alert badge progress accordion separator skeleton tooltip popover sonner
```

## 5. Prisma

```bash
npx prisma init
```

Criar schema completo da Onda 1. Consultar a skill `prisma-patterns` → `references/schema-onda1.md` para o schema de referência. Copiar EXATAMENTE o schema de referência.

```bash
npx prisma migrate dev --name init
npx prisma generate
```

## 6. Seed

Criar `prisma/seed.ts`:
- Usuário Fiscal: nome "Fiscal NUTEC", email "fiscal@jfap.jus.br", senha "SenhaForte@2026!", role FISCAL
- Usuário Diretor: nome "Diretor NUTEC", email "diretor@jfap.jus.br", senha "SenhaForte@2026!", role DIRETOR
- Senhas hasheadas com bcrypt custo 12

Adicionar em `package.json`:
```json
"prisma": { "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts" }
```

## 7. Estrutura de Pastas

Criar toda a árvore de diretórios:
```
src/app/(auth)/login/
src/app/(dashboard)/
src/app/(dashboard)/contratos/
src/app/(dashboard)/contratos/novo/
src/app/(dashboard)/contratos/[id]/
src/app/(dashboard)/contratos/[id]/editar/
src/app/(dashboard)/usuarios/
src/app/(dashboard)/usuarios/novo/
src/app/(dashboard)/usuarios/[id]/editar/
src/components/ui/
src/components/layout/
src/components/contratos/
src/components/usuarios/
src/lib/validators/
src/actions/
src/types/
tests/lib/
```

## 8. Configurações

Criar `.env.example`:
```
DATABASE_URL="postgresql://postgres:postgres@db:5432/contratos?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gerar-com-openssl-rand-base64-32"
```

Criar `.env.local` com valores de dev (mesmos do example).

Adicionar `.env.local` e `.env.production` ao `.gitignore`.

Criar `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

Criar `src/lib/prisma.ts` (singleton):
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

## 9. Verificação

Ao final, verificar:
- [ ] `docker compose up -d` sobe sem erros
- [ ] `npm run dev` inicia em localhost:3000
- [ ] `npx prisma studio` mostra todas as tabelas
- [ ] `npx prisma db seed` cria os 2 usuários
- [ ] `npx vitest run` executa sem erros (mesmo sem testes ainda)
- [ ] Imports com `@/` funcionam
