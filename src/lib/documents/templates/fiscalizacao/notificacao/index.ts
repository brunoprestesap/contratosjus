import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateLoadParams, TemplateModule } from "@/lib/documents/engine/types";
import { metadata } from "./metadata";
import { NotificacaoPdf, type NotificacaoData, type NotificacaoTipo } from "./template";

const TIPOS_VALIDOS: NotificacaoTipo[] = ["ATRASO", "DESCUMPRIMENTO", "ORIENTACAO"];

async function loadData(params: TemplateLoadParams): Promise<NotificacaoData> {
  const contract = await prisma.contract.findUnique({
    where: { id: params.contractId },
    select: {
      contractNumber: true,
      processNumber: true,
      object: true,
      supplier: true,
      supplierCnpj: true,
      fiscalHolder: true,
      legalRegime: true,
    },
  });
  if (!contract) throw new Error("Contrato não encontrado");

  const tipoRaw = params.manualFields?.tipo?.toUpperCase() as NotificacaoTipo | undefined;
  if (!tipoRaw || !TIPOS_VALIDOS.includes(tipoRaw)) {
    throw new Error(
      `Tipo de notificação inválido. Use manualFields.tipo com um de: ${TIPOS_VALIDOS.join(", ")}`,
    );
  }

  const prazoRaw = params.manualFields?.prazoDias;
  const prazoDias = prazoRaw ? parseInt(prazoRaw, 10) : 5;
  if (!Number.isFinite(prazoDias) || prazoDias <= 0) {
    throw new Error("manualFields.prazoDias inválido");
  }

  const regime = contract.legalRegime === "LEI_8666_1993" ? "LEI_8666_1993" : "LEI_14133_2021";

  return {
    tipo: tipoRaw,
    contract: {
      number: contract.contractNumber,
      processNumber: contract.processNumber,
      object: contract.object,
      supplier: contract.supplier,
      supplierCnpj: contract.supplierCnpj,
      fiscalHolder: contract.fiscalHolder,
      legalRegime: regime,
    },
    fato:
      params.aiFields?.fato ??
      "Fato ainda não preenchido — use 'Sugerir com IA' ou preencha manualmente.",
    fundamentacao:
      params.aiFields?.fundamentacao ??
      "Fundamentação ainda não preenchida — use 'Sugerir com IA' ou preencha manualmente.",
    prazoDias,
    prazoBase: params.manualFields?.prazoBase ?? "úteis",
  };
}

export const notificacaoTemplate: TemplateModule<NotificacaoData> = {
  metadata,
  loadData,
  render: (data) => React.createElement(NotificacaoPdf, { data }),
};
