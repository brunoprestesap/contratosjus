---
description: "Adicionar índices no schema Prisma para campos filtrados com frequência"
---

## Ordem de execução: 1 de 7 (Grupo A — Onda 1)

Primeiro da fila por ser **migração pura** — não altera código de aplicação, não tem breaking change, reversível via rollback de migration.

## Contexto

Lista de contratos filtra por `numero`, `cnpjContratada`, e lista de pagamentos por `mesReferencia`/`status`. Sem índice, PostgreSQL faz full scan — aceitável com 10 contratos, ruim com 500+.

## Passos

1. Ler `prisma/schema.prisma` e identificar models `Contrato`, `Pagamento`, `Empenho`, `Usuario`.
2. Adicionar:
   - `@@index([numero])` em `Contrato`
   - `@@index([cnpjContratada])` em `Contrato`
   - `@@index([status])` em `Contrato`
   - `@@index([mesReferencia])` em `Pagamento`
   - `@@index([status])` em `Pagamento`
   - `@@index([contratoId])` em `Pagamento` e `Empenho` (se ainda não implícito pela FK)
   - `@@index([email])` em `Usuario` (além do `@unique` já existente, para LIKE queries)
3. Rodar `npx prisma migrate dev --name add_performance_indexes`.
4. Rodar `npx vitest run` — nenhum teste deve quebrar.

## Validação

- `npx prisma studio` abre normalmente.
- `EXPLAIN ANALYZE` em query de busca por número mostra `Index Scan` (não `Seq Scan`).
