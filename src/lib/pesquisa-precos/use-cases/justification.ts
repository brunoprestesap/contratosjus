import { prisma } from "@/lib/prisma";
import { toNumber, toNumberOrNull } from "@/lib/decimal";
import { writeJustificativa } from "@/lib/ai/generate";
import { logAIGeneration } from "@/lib/pesquisa-precos/audit";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import type { UpdateJustificationInput } from "@/lib/validators/pesquisa-precos";

export async function generateJustificativaUseCase(researchId: string): Promise<{ text: string }> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: researchId },
    include: {
      contract: {
        select: {
          contractNumber: true,
          object: true,
          globalValue: true,
          estimatedMonthlyValue: true,
          supplier: true,
          startDate: true,
          endDate: true,
        },
      },
      _count: {
        select: { samples: { where: { excluded: false } } },
      },
    },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");
  if (!research.mean) {
    throw new ResearchDomainError("Calcule as estatísticas antes de gerar a justificativa");
  }

  const filters =
    (research.queryFilters as {
      dataCompraInicio?: string;
      dataCompraFim?: string;
    } | null) ?? null;

  const { texto, log } = await writeJustificativa({
    contrato: {
      numero: research.contract.contractNumber,
      objeto: research.contract.object,
      valorGlobal: toNumber(research.contract.globalValue),
      valorMensal: toNumberOrNull(research.contract.estimatedMonthlyValue),
      supplier: research.contract.supplier,
      vigenciaInicio: research.contract.startDate.toISOString().slice(0, 10),
      vigenciaFim: research.contract.endDate.toISOString().slice(0, 10),
    },
    estatisticas: {
      // Contagem real de amostras válidas — `_count.samples` já filtra
      // por `excluded: false`. A IA usa esse número nas frases do tipo
      // "baseado em N contratações análogas", afetando diretamente a
      // qualidade jurídica do documento.
      count: research._count.samples,
      mean: toNumber(research.mean),
      median: toNumberOrNull(research.median) ?? 0,
      min: toNumberOrNull(research.minValue) ?? 0,
      max: toNumberOrNull(research.maxValue) ?? 0,
      stdDev: toNumberOrNull(research.stdDev) ?? 0,
      coefVariation: toNumberOrNull(research.coefVariation) ?? 0,
    },
    periodoReferencia: {
      inicio: filters?.dataCompraInicio ?? "",
      fim: filters?.dataCompraFim ?? "",
    },
    fonte: "API Dados Abertos compras.gov.br — módulo de pesquisa de preços",
  });

  await logAIGeneration({ log, researchId });

  await prisma.priceResearch.update({
    where: { id: researchId },
    data: { justificationText: texto, justificationEditedAt: new Date() },
  });

  return { text: texto };
}

export async function updateJustificationTextUseCase(
  input: UpdateJustificationInput,
): Promise<void> {
  await prisma.priceResearch.update({
    where: { id: input.researchId },
    data: {
      justificationText: input.text,
      justificationEditedAt: new Date(),
    },
  });
}
