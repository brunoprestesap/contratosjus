"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFiscal, requireAuth, UnauthorizedError } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import { renderDocument } from "@/lib/documents/engine/render";
import { getTemplate } from "@/lib/documents/templates/registry";
import { coherenceCheck, fillFreeField, type AIGenerationLog, type CoherenceWarning } from "@/lib/ai/generate";
import { aiRateLimiter, RateLimitError } from "@/lib/rate-limiter";
import {
  checkCoherenceSchema,
  suggestFieldSchema,
  type CheckCoherenceInput,
  type SuggestFieldInput,
} from "@/lib/validators/documento";
import type { ActionResponse } from "@/types";
import type { Prisma } from "@/generated/prisma/client";

export async function listFinalizedResearchesForContract(
  contractId: string
): Promise<
  ActionResponse<
    Array<{
      id: string;
      itemType: "MATERIAL" | "SERVICE";
      catmatCode: string | null;
      catserCode: string | null;
      mean: number | null;
      median: number | null;
      stdDev: number | null;
      coefVariation: number | null;
      samplesCount: number;
      finalizedAt: Date | null;
      hasJustificativaDoc: boolean;
    }>
  >
> {
  try {
    await requireAuth();
    const [researches, existingJust] = await Promise.all([
      prisma.priceResearch.findMany({
        where: { contractId, status: "FINALIZED" },
        orderBy: { finalizedAt: "desc" },
        include: {
          samples: { where: { excluded: false }, select: { id: true } },
        },
      }),
      prisma.generatedDocument.findMany({
        where: {
          contractId,
          templateId: "prorrogacao.justificativa-economicidade",
          status: { in: ["GENERATED", "SIGNED"] },
        },
        select: { priceResearchId: true },
      }),
    ]);
    const withJust = new Set(
      existingJust.map((d) => d.priceResearchId).filter(Boolean)
    );

    return {
      success: true,
      data: researches.map((r) => ({
        id: r.id,
        itemType: r.itemType,
        catmatCode: r.catmatCode,
        catserCode: r.catserCode,
        mean: r.mean ? parseFloat(r.mean.toString()) : null,
        median: r.median ? parseFloat(r.median.toString()) : null,
        stdDev: r.stdDev ? parseFloat(r.stdDev.toString()) : null,
        coefVariation: r.coefVariation
          ? parseFloat(r.coefVariation.toString())
          : null,
        samplesCount: r.samples.length,
        finalizedAt: r.finalizedAt,
        hasJustificativaDoc: withJust.has(r.id),
      })),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao listar pesquisas" };
  }
}

export async function listAdditivesForContract(
  contractId: string
): Promise<
  ActionResponse<
    Array<{
      id: string;
      additiveNumber: string;
      type: string;
      signatureDate: Date;
      newEndDate: Date | null;
      newGlobalValue: number | null;
      hasMinuta: boolean;
    }>
  >
> {
  try {
    await requireAuth();
    const [additives, existing] = await Promise.all([
      prisma.additive.findMany({
        where: { contractId },
        orderBy: { signatureDate: "desc" },
        select: {
          id: true,
          additiveNumber: true,
          type: true,
          signatureDate: true,
          newEndDate: true,
          newGlobalValue: true,
        },
      }),
      prisma.generatedDocument.findMany({
        where: {
          contractId,
          templateId: "prorrogacao.termo-aditivo",
          status: { in: ["GENERATED", "SIGNED"] },
        },
        select: { additiveId: true },
      }),
    ]);
    const withMinuta = new Set(
      existing.map((d) => d.additiveId).filter(Boolean)
    );

    return {
      success: true,
      data: additives.map((a) => ({
        id: a.id,
        additiveNumber: a.additiveNumber,
        type: a.type,
        signatureDate: a.signatureDate,
        newEndDate: a.newEndDate,
        newGlobalValue: a.newGlobalValue
          ? parseFloat(a.newGlobalValue.toString())
          : null,
        hasMinuta: withMinuta.has(a.id),
      })),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao listar aditivos" };
  }
}

const MAX_SIGNED_PDF_BYTES = 20 * 1024 * 1024; // 20 MB
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"

function looksLikePdf(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (bytes[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}

export async function uploadSignedDocument(params: {
  documentId: string;
  pdfBytes: Uint8Array;
}): Promise<ActionResponse<{ checksum: string }>> {
  try {
    await requireFiscal();

    if (params.pdfBytes.length === 0) {
      return { success: false, error: "Arquivo vazio" };
    }
    if (params.pdfBytes.length > MAX_SIGNED_PDF_BYTES) {
      return {
        success: false,
        error: `Arquivo excede o limite de ${MAX_SIGNED_PDF_BYTES / 1024 / 1024} MB`,
      };
    }
    if (!looksLikePdf(params.pdfBytes)) {
      return { success: false, error: "Arquivo não é um PDF válido" };
    }

    const doc = await prisma.generatedDocument.findUnique({
      where: { id: params.documentId },
      select: {
        id: true,
        contractId: true,
        templateId: true,
        version: true,
        status: true,
      },
    });
    if (!doc) return { success: false, error: "Documento não encontrado" };
    if (doc.status === "SUPERSEDED") {
      return {
        success: false,
        error:
          "Não é possível anexar assinatura em versão substituída. Baixe a versão atual e assine-a.",
      };
    }

    const { resolveSignedPath, writeDocument } = await import(
      "@/lib/documents/engine/storage"
    );
    const { absolutePath, relativePath } = resolveSignedPath(
      doc.contractId,
      doc.templateId,
      doc.version
    );
    const checksum = await writeDocument(absolutePath, params.pdfBytes);

    await prisma.generatedDocument.update({
      where: { id: doc.id },
      data: {
        signedPdfPath: relativePath,
        signedChecksum: checksum,
        signedAt: new Date(),
        status: "SIGNED",
      },
    });

    await logAudit({
      entity: "GeneratedDocument",
      entityId: doc.id,
      action: "UPDATE",
      newValue: { status: "SIGNED", signedChecksum: checksum },
    });

    revalidatePath(`/contratos/${doc.contractId}/documentos/${doc.id}`);
    revalidatePath(`/contratos/${doc.contractId}/documentos`);

    return { success: true, data: { checksum } };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    console.error(
      "uploadSignedDocument error:",
      error instanceof Error ? error.message : "unknown"
    );
    return { success: false, error: "Erro ao salvar o documento assinado" };
  }
}

export async function listPaymentsForAteste(
  contractId: string
): Promise<
  ActionResponse<
    Array<{
      id: string;
      referenceMonth: Date;
      invoiceValue: number | null;
      attestDate: Date;
      hasAteste: boolean;
    }>
  >
> {
  try {
    await requireAuth();
    const [payments, existingAtestes] = await Promise.all([
      prisma.payment.findMany({
        where: { contractId, attestDate: { not: null } },
        orderBy: { referenceMonth: "desc" },
        select: {
          id: true,
          referenceMonth: true,
          invoiceValue: true,
          attestDate: true,
        },
      }),
      prisma.generatedDocument.findMany({
        where: {
          contractId,
          templateId: "fiscalizacao.ateste-nf",
          status: { in: ["GENERATED", "SIGNED"] },
        },
        select: { paymentId: true },
      }),
    ]);
    const attestedPaymentIds = new Set(
      existingAtestes.map((d) => d.paymentId).filter(Boolean)
    );

    return {
      success: true,
      data: payments.map((p) => ({
        id: p.id,
        referenceMonth: p.referenceMonth,
        invoiceValue: p.invoiceValue ? parseFloat(p.invoiceValue.toString()) : null,
        attestDate: p.attestDate as Date,
        hasAteste: attestedPaymentIds.has(p.id),
      })),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao listar pagamentos" };
  }
}

async function loadBasicContractContext(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: {
      contractNumber: true,
      processNumber: true,
      object: true,
      supplier: true,
      supplierCnpj: true,
      legalRegime: true,
      biddingModality: true,
      startDate: true,
      endDate: true,
      canExtend: true,
      globalValue: true,
      estimatedMonthlyValue: true,
      fiscalHolder: true,
      contractManager: true,
      status: true,
    },
  });
  if (!contract) return null;
  return {
    numero: contract.contractNumber,
    processo: contract.processNumber,
    objeto: contract.object,
    fornecedor: contract.supplier,
    cnpjFornecedor: contract.supplierCnpj,
    regimeLegal: contract.legalRegime,
    modalidade: contract.biddingModality,
    vigenciaInicio: contract.startDate.toISOString().slice(0, 10),
    vigenciaFim: contract.endDate.toISOString().slice(0, 10),
    podeProrrogar: contract.canExtend,
    valorGlobal: parseFloat(contract.globalValue.toString()),
    valorMensalEstimado: contract.estimatedMonthlyValue
      ? parseFloat(contract.estimatedMonthlyValue.toString())
      : null,
    fiscal: contract.fiscalHolder,
    gestor: contract.contractManager,
    status: contract.status,
    regime: contract.legalRegime,
  };
}

async function logAICall(params: {
  log: AIGenerationLog;
  contractId: string;
}): Promise<void> {
  await logAudit({
    entity: "AICall",
    entityId: params.contractId,
    action: "CREATE",
    newValue: {
      aiPurpose: params.log.purpose,
      aiModel: params.log.model,
      systemPromptHash: params.log.systemPromptHash,
      inputTokens: params.log.inputTokens,
      outputTokens: params.log.outputTokens,
      contextContractId: params.contractId,
    },
  });
}

interface GenerateDocumentInput {
  templateId: string;
  contractId: string;
  paymentId?: string;
  additiveId?: string;
  priceResearchId?: string;
  fiscalOccurrenceId?: string;
  manualFields?: Record<string, string>;
  aiFields?: Record<string, string>;
}

export async function generateDocument(
  input: GenerateDocumentInput
): Promise<ActionResponse<{ documentId: string; pdfPath: string }>> {
  try {
    const session = await requireFiscal();
    const template = getTemplate(input.templateId);

    const existingLatest = await prisma.generatedDocument.findFirst({
      where: {
        contractId: input.contractId,
        templateId: input.templateId,
      },
      orderBy: { version: "desc" },
    });

    const nextVersion = existingLatest ? existingLatest.version + 1 : 1;

    const rendered = await renderDocument({
      templateId: input.templateId,
      contractId: input.contractId,
      version: nextVersion,
      paymentId: input.paymentId,
      additiveId: input.additiveId,
      priceResearchId: input.priceResearchId,
      fiscalOccurrenceId: input.fiscalOccurrenceId,
      manualFields: input.manualFields,
      aiFields: input.aiFields,
    });

    const document = await prisma.$transaction(async (tx) => {
      if (existingLatest && existingLatest.status !== "SUPERSEDED") {
        await tx.generatedDocument.update({
          where: { id: existingLatest.id },
          data: { status: "SUPERSEDED" },
        });
      }

      const created = await tx.generatedDocument.create({
        data: {
          contractId: input.contractId,
          paymentId: input.paymentId ?? null,
          additiveId: input.additiveId ?? null,
          priceResearchId: input.priceResearchId ?? null,
          fiscalOccurrenceId: input.fiscalOccurrenceId ?? null,
          templateId: template.metadata.id,
          category: template.metadata.category,
          status: "GENERATED",
          version: nextVersion,
          title: template.metadata.title,
          inputData: rendered.inputData as Prisma.InputJsonValue,
          manualFields: (input.manualFields ?? null) as Prisma.InputJsonValue,
          aiFields: (input.aiFields ?? null) as Prisma.InputJsonValue,
          pdfPath: rendered.pdfPath,
          pdfChecksum: rendered.pdfChecksum,
          generatedAt: new Date(),
          createdById: session.user.id,
          supersededById:
            existingLatest && existingLatest.status !== "SUPERSEDED"
              ? existingLatest.id
              : null,
        },
      });

      return created;
    });

    await logAudit({
      entity: "GeneratedDocument",
      entityId: document.id,
      action: "CREATE",
      newValue: {
        templateId: template.metadata.id,
        version: nextVersion,
        checksum: rendered.pdfChecksum,
      },
    });

    revalidatePath(`/contratos/${input.contractId}`);
    revalidatePath(`/contratos/${input.contractId}/documentos`);

    return {
      success: true,
      data: { documentId: document.id, pdfPath: rendered.pdfPath },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    const message =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao gerar documento";
    return { success: false, error: message };
  }
}

// ── suggestFieldText — preenche campo AI livre (genérico) ─────

export async function suggestFieldText(
  input: SuggestFieldInput
): Promise<ActionResponse<{ text: string }>> {
  try {
    const session = await requireFiscal();
    await aiRateLimiter.consume(session.user.id);
    const parsed = suggestFieldSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const template = getTemplate(parsed.data.templateId);
    const section = template.metadata.sections.find(
      (s) => s.id === parsed.data.sectionId
    );
    if (!section) {
      return { success: false, error: "Seção não encontrada no template" };
    }
    if (section.kind !== "AI") {
      return {
        success: false,
        error: `Seção "${section.label}" não é do tipo AI (é ${section.kind})`,
      };
    }

    const contractContext = await loadBasicContractContext(parsed.data.contractId);
    if (!contractContext) {
      return { success: false, error: "Contrato não encontrado" };
    }

    const regime =
      contractContext.regime === "LEI_8666_1993"
        ? "LEI_8666_1993"
        : "LEI_14133_2021";

    const { text, log } = await fillFreeField({
      templateTitle: template.metadata.title,
      sectionLabel: section.label,
      lawRegime: regime,
      contractData: contractContext,
      existingText: parsed.data.existingText,
      userHint: parsed.data.userHint,
      extraContext: parsed.data.extraContext,
    });

    await logAICall({ log, contractId: parsed.data.contractId });

    return { success: true, data: { text } };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    const message =
      error instanceof Error ? error.message : "Erro ao sugerir texto";
    return { success: false, error: message };
  }
}

// ── checkDocumentCoherence — revisa o draft inteiro ───────────

export async function checkDocumentCoherence(
  input: CheckCoherenceInput
): Promise<
  ActionResponse<{ ok: boolean; warnings: CoherenceWarning[] }>
> {
  try {
    const session = await requireAuth();
    await aiRateLimiter.consume(session.user.id);
    const parsed = checkCoherenceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const template = getTemplate(parsed.data.templateId);
    const contract = await prisma.contract.findUnique({
      where: { id: parsed.data.contractId },
      select: { legalRegime: true },
    });
    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    const regime =
      contract.legalRegime === "LEI_8666_1993"
        ? "LEI_8666_1993"
        : "LEI_14133_2021";

    const result = await coherenceCheck({
      templateTitle: template.metadata.title,
      lawRegime: regime,
      draft: parsed.data.draft,
    });

    await logAICall({ log: result.log, contractId: parsed.data.contractId });

    return {
      success: true,
      data: { ok: result.ok, warnings: result.warnings },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    const message =
      error instanceof Error ? error.message : "Erro ao checar coerência";
    return { success: false, error: message };
  }
}

export async function listDocumentsByContract(
  contractId: string
): Promise<
  ActionResponse<
    Array<{
      id: string;
      templateId: string;
      title: string;
      category: string;
      status: string;
      version: number;
      generatedAt: Date | null;
      pdfChecksum: string | null;
    }>
  >
> {
  try {
    await requireAuth();
    const documents = await prisma.generatedDocument.findMany({
      where: { contractId },
      orderBy: [{ category: "asc" }, { templateId: "asc" }, { version: "desc" }],
      select: {
        id: true,
        templateId: true,
        title: true,
        category: true,
        status: true,
        version: true,
        generatedAt: true,
        pdfChecksum: true,
      },
    });
    return { success: true, data: documents };
  } catch (error) {
    if (error instanceof UnauthorizedError || error instanceof RateLimitError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Erro ao listar documentos",
    };
  }
}
