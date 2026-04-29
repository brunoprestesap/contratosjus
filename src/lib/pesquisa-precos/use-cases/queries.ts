import { prisma } from "@/lib/prisma";
import {
  toWireResearchDetail,
  toWireResearchListItem,
  type WireResearchDetail,
  type WireResearchListItem,
} from "@/lib/pesquisa-precos/mappers";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";

export async function getResearchDetailUseCase(researchId: string): Promise<WireResearchDetail> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: researchId },
    include: {
      contract: {
        select: {
          contractNumber: true,
          object: true,
          globalValue: true,
          estimatedMonthlyValue: true,
          legalRegime: true,
        },
      },
      samples: { orderBy: { valorGlobal: "asc" } },
      researchItems: {
        orderBy: { createdAt: "asc" },
        include: {
          contractItem: {
            select: {
              itemNumber: true,
              description: true,
              unitOfMeasure: true,
              quantity: true,
              unitValue: true,
              totalValue: true,
            },
          },
          samples: { orderBy: { valorGlobal: "asc" } },
        },
      },
      generatedDocument: { select: { id: true } },
    },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");
  return toWireResearchDetail(research);
}

export async function listResearchesByContractUseCase(
  contractId: string,
): Promise<WireResearchListItem[]> {
  const rows = await prisma.priceResearch.findMany({
    where: { contractId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      mode: true,
      itemType: true,
      catmatCode: true,
      catserCode: true,
      mean: true,
      finalizedAt: true,
      createdAt: true,
      _count: { select: { researchItems: true } },
    },
  });
  return rows.map(toWireResearchListItem);
}
