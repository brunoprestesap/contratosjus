import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateLoadParams, TemplateModule } from "@/lib/documents/engine/types";
import { metadata } from "./metadata";
import { RelatorioFiscalPdf, type RelatorioFiscalData } from "./template";
import { getPaymentStatus } from "@/lib/utils";

function parseDateOrDefault(raw: string | undefined, fallback: Date): Date {
  if (!raw) return fallback;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? fallback : d;
}

async function loadData(params: TemplateLoadParams): Promise<RelatorioFiscalData> {
  const today = new Date();
  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 30);

  const periodoInicio = parseDateOrDefault(params.manualFields?.periodoInicio, defaultStart);
  const periodoFim = parseDateOrDefault(params.manualFields?.periodoFim, today);
  if (periodoFim < periodoInicio) {
    throw new Error("periodoFim deve ser maior ou igual a periodoInicio");
  }

  const contract = await prisma.contract.findUnique({
    where: { id: params.contractId },
    include: {
      commitments: {
        orderBy: { commitmentDate: "asc" },
      },
      payments: {
        orderBy: { referenceMonth: "asc" },
      },
      additives: {
        where: {
          signatureDate: { gte: periodoInicio, lte: periodoFim },
        },
        orderBy: { signatureDate: "asc" },
      },
      fiscalOccurrences: {
        where: { occurredAt: { gte: periodoInicio, lte: periodoFim } },
        orderBy: { occurredAt: "asc" },
      },
    },
  });
  if (!contract) throw new Error("Contrato não encontrado");

  const globalValue = parseFloat(contract.globalValue.toString());
  const allPayments = contract.payments;
  const allCommitments = contract.commitments;

  const totalPagoAcumulado = allPayments.reduce(
    (sum, p) => sum + (p.paidValue ? parseFloat(p.paidValue.toString()) : 0),
    0,
  );
  const totalEmpenhadoAcumulado = allCommitments.reduce(
    (sum, c) => sum + parseFloat(c.value.toString()),
    0,
  );

  const paymentsPeriodo = allPayments.filter((p) => {
    const relevant = p.paidAt ?? p.settlementDate ?? p.attestDate;
    return relevant && relevant >= periodoInicio && relevant <= periodoFim;
  });
  const commitmentsPeriodo = allCommitments.filter(
    (c) => c.commitmentDate >= periodoInicio && c.commitmentDate <= periodoFim,
  );

  const totalPagoPeriodo = paymentsPeriodo.reduce(
    (sum, p) => sum + (p.paidValue ? parseFloat(p.paidValue.toString()) : 0),
    0,
  );
  const totalEmpenhadoPeriodo = commitmentsPeriodo.reduce(
    (sum, c) => sum + parseFloat(c.value.toString()),
    0,
  );

  return {
    contract: {
      number: contract.contractNumber,
      processNumber: contract.processNumber,
      object: contract.object,
      supplier: contract.supplier,
      supplierCnpj: contract.supplierCnpj,
      globalValue,
      startDate: contract.startDate,
      endDate: contract.endDate,
      fiscalHolder: contract.fiscalHolder,
    },
    periodo: { inicio: periodoInicio, fim: periodoFim },
    financeiro: {
      totalPagoAcumulado,
      totalEmpenhadoAcumulado,
      saldoContratual: globalValue - totalPagoAcumulado,
      totalPagoPeriodo,
      totalEmpenhadoPeriodo,
    },
    pagamentos: paymentsPeriodo.map((p) => ({
      referenceMonth: p.referenceMonth,
      invoiceValue: p.invoiceValue ? parseFloat(p.invoiceValue.toString()) : null,
      attestDate: p.attestDate,
      settlementDate: p.settlementDate,
      paidAt: p.paidAt,
      paidValue: p.paidValue ? parseFloat(p.paidValue.toString()) : null,
      status: getPaymentStatus(p),
    })),
    empenhos: commitmentsPeriodo.map((c) => ({
      number: c.commitmentNumber,
      date: c.commitmentDate,
      value: parseFloat(c.value.toString()),
      type: c.type,
    })),
    aditivos: contract.additives.map((a) => ({
      number: a.additiveNumber,
      type: a.type,
      signatureDate: a.signatureDate,
      newGlobalValue: a.newGlobalValue ? parseFloat(a.newGlobalValue.toString()) : null,
      newEndDate: a.newEndDate,
    })),
    ocorrencias: contract.fiscalOccurrences.map((o) => ({
      occurredAt: o.occurredAt,
      type: o.type,
      severity: o.severity,
      description: o.description,
    })),
    conclusao:
      params.aiFields?.conclusao ??
      "Conclusão ainda não preenchida — use 'Sugerir com IA' para gerar com base nos dados acima.",
  };
}

export const relatorioFiscalTemplate: TemplateModule<RelatorioFiscalData> = {
  metadata,
  loadData,
  render: (data) => React.createElement(RelatorioFiscalPdf, { data }),
};
