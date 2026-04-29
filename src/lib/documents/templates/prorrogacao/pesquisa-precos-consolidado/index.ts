import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateLoadParams, TemplateModule } from "@/lib/documents/engine/types";
import { toNumber, toNumberOrNull } from "@/lib/decimal";
import { metadata } from "./metadata";
import { PesquisaPrecosConsolidadoPdf, type PesquisaPrecosConsolidadoData } from "./template";

async function loadData(params: TemplateLoadParams): Promise<PesquisaPrecosConsolidadoData> {
  if (!params.priceResearchId) {
    throw new Error("priceResearchId é obrigatório para Pesquisa de Preços consolidada");
  }

  const research = await prisma.priceResearch.findUnique({
    where: { id: params.priceResearchId },
    include: {
      contract: true,
      researchItems: {
        orderBy: { createdAt: "asc" },
        include: {
          contractItem: {
            select: {
              itemNumber: true,
              description: true,
              unitOfMeasure: true,
              quantity: true,
              unitValue: true,
              totalValue: true,
            },
          },
          samples: { orderBy: { valorGlobal: "asc" } },
        },
      },
    },
  });
  if (!research) throw new Error("Pesquisa não encontrada");
  if (research.contractId !== params.contractId) {
    throw new Error("Pesquisa não pertence ao contrato informado");
  }
  if (research.mode !== "PER_ITEM") {
    throw new Error("Este template exige pesquisa em modo PER_ITEM");
  }
  if (research.researchItems.length === 0) {
    throw new Error("Pesquisa sem itens");
  }

  const filters =
    (research.queryFilters as {
      dataCompraInicio?: string;
      dataCompraFim?: string;
    } | null) ?? null;

  return {
    contract: {
      number: research.contract.contractNumber,
      processNumber: research.contract.processNumber,
      object: research.contract.object,
      supplier: research.contract.supplier,
      supplierCnpj: research.contract.supplierCnpj,
      globalValue: toNumber(research.contract.globalValue),
      monthlyValue: toNumberOrNull(research.contract.estimatedMonthlyValue),
      startDate: research.contract.startDate,
      endDate: research.contract.endDate,
      legalRegime: research.contract.legalRegime,
    },
    periodo: {
      inicio: filters?.dataCompraInicio ?? null,
      fim: filters?.dataCompraFim ?? null,
      fonte: "API Dados Abertos compras.gov.br — módulo de pesquisa de preços",
    },
    items: research.researchItems.map((item) => ({
      itemNumber: item.contractItem.itemNumber,
      description: item.contractItem.description,
      unitOfMeasure: item.contractItem.unitOfMeasure,
      quantity: toNumber(item.contractItem.quantity),
      unitValue: toNumber(item.contractItem.unitValue),
      totalValue: toNumber(item.contractItem.totalValue),
      itemType: item.itemType,
      catalogoCodigo: item.itemType === "MATERIAL" ? item.catmatCode : item.catserCode,
      codeDescricao: item.codeDescricao,
      stats: {
        count: item.sampleCountUsed,
        countTotal: item.sampleCountTotal,
        mean: toNumberOrNull(item.mean) ?? 0,
        median: toNumberOrNull(item.median) ?? 0,
        min: toNumberOrNull(item.minValue) ?? 0,
        max: toNumberOrNull(item.maxValue) ?? 0,
        stdDev: toNumberOrNull(item.stdDev) ?? 0,
        coefVariation: toNumberOrNull(item.coefVariation) ?? 0,
      },
      reference: {
        method: item.referenceMethod,
        value: toNumberOrNull(item.referenceValue),
        adjustmentPercent: toNumberOrNull(item.adjustmentPercent),
        methodJustification: item.methodJustification,
      },
      exceptionJustification: item.exceptionJustification,
      samples: item.samples.map((s) => ({
        orgao: s.orgao,
        supplierName: s.supplierName,
        objetoResumo: s.objetoResumo,
        valorGlobal: toNumber(s.valorGlobal),
        dataAssinatura: s.dataAssinatura,
        modalidade: s.modalidade,
        uf: s.uf,
        source: s.source,
        excluded: s.excluded,
        exclusionReason: s.exclusionReason,
        regimeInferred: s.legalRegimeInferred,
      })),
      justification: item.justificationText ?? "",
    })),
  };
}

export const pesquisaPrecosConsolidadoTemplate: TemplateModule<PesquisaPrecosConsolidadoData> = {
  metadata,
  loadData,
  render: (data) => React.createElement(PesquisaPrecosConsolidadoPdf, { data }),
};
