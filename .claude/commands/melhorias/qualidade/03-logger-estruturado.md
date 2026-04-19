---
description: "Logger estruturado (pino) com redaction de campos sensíveis"
---

## Ordem de execução: 3 de 3 (Grupo B — Qualidade)

Último porque **toca múltiplos arquivos** — refatoração mais invasiva, vale fazer com gates (husky + CI) já ativos para pegar regressões.

## Contexto

`console.log` não tem níveis, não tem timestamp estruturado, não redige dados sensíveis. Órgão federal exige log auditável. Pino é rápido, JSON-native e tem `redact` built-in.

## Passos

1. Instalar: `npm i pino pino-pretty`.
2. Criar `src/lib/logger.ts`:
   ```ts
   import pino from "pino";
   
   export const logger = pino({
     level: process.env.LOG_LEVEL ?? "info",
     redact: {
       paths: ["password", "senha", "token", "*.password", "*.senha", "authorization", "cookie"],
       censor: "[REDACTED]",
     },
     transport: process.env.NODE_ENV === "development"
       ? { target: "pino-pretty" }
       : undefined,
   });
   ```
3. Substituir `console.log`, `console.error`, `console.warn` em `src/actions/` e `src/lib/` por `logger.info`, `logger.error`, etc. Manter `console.*` apenas em scripts (`prisma/seed.ts`).
4. Conectar ao `error.tsx` (passo A4) para logar erros de boundary.
5. Adicionar lint rule para proibir `console.*` em `src/`:
   ```json
   "rules": { "no-console": ["error", { "allow": ["warn", "error"] }] }
   ```
6. Documentar níveis em `CLAUDE.md` ou `.claude/rules/logging.md`: `info` (eventos de negócio), `warn` (situações recuperáveis), `error` (falhas).

## Validação

- `grep -r "console.log" src/` retorna vazio.
- Log de login bem-sucedido não mostra a senha nem o hash.
- Em dev, log sai formatado; em prod, JSON puro (compatível com agregadores).
