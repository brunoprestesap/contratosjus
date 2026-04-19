# Testes E2E — Playwright

Cobrem o fluxo completo do wizard de **Pesquisa de Preços** em browser real (Chromium), com Prisma apontando para um banco isolado `contratos_test` e mocks de APIs externas (Dados Abertos + Maritaca IA) via `page.route()`.

## Setup (uma vez)

Pré-requisitos: Postgres já rodando via `docker compose up -d` (reusa o container do dev).

```bash
npm run test:e2e:install   # baixa chromium (pula se já tem)
npm run test:e2e:init      # cria banco contratos_test + migrations
```

## Rodando

```bash
npm run test:e2e           # headless, 1 worker, serial
npm run test:e2e:ui        # modo interativo (trace viewer)
```

Playwright sobe automaticamente `npm run dev:e2e` na porta **3001** com `NODE_ENV=test`. O Next carrega `.env.test` (ignora `.env.local` neste modo — comportamento default do Next). Não conflita com seu `npm run dev` habitual na 3000.

## Estrutura

```
e2e/
  fixtures/
    seed.ts          Limpa + insere usuário FISCAL e contrato teste via Prisma
    auth.ts          Forja cookie de sessão NextAuth (pula tela de login)
    api-mocks.ts     Mocks determinísticos (5 amostras, IA exclui 1)
  tests/
    pesquisa-precos-wizard.spec.ts
```

## O que o happy path cobre

1. Criar pesquisa (SERVICE)
2. Step 1 — Código: CATSER manual
3. Step 2 — Consulta: 5 amostras inseridas
4. Step 3 — Amostras: filtro IA exclui 1 (badge `Excluída · IA`)
5. Step 4 — Justificativa: stats calculadas + texto manual
6. Step 5 — Finalizar: PDF gerado, link `Abrir documento gerado`

## Troubleshooting

**`CREATE DATABASE` falha com permissão**: o usuário do `.env.test` precisa da role `CREATEDB`. Em `docker-compose.yml` o superuser `contratos` já tem.

**Teste trava no login**: cookie de sessão é forjado com `NEXTAUTH_SECRET` — tem que ser **o mesmo** em `.env.test` e no middleware/auth. Mudou o secret? Limpe e regenere.

**Cookies inválidos em localhost:3001**: o nome do cookie em dev é `authjs.session-token` (sem prefixo `__Secure-`). Se o NextAuth atualizar essa convenção, ajuste `SESSION_COOKIE_NAME` em `fixtures/auth.ts`.

**Amostras inesperadas**: o mock de `dadosabertos.compras.gov.br` devolve `DEFAULT_SAMPLES` do arquivo `api-mocks.ts`. Para outro cenário, passe `samples` customizados para `mockDadosAbertos(page, [...])`.

**Resetar estado**: `npm run test:e2e:init` recria schema. Para apagar tudo do zero:

```bash
docker compose exec db psql -U contratos -c 'DROP DATABASE IF EXISTS contratos_test'
npm run test:e2e:init
```

## Referências

- [Playwright — Test Fixtures](https://playwright.dev/docs/test-fixtures)
- [Auth.js — Edge Compatibility](https://authjs.dev/guides/edge-compatibility)
- [Next.js — Testing](https://nextjs.org/docs/app/guides/testing/playwright)
