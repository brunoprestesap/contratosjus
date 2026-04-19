---
description: "[PROPOSTA] Onda 2 — usar Prisma $extends para auditoria automática"
---

## Ordem de execução: 1 de 3 (Grupo C — Propostas)

**ATENÇÃO:** Esta melhoria pertence à **Onda 2**. Antes de executar, **pergunte ao usuário** se confirma entrar no escopo da Onda 2. Regra de `scope-control.md` exige autorização explícita.

## Contexto

A forma ingênua de implementar auditoria é instrumentar cada Server Action com `prisma.auditLog.create(...)`. Isso duplica lógica e é fácil esquecer em ações novas.

## Alternativa proposta

Usar **Prisma Client Extensions (`$extends`)** para interceptar `create`/`update`/`delete` em models marcados como auditáveis — grava entrada em `AuditLog` automaticamente.

## Passos (somente se Onda 2 aprovada)

1. Criar model `AuditLog(id, userId, entity, entityId, action, before, after, createdAt)` em `schema.prisma`.
2. Criar `src/lib/prisma.ts` com extensão:
   ```ts
   export const prisma = basePrisma.$extends({
     query: {
       $allModels: {
         async update({ model, args, query }) {
           const before = await basePrisma[model].findUnique({ where: args.where });
           const result = await query(args);
           await basePrisma.auditLog.create({
             data: {
               entity: model,
               action: "update",
               before,
               after: result,
               userId: currentUserId(),
             },
           });
           return result;
         },
         // análogo para create, delete
       },
     },
   });
   ```
3. Capturar `userId` via `AsyncLocalStorage` populado no middleware de auth.
4. Lista branca de models auditados (não auditar `Session`, `AuditLog` em si).
5. Testar: criar contrato → verificar que `AuditLog` tem 1 entrada com `before: null, after: {...}`.

## Tradeoff

- **Prós**: zero esquecimento; auditoria completa sem duplicação.
- **Contras**: extensão mais difícil de debugar; custo de 1 query extra por operação (aceitável).

## Decisão pendente

Pergunte ao usuário: "Quer seguir com `$extends` ou com chamadas explícitas por action?"
