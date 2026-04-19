---
name: prisma-patterns
description: "Padrões e schema Prisma para o projeto de contratos. Consultar antes de criar/modificar models, migrations ou queries Prisma."
---

# Prisma Patterns — Contratos JFAP

## Quando usar esta skill

- Antes de criar ou modificar qualquer model no `prisma/schema.prisma`
- Ao escrever queries Prisma em Server Actions
- Ao criar migrations

## Schema de referência

Consultar `references/schema-onda1.md` para o schema completo da Onda 1.

## Convenções

### Models

- PascalCase singular: `Contract`, `Payment`, `Commitment`, `User`
- Sempre incluir: `id String @id @default(cuid())`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`

### Campos financeiros

- Tipo `Decimal` com `@db.Decimal(15, 2)` — NUNCA Float
- Representam valores em Reais (R$)

### Enums

- Definir no schema para campos com valores fixos
- PascalCase: `PaymentType`, `ContractStatus`, `AdditiveType`

### Relações

- Sempre explícitas com `@relation`
- Cascade delete onde faz sentido (pagamentos de um contrato)
- `onDelete: Cascade` para filhos que não existem sem o pai

### Queries padrão

**Listar com paginação:**

```typescript
const contracts = await prisma.contract.findMany({
  skip: (page - 1) * perPage,
  take: perPage,
  orderBy: { createdAt: "desc" },
  include: { payments: true, commitments: true },
});
```

**Buscar com filtro:**

```typescript
const contracts = await prisma.contract.findMany({
  where: {
    OR: [
      { contractNumber: { contains: search, mode: "insensitive" } },
      { supplier: { contains: search, mode: "insensitive" } },
    ],
  },
});
```

**Calcular saldo (aggregation):**

```typescript
const totalPaid = await prisma.payment.aggregate({
  where: { contractId, paidAt: { not: null } },
  _sum: { paidValue: true },
});
```
