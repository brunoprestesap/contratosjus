import { Prisma } from "@/generated/prisma/client";

/**
 * Conversão centralizada de Prisma.Decimal → number para serialização
 * (wire types de Server Actions, payload JSON, estatísticas). Evita a
 * repetição de `parseFloat(d.toString())` espalhada pela base.
 *
 * ⚠ Uso apenas em fronteira de saída — para aritmética, manter Decimal.
 * Decimais do domínio financeiro cabem em Number.MAX_SAFE_INTEGER (2^53)
 * quando ≤ 999.999.999.999,99 (schema usa Decimal(15, 2)).
 */
export function toNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

export function toNumberOrNull(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return value.toNumber();
}

/**
 * Distribui um valor total entre N pesos, arredondando cada parte para 2
 * casas decimais e absorvendo a diferença de arredondamento no último item
 * — garante que Σ parts === total (exato, sem drift).
 *
 * Se a soma dos pesos for zero, distribui em partes iguais. Comportamento
 * usado no backfill de CommitmentItem/PaymentItem: rateio proporcional ao
 * totalValue de cada ContractItem.
 */
export function distributeProportional(
  total: Prisma.Decimal,
  weights: Prisma.Decimal[],
): Prisma.Decimal[] {
  if (weights.length === 0) return [];
  const zero = new Prisma.Decimal(0);
  const sumWeights = weights.reduce((s, w) => s.add(w), zero);
  let parts: Prisma.Decimal[];
  if (sumWeights.isZero()) {
    const even = total.div(weights.length).toDecimalPlaces(2);
    parts = weights.map(() => even);
  } else {
    parts = weights.map((w) => total.mul(w).div(sumWeights).toDecimalPlaces(2));
  }
  const sum = parts.reduce((s, p) => s.add(p), zero);
  const diff = total.sub(sum);
  parts[parts.length - 1] = parts[parts.length - 1].add(diff);
  return parts;
}
