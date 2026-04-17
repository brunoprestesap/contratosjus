import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateLoadParams, TemplateModule } from "@/lib/documents/engine/types";
import { metadata } from "./metadata";
import { TermoAditivoPdf, type TermoAditivoData } from "./template";

async function loadData(params: TemplateLoadParams): Promise<TermoAditivoData> {
  if (!params.additiveId) {
    throw new Error("additiveId é obrigatório para Minuta de Termo Aditivo");
  }

  const additive = await prisma.additive.findUnique({
    where: { id: params.additiveId },
    include: { contract: true },
  });
  if (!additive) throw new Error("Aditivo não encontrado");
  if (additive.contractId !== params.contractId) {
    throw new Error("Aditivo não pertence ao contrato informado");
  }

  return {
    contract: {
      number: additive.contract.contractNumber,
      processNumber: additive.contract.processNumber,
      object: additive.contract.object,
      supplier: additive.contract.supplier,
      supplierCnpj: additive.contract.supplierCnpj,
      signatureDate: additive.contract.signatureDate,
      originalEndDate: additive.originalEndDate,
      originalGlobalValue: parseFloat(additive.originalGlobalValue.toString()),
      fiscalHolder: additive.contract.fiscalHolder,
      contractManager: additive.contract.contractManager,
      legalRegime: additive.contract.legalRegime,
    },
    additive: {
      number: additive.additiveNumber,
      type: additive.type,
      signatureDate: additive.signatureDate,
      newEndDate: additive.newEndDate,
      newGlobalValue: additive.newGlobalValue
        ? parseFloat(additive.newGlobalValue.toString())
        : null,
      newMonthlyValue: additive.newMonthlyValue
        ? parseFloat(additive.newMonthlyValue.toString())
        : null,
      justification: additive.justification,
    },
    consideracoesManual: params.manualFields?.consideracoes,
  };
}

export const termoAditivoTemplate: TemplateModule<TermoAditivoData> = {
  metadata,
  loadData,
  render: (data) => React.createElement(TermoAditivoPdf, { data }),
};
