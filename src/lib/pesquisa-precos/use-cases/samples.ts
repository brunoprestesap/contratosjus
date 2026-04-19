import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber, toNumberOrNull } from "@/lib/decimal";
import { filterSamples } from "@/lib/ai/generate";
import { getPrecoMaterial, getPrecoServico, type PrecoFilters } from "@/lib/compras-dadosabertos";
import { logAIGeneration } from "@/lib/pesquisa-precos/audit";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import { fetchAllPrecos } from "@/lib/pesquisa-precos/fetch-all-precos";
import { rowsToValidSamples } from "@/lib/pesquisa-precos/sample-transformer";
import type { QueryPrecosFilters, ToggleExclusionInput } from "@/lib/validators/pesquisa-precos";

function toDateOnly(d: Date | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

export interface QueryPrecosResult {
  inserted: number;
  contractId: string;
}

export async function queryPrecosUseCase(input: QueryPrecosFilters): Promise<QueryPrecosResult> {
  const research = await prisma.priceResearch.findUnique({
    where: { id: input.researchId },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");

  const codigoStr = research.itemType === "MATERIAL" ? research.catmatCode : research.catserCode;
  if (!codigoStr) {
    throw new ResearchDomainError(
      "Confirme o código do catálogo (CATMAT ou CATSER) antes de consultar preços.",
    );
  }
  const codigoItemCatalogo = parseInt(codigoStr, 10);
  if (!Number.isFinite(codigoItemCatalogo)) {
    throw new ResearchDomainError("Código do catálogo inválido");
  }

  const baseFilters: Omit<PrecoFilters, "pagina" | "tamanhoPagina"> = {
    codigoItemCatalogo,
    dataCompraInicio: toDateOnly(input.dataCompraInicio),
    dataCompraFim: toDateOnly(input.dataCompraFim),
    estado: input.estado,
    poder: input.poder,
    esfera: input.esfera,
    dataResultado: true,
  };

  const rows = await fetchAllPrecos({
    fetcher: research.itemType === "MATERIAL" ? getPrecoMaterial : getPrecoServico,
    baseFilters,
  });
  const samples = rowsToValidSamples(rows, research.id);

  // queryFilters é JSON — round-trip evita cast duplo `as unknown as`.
  const queryFiltersJson = JSON.parse(JSON.stringify(baseFilters)) as Prisma.InputJsonValue;

  const inserted = await prisma.$transaction(async (tx) => {
    // Nova consulta = nova pesquisa: substitui todas as amostras anteriores.
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
    },
  });
  if (!research) throw new ResearchDomainError("Pesquisa não encontrada");
  if (research.samples.length === 0) {
    throw new ResearchDomainError("Sem amostras a filtrar");
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

  await logAIGeneration({ log, researchId });

  // Agrupa excluídos pelo motivo para reduzir updateMany. No pior caso
  // (cada amostra com motivo único) cai em ~20 queries rápidas.
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
        data: { excluded: true, exclusionReason: reason, excludedByAI: true },
      });
    }
    await tx.priceResearch.update({
      where: { id: researchId },
      data: { status: "AI_FILTERED" },
    });
  });

  return {
    excluded: excluded.length,
    kept: kept.length,
    contractId: research.contractId,
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
