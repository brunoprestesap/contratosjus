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
