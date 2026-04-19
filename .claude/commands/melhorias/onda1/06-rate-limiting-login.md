---
description: "Rate limiting por IP no endpoint de login (mitigar brute force distribuído)"
---

## Ordem de execução: 6 de 7 (Grupo A — Onda 1)

Sexto porque **mexe em fluxo de auth** — risco médio. Só depois dos passos 1–5 estabilizados.

## Contexto

`security.md` já exige bloqueio após 5 tentativas por conta (`failedAttempts`/`lockedUntil`). Isso não protege contra brute force distribuído que troca de e-mail a cada tentativa. Rate limit por IP fecha essa lacuna.

## Passos

1. Decidir estratégia:
   - **Em memória (MVP)**: `Map<ip, { count, resetAt }>` em módulo singleton — perde estado ao reiniciar, mas OK para servidor único JFAP.
   - **Postgres**: tabela `LoginAttempt(ip, timestamp)` — persiste entre restarts, consulta `count WHERE timestamp > now() - interval '15 min'`.
   - **Upstash/Redis**: overkill para MVP.

   **Recomendação**: Postgres (alinha com stack, sem infra nova).

2. Criar model `LoginAttempt` em `schema.prisma` e migrar.
3. Adicionar no callback `authorize` do NextAuth (`src/lib/auth.ts`):
   - Pegar IP de `req.headers.get("x-forwarded-for")` (ou `x-real-ip`).
   - Contar tentativas do IP nos últimos 15 min.
   - Se `> 20`, rejeitar com erro genérico "Muitas tentativas. Tente novamente em 15 minutos".
   - Em caso de falha, `INSERT` novo registro.
4. Criar job de limpeza (cron ou `DELETE` na próxima tentativa) para não acumular registros antigos.
5. Criar teste em `tests/actions/auth.test.ts` simulando 21 tentativas seguidas.

## Validação

- Script `for i in {1..25}; do curl -X POST /api/auth/callback/credentials; done` é barrado a partir da 21ª.
- Login legítimo continua funcionando.
- Campo `lockedUntil` por conta continua funcionando em paralelo.
