import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { DesembolsoPeriodoPdf, type DesembolsoPeriodoData } from "@/lib/pdf/desembolso-periodo";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Parâmetros startDate e endDate são obrigatórios" },
      { status: 400 },
    );
  }

  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    return NextResponse.json(
      { error: "Formato de data inválido. Use AAAA-MM-DD" },
      { status: 400 },
    );
  }

  if (startDate > endDate) {
    return NextResponse.json(
      { error: "Data de início deve ser anterior à data de fim" },
      { status: 400 },
    );
  }

  try {
    const start = new Date(startDate + "T00:00:00.000Z");
    const end = new Date(endDate + "T23:59:59.999Z");

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }

    const payments = await prisma.payment.findMany({
      where: {
        paidAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        contract: {
          select: {
            contractNumber: true,
            supplier: true,
          },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    const data: DesembolsoPeriodoData = {
      startDate,
      endDate,
      items: payments.map((p) => ({
        contractNumber: p.contract.contractNumber,
        supplier: p.contract.supplier,
        referenceMonth: p.referenceMonth,
        invoiceValue: p.invoiceValue ? parseFloat(p.invoiceValue.toString()) : null,
        paidAt: p.paidAt,
        paidValue: p.paidValue ? parseFloat(p.paidValue.toString()) : null,
      })),
    };

    const element = React.createElement(DesembolsoPeriodoPdf, { data });
    const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

    const filenameStart = startDate.replace(/-/g, "");
    const filenameEnd = endDate.replace(/-/g, "");
    const filename = `desembolso-${filenameStart}-${filenameEnd}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF de desembolso:", error);
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
