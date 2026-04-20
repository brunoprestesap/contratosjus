import { z } from "zod/v4";

/**
 * Tolerância de 1 centavo para comparação de soma de breakdown — absorve
 * drift de arredondamento em rateios proporcionais.
 */
export const BREAKDOWN_TOLERANCE = 0.01;

export const breakdownItemSchema = z.object({
  contractItemId: z.string().min(1, "Item do contrato é obrigatório"),
  value: z.coerce.number().nonnegative("Valor não pode ser negativo"),
});

export type BreakdownItem = z.infer<typeof breakdownItemSchema>;

/**
 * Soma os valores do breakdown. Usa number direto — aceitável para a tolerância
 * de 1 centavo que aplicamos aqui (breakdown de até R$ 9.999.999.999,99 cabe
 * com folga em Number.MAX_SAFE_INTEGER).
 */
export function sumBreakdown(items: BreakdownItem[]): number {
  return items.reduce((s, i) => s + i.value, 0);
}

/**
 * Valida que a soma do breakdown é igual ao total (com tolerância).
 * Se `total` for `undefined`/`null` e houver items não-zero, também marca erro.
 * Agrega o issue em `ctx` no path informado.
 */
export function assertBreakdownMatches(
  items: BreakdownItem[],
  total: number | null | undefined,
  ctx: z.core.$RefinementCtx,
  path: (string | number)[] = ["items"],
  tolerance = BREAKDOWN_TOLERANCE,
): void {
  const hasNonZero = items.some((i) => i.value > 0);
  if (total == null || total === 0) {
    if (hasNonZero) {
      ctx.addIssue({
        code: "custom",
        path,
        message: "Não é possível detalhar itens sem valor total preenchido nesta etapa",
      });
    }
    return;
  }
  const sumCents = Math.round(sumBreakdown(items) * 100);
  const totalCents = Math.round(total * 100);
  const toleranceCents = Math.round(tolerance * 100);
  if (Math.abs(sumCents - totalCents) > toleranceCents) {
    const sumFmt = (sumCents / 100).toFixed(2);
    const totalFmt = (totalCents / 100).toFixed(2);
    ctx.addIssue({
      code: "custom",
      path,
      message: `Soma do detalhamento (R$ ${sumFmt}) deve ser igual ao total (R$ ${totalFmt})`,
    });
  }
}

/**
 * Rejeita duplicidade de `contractItemId` no breakdown — uma linha por item.
 */
export function assertBreakdownUnique(
  items: BreakdownItem[],
  ctx: z.core.$RefinementCtx,
  path: (string | number)[] = ["items"],
): void {
  const seen = new Set<string>();
  for (const [idx, item] of items.entries()) {
    if (seen.has(item.contractItemId)) {
      ctx.addIssue({
        code: "custom",
        path: [...path, idx, "contractItemId"],
        message: "Item duplicado no detalhamento",
      });
    }
    seen.add(item.contractItemId);
  }
}
