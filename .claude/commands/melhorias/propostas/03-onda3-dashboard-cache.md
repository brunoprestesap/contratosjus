---
description: "[PROPOSTA] Onda 3 — usar React 19 cache() no dashboard para deduplicar queries"
---

## Ordem de execução: 3 de 3 (Grupo C — Propostas)

**ATENÇÃO:** Funcionalidade da **Onda 3**. Não executar sem confirmação explícita do usuário.

## Contexto

O dashboard terá 7 indicadores. Se cada Server Component fizer sua própria query, contratos serão buscados 7× a cada renderização. `cache()` do React 19 deduplica durante uma mesma requisição — sem precisar de infra externa.

## Passos (somente se Onda 3 aprovada)

1. Criar `src/lib/dashboard/queries.ts`:
   ```ts
   import { cache } from "react";
   import { prisma } from "@/lib/prisma";
   
   export const getContratosDoExercicio = cache(async (ano: number) => {
     return prisma.contrato.findMany({
       where: { /* filtro por exercício */ },
       include: { pagamentos: true, empenhos: true },
     });
   });
   ```
2. Cada componente de indicador (`TotalContratos`, `TotalEmpenhado`, `TotalPago`, etc.) importa e chama essa função — React garante que a query execute uma vez.
3. Para indicadores com agregações diferentes (`SUM`, `COUNT`), usar `Prisma.$queryRaw` separadamente e também cachear.
4. Confirmar com log de Prisma (`log: ["query"]`) que há uma query única por requisição, não 7.

## Tradeoff vs alternativas

- **`cache()` (proposto)**: deduplicação por requisição, zero infra.
- **`unstable_cache`**: persiste entre requisições; útil se o dashboard tolerar dados de 5 min atrás.
- **Loader único no page.tsx**: passa props para todos — mais simples, mas mistura preocupações.

## Decisão pendente

Pergunte ao usuário: "Os indicadores precisam ser real-time ou aceitam delay de minutos? Isso decide entre `cache()` e `unstable_cache`."
