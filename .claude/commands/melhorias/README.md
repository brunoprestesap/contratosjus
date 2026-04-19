---
description: "Índice das sugestões de melhorias com ordem de execução recomendada"
---

## Índice de Melhorias — Ordem de Execução

Cada grupo tem ordem própria. Execute do menor número para o maior dentro de cada grupo. Grupos podem rodar em paralelo.

### Grupo A — Onda 1 (seguro, dentro do escopo atual)

Ordem justificada: migrations inofensivas → utilidades reutilizáveis → validações → boundaries → config → auth → dev data.

1. `/melhorias:onda1:01-prisma-indices` — Índices no schema (migração pura)
2. `/melhorias:onda1:02-format-helpers` — Helpers pt-BR centralizados (reutilizados depois)
3. `/melhorias:onda1:03-zod-refinements-datas` — Validador de datas reaproveitável
4. `/melhorias:onda1:04-error-boundaries` — `error.tsx` por rota
5. `/melhorias:onda1:05-security-headers` — Headers em `next.config.ts`
6. `/melhorias:onda1:06-rate-limiting-login` — Proteção contra brute force distribuído
7. `/melhorias:onda1:07-seed-rico` — Seed de dev com cenários variados

### Grupo B — Qualidade técnica transversal

Ordem justificada: gate local rápido → gate remoto → observabilidade.

1. `/melhorias:qualidade:01-husky-lintstaged` — Pre-commit local
2. `/melhorias:qualidade:02-ci-github-actions` — CI no PR (mesmos checks)
3. `/melhorias:qualidade:03-logger-estruturado` — Logger com redaction

### Grupo C — Propostas para ondas futuras (exigem confirmação)

Não execute sem OK do usuário — violam `scope-control.md`.

1. `/melhorias:propostas:01-onda2-auditoria-middleware` — Prisma `$extends` para auditoria
2. `/melhorias:propostas:02-onda3-relatorios-pdf` — Avaliação de `@react-pdf/renderer`
3. `/melhorias:propostas:03-onda3-dashboard-cache` — `cache()` do React 19

### Grupo D — Backlog (fora das ondas planejadas)

Ordem justificada: ganho rápido → infra → depende de Onda 2 → mudança maior.

1. `/melhorias:backlog:01-export-csv` — Exportação CSV da lista
2. `/melhorias:backlog:02-notificacoes-email` — E-mail de vencimento
3. `/melhorias:backlog:03-historico-alteracoes` — Diff por campo (depende de auditoria)
4. `/melhorias:backlog:04-2fa-totp` — 2FA para Fiscal
