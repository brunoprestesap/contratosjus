import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import type { CreateResearchInput, LinkAdditiveInput } from "@/lib/validators/pesquisa-precos";

export async function createResearchUseCase(
  input: CreateResearchInput,
  userId: string,
): Promise<{ researchId: string; contractId: string }> {
  const research = await prisma.priceResearch.create({
    data: {
      contractId: input.contractId,
      additiveId: input.additiveId ?? null,
      createdById: userId,
      itemType: input.itemType,
      status: "DRAFT",
    },
  });

  await logAudit({
    entity: "PriceResearch",
    entityId: research.id,
    action: "CREATE",
    newValue: { contractId: research.contractId, itemType: research.itemType },
  });

  return { researchId: research.id, contractId: research.contractId };
}

export async function linkResearchToAdditiveUseCase(
  input: LinkAdditiveInput,
): Promise<{ contractId: string }> {
  const additive = await prisma.additive.findUnique({
    where: { id: input.additiveId },
    select: { type: true, contractId: true },
  });
  if (!additive) throw new ResearchDomainError("Aditivo não encontrado");
  if (additive.type !== "TERM" && additive.type !== "MIXED") {
    throw new ResearchDomainError(
      "Pesquisa de preços só pode ser vinculada a aditivos de prorrogação (TERM) ou mistos (MIXED)",
    );
  }
  await prisma.priceResearch.update({
    where: { id: input.researchId },
    data: { additiveId: input.additiveId },
  });
  return { contractId: additive.contractId };
}
