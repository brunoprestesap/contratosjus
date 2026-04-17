/**
 * Estatísticas descritivas para amostras de preços (pesquisa de preços).
 * Valores nulos são ignorados. Retorna zeros quando amostra está vazia.
 */

export interface SampleStats {
  count: number;
  mean: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
  coefVariation: number; // stdDev / mean
}

const EMPTY: SampleStats = {
  count: 0,
  mean: 0,
  median: 0,
  min: 0,
  max: 0,
  stdDev: 0,
  coefVariation: 0,
};

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeStats(values: readonly (number | null | undefined)[]): SampleStats {
  const clean = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
  const n = clean.length;
  if (n === 0) return { ...EMPTY };

  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sorted = [...clean].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const med = median(sorted);

  // Amostra populacional (divide por n); suficiente para análise descritiva
  const variance =
    clean.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const coefVariation = mean === 0 ? 0 : stdDev / mean;

  return { count: n, mean, median: med, min, max, stdDev, coefVariation };
}
