import type {
  CodeSource,
  LegalRegime,
  Prisma,
  PriceSampleSource,
  ReferenceMethod,
  ResearchItemType,
  ResearchMode,
  ResearchStatus,
} from "@/generated/prisma/client";
import { toNumber, toNumberOrNull } from "@/lib/decimal";

/**
 * Wire types — contratos serializáveis retornados pelas Server Actions.
 * Centralizam o "formato de saída" para que a UI não lide com Prisma.Decimal.
 */

export interface WireResearchSample {
  id: string;
  researchItemId: string | null;
  pncpNumeroControle: string;
  orgao: string | null;
  cnpjFornecedor: string | null;
  supplierName: string | null;
  objetoResumo: string;
  valorGlobal: number;
  valorMensal: number | null;
  dataAssinatura: Date | null;
  uf: string | null;
  modalidade: string | null;
  legalRegimeInferred: LegalRegime | null;
  source: PriceSampleSource;
  sourceNotes: string | null;
  createdManually: boolean;
  excluded: boolean;
  exclusionReason: string | null;
  excludedByAI: boolean | null;
}

export interface WireResearchContract {
  contractNumber: string;
  object: string;
  globalValue: number;
  estimatedMonthlyValue: number | null;
  legalRegime: LegalRegime;
}

export interface WireResearchItem {
  id: string;
  contractItemId: string;
  itemType: ResearchItemType;
  catmatCode: string | null;
  catserCode: string | null;
  codeSource: CodeSource;
  codeDescricao: string | null;
  mean: number | null;
  median: number | null;
  minValue: number | null;
  maxValue: number | null;
  stdDev: number | null;
  coefVariation: number | null;
  sampleCountTotal: number;
  sampleCountUsed: number;
  referenceMethod: ReferenceMethod;
  referenceValue: number | null;
  adjustmentPercent: number | null;
  methodJustification: string | null;
  exceptionJustification: string | null;
  justificationText: string | null;
  justificationEditedAt: Date | null;
  queriedAt: Date | null;
  contractItem: {
    itemNumber: string;
    description: string;
    unitOfMeasure: string;
    quantity: number;
    unitValue: number;
    totalValue: number;
  };
  samples: WireResearchSample[];
}

export interface WireResearchDetail {
  id: string;
  contractId: string;
  status: ResearchStatus;
  mode: ResearchMode;
  legalRegimeSnapshot: LegalRegime | null;
  legalRegimeFilterOn: boolean;
  itemType: ResearchItemType | null;
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
  researchItems: WireResearchItem[];
  generatedDocumentId: string | null;
}

export interface WireResearchListItem {
  id: string;
  status: ResearchStatus;
  mode: ResearchMode;
  itemType: ResearchItemType | null;
  catmatCode: string | null;
  catserCode: string | null;
  mean: number | null;
  finalizedAt: Date | null;
  createdAt: Date;
  itemCount: number;
}

/**
 * Inputs — casam com o retorno cru do Prisma. Declaramos o mínimo
 * que o mapper precisa para não acoplar à forma exata do include.
 */

type SampleRow = {
  id: string;
  researchItemId: string | null;
  pncpNumeroControle: string;
  orgao: string | null;
  cnpjFornecedor: string | null;
  supplierName: string | null;
  objetoResumo: string;
  valorGlobal: Prisma.Decimal;
  valorMensal: Prisma.Decimal | null;
  dataAssinatura: Date | null;
  uf: string | null;
  modalidade: string | null;
  legalRegimeInferred: LegalRegime | null;
  source: PriceSampleSource;
  sourceNotes: string | null;
  createdManually: boolean;
  excluded: boolean;
  exclusionReason: string | null;
  excludedByAI: boolean | null;
};

type ContractItemRow = {
  itemNumber: string;
  description: string;
  unitOfMeasure: string;
  quantity: Prisma.Decimal;
  unitValue: Prisma.Decimal;
  totalValue: Prisma.Decimal;
};

type ResearchItemRow = {
  id: string;
  contractItemId: string;
  itemType: ResearchItemType;
  catmatCode: string | null;
  catserCode: string | null;
  codeSource: CodeSource;
  codeDescricao: string | null;
  mean: Prisma.Decimal | null;
  median: Prisma.Decimal | null;
  minValue: Prisma.Decimal | null;
  maxValue: Prisma.Decimal | null;
  stdDev: Prisma.Decimal | null;
  coefVariation: Prisma.Decimal | null;
  sampleCountTotal: number;
  sampleCountUsed: number;
  referenceMethod: ReferenceMethod;
  referenceValue: Prisma.Decimal | null;
  adjustmentPercent: Prisma.Decimal | null;
  methodJustification: string | null;
  exceptionJustification: string | null;
  justificationText: string | null;
  justificationEditedAt: Date | null;
  queriedAt: Date | null;
  contractItem: ContractItemRow;
  samples: SampleRow[];
};

type ResearchDetailRow = {
  id: string;
  contractId: string;
  status: ResearchStatus;
  mode: ResearchMode;
  legalRegimeSnapshot: LegalRegime | null;
  legalRegimeFilterOn: boolean;
  itemType: ResearchItemType | null;
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
    legalRegime: LegalRegime;
  };
  samples: SampleRow[];
  researchItems: ResearchItemRow[];
  generatedDocument: { id: string } | null;
};

type ResearchListRow = {
  id: string;
  status: ResearchStatus;
  mode: ResearchMode;
  itemType: ResearchItemType | null;
  catmatCode: string | null;
  catserCode: string | null;
  mean: Prisma.Decimal | null;
  finalizedAt: Date | null;
  createdAt: Date;
  _count: { researchItems: number };
};

export function toWireSample(row: SampleRow): WireResearchSample {
  return {
    id: row.id,
    researchItemId: row.researchItemId,
    pncpNumeroControle: row.pncpNumeroControle,
    orgao: row.orgao,
    cnpjFornecedor: row.cnpjFornecedor,
    supplierName: row.supplierName,
    objetoResumo: row.objetoResumo,
    valorGlobal: toNumber(row.valorGlobal),
    valorMensal: toNumberOrNull(row.valorMensal),
    dataAssinatura: row.dataAssinatura,
    uf: row.uf,
    modalidade: row.modalidade,
    legalRegimeInferred: row.legalRegimeInferred,
    source: row.source,
    sourceNotes: row.sourceNotes,
    createdManually: row.createdManually,
    excluded: row.excluded,
    exclusionReason: row.exclusionReason,
    excludedByAI: row.excludedByAI,
  };
}

export function toWireResearchItem(row: ResearchItemRow): WireResearchItem {
  return {
    id: row.id,
    contractItemId: row.contractItemId,
    itemType: row.itemType,
    catmatCode: row.catmatCode,
    catserCode: row.catserCode,
    codeSource: row.codeSource,
    codeDescricao: row.codeDescricao,
    mean: toNumberOrNull(row.mean),
    median: toNumberOrNull(row.median),
    minValue: toNumberOrNull(row.minValue),
    maxValue: toNumberOrNull(row.maxValue),
    stdDev: toNumberOrNull(row.stdDev),
    coefVariation: toNumberOrNull(row.coefVariation),
    sampleCountTotal: row.sampleCountTotal,
    sampleCountUsed: row.sampleCountUsed,
    referenceMethod: row.referenceMethod,
    referenceValue: toNumberOrNull(row.referenceValue),
    adjustmentPercent: toNumberOrNull(row.adjustmentPercent),
    methodJustification: row.methodJustification,
    exceptionJustification: row.exceptionJustification,
    justificationText: row.justificationText,
    justificationEditedAt: row.justificationEditedAt,
    queriedAt: row.queriedAt,
    contractItem: {
      itemNumber: row.contractItem.itemNumber,
      description: row.contractItem.description,
      unitOfMeasure: row.contractItem.unitOfMeasure,
      quantity: toNumber(row.contractItem.quantity),
      unitValue: toNumber(row.contractItem.unitValue),
      totalValue: toNumber(row.contractItem.totalValue),
    },
    samples: row.samples.map(toWireSample),
  };
}

export function toWireResearchDetail(row: ResearchDetailRow): WireResearchDetail {
  return {
    id: row.id,
    contractId: row.contractId,
    status: row.status,
    mode: row.mode,
    legalRegimeSnapshot: row.legalRegimeSnapshot,
    legalRegimeFilterOn: row.legalRegimeFilterOn,
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
      legalRegime: row.contract.legalRegime,
    },
    samples: row.samples.map(toWireSample),
    researchItems: row.researchItems.map(toWireResearchItem),
    generatedDocumentId: row.generatedDocument?.id ?? null,
  };
}

export function toWireResearchListItem(row: ResearchListRow): WireResearchListItem {
  return {
    id: row.id,
    status: row.status,
    mode: row.mode,
    itemType: row.itemType,
    catmatCode: row.catmatCode,
    catserCode: row.catserCode,
    mean: toNumberOrNull(row.mean),
    finalizedAt: row.finalizedAt,
    createdAt: row.createdAt,
    itemCount: row._count.researchItems,
  };
}
