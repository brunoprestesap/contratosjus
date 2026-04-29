import { ReferenceMethod } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber, toNumberOrNull } from "@/lib/decimal";
import { computeReferenceValue, computeStats, type ReferenceMethodKind } from "@/lib/statistics";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import type {
  SetItemExceptionJustificationInput,
  SetItemReferenceMethodInput,
} from "@/lib/validators/pesquisa-precos";

/**
 * Atualiza o método de preço de referência e recalcula o valor.
 *
 * Quando método = CUSTOM, o fiscal informa o valor diretamente.
 * Quando método ∈ {MEAN, MEDIAN, MIN}, o valor é derivado das estatísticas.
 * `adjustmentPercent` aplica ajuste ±% sobre a base (IN SEGES 65 art. 6º).
 *
 * Se o método escolhido diferir do default sugerido, exige
 * `methodJustification` para rastreabilidade no processo administrativo.
 */
export async function setItemReferenceMethodUseCase(
  input: SetItemReferenceMethodInput,
): Promise<{ referenceValue: number | null; contractId: string }> {
  const item = await prisma.priceResearchItem.findUnique({
    where: { id: input.researchItemId },
    include: {
      research: { select: { contractId: true, status: true } },
      samples: {
        where: { excluded: false },
        select: { valorGlobal: true },
      },
    },
  });
  if (!item) throw new ResearchDomainError("Item da pesquisa não encontrado");
  if (item.research.status === "FINALIZED") {
    throw new ResearchDomainError("Pesquisa finalizada não pode ter o método alterado");
  }

  const values = item.samples.map((s) => toNumber(s.valorGlobal));
  const stats = computeStats(values);

  if (stats.count === 0 && input.method !== "NONE") {
    throw new ResearchDomainError(
      "Impossível definir método sem amostras válidas. Consulte ou adicione amostras primeiro.",
    );
  }

  const method = input.method as ReferenceMethodKind;
  const adjustmentPercent = input.adjustmentPercent ?? null;
  const customValue = method === "CUSTOM" ? (input.customValue ?? null) : null;
  const value =
    method === "NONE" ? null : computeReferenceValue(stats, method, adjustmentPercent, customValue);

  await prisma.priceResearchItem.update({
    where: { id: input.researchItemId },
    data: {
      referenceMethod: method as ReferenceMethod,
      referenceValue: value,
      adjustmentPercent: adjustmentPercent,
      methodJustification: input.methodJustification ?? null,
    },
  });

  return { referenceValue: value, contractId: item.research.contractId };
}

export async function setItemExceptionJustificationUseCase(
  input: SetItemExceptionJustificationInput,
): Promise<{ contractId: string }> {
  const item = await prisma.priceResearchItem.findUnique({
    where: { id: input.researchItemId },
    select: { research: { select: { contractId: true, status: true } } },
  });
  if (!item) throw new ResearchDomainError("Item da pesquisa não encontrado");
  if (item.research.status === "FINALIZED") {
    throw new ResearchDomainError("Pesquisa finalizada não pode ter justificativa alterada");
  }

  await prisma.priceResearchItem.update({
    where: { id: input.researchItemId },
    data: { exceptionJustification: input.text },
  });

  return { contractId: item.research.contractId };
}

export function getCurrentReferenceValue(
  stats: ReturnType<typeof computeStats>,
  method: ReferenceMethodKind,
  adjustmentPercent: number | null,
  customValue: number | null,
): number | null {
  return computeReferenceValue(stats, method, adjustmentPercent, customValue);
}

export { toNumberOrNull };
