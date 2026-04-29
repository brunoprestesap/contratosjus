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
  const clean = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const n = clean.length;
  if (n === 0) return { ...EMPTY };

  const sum = clean.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sorted = [...clean].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const med = median(sorted);

  // Amostra populacional (divide por n); suficiente para análise descritiva
  const variance = clean.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const coefVariation = mean === 0 ? 0 : stdDev / mean;

  return { count: n, mean, median: med, min, max, stdDev, coefVariation };
}

// ── Seleção do método de preço de referência ───────────────────
//
// IN SEGES/ME 65/2021 art. 6º, §3º: o preço estimado será obtido a partir
// de método estatístico aplicado à série de preços coletados, devendo-se
// desconsiderar valores inexequíveis, inconsistentes e excessivamente
// elevados. Em regra, usa-se média, mediana ou menor valor.
//
// Manual TRT4 / Guia CNJ: usar **mediana** quando dados heterogêneos
// (coef. variação alto) ou amostra pequena — menos sensível a outliers.
// Usar **média** quando dados homogêneos.

export type ReferenceMethodKind = "NONE" | "MEAN" | "MEDIAN" | "MIN" | "CUSTOM";

const HETEROGENEITY_CV_THRESHOLD = 0.25; // 25% — acima disso, usar mediana
const SMALL_SAMPLE_THRESHOLD = 10; // N < 10 → mediana

/**
 * Escolhe o método default conforme dispersão e tamanho da amostra.
 * CV alto OU N pequeno → MEDIAN; caso contrário → MEAN.
 * Sem amostras retorna NONE (nada a calcular).
 */
export function chooseReferenceMethod(stats: SampleStats): ReferenceMethodKind {
  if (stats.count === 0) return "NONE";
  if (stats.count < SMALL_SAMPLE_THRESHOLD) return "MEDIAN";
  if (stats.coefVariation > HETEROGENEITY_CV_THRESHOLD) return "MEDIAN";
  return "MEAN";
}

/**
 * Limite superior e inferior do ajuste percentual aplicável ao preço
 * de referência. Invariante interna da função — o validator de input
 * também limita, mas este clamp protege contra dados legados ou
 * chamadas internas que escapem da validação de entrada.
 */
export const ADJUSTMENT_PERCENT_MIN = -50;
export const ADJUSTMENT_PERCENT_MAX = 50;

function clampAdjustment(adj: number): number {
  if (adj < ADJUSTMENT_PERCENT_MIN) return ADJUSTMENT_PERCENT_MIN;
  if (adj > ADJUSTMENT_PERCENT_MAX) return ADJUSTMENT_PERCENT_MAX;
  return adj;
}

/**
 * Calcula o valor de referência adotado, aplicando opcionalmente um ajuste
 * percentual (±%) sobre a estatística escolhida. IN SEGES/ME 65/2021
 * permite esse acréscimo/desconto para aliar atratividade de mercado e
 * mitigar sobrepreço, desde que justificado.
 *
 * Ajustes são sempre clampados em ±50% (invariante interna), mesmo que
 * o dado venha de registros legados ou chamadas internas fora do validator.
 *
 * Retorna null quando o método é NONE ou CUSTOM sem valor fornecido
 * (caller deve preencher referenceValue manualmente).
 */
export function computeReferenceValue(
  stats: SampleStats,
  method: ReferenceMethodKind,
  adjustmentPercent: number | null | undefined = null,
  customValue: number | null | undefined = null,
): number | null {
  if (stats.count === 0 && method !== "CUSTOM") return null;

  let base: number | null = null;
  switch (method) {
    case "MEAN":
      base = stats.mean;
      break;
    case "MEDIAN":
      base = stats.median;
      break;
    case "MIN":
      base = stats.min;
      break;
    case "CUSTOM":
      base = customValue ?? null;
      break;
    case "NONE":
    default:
      return null;
  }
  if (base == null) return null;

  const raw = adjustmentPercent ?? 0;
  if (Number.isNaN(raw)) return base;
  const adj = clampAdjustment(raw);
  return base * (1 + adj / 100);
}

/**
 * Regra do Manual: quando a base única é o Painel de Preços (composição
 * de custos em sistemas oficiais), o valor de referência **não pode
 * superar a mediana** do item. Utilitário para uso em guards.
 */
export function isReferenceExceedingMedian(stats: SampleStats, referenceValue: number): boolean {
  if (stats.median === 0) return false;
  return referenceValue > stats.median;
}
