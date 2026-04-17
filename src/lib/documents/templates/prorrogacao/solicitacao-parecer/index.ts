import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateLoadParams, TemplateModule } from "@/lib/documents/engine/types";
import { metadata } from "./metadata";
import { SolicitacaoParecerPdf, type SolicitacaoParecerData } from "./template";

async function loadData(
  params: TemplateLoadParams
): Promise<SolicitacaoParecerData> {
  const contract = await prisma.contract.findUnique({
    where: { id: params.contractId },
    select: {
      contractNumber: true,
      processNumber: true,
      object: true,
      supplier: true,
      supplierCnpj: true,
      endDate: true,
      fiscalHolder: true,
    },
  });
  if (!contract) throw new Error("Contrato não encontrado");

  // Anexos referenciados: documentos de prorrogação já finalizados no contrato
  const anexos = await prisma.generatedDocument.findMany({
    where: {
      contractId: params.contractId,
      category: "PROROGACAO",
      status: { in: ["GENERATED", "SIGNED"] },
      templateId: { not: metadata.id },
    },
    orderBy: [{ templateId: "asc" }, { version: "desc" }],
    distinct: ["templateId"],
    select: {
      title: true,
      version: true,
      generatedAt: true,
      pdfChecksum: true,
    },
  });

  return {
    contract: {
      number: contract.contractNumber,
      processNumber: contract.processNumber,
      object: contract.object,
      supplier: contract.supplier,
      supplierCnpj: contract.supplierCnpj,
      endDate: contract.endDate,
      fiscalHolder: contract.fiscalHolder,
    },
    destinatario:
      params.manualFields?.destinatario ??
      "Assessoria Jurídica da Justiça Federal do Amapá",
    resumoFato:
      params.aiFields?.resumoFato ??
      "Resumo fático ainda não preenchido — use 'Sugerir com IA' para gerar.",
    fundamentacao:
      params.aiFields?.fundamentacao ??
      "Fundamentação preliminar ainda não preenchida — use 'Sugerir com IA' para gerar.",
    quesitosManual: params.manualFields?.quesitos,
    anexos,
  };
}

export const solicitacaoParecerTemplate: TemplateModule<SolicitacaoParecerData> =
  {
    metadata,
    loadData,
    render: (data) => React.createElement(SolicitacaoParecerPdf, { data }),
  };
