---
description: "Centralizar formatação pt-BR (moeda, data, CNPJ) em src/lib/format.ts com testes"
---

## Ordem de execução: 2 de 7 (Grupo A — Onda 1)

Segundo porque **é utilidade reutilizada** pelos passos seguintes (refinements usam `parseDateBR`, error boundaries formatam mensagens, etc).

## Contexto

Formatação inconsistente espalhada causa bugs sutis com `toLocaleString`, timezones e `Intl`. Um único módulo testado evita divergência.

## Passos

1. Criar `src/lib/format.ts` com:
   - `formatCurrency(value: number | Prisma.Decimal): string` → `"R$ 35.000,00"` (usar `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`)
   - `formatDate(date: Date | string): string` → `"18/04/2026"` (`Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" })`)
   - `formatCnpj(cnpj: string): string` → `"XX.XXX.XXX/XXXX-XX"`
   - `parseCurrencyInput(input: string): number` → converte `"R$ 35.000,00"` em número
   - `parseDateBR(input: string): Date` → converte `"18/04/2026"` em Date
2. Criar `tests/lib/format.test.ts` cobrindo:
   - Valores zero, negativos, decimais com múltiplas casas
   - Datas em UTC vs local (garantir que não volta um dia)
   - CNPJs com/sem máscara no input
3. Substituir usos inline existentes (`grep` por `toLocaleString`, `Intl.NumberFormat`) pelos helpers.

## Validação

- `npx vitest run tests/lib/format.test.ts` verde.
- `grep -r "toLocaleString\|Intl.NumberFormat" src/` não retorna chamadas fora de `src/lib/format.ts`.
