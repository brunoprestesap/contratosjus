import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateModule } from "@/lib/documents/engine/types";
import { metadata } from "./metadata";
import { PesquisaPrecosPdf, type PesquisaPrecosData } from "./template";

async function loadData(params: {
  contractId: string;
  priceResearchId?: string;
}): Promise<PesquisaPrecosData> {
  if (!params.priceResearchId) {
    throw new Error("priceResearchId é obrigatório para Pesquisa de Preços");
  }

  const research = await prisma.priceResearch.findUnique({
    where: { id: params.priceResearchId },
    include: {
      contract: true,
      samples: { orderBy: { valorGlobal: "asc" } },
    },
  });
  if (!research) throw new Error("Pesquisa não encontrada");
  if (research.contractId !== params.contractId) {
    throw new Error("Pesquisa não pertence ao contrato informado");
  }

  const filters = (research.queryFilters as {
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
      globalValue: parseFloat(research.contract.globalValue.toString()),
      monthlyValue: research.contract.estimatedMonthlyValue
        ? parseFloat(research.contract.estimatedMonthlyValue.toString())
        : null,
      startDate: research.contract.startDate,
      endDate: research.contract.endDate,
    },
    catalogo: {
      tipo: research.itemType,
      codigo:
        research.itemType === "MATERIAL"
          ? research.catmatCode
          : research.catserCode,
    },
    periodo: {
      inicio: filters?.dataCompraInicio ?? null,
      fim: filters?.dataCompraFim ?? null,
      fonte:
        "API Dados Abertos compras.gov.br — /modulo-pesquisa-preco/" +
        (research.itemType === "MATERIAL" ? "1_consultarMaterial" : "3_consultarServico"),
    },
    samples: research.samples.map((s) => ({
      orgao: s.orgao,
      cnpjFornecedor: s.cnpjFornecedor,
      objetoResumo: s.objetoResumo,
      valorGlobal: parseFloat(s.valorGlobal.toString()),
      dataAssinatura: s.dataAssinatura,
      modalidade: s.modalidade,
      uf: s.uf,
      excluded: s.excluded,
      exclusionReason: s.exclusionReason,
    })),
    statistics: {
      count: research.samples.filter((s) => !s.excluded).length,
      mean: research.mean ? parseFloat(research.mean.toString()) : 0,
      median: research.median ? parseFloat(research.median.toString()) : 0,
      min: research.minValue ? parseFloat(research.minValue.toString()) : 0,
      max: research.maxValue ? parseFloat(research.maxValue.toString()) : 0,
      stdDev: research.stdDev ? parseFloat(research.stdDev.toString()) : 0,
      coefVariation: research.coefVariation
        ? parseFloat(research.coefVariation.toString())
        : 0,
    },
    justification: research.justificationText ?? "",
  };
}

export const pesquisaPrecosTemplate: TemplateModule<PesquisaPrecosData> = {
  metadata,
  loadData,
  render: (data) => React.createElement(PesquisaPrecosPdf, { data }),
};
