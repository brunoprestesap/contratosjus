import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import { CodeSource, ItemType, ResearchItemType } from "@/generated/prisma/client";
import type {
  CreateResearchInput,
  CreateResearchPerItemInput,
  LinkAdditiveInput,
} from "@/lib/validators/pesquisa-precos";

/**
 * Mapeia o tipo mais amplo do item de contrato para o subset suportado
 * pelo módulo de pesquisa (MATERIAL/SERVICE). WORK e IT_SOLUTION são
 * serviços para fins de CATSER.
 */
function itemTypeToResearchItemType(itemType: ItemType): ResearchItemType {
  return itemType === ItemType.MATERIAL ? ResearchItemType.MATERIAL : ResearchItemType.SERVICE;
}

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
      mode: "CONTRACT_LEGACY",
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

export async function createResearchPerItemUseCase(
  input: CreateResearchPerItemInput,
  userId: string,
): Promise<{ researchId: string; contractId: string }> {
  // Contrato e itens são consultas independentes — paralelizar para
  // reduzir TTFB. A validação cruzada (items.length === input.length
  // e items.contractId === contractId) acontece depois.
  const [contract, items] = await Promise.all([
    prisma.contract.findUnique({
      where: { id: input.contractId },
      select: { id: true, legalRegime: true },
    }),
    prisma.contractItem.findMany({
      where: {
        id: { in: input.contractItemIds },
        contractId: input.contractId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        itemType: true,
        catalogCode: true,
        description: true,
      },
    }),
  ]);
  if (!contract) throw new ResearchDomainError("Contrato não encontrado");
  if (items.length !== input.contractItemIds.length) {
    throw new ResearchDomainError("Um ou mais itens não pertencem ao contrato ou estão inativos");
  }

  const research = await prisma.$transaction(async (tx) => {
    const created = await tx.priceResearch.create({
      data: {
        contractId: input.contractId,
        additiveId: input.additiveId ?? null,
        createdById: userId,
        status: "DRAFT",
        mode: "PER_ITEM",
        legalRegimeSnapshot: contract.legalRegime,
      },
    });

    await tx.priceResearchItem.createMany({
      data: items.map((item) => {
        const researchItemType = itemTypeToResearchItemType(item.itemType);
        const hasCode = item.catalogCode != null && item.catalogCode.trim().length > 0;
        return {
          researchId: created.id,
          contractItemId: item.id,
          itemType: researchItemType,
          catmatCode:
            hasCode && researchItemType === ResearchItemType.MATERIAL ? item.catalogCode : null,
          catserCode:
            hasCode && researchItemType === ResearchItemType.SERVICE ? item.catalogCode : null,
          codeSource: hasCode ? CodeSource.ITEM : CodeSource.PENDING,
        };
      }),
    });

    return created;
  });

  await logAudit({
    entity: "PriceResearch",
    entityId: research.id,
    action: "CREATE",
    newValue: {
      contractId: research.contractId,
      mode: research.mode,
      itemCount: items.length,
      legalRegimeSnapshot: research.legalRegimeSnapshot,
    },
  });

  // WORK e IT_SOLUTION mapeiam para SERVICE/CATSER no fluxo do Painel,
  // mas o Manual CNJ indica SINAPI (obras, Dec. 7.983/2013) e Catálogo
  // TIC SEGES (TI, IN SEGES 65 art. 8º) como fonte primária. O sistema
  // não integra essas fontes — alerta o fiscal via log para que ele
  // complemente manualmente em "Adicionar amostra" com source=SINAPI
  // ou CATALOGO_TIC.
  const hasWork = items.some((i) => i.itemType === ItemType.WORK);
  const hasIt = items.some((i) => i.itemType === ItemType.IT_SOLUTION);
  if (hasWork) {
    logger.warn(
      {
        event: "research.per_item.work_item",
        action: "createResearchPerItemUseCase",
        contractId: research.contractId,
        researchId: research.id,
      },
      "Pesquisa inclui itens WORK — Painel de Preços é fonte secundária; complementar com SINAPI",
    );
  }
  if (hasIt) {
    logger.warn(
      {
        event: "research.per_item.it_item",
        action: "createResearchPerItemUseCase",
        contractId: research.contractId,
        researchId: research.id,
      },
      "Pesquisa inclui itens IT_SOLUTION — verificar Catálogo TIC SEGES como preço estimado",
    );
  }

  return { researchId: research.id, contractId: research.contractId };
}

export async function linkResearchToAdditiveUseCase(
  input: LinkAdditiveInput,
): Promise<{ contractId: string }> {
  const [research, additive] = await Promise.all([
    prisma.priceResearch.findUnique({
      where: { id: input.researchId },
      select: { contractId: true },
    }),
    prisma.additive.findUnique({
      where: { id: input.additiveId },
      select: { type: true, contractId: true },
    }),
  ]);
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");
  if (!additive) throw new ResearchDomainError("Aditivo não encontrado");
  // Proteção: pesquisa do contrato A não pode ser vinculada a aditivo do
  // contrato B. Erro genérico para não vazar existência/IDs entre contratos.
  if (research.contractId !== additive.contractId) {
    throw new ResearchDomainError("Pesquisa e aditivo pertencem a contratos diferentes");
  }
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
