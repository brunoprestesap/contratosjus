import type { Prisma, ResearchItemType, ResearchStatus } from "@/generated/prisma/client";
import { toNumber, toNumberOrNull } from "@/lib/decimal";

/**
 * Wire types — contratos serializáveis retornados pelas Server Actions.
 * Centralizam o "formato de saída" para que a UI não lide com Prisma.Decimal.
 */

export interface WireResearchSample {
  id: string;
  pncpNumeroControle: string;
  orgao: string | null;
  cnpjFornecedor: string | null;
  objetoResumo: string;
  valorGlobal: number;
  dataAssinatura: Date | null;
  uf: string | null;
  modalidade: string | null;
  excluded: boolean;
  exclusionReason: string | null;
  excludedByAI: boolean | null;
}

export interface WireResearchContract {
  contractNumber: string;
  object: string;
  globalValue: number;
  estimatedMonthlyValue: number | null;
}

export interface WireResearchDetail {
  id: string;
  contractId: string;
  status: ResearchStatus;
  itemType: ResearchItemType;
  catmatCode: string | null;
  catserCode: string | null;
  queryFilters: unknown;
  mean: number | null;
  median: number | null;
  minValue: number | null;
  maxValue: number | null;
  stdDev: number | null;
  coefVariation: number | null;
  justificationText: string | null;
  finalizedAt: Date | null;
  additiveId: string | null;
  contract: WireResearchContract;
  samples: WireResearchSample[];
  generatedDocumentId: string | null;
}

export interface WireResearchListItem {
  id: string;
  status: ResearchStatus;
  itemType: ResearchItemType;
  catmatCode: string | null;
  catserCode: string | null;
  mean: number | null;
  finalizedAt: Date | null;
  createdAt: Date;
}

/**
 * Inputs — casam com o retorno cru do Prisma. Definidos em termos de
 * `GetPayload` permitiriam inferência mais estrita, mas o ganho de tipagem
 * não compensa o acoplamento à forma exata do include. Declaramos o mínimo.
 */

type SampleRow = {
  id: string;
  pncpNumeroControle: string;
  orgao: string | null;
  cnpjFornecedor: string | null;
  objetoResumo: string;
  valorGlobal: Prisma.Decimal;
  dataAssinatura: Date | null;
  uf: string | null;
  modalidade: string | null;
  excluded: boolean;
  exclusionReason: string | null;
  excludedByAI: boolean | null;
};

type ResearchDetailRow = {
  id: string;
  contractId: string;
  status: ResearchStatus;
  itemType: ResearchItemType;
  catmatCode: string | null;
  catserCode: string | null;
  queryFilters: Prisma.JsonValue | null;
  mean: Prisma.Decimal | null;
  median: Prisma.Decimal | null;
  minValue: Prisma.Decimal | null;
  maxValue: Prisma.Decimal | null;
  stdDev: Prisma.Decimal | null;
  coefVariation: Prisma.Decimal | null;
  justificationText: string | null;
  finalizedAt: Date | null;
  additiveId: string | null;
  contract: {
    contractNumber: string;
    object: string;
    globalValue: Prisma.Decimal;
    estimatedMonthlyValue: Prisma.Decimal | null;
  };
  samples: SampleRow[];
  generatedDocument: { id: string } | null;
};

type ResearchListRow = {
  id: string;
  status: ResearchStatus;
  itemType: ResearchItemType;
  catmatCode: string | null;
  catserCode: string | null;
  mean: Prisma.Decimal | null;
  finalizedAt: Date | null;
  createdAt: Date;
};

export function toWireSample(row: SampleRow): WireResearchSample {
  return {
    id: row.id,
    pncpNumeroControle: row.pncpNumeroControle,
    orgao: row.orgao,
    cnpjFornecedor: row.cnpjFornecedor,
    objetoResumo: row.objetoResumo,
    valorGlobal: toNumber(row.valorGlobal),
    dataAssinatura: row.dataAssinatura,
    uf: row.uf,
    modalidade: row.modalidade,
    excluded: row.excluded,
    exclusionReason: row.exclusionReason,
    excludedByAI: row.excludedByAI,
  };
}

export function toWireResearchDetail(row: ResearchDetailRow): WireResearchDetail {
  return {
    id: row.id,
    contractId: row.contractId,
    status: row.status,
    itemType: row.itemType,
    catmatCode: row.catmatCode,
    catserCode: row.catserCode,
    queryFilters: row.queryFilters,
    mean: toNumberOrNull(row.mean),
    median: toNumberOrNull(row.median),
    minValue: toNumberOrNull(row.minValue),
    maxValue: toNumberOrNull(row.maxValue),
    stdDev: toNumberOrNull(row.stdDev),
    coefVariation: toNumberOrNull(row.coefVariation),
    justificationText: row.justificationText,
    finalizedAt: row.finalizedAt,
    additiveId: row.additiveId,
    contract: {
      contractNumber: row.contract.contractNumber,
      object: row.contract.object,
      globalValue: toNumber(row.contract.globalValue),
      estimatedMonthlyValue: toNumberOrNull(row.contract.estimatedMonthlyValue),
    },
    samples: row.samples.map(toWireSample),
    generatedDocumentId: row.generatedDocument?.id ?? null,
  };
}

export function toWireResearchListItem(row: ResearchListRow): WireResearchListItem {
  return {
    id: row.id,
    status: row.status,
    itemType: row.itemType,
    catmatCode: row.catmatCode,
    catserCode: row.catserCode,
    mean: toNumberOrNull(row.mean),
    finalizedAt: row.finalizedAt,
    createdAt: row.createdAt,
  };
}
