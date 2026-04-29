import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { renderDocument } from "@/lib/documents/engine/render";
import { MIN_SAMPLES_TO_FINALIZE } from "@/lib/pesquisa-precos/constants";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";

export { MIN_SAMPLES_TO_FINALIZE };

const TEMPLATE_ID_LEGACY = "prorrogacao.pesquisa-precos";
const TEMPLATE_ID_CONSOLIDADO = "prorrogacao.pesquisa-precos-consolidado";

export async function finalizeResearchUseCase(
  researchId: string,
  userId: string,
): Promise<{ researchId: string; contractId: string }> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: researchId },
    include: {
      samples: { where: { excluded: false }, select: { id: true, researchItemId: true } },
      researchItems: {
        include: {
          contractItem: { select: { itemNumber: true } },
          samples: {
            where: { excluded: false },
            select: { source: true, valorGlobal: true },
          },
          _count: { select: { samples: { where: { excluded: false } } } },
        },
      },
    },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");

  const templateId = research.mode === "PER_ITEM" ? TEMPLATE_ID_CONSOLIDADO : TEMPLATE_ID_LEGACY;

  if (research.mode === "PER_ITEM") {
    validatePerItemReady(research.researchItems);
  } else {
    validateLegacyReady(research.samples.length, research.justificationText);
  }

  const renderedChecksum = await prisma.$transaction(
    async (tx) => {
      const existingLatest = await tx.generatedDocument.findFirst({
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
          title:
            research.mode === "PER_ITEM"
              ? "Pesquisa de Preços (consolidada por item)"
              : "Pesquisa de Preços",
          inputData: rendered.inputData as Prisma.InputJsonValue,
          pdfPath: rendered.pdfPath,
          pdfChecksum: rendered.pdfChecksum,
          generatedAt: new Date(),
          createdById: userId,
          supersededById:
            existingLatest && existingLatest.status !== "SUPERSEDED" ? existingLatest.id : null,
        },
      });
      await tx.priceResearch.update({
        where: { id: researchId },
        data: { status: "FINALIZED", finalizedAt: new Date() },
      });
      return rendered.pdfChecksum;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  await logAudit({
    entity: "PriceResearch",
    entityId: researchId,
    action: "UPDATE",
    newValue: {
      status: "FINALIZED",
      mode: research.mode,
      templateId,
      generatedChecksum: renderedChecksum,
    },
  });

  return { researchId, contractId: research.contractId };
}

function validateLegacyReady(validSamples: number, justification: string | null) {
  if (validSamples < MIN_SAMPLES_TO_FINALIZE) {
    throw new ResearchDomainError(
      `A finalização exige ao menos ${MIN_SAMPLES_TO_FINALIZE} amostras válidas (Manual CNJ). Atual: ${validSamples}.`,
    );
  }
  if (!justification || justification.length < 10) {
    throw new ResearchDomainError("Preencha a justificativa antes de finalizar");
  }
}

// Fontes consideradas "independentes" — rastreabilidade de terceiros
// verificável (SINAPI oficial, outro ente público, cotação formal de
// fornecedor). Mídia/catálogo/outro são admissíveis mas não dispensam
// sozinhas a regra do teto da mediana.
const INDEPENDENT_SOURCES = new Set(["SINAPI", "CONTRATO_PUBLICO", "COTACAO_DIRETA"]);
const PAINEL_CAP_MIN_INDEPENDENT_RATIO = 0.3;

function shouldEnforcePainelCap(samples: ReadonlyArray<{ source: string }>): boolean {
  if (samples.length === 0) return false;
  const independent = samples.filter((s) => INDEPENDENT_SOURCES.has(s.source)).length;
  const ratio = independent / samples.length;
  return ratio < PAINEL_CAP_MIN_INDEPENDENT_RATIO;
}

function validatePerItemReady(
  items: Array<{
    contractItem: { itemNumber: string };
    catmatCode: string | null;
    catserCode: string | null;
    itemType: "MATERIAL" | "SERVICE";
    justificationText: string | null;
    exceptionJustification: string | null;
    referenceMethod: "NONE" | "MEAN" | "MEDIAN" | "MIN" | "CUSTOM";
    referenceValue: Prisma.Decimal | null;
    median: Prisma.Decimal | null;
    samples: Array<{ source: string; valorGlobal: Prisma.Decimal }>;
    _count: { samples: number };
  }>,
) {
  if (items.length === 0) {
    throw new ResearchDomainError("Pesquisa sem itens vinculados");
  }
  for (const item of items) {
    const label = `item #${item.contractItem.itemNumber}`;
    const code = item.itemType === "MATERIAL" ? item.catmatCode : item.catserCode;
    if (!code) {
      throw new ResearchDomainError(`Confirme o código do catálogo do ${label}`);
    }

    const sampleCount = item._count.samples;
    if (sampleCount === 0) {
      throw new ResearchDomainError(`${label} não tem amostras válidas`);
    }
    // < 3 amostras exige justificativa de excepcionalidade (IN SEGES 65 art. 6º §4º).
    if (sampleCount < MIN_SAMPLES_TO_FINALIZE) {
      const justif = item.exceptionJustification?.trim() ?? "";
      if (justif.length < 20) {
        throw new ResearchDomainError(
          `${label} tem apenas ${sampleCount} amostra(s). Preencha a justificativa de excepcionalidade (mín. 20 caracteres) para finalizar com menos de ${MIN_SAMPLES_TO_FINALIZE}.`,
        );
      }
    }

    if (item.referenceMethod === "NONE" || item.referenceValue == null) {
      throw new ResearchDomainError(
        `${label}: defina o método e o valor de referência antes de finalizar.`,
      );
    }

    // Regra do Manual (IN SEGES 65 art. 6º §5º): quando a base única é o
    // Painel de Preços, o valor de referência não pode superar a mediana.
    // O guard-rail só é dispensado se houver presença material (≥ 30%) de
    // amostras de fontes independentes verificáveis (SINAPI, CONTRATO_PUBLICO,
    // COTACAO_DIRETA). Amostras genéricas (MIDIA, OUTRO, CATALOGO_TIC) contam
    // mas não dispensam sozinhas — evita driblar o teto com uma única amostra
    // forjada.
    if (shouldEnforcePainelCap(item.samples) && item.median && item.referenceValue) {
      const refNum = Number(item.referenceValue);
      const medNum = Number(item.median);
      if (refNum > medNum) {
        throw new ResearchDomainError(
          `${label}: com base predominante no Painel de Preços, o valor de referência (${refNum.toFixed(2)}) não pode superar a mediana (${medNum.toFixed(2)}). Ajuste o método, desconte percentual ou complemente com outras fontes (SINAPI, Contrato Público, Cotação Direta) representando ao menos 30% das amostras.`,
        );
      }
    }

    if (!item.justificationText || item.justificationText.length < 10) {
      throw new ResearchDomainError(`Preencha a justificativa do ${label}`);
    }
  }
}
