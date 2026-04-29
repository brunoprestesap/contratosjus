import { prisma } from "@/lib/prisma";
import {
  suggestCatmatHierarchy,
  suggestCatmatHierarchyFromItem,
  suggestCatserHierarchy,
  suggestCatserHierarchyFromItem,
  type HierarchyTrailStep,
} from "@/lib/ai/generate";
import { logAIGeneration } from "@/lib/pesquisa-precos/audit";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import { CodeSource, ResearchItemType } from "@/generated/prisma/client";
import type {
  ConfirmCatalogoCodeInput,
  ConfirmItemCodeInput,
} from "@/lib/validators/pesquisa-precos";

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

export async function suggestItemCodeUseCase(
  researchItemId: string,
): Promise<CodigoSuggestionResponse> {
  const researchItem = await prisma.priceResearchItem.findUnique({
    where: { id: researchItemId },
    include: {
      research: { select: { id: true } },
      contractItem: {
        select: {
          description: true,
          detailedSpecification: true,
          itemType: true,
          unitOfMeasure: true,
        },
      },
    },
  });
  if (!researchItem) throw new ResearchDomainError("Item da pesquisa não encontrado");

  const ctx = {
    description: researchItem.contractItem.description,
    detailedSpecification: researchItem.contractItem.detailedSpecification,
    itemType: researchItem.contractItem.itemType,
    unitOfMeasure: researchItem.contractItem.unitOfMeasure,
  };

  if (researchItem.itemType === ResearchItemType.MATERIAL) {
    const result = await suggestCatmatHierarchyFromItem(ctx);
    for (const log of result.logs) {
      await logAIGeneration({ log, researchId: researchItem.research.id });
    }
    return {
      codigo: result.codigoItem,
      descricao: result.descricaoItem,
      confidence: result.trail.at(-1)?.confidence ?? null,
      trail: result.trail,
      reason: result.reason,
    };
  }

  const result = await suggestCatserHierarchyFromItem(ctx);
  for (const log of result.logs) {
    await logAIGeneration({ log, researchId: researchItem.research.id });
  }
  return {
    codigo: result.codigoServico,
    descricao: result.descricaoServico,
    confidence: result.trail.at(-1)?.confidence ?? null,
    trail: result.trail,
    reason: result.reason,
  };
}

export async function confirmItemCodeUseCase(input: ConfirmItemCodeInput): Promise<void> {
  const trail = input.codeTrail == null ? null : (input.codeTrail as object);
  await prisma.priceResearchItem.update({
    where: { id: input.researchItemId },
    data: {
      catmatCode: input.catmatCode ?? null,
      catserCode: input.catserCode ?? null,
      codeSource: input.codeSource as CodeSource,
      codeDescricao: input.codeDescricao ?? null,
      codeTrail: trail === null ? undefined : (trail as object),
    },
  });
}
