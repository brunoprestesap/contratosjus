import { Prisma, ReferenceMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber, toNumberOrNull } from "@/lib/decimal";
import {
  chooseReferenceMethod,
  computeReferenceValue,
  computeStats,
  type ReferenceMethodKind,
  type SampleStats,
} from "@/lib/statistics";

export interface PersistStatsResult {
  stats: SampleStats;
  contractId: string;
}

export interface PersistItemStatsResult {
  stats: SampleStats;
  contractId: string;
  referenceValue: number | null;
}

interface ItemSnapshot {
  referenceMethod: ReferenceMethod;
  adjustmentPercent: Prisma.Decimal | null;
  referenceValue: Prisma.Decimal | null;
}

/**
 * Computa estatísticas + método de referência + valor de referência para
 * um conjunto de amostras. Usado como helper puro (sem I/O) por
 * `computeAndPersistItemStatisticsUseCase` e pelo batch em
 * `computeAndPersistStatisticsPerItem`.
 */
function deriveItemStats(
  samples: ReadonlyArray<{ valorGlobal: Prisma.Decimal }>,
  snapshot: ItemSnapshot,
): {
  stats: SampleStats;
  method: ReferenceMethodKind;
  referenceValue: number | null;
} {
  const values = samples.map((s) => toNumber(s.valorGlobal));
  const stats = computeStats(values);
  const currentMethod = snapshot.referenceMethod as ReferenceMethodKind;
  const method: ReferenceMethodKind =
    currentMethod === "NONE" ? chooseReferenceMethod(stats) : currentMethod;
  const adjustmentPercent = toNumberOrNull(snapshot.adjustmentPercent);
  const customValue = method === "CUSTOM" ? toNumberOrNull(snapshot.referenceValue) : null;
  const referenceValue =
    method === "NONE" ? null : computeReferenceValue(stats, method, adjustmentPercent, customValue);
  return { stats, method, referenceValue };
}

function buildItemUpdateData(
  stats: SampleStats,
  method: ReferenceMethodKind,
  referenceValue: number | null,
  countTotal: number,
): Prisma.PriceResearchItemUpdateInput {
  return {
    mean: stats.mean,
    median: stats.median,
    minValue: stats.min,
    maxValue: stats.max,
    stdDev: stats.stdDev,
    coefVariation: stats.coefVariation,
    sampleCountTotal: countTotal,
    sampleCountUsed: stats.count,
    referenceMethod: method as ReferenceMethod,
    referenceValue,
  };
}

export async function computeAndPersistStatisticsUseCase(
  researchId: string,
): Promise<PersistStatsResult> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: researchId },
    select: { mode: true, contractId: true },
  });
  if (!research) {
    throw new Error("Pesquisa não encontrada");
  }

  if (research.mode === "PER_ITEM") {
    const stats = await computeAndPersistStatisticsPerItem(researchId);
    return { stats, contractId: research.contractId };
  }

  const samples = await prisma.priceSample.findMany({
    where: { researchId, excluded: false },
    select: { valorGlobal: true },
  });
  const values = samples.map((s) => toNumber(s.valorGlobal));
  const stats = computeStats(values);

  await prisma.priceResearch.update({
    where: { id: researchId },
    data: {
      mean: stats.mean,
      median: stats.median,
      minValue: stats.min,
      maxValue: stats.max,
      stdDev: stats.stdDev,
      coefVariation: stats.coefVariation,
    },
  });

  return { stats, contractId: research.contractId };
}

/**
 * Versão batch — elimina N+1. Carrega todos os itens + todas as amostras em
 * 2 queries, calcula em memória e aplica updates numa única transação.
 * Complexidade: O(3) queries independente do número de itens.
 */
async function computeAndPersistStatisticsPerItem(researchId: string): Promise<SampleStats> {
  const items = await prisma.priceResearchItem.findMany({
    where: { researchId },
    select: {
      id: true,
      referenceMethod: true,
      adjustmentPercent: true,
      referenceValue: true,
    },
  });
  if (items.length === 0) return computeStats([]);

  const itemIds = items.map((i) => i.id);
  const allSamples = await prisma.priceSample.findMany({
    where: { researchItemId: { in: itemIds } },
    select: { researchItemId: true, valorGlobal: true, excluded: true },
  });

  // Agrupa amostras por item (em memória).
  const validByItem = new Map<string, { valorGlobal: Prisma.Decimal }[]>();
  const totalByItem = new Map<string, number>();
  for (const id of itemIds) {
    validByItem.set(id, []);
    totalByItem.set(id, 0);
  }
  for (const s of allSamples) {
    if (!s.researchItemId) continue;
    totalByItem.set(s.researchItemId, (totalByItem.get(s.researchItemId) ?? 0) + 1);
    if (!s.excluded) {
      validByItem.get(s.researchItemId)?.push({ valorGlobal: s.valorGlobal });
    }
  }

  const aggregatedValues: number[] = [];
  const updates: Prisma.PrismaPromise<unknown>[] = [];
  for (const item of items) {
    const bucket = validByItem.get(item.id) ?? [];
    const countTotal = totalByItem.get(item.id) ?? 0;
    const { stats, method, referenceValue } = deriveItemStats(bucket, item);
    aggregatedValues.push(...bucket.map((s) => toNumber(s.valorGlobal)));
    updates.push(
      prisma.priceResearchItem.update({
        where: { id: item.id },
        data: buildItemUpdateData(stats, method, referenceValue, countTotal),
      }),
    );
  }
  await prisma.$transaction(updates);

  return computeStats(aggregatedValues);
}

/**
 * Calcula estatísticas de um item, escolhe automaticamente o método de
 * preço de referência (mediana/média) conforme dispersão, e grava tudo.
 * Se o fiscal já escolheu um método manualmente, preserva a escolha e
 * apenas recalcula o valor com a nova base estatística.
 */
export async function computeAndPersistItemStatisticsUseCase(
  researchItemId: string,
): Promise<PersistItemStatsResult> {
  // Três consultas independentes (current snapshot, samples válidas, count total)
  // — Promise.all elimina o waterfall. findMany + count são quase sempre mais
  // lentas que o findUnique de um único item, então o ganho é real.
  const [current, samples, countTotal] = await Promise.all([
    prisma.priceResearchItem.findUnique({
      where: { id: researchItemId },
      select: {
        referenceMethod: true,
        adjustmentPercent: true,
        referenceValue: true,
        research: { select: { contractId: true } },
      },
    }),
    prisma.priceSample.findMany({
      where: { researchItemId, excluded: false },
      select: { valorGlobal: true },
    }),
    prisma.priceSample.count({ where: { researchItemId } }),
  ]);
  if (!current) throw new Error("Item da pesquisa não encontrado");

  const { stats, method, referenceValue } = deriveItemStats(samples, current);

  await prisma.priceResearchItem.update({
    where: { id: researchItemId },
    data: buildItemUpdateData(stats, method, referenceValue, countTotal),
  });

  return { stats, contractId: current.research.contractId, referenceValue };
}
