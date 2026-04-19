import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import {
  ContratosVigentesPdf,
  type ContratosVigentesData,
  type ContratoVigenteItem,
} from "@/lib/pdf/contratos-vigentes";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const referenceDate = searchParams.get("referenceDate") ?? new Date().toISOString().split("T")[0];

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(referenceDate)) {
    return NextResponse.json(
      { error: "Formato de data inválido. Use AAAA-MM-DD" },
      { status: 400 },
    );
  }

  try {
    const refDate = new Date(referenceDate + "T23:59:59.999Z");
    const refDateStart = new Date(referenceDate + "T00:00:00.000Z");

    if (isNaN(refDate.getTime())) {
      return NextResponse.json({ error: "Data inválida" }, { status: 400 });
    }

    const contracts = await prisma.contract.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: refDate },
        endDate: { gte: refDateStart },
      },
      include: {
        payments: {
          select: { paidValue: true },
        },
      },
      orderBy: { endDate: "asc" },
    });

    const items: ContratoVigenteItem[] = contracts.map((c) => {
      const globalValue = parseFloat(c.globalValue.toString());
      const totalPaid = c.payments.reduce(
        (sum, p) => sum + (p.paidValue ? parseFloat(p.paidValue.toString()) : 0),
        0,
      );
      const balance = globalValue - totalPaid;
      const percentUsed = globalValue > 0 ? (totalPaid / globalValue) * 100 : 0;

      return {
        contractNumber: c.contractNumber,
        supplier: c.supplier,
        object: c.object,
        globalValue,
        totalPaid,
        balance,
        percentUsed,
        endDate: c.endDate,
      };
    });

    // Ordenar por saldo % (menor primeiro — mais urgentes no topo)
    items.sort((a, b) => {
      const balancePctA = a.globalValue > 0 ? (a.balance / a.globalValue) * 100 : 0;
      const balancePctB = b.globalValue > 0 ? (b.balance / b.globalValue) * 100 : 0;
      return balancePctA - balancePctB;
    });

    const totalGlobalValue = items.reduce((sum, item) => sum + item.globalValue, 0);
    const totalPaid = items.reduce((sum, item) => sum + item.totalPaid, 0);
    const totalBalance = items.reduce((sum, item) => sum + item.balance, 0);

    const data: ContratosVigentesData = {
      referenceDate,
      items,
      totalGlobalValue,
      totalPaid,
      totalBalance,
    };

    const element = React.createElement(ContratosVigentesPdf, { data });
    const buffer = await renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);

    const filename = `contratos-vigentes-${referenceDate}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error(
      { err: error, route: "relatorios/vigentes" },
      "Erro ao gerar PDF de contratos vigentes",
    );
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 });
  }
}
