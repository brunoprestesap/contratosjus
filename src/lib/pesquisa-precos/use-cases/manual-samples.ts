import { Prisma, PriceSampleSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { inferLegalRegime } from "@/lib/pesquisa-precos/legal-regime";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import { computeAndPersistItemStatisticsUseCase } from "@/lib/pesquisa-precos/use-cases/statistics";
import type { CreateManualSampleInput, DeleteSampleInput } from "@/lib/validators/pesquisa-precos";

/**
 * Gera um identificador único para amostras manuais. Não colide com IDs
 * da API compras.gov.br (que vêm numéricos), usa namespace "MAN-<timestamp>".
 */
function buildManualIdentifier(): string {
  return `MAN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createManualSampleUseCase(
  input: CreateManualSampleInput,
  userId: string,
): Promise<{ sampleId: string; researchId: string; contractId: string }> {
  const researchItem = await prisma.priceResearchItem.findUnique({
    where: { id: input.researchItemId },
    include: {
      research: { select: { id: true, contractId: true, status: true } },
    },
  });
  if (!researchItem) throw new ResearchDomainError("Item da pesquisa não encontrado");
  if (researchItem.research.status === "FINALIZED") {
    throw new ResearchDomainError("Não é possível adicionar amostras a uma pesquisa finalizada");
  }

  const valorGlobal = new Prisma.Decimal(input.valorGlobal.toString());
  const valorMensal =
    input.valorMensal != null ? new Prisma.Decimal(input.valorMensal.toString()) : null;

  const sample = await prisma.priceSample.create({
    data: {
      researchId: researchItem.research.id,
      researchItemId: researchItem.id,
      pncpNumeroControle: buildManualIdentifier(),
      orgao: input.orgao ?? null,
      supplierName: input.supplierName ?? null,
      objetoResumo: input.objetoResumo,
      valorGlobal,
      valorMensal,
      dataAssinatura: input.dataAssinatura ?? null,
      modalidade: input.modalidade ?? null,
      uf: input.uf ?? null,
      legalRegimeInferred: inferLegalRegime(input.modalidade, input.dataAssinatura ?? null),
      source: input.source as PriceSampleSource,
      sourceNotes: input.sourceNotes ?? null,
      createdManually: true,
      rawPayload: {
        manual: true,
        createdBy: userId,
        input: {
          source: input.source,
          supplierName: input.supplierName ?? null,
          orgao: input.orgao ?? null,
          objetoResumo: input.objetoResumo,
          valorGlobal: input.valorGlobal,
          valorMensal: input.valorMensal ?? null,
          dataAssinatura: input.dataAssinatura?.toISOString() ?? null,
          modalidade: input.modalidade ?? null,
          uf: input.uf ?? null,
          sourceNotes: input.sourceNotes ?? null,
        },
      },
    },
  });

  // Recalcula estatísticas do item para refletir a nova amostra imediatamente.
  await computeAndPersistItemStatisticsUseCase(researchItem.id);

  return {
    sampleId: sample.id,
    researchId: researchItem.research.id,
    contractId: researchItem.research.contractId,
  };
}

/**
 * Exclui uma amostra. Apenas amostras `createdManually = true` podem ser
 * removidas — amostras vindas da API compras.gov.br devem ser marcadas
 * como excluídas (toggle), não removidas, para preservar o histórico.
 */
export async function deleteManualSampleUseCase(
  input: DeleteSampleInput,
): Promise<{ researchId: string | null; contractId: string; researchItemId: string | null }> {
  const sample = await prisma.priceSample.findUnique({
    where: { id: input.sampleId },
    include: { research: { select: { contractId: true, status: true } } },
  });
  if (!sample) throw new ResearchDomainError("Amostra não encontrada");
  if (!sample.createdManually) {
    throw new ResearchDomainError(
      "Apenas amostras adicionadas manualmente podem ser excluídas. Use o toggle para marcar como excluída.",
    );
  }
  if (sample.research.status === "FINALIZED") {
    throw new ResearchDomainError("Não é possível remover amostras de uma pesquisa finalizada");
  }

  await prisma.priceSample.delete({ where: { id: sample.id } });

  if (sample.researchItemId) {
    await computeAndPersistItemStatisticsUseCase(sample.researchItemId);
  }

  return {
    researchId: sample.researchId,
    contractId: sample.research.contractId,
    researchItemId: sample.researchItemId,
  };
}
