import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateLoadParams, TemplateModule } from "@/lib/documents/engine/types";
import { metadata } from "./metadata";
import {
  JustificativaEconomicidadePdf,
  type JustificativaEconomicidadeData,
} from "./template";

async function loadData(
  params: TemplateLoadParams
): Promise<JustificativaEconomicidadeData> {
  if (!params.priceResearchId) {
    throw new Error(
      "priceResearchId é obrigatório para Justificativa de Economicidade"
    );
  }

  const research = await prisma.priceResearch.findUnique({
    where: { id: params.priceResearchId },
    include: {
      contract: true,
      samples: { where: { excluded: false }, select: { valorGlobal: true } },
    },
  });
  if (!research) throw new Error("Pesquisa não encontrada");
  if (research.contractId !== params.contractId) {
    throw new Error("Pesquisa não pertence ao contrato informado");
  }
  if (research.status !== "FINALIZED") {
    throw new Error(
      "Somente pesquisas FINALIZADAS podem gerar Justificativa de Economicidade"
    );
  }
  if (!research.mean) {
    throw new Error("Pesquisa sem estatísticas calculadas");
  }

  const filters = (research.queryFilters as {
    dataCompraInicio?: string;
    dataCompraFim?: string;
  } | null) ?? null;

  const globalValue = parseFloat(research.contract.globalValue.toString());
  const monthlyValue = research.contract.estimatedMonthlyValue
    ? parseFloat(research.contract.estimatedMonthlyValue.toString())
    : null;
  // Usa valor mensal como referência se disponível; caso contrário, global
  const valorContratoReferencia = monthlyValue ?? globalValue;

  const mean = parseFloat(research.mean.toString());
  const diffAbs = valorContratoReferencia - mean;
  const diffPct = mean === 0 ? 0 : (diffAbs / mean) * 100;
  let conclusao: "economico" | "acima_mercado" | "dentro_media";
  if (diffPct < -5) conclusao = "economico";
  else if (diffPct > 5) conclusao = "acima_mercado";
  else conclusao = "dentro_media";

  const fundamentacaoTexto =
    params.aiFields?.fundamentacao ??
    research.justificationText ??
    "Fundamentação ainda não preenchida — use 'Sugerir com IA' para gerar.";

  return {
    contract: {
      number: research.contract.contractNumber,
      processNumber: research.contract.processNumber,
      object: research.contract.object,
      supplier: research.contract.supplier,
      supplierCnpj: research.contract.supplierCnpj,
      globalValue,
      monthlyValue,
      startDate: research.contract.startDate,
      endDate: research.contract.endDate,
      fiscalHolder: research.contract.fiscalHolder,
      legalRegime: research.contract.legalRegime,
    },
    pesquisa: {
      catalogoTipo: research.itemType,
      catalogoCodigo:
        research.itemType === "MATERIAL"
          ? research.catmatCode
          : research.catserCode,
      periodoInicio: filters?.dataCompraInicio ?? null,
      periodoFim: filters?.dataCompraFim ?? null,
      amostrasValidas: research.samples.length,
      stats: {
        mean,
        median: parseFloat((research.median ?? 0).toString()),
        min: parseFloat((research.minValue ?? 0).toString()),
        max: parseFloat((research.maxValue ?? 0).toString()),
        stdDev: parseFloat((research.stdDev ?? 0).toString()),
        coefVariation: parseFloat((research.coefVariation ?? 0).toString()),
      },
    },
    comparacao: {
      valorContratoReferencia,
      valorMedio: mean,
      diferencaAbs: diffAbs,
      diferencaPct: diffPct,
      conclusao,
    },
    fundamentacaoTexto,
  };
}

export const justificativaEconomicidadeTemplate: TemplateModule<JustificativaEconomicidadeData> =
  {
    metadata,
    loadData,
    render: (data) => React.createElement(JustificativaEconomicidadePdf, { data }),
  };
