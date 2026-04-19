import { prisma } from "@/lib/prisma";
import {
  suggestCatmatHierarchy,
  suggestCatserHierarchy,
  type HierarchyTrailStep,
} from "@/lib/ai/generate";
import { logAIGeneration } from "@/lib/pesquisa-precos/audit";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import type { ConfirmCatalogoCodeInput } from "@/lib/validators/pesquisa-precos";

export interface CodigoSuggestionResponse {
  codigo: number | null;
  descricao: string | null;
  confidence: string | null;
  trail: HierarchyTrailStep[];
  reason?: string;
}

export async function suggestCodigoUseCase(researchId: string): Promise<CodigoSuggestionResponse> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: researchId },
    include: { contract: { select: { object: true } } },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");

  if (research.itemType === "MATERIAL") {
    const result = await suggestCatmatHierarchy(research.contract.object);
    for (const log of result.logs) {
      await logAIGeneration({ log, researchId });
    }
    return {
      codigo: result.codigoItem,
      descricao: result.descricaoItem,
      confidence: result.trail.at(-1)?.confidence ?? null,
      trail: result.trail,
      reason: result.reason,
    };
  }

  const result = await suggestCatserHierarchy(research.contract.object);
  for (const log of result.logs) {
    await logAIGeneration({ log, researchId });
  }
  return {
    codigo: result.codigoServico,
    descricao: result.descricaoServico,
    confidence: result.trail.at(-1)?.confidence ?? null,
    trail: result.trail,
    reason: result.reason,
  };
}

export async function confirmCatalogoCodeUseCase(input: ConfirmCatalogoCodeInput): Promise<void> {
  await prisma.priceResearch.update({
    where: { id: input.researchId },
    data: {
      catmatCode: input.catmatCode ?? null,
      catserCode: input.catserCode ?? null,
    },
  });
}
