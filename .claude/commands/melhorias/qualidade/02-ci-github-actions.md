---
description: "CI no GitHub Actions: build + typecheck + vitest em cada PR"
---

## Ordem de execução: 2 de 3 (Grupo B — Qualidade)

Segundo porque depende dos scripts `typecheck`/`test` do passo B1, e **estende o gate local para o remoto**.

## Contexto

Gate local (husky) pode ser pulado com `--no-verify`. CI é imposto pelo branch protection e garante que `main` permanece verde.

## Passos

1. Criar `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on:
     pull_request:
       branches: [main]
     push:
       branches: [main]
   jobs:
     check:
       runs-on: ubuntu-latest
       services:
         postgres:
           image: postgres:16
           env:
             POSTGRES_PASSWORD: postgres
             POSTGRES_DB: contratos_test
           ports: ['5432:5432']
           options: >-
             --health-cmd pg_isready
             --health-interval 10s
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: npm
         - run: npm ci
         - run: npx prisma generate
         - run: npm run typecheck
         - run: npm run lint
         - run: npx prisma migrate deploy
           env:
             DATABASE_URL: postgresql://postgres:postgres@localhost:5432/contratos_test
         - run: npx vitest run
           env:
             DATABASE_URL: postgresql://postgres:postgres@localhost:5432/contratos_test
         - run: npm run build
   ```
2. Configurar branch protection em `main`: exigir status check `check`.
3. Decidir: build em matrix de Node 20 e 22? Para JFAP, só a versão alvo de produção — sem matrix.
4. Adicionar cache do `.next/cache` para acelerar builds.

## Validação

- PR com erro de tipo aparece vermelho no GitHub.
- Merge em `main` bloqueado até CI verde.
- Tempo total do job < 5 min.
