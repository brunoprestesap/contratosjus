/**
 * Versão client-safe de distributeProportional — sem dependência de Prisma.
 * Usa aritmética em centavos (integer math) para evitar drift de float.
 *
 * Distribui `total` (número decimal) entre N pesos e garante que Σ parts === total
 * (exato, sem drift), arredondando cada parte a 2 casas e absorvendo a diferença
 * no último item.
 *
 * Se a soma dos pesos for zero, distribui em partes iguais.
 */
export function distributeProportionalNumbers(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const totalCents = Math.round(total * 100);
  const weightsSum = weights.reduce((s, w) => s + w, 0);

  let partsCents: number[];
  if (weightsSum === 0) {
    const evenCents = Math.floor(totalCents / weights.length);
    partsCents = weights.map(() => evenCents);
  } else {
    partsCents = weights.map((w) => Math.round((totalCents * w) / weightsSum));
  }
  const sumCents = partsCents.reduce((s, p) => s + p, 0);
  const diff = totalCents - sumCents;
  partsCents[partsCents.length - 1] += diff;
  return partsCents.map((c) => c / 100);
}
