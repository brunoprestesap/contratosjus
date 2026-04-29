import { prisma } from "@/lib/prisma";
import { toNumber, toNumberOrNull } from "@/lib/decimal";
import { buildItemContext, writeJustificativa } from "@/lib/ai/generate";
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

export async function generateItemJustificativaUseCase(
  researchItemId: string,
): Promise<{ text: string; contractId: string }> {
  const item = await prisma.priceResearchItem.findUnique({
    where: { id: researchItemId },
    include: {
      research: {
        select: {
          id: true,
          contractId: true,
          queryFilters: true,
          contract: {
            select: {
              contractNumber: true,
              globalValue: true,
              estimatedMonthlyValue: true,
              supplier: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      },
      contractItem: {
        select: {
          description: true,
          detailedSpecification: true,
          itemType: true,
          unitOfMeasure: true,
          totalValue: true,
        },
      },
    },
  });
  if (!item) throw new ResearchDomainError("Item da pesquisa não encontrado");
  if (!item.mean) {
    throw new ResearchDomainError("Calcule as estatísticas do item antes de gerar a justificativa");
  }

  const filters =
    (item.research.queryFilters as {
      dataCompraInicio?: string;
      dataCompraFim?: string;
    } | null) ?? null;

  const itemContext = buildItemContext({
    description: item.contractItem.description,
    detailedSpecification: item.contractItem.detailedSpecification,
    itemType: item.contractItem.itemType,
    unitOfMeasure: item.contractItem.unitOfMeasure,
  });

  const { texto, log } = await writeJustificativa({
    contrato: {
      numero: item.research.contract.contractNumber,
      objeto: itemContext,
      valorGlobal: toNumber(item.contractItem.totalValue),
      valorMensal: toNumberOrNull(item.research.contract.estimatedMonthlyValue),
      supplier: item.research.contract.supplier,
      vigenciaInicio: item.research.contract.startDate.toISOString().slice(0, 10),
      vigenciaFim: item.research.contract.endDate.toISOString().slice(0, 10),
    },
    estatisticas: {
      count: item.sampleCountUsed,
      mean: toNumber(item.mean),
      median: toNumberOrNull(item.median) ?? 0,
      min: toNumberOrNull(item.minValue) ?? 0,
      max: toNumberOrNull(item.maxValue) ?? 0,
      stdDev: toNumberOrNull(item.stdDev) ?? 0,
      coefVariation: toNumberOrNull(item.coefVariation) ?? 0,
    },
    periodoReferencia: {
      inicio: filters?.dataCompraInicio ?? "",
      fim: filters?.dataCompraFim ?? "",
    },
    fonte: "API Dados Abertos compras.gov.br — módulo de pesquisa de preços",
  });

  await logAIGeneration({ log, researchId: item.research.id });

  await prisma.priceResearchItem.update({
    where: { id: researchItemId },
    data: { justificationText: texto, justificationEditedAt: new Date() },
  });

  return { text: texto, contractId: item.research.contractId };
}

export async function updateItemJustificationTextUseCase(input: {
  researchItemId: string;
  text: string;
}): Promise<{ contractId: string }> {
  const item = await prisma.priceResearchItem.findUnique({
    where: { id: input.researchItemId },
    select: { research: { select: { contractId: true } } },
  });
  if (!item) throw new ResearchDomainError("Item da pesquisa não encontrado");

  await prisma.priceResearchItem.update({
    where: { id: input.researchItemId },
    data: {
      justificationText: input.text,
      justificationEditedAt: new Date(),
    },
  });

  return { contractId: item.research.contractId };
}
