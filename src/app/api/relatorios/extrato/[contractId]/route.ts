import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  ExtratoContratoPdf,
  type ExtratoContratoData,
} from "@/lib/pdf/extrato-contrato";
import { sanitizeFilename } from "@/lib/pdf/styles";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { contractId } = await params;

  try {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        commitments: { orderBy: { commitmentDate: "asc" } },
        payments: { orderBy: { referenceMonth: "asc" } },
        additives: { orderBy: { signatureDate: "asc" } },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contrato não encontrado" },
        { status: 404 }
      );
    }

    const data: ExtratoContratoData = {
      contractNumber: contract.contractNumber,
      processNumber: contract.processNumber,
      object: contract.object,
      supplier: contract.supplier,
      supplierCnpj: contract.supplierCnpj,
      legalRegime: contract.legalRegime,
      biddingModality: contract.biddingModality,
      signatureDate: contract.signatureDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      canExtend: contract.canExtend,
      globalValue: parseFloat(contract.globalValue.toString()),
      paymentType: contract.paymentType,
      estimatedMonthlyValue: contract.estimatedMonthlyValue
        ? parseFloat(contract.estimatedMonthlyValue.toString())
        : null,
      paymentPeriodicity: contract.paymentPeriodicity,
      budgetProgram: contract.budgetProgram,
      expenseNature: contract.expenseNature,
      fiscalHolder: contract.fiscalHolder,
      fiscalSubstitute: contract.fiscalSubstitute,
      contractManager: contract.contractManager,
      status: contract.status,
      commitments: contract.commitments.map((c) => ({
        commitmentNumber: c.commitmentNumber,
        commitmentDate: c.commitmentDate,
        value: parseFloat(c.value.toString()),
        type: c.type,
        notes: c.notes,
      })),
      payments: contract.payments.map((p) => ({
        referenceMonth: p.referenceMonth,
        invoiceValue: p.invoiceValue
          ? parseFloat(p.invoiceValue.toString())
          : null,
        attestDate: p.attestDate,
        settlementDate: p.settlementDate,
        settledValue: p.settledValue
          ? parseFloat(p.settledValue.toString())
          : null,
        paidAt: p.paidAt,
        paidValue: p.paidValue ? parseFloat(p.paidValue.toString()) : null,
      })),
      additives: contract.additives.map((a) => ({
        additiveNumber: a.additiveNumber,
        type: a.type,
        signatureDate: a.signatureDate,
        newGlobalValue: a.newGlobalValue
          ? parseFloat(a.newGlobalValue.toString())
          : null,
        newEndDate: a.newEndDate,
        justification: a.justification,
      })),
    };

    const element = React.createElement(ExtratoContratoPdf, { data });
    const buffer = await renderToBuffer(
      element as Parameters<typeof renderToBuffer>[0]
    );

    const filename = `extrato-${sanitizeFilename(contract.contractNumber)}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF do extrato:", error);
    return NextResponse.json(
      { error: "Erro ao gerar relatório" },
      { status: 500 }
    );
  }
}
