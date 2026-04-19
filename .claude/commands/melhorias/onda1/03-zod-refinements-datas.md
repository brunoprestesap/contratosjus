---
description: "Criar superRefine Zod reutilizável para coerência de datas de pagamento"
---

## Ordem de execução: 3 de 7 (Grupo A — Onda 1)

Terceiro porque a regra `dataAteste ≤ dataLiquidacao ≤ dataPagamento` já existe em `CLAUDE.md` e pode estar duplicada em múltiplos actions. Centralizar antes de adicionar mais actions reduz dívida.

## Contexto

A regra de coerência de datas de pagamento aparece em `src/actions/pagamentos.ts` e no formulário. Duplicação significa que qualquer ajuste exige dois lugares. Um `superRefine` compartilhado elimina isso.

## Passos

1. Localizar validadores existentes em `src/lib/validators/pagamento.ts`.
2. Extrair lógica em função exportada:
   ```ts
   export const datesCoherenceRefinement = (
     data: { dataAteste?: Date | null; dataLiquidacao?: Date | null; dataPagamento?: Date | null },
     ctx: z.RefinementCtx,
   ) => {
     /* ... */
   };
   ```
3. Aplicar com `.superRefine(datesCoherenceRefinement)` no schema de criação E de edição de pagamento.
4. Remover verificações manuais duplicadas em `src/actions/pagamentos.ts` (a validação Zod já cobre).
5. Criar teste `tests/lib/validators/pagamento.test.ts` cobrindo:
   - ateste sem liquidação (válido)
   - liquidação sem ateste (inválido)
   - datas fora de ordem (inválido)
   - todas no mesmo dia (válido)

## Validação

- `npx vitest run tests/lib/validators/` verde.
- Formulário de pagamento mostra erro inline quando datas estão fora de ordem.
