---
description: "Cria ou atualiza o schema Prisma e executa migration"
argument-hint: "[nome-da-migration] ex: add-aditivos, add-audit-log"
---

## Tarefa

Atualizar o schema Prisma e executar migration `$ARGUMENTS`.

## Passos

1. Editar `prisma/schema.prisma`
2. Validar schema: `npx prisma validate`
3. Criar migration: `npx prisma migrate dev --name $ARGUMENTS`
4. Gerar client: `npx prisma generate`
5. Verificar com Prisma Studio: `npx prisma studio`

## Convenções do Schema

- Models em PascalCase singular: `Contract`, `Payment`, `Commitment`
- Campos em camelCase: `contractNumber`, `globalValue`, `createdAt`
- Sempre incluir `id`, `createdAt`, `updatedAt`
- IDs como `String @id @default(cuid())`
- Relações explícitas com `@relation`
- Enums para campos com valores fixos (PaymentType, ContractStatus, etc.)
- Decimais financeiros como `Decimal` (não Float)
- Datas como `DateTime`

## Schema de Referência

Consultar `.claude/skills/prisma-patterns/references/schema-onda1.md` para o schema completo da Onda 1.
