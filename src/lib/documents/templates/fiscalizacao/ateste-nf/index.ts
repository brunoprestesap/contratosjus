import React from "react";
import { prisma } from "@/lib/prisma";
import type { TemplateModule } from "@/lib/documents/engine/types";
import { metadata } from "./metadata";
import { AtesteNfPdf, type AtesteNfData } from "./template";

async function loadData(params: {
  contractId: string;
  paymentId?: string;
}): Promise<AtesteNfData> {
  if (!params.paymentId) {
    throw new Error("paymentId é obrigatório para o Ateste de NF");
  }

  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: { contract: true },
  });

  if (!payment) {
    throw new Error("Pagamento não encontrado");
  }

  if (payment.contractId !== params.contractId) {
    throw new Error("Pagamento não pertence ao contrato informado");
  }

  if (!payment.attestDate) {
    throw new Error(
      "Não é possível gerar Ateste: pagamento sem data de ateste"
    );
  }

  return {
    contract: {
      number: payment.contract.contractNumber,
      processNumber: payment.contract.processNumber,
      object: payment.contract.object,
      supplier: payment.contract.supplier,
      supplierCnpj: payment.contract.supplierCnpj,
    },
    payment: {
      referenceMonth: payment.referenceMonth,
      invoiceValue: payment.invoiceValue
        ? parseFloat(payment.invoiceValue.toString())
        : null,
      attestDate: payment.attestDate,
      attestNotes: payment.attestNotes,
    },
    fiscal: {
      holderName: payment.contract.fiscalHolder,
    },
    generatedAt: new Date(),
  };
}

export const atesteNfTemplate: TemplateModule<AtesteNfData> = {
  metadata,
  loadData,
  render: (data) => React.createElement(AtesteNfPdf, { data }),
};
