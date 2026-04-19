"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireFiscal, UnauthorizedError } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";
import { computeStats } from "@/lib/statistics";
import { toNumber, toNumberOrNull } from "@/lib/decimal";
import { renderDocument } from "@/lib/documents/engine/render";
import { aiRateLimiter, RateLimitError } from "@/lib/rate-limiter";
import { getPrecoMaterial, getPrecoServico, type PrecoFilters } from "@/lib/compras-dadosabertos";
import {
  filterSamples,
  suggestCatmatHierarchy,
  suggestCatserHierarchy,
  writeJustificativa,
  type AIGenerationLog,
  type HierarchyTrailStep,
} from "@/lib/ai/generate";
import { AIResponseError, extractResultado } from "@/lib/pesquisa-precos/response-parser";
import { rowsToValidSamples } from "@/lib/pesquisa-precos/sample-transformer";
import {
  toWireResearchDetail,
  toWireResearchListItem,
  type WireResearchDetail,
  type WireResearchListItem,
} from "@/lib/pesquisa-precos/mappers";
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
import { Prisma } from "@/generated/prisma/client";
import type { ActionResponse } from "@/types";

const MIN_SAMPLES_TO_FINALIZE = 3;

function toDateOnly(d: Date | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

async function logAIGeneration(params: {
  log: AIGenerationLog;
  userId: string;
  researchId: string;
}): Promise<void> {
  // Chamadas de IA têm entidade dedicada "AICall" para não poluir o log da
  // entidade de domínio. `entityId` carrega a pesquisa como contexto.
  await logAudit({
    entity: "AICall",
    entityId: params.researchId,
    action: "CREATE",
    newValue: {
      aiPurpose: params.log.purpose,
      aiModel: params.log.model,
      systemPromptHash: params.log.systemPromptHash,
      inputTokens: params.log.inputTokens,
      outputTokens: params.log.outputTokens,
      contextResearchId: params.researchId,
    },
  });
}

/**
 * Erros cujo .message é seguro expor ao cliente. Demais erros viram
 * mensagem genérica + log sanitizado no servidor.
 */
const SAFE_ERROR_NAMES = new Set([
  "UnauthorizedError",
  "RateLimitError",
  "ZodError",
  "AIResponseError",
]);

function handleError(error: unknown): ActionResponse<never> {
  if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
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

    const research = await prisma.priceResearch.create({
      data: {
        contractId: parsed.data.contractId,
        additiveId: parsed.data.additiveId ?? null,
        createdById: session.user.id,
        itemType: parsed.data.itemType,
        status: "DRAFT",
      },
    });

    await logAudit({
      entity: "PriceResearch",
      entityId: research.id,
      action: "CREATE",
      newValue: { contractId: research.contractId, itemType: research.itemType },
    });

    revalidatePath(`/contratos/${parsed.data.contractId}`);
    return { success: true, data: { researchId: research.id } };
  } catch (error) {
    return handleError(error);
  }
}

// ── suggestCodigoForResearch (roteia hierárquico) ──────────────

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
    const research = await prisma.priceResearch.findUnique({
      where: { id: researchId },
      include: { contract: { select: { object: true } } },
    });
    if (!research) {
      return { success: false, error: "Pesquisa não encontrada" };
    }

    if (research.itemType === "MATERIAL") {
      const result = await suggestCatmatHierarchy(research.contract.object);
      for (const log of result.logs) {
        await logAIGeneration({ log, userId: session.user.id, researchId });
      }
      return {
        success: true,
        data: {
          codigo: result.codigoItem,
          descricao: result.descricaoItem,
          confidence: result.trail.at(-1)?.confidence ?? null,
          trail: result.trail,
          reason: result.reason,
        },
      };
    }

    const result = await suggestCatserHierarchy(research.contract.object);
    for (const log of result.logs) {
      await logAIGeneration({ log, userId: session.user.id, researchId });
    }
    return {
      success: true,
      data: {
        codigo: result.codigoServico,
        descricao: result.descricaoServico,
        confidence: result.trail.at(-1)?.confidence ?? null,
        trail: result.trail,
        reason: result.reason,
      },
    };
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
    await prisma.priceResearch.update({
      where: { id: parsed.data.researchId },
      data: {
        catmatCode: parsed.data.catmatCode ?? null,
        catserCode: parsed.data.catserCode ?? null,
      },
    });
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

    const research = await prisma.priceResearch.findUnique({
      where: { id: parsed.data.researchId },
    });
    if (!research) return { success: false, error: "Pesquisa não encontrada" };

    const codigoItemCatalogoStr =
      research.itemType === "MATERIAL" ? research.catmatCode : research.catserCode;
    if (!codigoItemCatalogoStr) {
      return {
        success: false,
        error: "Confirme o código do catálogo (CATMAT ou CATSER) antes de consultar preços.",
      };
    }
    const codigoItemCatalogo = parseInt(codigoItemCatalogoStr, 10);
    if (!Number.isFinite(codigoItemCatalogo)) {
      return { success: false, error: "Código do catálogo inválido" };
    }

    const filters: PrecoFilters = {
      codigoItemCatalogo,
      dataCompraInicio: toDateOnly(parsed.data.dataCompraInicio),
      dataCompraFim: toDateOnly(parsed.data.dataCompraFim),
      estado: parsed.data.estado,
      poder: parsed.data.poder,
      esfera: parsed.data.esfera,
      dataResultado: true,
      pagina: 1,
      tamanhoPagina: 200,
    };

    const response =
      research.itemType === "MATERIAL"
        ? await getPrecoMaterial(filters)
        : await getPrecoServico(filters);

    const rows = extractResultado(response);
    const samples = rowsToValidSamples(rows, research.id);

    // Substitui amostras anteriores (nova consulta = nova pesquisa).
    // queryFilters é JSON — round-trip para InputJsonValue sem cast duplo.
    const queryFiltersJson = JSON.parse(JSON.stringify(filters)) as Prisma.InputJsonValue;
    const inserted = await prisma.$transaction(async (tx) => {
      await tx.priceSample.deleteMany({ where: { researchId: research.id } });
      if (samples.length === 0) return 0;
      await tx.priceSample.createMany({ data: samples, skipDuplicates: true });
      await tx.priceResearch.update({
        where: { id: research.id },
        data: {
          status: "PNCP_QUERIED",
          queryFilters: queryFiltersJson,
          queriedAt: new Date(),
        },
      });
      return samples.length;
    });

    revalidatePath(`/contratos/${research.contractId}`);
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
    const research = await prisma.priceResearch.findUnique({
      where: { id: researchId },
      include: {
        contract: { select: { object: true, globalValue: true } },
        samples: true,
      },
    });
    if (!research) return { success: false, error: "Pesquisa não encontrada" };
    if (research.samples.length === 0) {
      return { success: false, error: "Sem amostras a filtrar" };
    }

    const { kept, excluded, log } = await filterSamples({
      contratoObjeto: research.contract.object,
      contratoValorGlobal: toNumber(research.contract.globalValue),
      samples: research.samples.map((s) => ({
        id: s.id,
        objetoResumo: s.objetoResumo,
        valorGlobal: toNumber(s.valorGlobal),
        valorMensal: toNumberOrNull(s.valorMensal),
        dataAssinatura: s.dataAssinatura?.toISOString() ?? null,
      })),
    });

    await logAIGeneration({ log, userId: session.user.id, researchId });

    // Agrupa IDs excluídos por motivo idêntico para reduzir operações em
    // lote quando a IA reutiliza um motivo para vários itens. No pior caso
    // (1 motivo distinto por amostra) cai num N+1 — aceitável: ~20 amostras
    // típicas × 1 updateMany ≈ 20 queries rápidas.
    const excludedMap = new Map(excluded.map((e) => [e.id, e.reason]));
    const keptIds = research.samples.filter((s) => !excludedMap.has(s.id)).map((s) => s.id);

    const byReason = new Map<string, string[]>();
    for (const [id, reason] of excludedMap.entries()) {
      const list = byReason.get(reason) ?? [];
      list.push(id);
      byReason.set(reason, list);
    }

    await prisma.$transaction(async (tx) => {
      if (keptIds.length > 0) {
        await tx.priceSample.updateMany({
          where: { id: { in: keptIds } },
          data: { excluded: false, exclusionReason: null, excludedByAI: null },
        });
      }
      for (const [reason, ids] of byReason.entries()) {
        await tx.priceSample.updateMany({
          where: { id: { in: ids } },
          data: {
            excluded: true,
            exclusionReason: reason,
            excludedByAI: true,
          },
        });
      }
      await tx.priceResearch.update({
        where: { id: researchId },
        data: { status: "AI_FILTERED" },
      });
    });

    revalidatePath(`/contratos/${research.contractId}`);
    return {
      success: true,
      data: { excluded: excluded.length, kept: kept.length },
    };
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
    const sample = await prisma.priceSample.update({
      where: { id: parsed.data.sampleId },
      data: {
        excluded: parsed.data.excluded,
        exclusionReason: parsed.data.reason ?? null,
        excludedByAI: false,
      },
      select: { research: { select: { contractId: true } } },
    });
    revalidatePath(`/contratos/${sample.research.contractId}`);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

// ── computeAndPersistStatistics ────────────────────────────────

export async function computeAndPersistStatistics(researchId: string): Promise<
  ActionResponse<{
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    coefVariation: number;
  }>
> {
  try {
    await requireFiscal();
    const samples = await prisma.priceSample.findMany({
      where: { researchId, excluded: false },
      select: { valorGlobal: true },
    });
    const values = samples.map((s) => toNumber(s.valorGlobal));
    const stats = computeStats(values);

    await prisma.priceResearch.update({
      where: { id: researchId },
      data: {
        mean: stats.mean,
        median: stats.median,
        minValue: stats.min,
        maxValue: stats.max,
        stdDev: stats.stdDev,
        coefVariation: stats.coefVariation,
      },
    });

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
      },
    });
    if (!research) return { success: false, error: "Pesquisa não encontrada" };
    if (!research.mean) {
      return {
        success: false,
        error: "Calcule as estatísticas antes de gerar a justificativa",
      };
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
        count: 0, // count real vive em `samples` e já está persistido
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

    await logAIGeneration({ log, userId: session.user.id, researchId });

    await prisma.priceResearch.update({
      where: { id: researchId },
      data: { justificationText: texto, justificationEditedAt: new Date() },
    });

    return { success: true, data: { text: texto } };
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
    await prisma.priceResearch.update({
      where: { id: parsed.data.researchId },
      data: {
        justificationText: parsed.data.text,
        justificationEditedAt: new Date(),
      },
    });
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
    const research = await prisma.priceResearch.findUnique({
      where: { id: researchId },
      include: { samples: { where: { excluded: false }, select: { id: true } } },
    });
    if (!research) return { success: false, error: "Pesquisa não encontrada" };
    if (research.samples.length < MIN_SAMPLES_TO_FINALIZE) {
      return {
        success: false,
        error: `A finalização exige ao menos ${MIN_SAMPLES_TO_FINALIZE} amostras válidas (Manual CNJ). Atual: ${research.samples.length}.`,
      };
    }
    if (!research.justificationText || research.justificationText.length < 10) {
      return {
        success: false,
        error: "Preencha a justificativa antes de finalizar",
      };
    }

    const templateId = "prorrogacao.pesquisa-precos";

    const existingLatest = await prisma.generatedDocument.findFirst({
      where: { contractId: research.contractId, templateId },
      orderBy: { version: "desc" },
    });
    const nextVersion = existingLatest ? existingLatest.version + 1 : 1;

    const rendered = await renderDocument({
      templateId,
      contractId: research.contractId,
      version: nextVersion,
      priceResearchId: researchId,
    });

    await prisma.$transaction(async (tx) => {
      if (existingLatest && existingLatest.status !== "SUPERSEDED") {
        await tx.generatedDocument.update({
          where: { id: existingLatest.id },
          data: { status: "SUPERSEDED" },
        });
      }
      await tx.generatedDocument.create({
        data: {
          contractId: research.contractId,
          priceResearchId: researchId,
          templateId,
          category: "PROROGACAO",
          status: "GENERATED",
          version: nextVersion,
          title: "Pesquisa de Preços",
          inputData: rendered.inputData as Prisma.InputJsonValue,
          pdfPath: rendered.pdfPath,
          pdfChecksum: rendered.pdfChecksum,
          generatedAt: new Date(),
          createdById: session.user.id,
          supersededById:
            existingLatest && existingLatest.status !== "SUPERSEDED" ? existingLatest.id : null,
        },
      });
      await tx.priceResearch.update({
        where: { id: researchId },
        data: { status: "FINALIZED", finalizedAt: new Date() },
      });
    });

    await logAudit({
      entity: "PriceResearch",
      entityId: researchId,
      action: "UPDATE",
      newValue: { status: "FINALIZED", generatedChecksum: rendered.pdfChecksum },
    });

    revalidatePath(`/contratos/${research.contractId}`);
    return { success: true, data: { researchId } };
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
    const additive = await prisma.additive.findUnique({
      where: { id: parsed.data.additiveId },
      select: { type: true, contractId: true },
    });
    if (!additive) return { success: false, error: "Aditivo não encontrado" };
    if (additive.type !== "TERM" && additive.type !== "MIXED") {
      return {
        success: false,
        error:
          "Pesquisa de preços só pode ser vinculada a aditivos de prorrogação (TERM) ou mistos (MIXED)",
      };
    }
    await prisma.priceResearch.update({
      where: { id: parsed.data.researchId },
      data: { additiveId: parsed.data.additiveId },
    });
    revalidatePath(`/contratos/${additive.contractId}`);
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
    const research = await prisma.priceResearch.findUnique({
      where: { id: researchId },
      include: {
        contract: {
          select: {
            contractNumber: true,
            object: true,
            globalValue: true,
            estimatedMonthlyValue: true,
          },
        },
        samples: { orderBy: { valorGlobal: "asc" } },
        generatedDocument: { select: { id: true } },
      },
    });
    if (!research) return { success: false, error: "Pesquisa não encontrada" };

    return { success: true, data: toWireResearchDetail(research) };
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
    const rows = await prisma.priceResearch.findMany({
      where: { contractId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        itemType: true,
        catmatCode: true,
        catserCode: true,
        mean: true,
        finalizedAt: true,
        createdAt: true,
      },
    });
    return { success: true, data: rows.map(toWireResearchListItem) };
  } catch (error) {
    return handleError(error);
  }
}
