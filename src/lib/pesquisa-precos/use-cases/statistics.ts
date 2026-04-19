import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import { computeStats, type SampleStats } from "@/lib/statistics";

export async function computeAndPersistStatisticsUseCase(researchId: string): Promise<SampleStats> {
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

  return stats;
}
