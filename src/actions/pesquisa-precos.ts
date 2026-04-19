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
  createResearchUseCase,
  linkResearchToAdditiveUseCase,
} from "@/lib/pesquisa-precos/use-cases/research-lifecycle";
import {
  confirmCatalogoCodeUseCase,
  suggestCodigoUseCase,
} from "@/lib/pesquisa-precos/use-cases/catalog-code";
import {
  filterSamplesWithAIUseCase,
  queryPrecosUseCase,
  toggleSampleExclusionUseCase,
} from "@/lib/pesquisa-precos/use-cases/samples";
import { computeAndPersistStatisticsUseCase } from "@/lib/pesquisa-precos/use-cases/statistics";
import {
  generateJustificativaUseCase,
  updateJustificationTextUseCase,
} from "@/lib/pesquisa-precos/use-cases/justification";
import { finalizeResearchUseCase } from "@/lib/pesquisa-precos/use-cases/finalize";
import {
  getResearchDetailUseCase,
  listResearchesByContractUseCase,
} from "@/lib/pesquisa-precos/use-cases/queries";
import {
  confirmCatalogoCodeSchema,
  createResearchSchema,
  linkAdditiveSchema,
  queryPrecosFiltersSchema,
  toggleExclusionSchema,
  updateJustificationSchema,
  type ConfirmCatalogoCodeInput,
  type CreateResearchInput,
  type LinkAdditiveInput,
  type QueryPrecosFilters,
  type ToggleExclusionInput,
  type UpdateJustificationInput,
} from "@/lib/validators/pesquisa-precos";
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
    await aiRateLimiter.consume(session.user.id);
    const data = await suggestCodigoUseCase(researchId);
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
    await aiRateLimiter.consume(session.user.id);
    const { excluded, kept, contractId } = await filterSamplesWithAIUseCase(researchId);
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
    const stats = await computeAndPersistStatisticsUseCase(researchId);
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
    await aiRateLimiter.consume(session.user.id);
    const data = await generateJustificativaUseCase(researchId);
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
    const { researchId: finalizedId, contractId } = await finalizeResearchUseCase(
      researchId,
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
    const data = await getResearchDetailUseCase(researchId);
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
    const data = await listResearchesByContractUseCase(contractId);
    return { success: true, data };
  } catch (error) {
    return handleError(error);
  }
}
