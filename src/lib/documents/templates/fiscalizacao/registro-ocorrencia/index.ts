import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateLoadParams, TemplateModule } from "@/lib/documents/engine/types";
import { metadata } from "./metadata";
import {
  RegistroOcorrenciaPdf,
  type RegistroOcorrenciaData,
} from "./template";

interface EvidenceItem {
  descricao: string;
  referencia?: string;
}

function parseEvidences(raw: unknown): EvidenceItem[] {
  if (!raw) return [];
  if (!Array.isArray(raw)) return [];
  const out: EvidenceItem[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      out.push({ descricao: item });
    } else if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      const descricao =
        typeof obj.descricao === "string" ? obj.descricao : null;
      if (descricao) {
        out.push({
          descricao,
          referencia:
            typeof obj.referencia === "string" ? obj.referencia : undefined,
        });
      }
    }
  }
  return out;
}

async function loadData(
  params: TemplateLoadParams
): Promise<RegistroOcorrenciaData> {
  if (!params.fiscalOccurrenceId) {
    throw new Error(
      "fiscalOccurrenceId é obrigatório para Registro de Ocorrência"
    );
  }

  const occurrence = await prisma.fiscalOccurrence.findUnique({
    where: { id: params.fiscalOccurrenceId },
    include: {
      contract: {
        select: {
          contractNumber: true,
          processNumber: true,
          object: true,
          supplier: true,
          supplierCnpj: true,
          fiscalHolder: true,
        },
      },
      reportedBy: { select: { name: true } },
    },
  });
  if (!occurrence) throw new Error("Ocorrência não encontrada");
  if (occurrence.contractId !== params.contractId) {
    throw new Error("Ocorrência não pertence ao contrato informado");
  }

  return {
    contract: {
      number: occurrence.contract.contractNumber,
      processNumber: occurrence.contract.processNumber,
      object: occurrence.contract.object,
      supplier: occurrence.contract.supplier,
      supplierCnpj: occurrence.contract.supplierCnpj,
      fiscalHolder: occurrence.contract.fiscalHolder,
    },
    ocorrencia: {
      occurredAt: occurrence.occurredAt,
      type: occurrence.type,
      severity: occurrence.severity,
      description: occurrence.description,
      evidences: parseEvidences(occurrence.evidences),
    },
    providencias:
      params.aiFields?.providencias ??
      "Providências a serem definidas após análise conjunta com o gestor do contrato.",
    reportedBy: occurrence.reportedBy.name,
  };
}

export const registroOcorrenciaTemplate: TemplateModule<RegistroOcorrenciaData> =
  {
    metadata,
    loadData,
    render: (data) => React.createElement(RegistroOcorrenciaPdf, { data }),
  };
