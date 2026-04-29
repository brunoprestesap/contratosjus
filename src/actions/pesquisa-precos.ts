"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requireFiscal, UnauthorizedError } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { aiRateLimiter, RateLimitError } from "@/lib/rate-limiter";
import { AIResponseError } from "@/lib/pesquisa-precos/response-parser";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import type { SampleStats } from "@/lib/statistics";
import type { HierarchyTrailStep } from "@/lib/ai/generate";
import type { WireResearchDetail, WireResearchListItem } from "@/lib/pesquisa-precos/mappers";
import {
  createResearchPerItemUseCase,
  createResearchUseCase,
  linkResearchToAdditiveUseCase,
} from "@/lib/pesquisa-precos/use-cases/research-lifecycle";
import {
  confirmCatalogoCodeUseCase,
  confirmItemCodeUseCase,
  suggestCodigoUseCase,
  suggestItemCodeUseCase,
} from "@/lib/pesquisa-precos/use-cases/catalog-code";
import {
  applyLegalRegimeFilter,
  clearLegalRegimeFilter,
  filterSamplesWithAIUseCase,
  queryPrecosUseCase,
  toggleSampleExclusionUseCase,
} from "@/lib/pesquisa-precos/use-cases/samples";
import {
  createManualSampleUseCase,
  deleteManualSampleUseCase,
} from "@/lib/pesquisa-precos/use-cases/manual-samples";
import {
  setItemExceptionJustificationUseCase,
  setItemReferenceMethodUseCase,
} from "@/lib/pesquisa-precos/use-cases/reference-method";
import {
  computeAndPersistItemStatisticsUseCase,
  computeAndPersistStatisticsUseCase,
} from "@/lib/pesquisa-precos/use-cases/statistics";
import {
  generateItemJustificativaUseCase,
  generateJustificativaUseCase,
  updateItemJustificationTextUseCase,
  updateJustificationTextUseCase,
} from "@/lib/pesquisa-precos/use-cases/justification";
import { finalizeResearchUseCase } from "@/lib/pesquisa-precos/use-cases/finalize";
import {
  getResearchDetailUseCase,
  listResearchesByContractUseCase,
} from "@/lib/pesquisa-precos/use-cases/queries";
import { prisma } from "@/lib/prisma";
import {
  confirmCatalogoCodeSchema,
  confirmItemCodeSchema,
  contractIdSchema,
  createManualSampleSchema,
  createResearchPerItemSchema,
  createResearchSchema,
  deleteSampleSchema,
  linkAdditiveSchema,
  queryPrecosFiltersSchema,
  researchIdSchema,
  researchItemIdSchema,
  setItemExceptionJustificationSchema,
  setItemReferenceMethodSchema,
  setLegalRegimeFilterSchema,
  toggleExclusionSchema,
  updateItemJustificationSchema,
  updateJustificationSchema,
  type ConfirmCatalogoCodeInput,
  type ConfirmItemCodeInput,
  type CreateManualSampleInput,
  type CreateResearchInput,
  type CreateResearchPerItemInput,
  type DeleteSampleInput,
  type LinkAdditiveInput,
  type QueryPrecosFilters,
  type SetItemExceptionJustificationInput,
  type SetItemReferenceMethodInput,
  type SetLegalRegimeFilterInput,
  type ToggleExclusionInput,
  type UpdateItemJustificationInput,
  type UpdateJustificationInput,
} from "@/lib/validators/pesquisa-precos";

/** Valida um id opaco de recurso — evita que payload malformado chegue
 *  ao Prisma. Retorna erro estruturado seguro de expor ao cliente. */
function parseResearchId(id: string): string | ActionResponse<never> {
  const parsed = researchIdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Identificador de pesquisa inválido" };
  }
  return parsed.data;
}

function parseContractId(id: string): string | ActionResponse<never> {
  const parsed = contractIdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Identificador de contrato inválido" };
  }
  return parsed.data;
}

function parseResearchItemId(id: string): string | ActionResponse<never> {
  const parsed = researchItemIdSchema.safeParse(id);
  if (!parsed.success) {
    return { success: false, error: "Identificador de item inválido" };
  }
  return parsed.data;
}
import type { ActionResponse } from "@/types";

/**
 * Erros cujo `.message` é seguro expor ao cliente. Demais erros viram
 * mensagem genérica + log sanitizado no servidor.
 */
const SAFE_ERROR_NAMES = new Set([
  "UnauthorizedError",
  "RateLimitError",
  "ZodError",
  "AIResponseError",
  "ResearchDomainError",
]);

function handleError(error: unknown): ActionResponse<never> {
  if (
    error instanceof UnauthorizedError ||
    error instanceof RateLimitError ||
    error instanceof ResearchDomainError
  ) {
    return { success: false, error: error.message };
  }
  if (error instanceof AIResponseError) {
    return {
      success: false,
      error: "A IA retornou uma resposta inválida. Tente novamente em alguns instantes.",
    };
  }
  if (error instanceof Error && SAFE_ERROR_NAMES.has(error.name)) {
    return { success: false, error: error.message };
  }
  logger.error({ err: error, action: "pesquisa-precos" }, "pesquisa-precos action error");
  return { success: false, error: "Erro ao processar a solicitação" };
}

// ── createPriceResearch ────────────────────────────────────────

export async function createPriceResearch(
  input: CreateResearchInput,
): Promise<ActionResponse<{ researchId: string }>> {
  try {
    const session = await requireFiscal();
    const parsed = createResearchSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { researchId, contractId } = await createResearchUseCase(parsed.data, session.user.id);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: { researchId } };
  } catch (error) {
    return handleError(error);
  }
}

// ── suggestCodigoForResearch ───────────────────────────────────

export interface CodigoSuggestionResponse {
  codigo: number | null;
  descricao: string | null;
  confidence: string | null;
  trail: HierarchyTrailStep[];
  reason?: string;
}

export async function suggestCodigoForResearch(
  researchId: string,
): Promise<ActionResponse<CodigoSuggestionResponse>> {
  try {
    const session = await requireFiscal();
    const id = parseResearchId(researchId);
    if (typeof id !== "string") return id;
    await aiRateLimiter.consume(session.user.id);
    const data = await suggestCodigoUseCase(id);
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

// ── confirmCatalogoCode ────────────────────────────────────────

export async function confirmCatalogoCode(
  input: ConfirmCatalogoCodeInput,
): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = confirmCatalogoCodeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    await confirmCatalogoCodeUseCase(parsed.data);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

// ── queryPrecosPraticados ──────────────────────────────────────

export async function queryPrecosPraticados(
  input: QueryPrecosFilters,
): Promise<ActionResponse<{ inserted: number }>> {
  try {
    await requireFiscal();
    const parsed = queryPrecosFiltersSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { inserted, contractId } = await queryPrecosUseCase(parsed.data);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: { inserted } };
  } catch (error) {
    return handleError(error);
  }
}

// ── filterSamplesWithAI ────────────────────────────────────────

export async function filterSamplesWithAI(
  researchId: string,
): Promise<ActionResponse<{ excluded: number; kept: number }>> {
  try {
    const session = await requireFiscal();
    const id = parseResearchId(researchId);
    if (typeof id !== "string") return id;
    await aiRateLimiter.consume(session.user.id);
    const { excluded, kept, contractId } = await filterSamplesWithAIUseCase(id);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: { excluded, kept } };
  } catch (error) {
    return handleError(error);
  }
}

// ── toggleSampleExclusion ──────────────────────────────────────

export async function toggleSampleExclusion(
  input: ToggleExclusionInput,
): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = toggleExclusionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { contractId } = await toggleSampleExclusionUseCase(parsed.data);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

// ── computeAndPersistStatistics ────────────────────────────────

export async function computeAndPersistStatistics(
  researchId: string,
): Promise<ActionResponse<SampleStats>> {
  try {
    await requireFiscal();
    const id = parseResearchId(researchId);
    if (typeof id !== "string") return id;
    const { stats, contractId } = await computeAndPersistStatisticsUseCase(id);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: stats };
  } catch (error) {
    return handleError(error);
  }
}

// ── generateJustificativaAI ────────────────────────────────────

export async function generateJustificativaAI(
  researchId: string,
): Promise<ActionResponse<{ text: string }>> {
  try {
    const session = await requireFiscal();
    const id = parseResearchId(researchId);
    if (typeof id !== "string") return id;
    await aiRateLimiter.consume(session.user.id);
    const data = await generateJustificativaUseCase(id);
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

// ── updateJustificationText ────────────────────────────────────

export async function updateJustificationText(
  input: UpdateJustificationInput,
): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = updateJustificationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    await updateJustificationTextUseCase(parsed.data);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

// ── finalizeResearch ──────────────────────────────────────────

export async function finalizeResearch(
  researchId: string,
): Promise<ActionResponse<{ researchId: string }>> {
  try {
    const session = await requireFiscal();
    const id = parseResearchId(researchId);
    if (typeof id !== "string") return id;
    const { researchId: finalizedId, contractId } = await finalizeResearchUseCase(
      id,
      session.user.id,
    );
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: { researchId: finalizedId } };
  } catch (error) {
    return handleError(error);
  }
}

// ── linkResearchToAdditive ────────────────────────────────────

export async function linkResearchToAdditive(
  input: LinkAdditiveInput,
): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = linkAdditiveSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { contractId } = await linkResearchToAdditiveUseCase(parsed.data);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

// ── getPriceResearchDetail ─────────────────────────────────────

export async function getPriceResearchDetail(
  researchId: string,
): Promise<ActionResponse<WireResearchDetail>> {
  try {
    await requireAuth();
    const id = parseResearchId(researchId);
    if (typeof id !== "string") return id;
    const data = await getResearchDetailUseCase(id);
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

// ── listPriceResearchesByContract ──────────────────────────────

export async function listPriceResearchesByContract(
  contractId: string,
): Promise<ActionResponse<WireResearchListItem[]>> {
  try {
    await requireAuth();
    const id = parseContractId(contractId);
    if (typeof id !== "string") return id;
    const data = await listResearchesByContractUseCase(id);
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

// ── createPriceResearchPerItem ────────────────────────────────
// Cria uma pesquisa no modo PER_ITEM: fiscal seleciona 1+ itens do
// contrato; cada item recebe seu próprio PriceResearchItem.

export async function createPriceResearchPerItem(
  input: CreateResearchPerItemInput,
): Promise<ActionResponse<{ researchId: string }>> {
  try {
    const session = await requireFiscal();
    const parsed = createResearchPerItemSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { researchId, contractId } = await createResearchPerItemUseCase(
      parsed.data,
      session.user.id,
    );
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: { researchId } };
  } catch (error) {
    return handleError(error);
  }
}

// ── suggestItemCode ──────────────────────────────────────────
// Sugere CATMAT/CATSER para um ContractItem específico usando IA
// contextualizada (description + detailedSpecification + itemType).

export async function suggestItemCode(
  researchItemId: string,
): Promise<ActionResponse<CodigoSuggestionResponse>> {
  try {
    const session = await requireFiscal();
    const id = parseResearchItemId(researchItemId);
    if (typeof id !== "string") return id;
    await aiRateLimiter.consume(session.user.id);
    const data = await suggestItemCodeUseCase(id);
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}

// ── confirmItemCode ──────────────────────────────────────────

export async function confirmItemCode(input: ConfirmItemCodeInput): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = confirmItemCodeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    await confirmItemCodeUseCase(parsed.data);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

// ── setLegalRegimeFilter ─────────────────────────────────────
// Liga/desliga o filtro automático por regime legal. Ao ligar,
// marca amostras incompatíveis; ao desligar, restaura as que
// foram excluídas por esse filtro (não afeta exclusões manuais
// ou de IA).

export async function setLegalRegimeFilter(
  input: SetLegalRegimeFilterInput,
): Promise<ActionResponse<{ excluded: number; restored: number }>> {
  try {
    await requireFiscal();
    const parsed = setLegalRegimeFilterSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const research = await prisma.priceResearch.findUnique({
      where: { id: parsed.data.researchId },
      select: { contractId: true, legalRegimeSnapshot: true },
    });
    if (!research) {
      return { success: false, error: "Pesquisa não encontrada" };
    }
    await prisma.priceResearch.update({
      where: { id: parsed.data.researchId },
      data: { legalRegimeFilterOn: parsed.data.enabled },
    });

    let result = { excluded: 0, restored: 0 };
    if (parsed.data.enabled && research.legalRegimeSnapshot) {
      result = await applyLegalRegimeFilter(parsed.data.researchId, research.legalRegimeSnapshot);
    } else if (!parsed.data.enabled) {
      const cleared = await clearLegalRegimeFilter(parsed.data.researchId);
      result = { excluded: 0, restored: cleared.restored };
    }
    revalidatePath(`/contratos/${research.contractId}`);
    return { success: true, data: result };
  } catch (error) {
    return handleError(error);
  }
}

// ── computeAndPersistItemStatistics ──────────────────────────

export async function computeAndPersistItemStatistics(
  researchItemId: string,
): Promise<ActionResponse<SampleStats>> {
  try {
    await requireFiscal();
    const id = parseResearchItemId(researchItemId);
    if (typeof id !== "string") return id;
    const { stats, contractId } = await computeAndPersistItemStatisticsUseCase(id);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: stats };
  } catch (error) {
    return handleError(error);
  }
}

// ── generateItemJustificativaAI ──────────────────────────────

export async function generateItemJustificativaAI(
  researchItemId: string,
): Promise<ActionResponse<{ text: string }>> {
  try {
    const session = await requireFiscal();
    const id = parseResearchItemId(researchItemId);
    if (typeof id !== "string") return id;
    await aiRateLimiter.consume(session.user.id);
    const { text, contractId } = await generateItemJustificativaUseCase(id);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: { text } };
  } catch (error) {
    return handleError(error);
  }
}

// ── updateItemJustificationText ──────────────────────────────

export async function updateItemJustificationText(
  input: UpdateItemJustificationInput,
): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = updateItemJustificationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { contractId } = await updateItemJustificationTextUseCase(parsed.data);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

// ── createManualSample ──────────────────────────────────────
// Permite adicionar amostras manualmente (mídia, cotação direta, contratos
// públicos externos, SINAPI etc.) — IN SEGES 65 art. 5º §1º.

export async function createManualSample(
  input: CreateManualSampleInput,
): Promise<ActionResponse<{ sampleId: string }>> {
  try {
    const session = await requireFiscal();
    const parsed = createManualSampleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { sampleId, contractId } = await createManualSampleUseCase(parsed.data, session.user.id);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: { sampleId } };
  } catch (error) {
    return handleError(error);
  }
}

// ── deleteManualSample ─────────────────────────────────────
// Apenas amostras manuais podem ser removidas. Amostras do Painel são
// apenas marcadas como excluídas (preservar histórico).

export async function deleteManualSample(input: DeleteSampleInput): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = deleteSampleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { contractId } = await deleteManualSampleUseCase(parsed.data);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

// ── setItemReferenceMethod ─────────────────────────────────
// Define o método de preço de referência (MEAN/MEDIAN/MIN/CUSTOM) e
// opcional ajuste percentual. Guard-rail: bloqueia valor > mediana
// quando fonte única é o Painel (validado em finalize).

export async function setItemReferenceMethod(
  input: SetItemReferenceMethodInput,
): Promise<ActionResponse<{ referenceValue: number | null }>> {
  try {
    await requireFiscal();
    const parsed = setItemReferenceMethodSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { referenceValue, contractId } = await setItemReferenceMethodUseCase(parsed.data);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true, data: { referenceValue } };
  } catch (error) {
    return handleError(error);
  }
}

// ── setItemExceptionJustification ──────────────────────────
// Permite finalizar item com < 3 amostras mediante justificativa robusta
// (IN SEGES 65 art. 6º §4º).

export async function setItemExceptionJustification(
  input: SetItemExceptionJustificationInput,
): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = setItemExceptionJustificationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { contractId } = await setItemExceptionJustificationUseCase(parsed.data);
    revalidatePath(`/contratos/${contractId}`);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}
