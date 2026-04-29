import { Prisma, ResearchItemType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber, toNumberOrNull } from "@/lib/decimal";
import { filterSamples, filterSamplesForItem } from "@/lib/ai/generate";
import { getPrecoMaterial, getPrecoServico, type PrecoFilters } from "@/lib/compras-dadosabertos";
import { precoPraticadoRowSchema } from "@/lib/pesquisa-precos/api-schemas";
import { logAIGeneration } from "@/lib/pesquisa-precos/audit";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import { fetchAllPrecos } from "@/lib/pesquisa-precos/fetch-all-precos";
import { rowsToValidSamples, type PrecoRow } from "@/lib/pesquisa-precos/sample-transformer";
import { LEGAL_REGIME_FILTER_REASON, isSampleCompatible } from "@/lib/pesquisa-precos/legal-regime";
import type { QueryPrecosFilters, ToggleExclusionInput } from "@/lib/validators/pesquisa-precos";

function toDateOnly(d: Date | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

export interface QueryPrecosResult {
  inserted: number;
  contractId: string;
}

function buildBaseFilters(
  input: QueryPrecosFilters,
  codigoItemCatalogo: number,
): Omit<PrecoFilters, "pagina" | "tamanhoPagina"> {
  return {
    codigoItemCatalogo,
    dataCompraInicio: toDateOnly(input.dataCompraInicio),
    dataCompraFim: toDateOnly(input.dataCompraFim),
    estado: input.estado,
    poder: input.poder,
    esfera: input.esfera,
    dataResultado: true,
  };
}

function parseCodigo(str: string | null | undefined, label: string): number {
  if (!str) {
    throw new ResearchDomainError(
      `Confirme o código do catálogo (${label}) antes de consultar preços.`,
    );
  }
  const parsed = parseInt(str, 10);
  if (!Number.isFinite(parsed)) {
    throw new ResearchDomainError(`Código do catálogo inválido: ${str}`);
  }
  return parsed;
}

export async function queryPrecosUseCase(input: QueryPrecosFilters): Promise<QueryPrecosResult> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: input.researchId },
    include: {
      researchItems: {
        select: {
          id: true,
          itemType: true,
          catmatCode: true,
          catserCode: true,
        },
      },
    },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");

  if (research.mode === "PER_ITEM") {
    return queryPrecosPerItem(research, input);
  }
  return queryPrecosLegacy(research, input);
}

async function queryPrecosLegacy(
  research: {
    id: string;
    contractId: string;
    itemType: ResearchItemType | null;
    catmatCode: string | null;
    catserCode: string | null;
  },
  input: QueryPrecosFilters,
): Promise<QueryPrecosResult> {
  if (!research.itemType) {
    throw new ResearchDomainError("Pesquisa legado sem tipo de item definido");
  }
  const codigoItemCatalogo = parseCodigo(
    research.itemType === "MATERIAL" ? research.catmatCode : research.catserCode,
    research.itemType === "MATERIAL" ? "CATMAT" : "CATSER",
  );
  const baseFilters = buildBaseFilters(input, codigoItemCatalogo);

  const rows = await fetchAllPrecos<PrecoRow>({
    fetcher: research.itemType === "MATERIAL" ? getPrecoMaterial : getPrecoServico,
    baseFilters,
    schema: precoPraticadoRowSchema,
    purpose: `QUERY_PRECOS_${research.itemType}`,
  });
  const samples = rowsToValidSamples(rows, research.id, null);
  const queryFiltersJson = JSON.parse(JSON.stringify(baseFilters)) as Prisma.InputJsonValue;

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

  return { inserted, contractId: research.contractId };
}

async function queryPrecosPerItem(
  research: {
    id: string;
    contractId: string;
    legalRegimeSnapshot: "LEI_14133_2021" | "LEI_8666_1993" | null;
    legalRegimeFilterOn: boolean;
    researchItems: Array<{
      id: string;
      itemType: ResearchItemType;
      catmatCode: string | null;
      catserCode: string | null;
    }>;
  },
  input: QueryPrecosFilters,
): Promise<QueryPrecosResult> {
  if (research.researchItems.length === 0) {
    throw new ResearchDomainError("Pesquisa sem itens vinculados");
  }

  const now = new Date();
  let totalInserted = 0;
  const queryFiltersJson = JSON.parse(
    JSON.stringify({
      dataCompraInicio: toDateOnly(input.dataCompraInicio),
      dataCompraFim: toDateOnly(input.dataCompraFim),
      estado: input.estado,
      poder: input.poder,
      esfera: input.esfera,
    }),
  ) as Prisma.InputJsonValue;

  // Processa N itens com concorrência limitada. Itens com código pendente
  // são pulados silenciosamente (UI alerta). Concorrência 3 equilibra
  // latência total (melhor que serial) com o limite de paralelismo do
  // circuit-breaker interno de `compras-dadosabertos.ts`, que por padrão
  // aceita ~60 requests/min por processo.
  const QUERY_CONCURRENCY = 3;
  const itemsToQuery = research.researchItems.filter((item) => {
    const codigo = item.itemType === "MATERIAL" ? item.catmatCode : item.catserCode;
    return Boolean(codigo);
  });

  async function processItem(item: (typeof research.researchItems)[number]): Promise<number> {
    const codigoStr = item.itemType === "MATERIAL" ? item.catmatCode : item.catserCode;
    const codigoItemCatalogo = parseCodigo(
      codigoStr,
      item.itemType === "MATERIAL" ? "CATMAT" : "CATSER",
    );
    const baseFilters = buildBaseFilters(input, codigoItemCatalogo);

    const rows = await fetchAllPrecos<PrecoRow>({
      fetcher: item.itemType === "MATERIAL" ? getPrecoMaterial : getPrecoServico,
      baseFilters,
      schema: precoPraticadoRowSchema,
      purpose: `QUERY_PRECOS_ITEM_${item.itemType}`,
    });
    const samples = rowsToValidSamples(rows, research.id, item.id);

    await prisma.$transaction(async (tx) => {
      await tx.priceSample.deleteMany({ where: { researchItemId: item.id } });
      if (samples.length > 0) {
        await tx.priceSample.createMany({ data: samples, skipDuplicates: true });
      }
      await tx.priceResearchItem.update({
        where: { id: item.id },
        data: { queriedAt: now, sampleCountTotal: samples.length },
      });
    });
    return samples.length;
  }

  // Fila custom com concorrência fixa — evita dependência de p-limit.
  for (let i = 0; i < itemsToQuery.length; i += QUERY_CONCURRENCY) {
    const batch = itemsToQuery.slice(i, i + QUERY_CONCURRENCY);
    const counts = await Promise.all(batch.map(processItem));
    totalInserted += counts.reduce((a, b) => a + b, 0);
  }

  await prisma.priceResearch.update({
    where: { id: research.id },
    data: {
      status: "PNCP_QUERIED",
      queryFilters: queryFiltersJson,
      queriedAt: now,
    },
  });

  // Aplica filtro automático por regime legal se habilitado. Marcação é
  // reversível via setLegalRegimeFilter (desliga) ou toggle manual por amostra.
  if (research.legalRegimeFilterOn && research.legalRegimeSnapshot) {
    await applyLegalRegimeFilter(research.id, research.legalRegimeSnapshot);
  }

  return { inserted: totalInserted, contractId: research.contractId };
}

export async function applyLegalRegimeFilter(
  researchId: string,
  regime: "LEI_14133_2021" | "LEI_8666_1993",
): Promise<{ excluded: number; restored: number }> {
  const samples = await prisma.priceSample.findMany({
    where: { researchId },
    select: {
      id: true,
      legalRegimeInferred: true,
      excludedByAI: true,
      exclusionReason: true,
      excluded: true,
    },
  });

  const toExclude: string[] = [];
  const toRestore: string[] = [];
  for (const s of samples) {
    const compatible = isSampleCompatible(s, regime);
    if (!compatible && !s.excluded) toExclude.push(s.id);
    // Só restaura amostras que foram excluídas pelo próprio filtro legal.
    if (compatible && s.excluded && s.exclusionReason === LEGAL_REGIME_FILTER_REASON) {
      toRestore.push(s.id);
    }
  }

  if (toExclude.length > 0) {
    await prisma.priceSample.updateMany({
      where: { id: { in: toExclude } },
      data: {
        excluded: true,
        exclusionReason: LEGAL_REGIME_FILTER_REASON,
        excludedByAI: false,
      },
    });
  }
  if (toRestore.length > 0) {
    await prisma.priceSample.updateMany({
      where: { id: { in: toRestore } },
      data: {
        excluded: false,
        exclusionReason: null,
        excludedByAI: null,
      },
    });
  }
  return { excluded: toExclude.length, restored: toRestore.length };
}

export async function clearLegalRegimeFilter(researchId: string): Promise<{ restored: number }> {
  const result = await prisma.priceSample.updateMany({
    where: { researchId, exclusionReason: LEGAL_REGIME_FILTER_REASON },
    data: {
      excluded: false,
      exclusionReason: null,
      excludedByAI: null,
    },
  });
  return { restored: result.count };
}

export interface FilterSamplesWithAIResult {
  excluded: number;
  kept: number;
  contractId: string;
}

export async function filterSamplesWithAIUseCase(
  researchId: string,
): Promise<FilterSamplesWithAIResult> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: researchId },
    include: {
      contract: { select: { object: true, globalValue: true } },
      samples: true,
      researchItems: {
        include: {
          contractItem: {
            select: {
              description: true,
              detailedSpecification: true,
              itemType: true,
              unitOfMeasure: true,
              totalValue: true,
            },
          },
        },
      },
    },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");
  if (research.samples.length === 0) {
    throw new ResearchDomainError("Sem amostras a filtrar");
  }

  if (research.mode === "PER_ITEM") {
    return filterSamplesWithAIPerItem(research);
  }
  return filterSamplesWithAILegacy(research);
}

async function filterSamplesWithAILegacy(research: {
  id: string;
  contractId: string;
  contract: { object: string; globalValue: Prisma.Decimal };
  samples: Array<{
    id: string;
    objetoResumo: string;
    valorGlobal: Prisma.Decimal;
    valorMensal: Prisma.Decimal | null;
    dataAssinatura: Date | null;
  }>;
}): Promise<FilterSamplesWithAIResult> {
  const { kept, excluded, logs, errors } = await filterSamples({
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
  return persistAIFilterResult(research.id, research.contractId, research.samples, {
    kept,
    excluded,
    logs,
    errors,
  });
}

async function filterSamplesWithAIPerItem(research: {
  id: string;
  contractId: string;
  samples: Array<{
    id: string;
    researchItemId: string | null;
    objetoResumo: string;
    valorGlobal: Prisma.Decimal;
    valorMensal: Prisma.Decimal | null;
    dataAssinatura: Date | null;
  }>;
  researchItems: Array<{
    id: string;
    contractItem: {
      description: string;
      detailedSpecification: string;
      itemType: string;
      unitOfMeasure: string;
      totalValue: Prisma.Decimal;
    };
  }>;
}): Promise<FilterSamplesWithAIResult> {
  const samplesByItem = new Map<string, typeof research.samples>();
  for (const s of research.samples) {
    if (!s.researchItemId) continue;
    const bucket = samplesByItem.get(s.researchItemId) ?? [];
    bucket.push(s);
    samplesByItem.set(s.researchItemId, bucket);
  }

  const allLogs: Awaited<ReturnType<typeof filterSamplesForItem>>["logs"] = [];
  const allErrors: unknown[] = [];
  const allKept: string[] = [];
  const allExcluded: Array<{ id: string; reason: string }> = [];

  for (const item of research.researchItems) {
    const bucket = samplesByItem.get(item.id) ?? [];
    if (bucket.length === 0) continue;

    const { kept, excluded, logs, errors } = await filterSamplesForItem({
      item: {
        description: item.contractItem.description,
        detailedSpecification: item.contractItem.detailedSpecification,
        itemType: item.contractItem.itemType,
        unitOfMeasure: item.contractItem.unitOfMeasure,
      },
      itemTotalValue: toNumber(item.contractItem.totalValue),
      samples: bucket.map((s) => ({
        id: s.id,
        objetoResumo: s.objetoResumo,
        valorGlobal: toNumber(s.valorGlobal),
        valorMensal: toNumberOrNull(s.valorMensal),
        dataAssinatura: s.dataAssinatura?.toISOString() ?? null,
      })),
    });
    allLogs.push(...logs);
    allErrors.push(...errors);
    allKept.push(...kept);
    allExcluded.push(...excluded);
  }

  return persistAIFilterResult(research.id, research.contractId, research.samples, {
    kept: allKept,
    excluded: allExcluded,
    logs: allLogs,
    errors: allErrors,
  });
}

async function persistAIFilterResult(
  researchId: string,
  contractId: string,
  samples: ReadonlyArray<{ id: string }>,
  result: {
    kept: string[];
    excluded: Array<{ id: string; reason: string }>;
    logs: Awaited<ReturnType<typeof filterSamples>>["logs"];
    errors: unknown[];
  },
): Promise<FilterSamplesWithAIResult> {
  // Audita PRIMEIRO: chunks bem-sucedidos já consumiram tokens e custo.
  // Mesmo que outro chunk tenha falhado, o consumo precisa ficar registrado.
  for (const log of result.logs) {
    await logAIGeneration({ log, researchId });
  }
  if (result.errors.length > 0) {
    throw result.errors[0];
  }

  const excludedMap = new Map(result.excluded.map((e) => [e.id, e.reason]));
  const keptIds = samples.filter((s) => !excludedMap.has(s.id)).map((s) => s.id);
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
        data: { excluded: true, exclusionReason: reason, excludedByAI: true },
      });
    }
    await tx.priceResearch.update({
      where: { id: researchId },
      data: { status: "AI_FILTERED" },
    });
  });

  return {
    excluded: result.excluded.length,
    kept: result.kept.length,
    contractId,
  };
}

export async function toggleSampleExclusionUseCase(
  input: ToggleExclusionInput,
): Promise<{ contractId: string }> {
  const sample = await prisma.priceSample.update({
    where: { id: input.sampleId },
    data: {
      excluded: input.excluded,
      exclusionReason: input.reason ?? null,
      excludedByAI: false,
    },
    select: { research: { select: { contractId: true } } },
  });
  return { contractId: sample.research.contractId };
}
