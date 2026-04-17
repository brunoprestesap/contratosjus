"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";

export interface DashboardData {
  activeContractsCount: number;
  totalContractedValue: number;
  totalPaidInYear: number;
  committedInYear: number;
  settledInYear: number;
  paidInYear: number;
  lowBalanceContracts: {
    id: string;
    contractNumber: string;
    supplier: string;
    balancePercentage: number;
  }[];
  expiringContracts: {
    id: string;
    contractNumber: string;
    daysRemaining: number;
  }[];
  pendingPayments: {
    id: string;
    contractNumber: string;
    missingMonth: string;
  }[];
  monthlyEvolution: {
    month: string;
    totalPaid: number;
  }[];
  rankingByVolume: {
    id: string;
    contractNumber: string;
    supplier: string;
    globalValue: number;
  }[];
}

function decimalToNumber(value: Prisma.Decimal | null): number {
  if (!value) return 0;
  return Number(value);
}

export async function getDashboardData(
  fiscalYear: number
): Promise<DashboardData> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Acesso não autorizado");
  }

  const yearStart = new Date(Date.UTC(fiscalYear, 0, 1));
  const yearEnd = new Date(Date.UTC(fiscalYear, 11, 31, 23, 59, 59, 999));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Optimized query: select only needed fields
  const contracts = await prisma.contract.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      contractNumber: true,
      supplier: true,
      globalValue: true,
      endDate: true,
      startDate: true,
      paymentType: true,
      payments: {
        select: {
          paidValue: true,
          paidAt: true,
          settledValue: true,
          settlementDate: true,
          referenceMonth: true,
        },
      },
      commitments: {
        select: {
          value: true,
          commitmentDate: true,
        },
      },
    },
  });

  // 1. Total de contratos ativos
  const activeContractsCount = contracts.length;

  // 2. Valor total contratado (using Decimal arithmetic)
  const totalContractedDecimal = contracts.reduce(
    (sum, c) => sum.add(c.globalValue),
    new Prisma.Decimal(0)
  );
  const totalContractedValue = Number(totalContractedDecimal);

  // 3. Total pago no exercicio
  let totalPaidInYearDecimal = new Prisma.Decimal(0);
  for (const c of contracts) {
    for (const p of c.payments) {
      if (p.paidAt && p.paidValue && p.paidAt >= yearStart && p.paidAt <= yearEnd) {
        totalPaidInYearDecimal = totalPaidInYearDecimal.add(p.paidValue);
      }
    }
  }
  const totalPaidInYear = Number(totalPaidInYearDecimal);

  // 4. Empenhado / Liquidado / Pago no exercicio
  let committedDecimal = new Prisma.Decimal(0);
  for (const c of contracts) {
    for (const cm of c.commitments) {
      if (cm.commitmentDate >= yearStart && cm.commitmentDate <= yearEnd) {
        committedDecimal = committedDecimal.add(cm.value);
      }
    }
  }
  const committedInYear = Number(committedDecimal);

  let settledDecimal = new Prisma.Decimal(0);
  for (const c of contracts) {
    for (const p of c.payments) {
      if (
        p.settlementDate &&
        p.settledValue &&
        p.settlementDate >= yearStart &&
        p.settlementDate <= yearEnd
      ) {
        settledDecimal = settledDecimal.add(p.settledValue);
      }
    }
  }
  const settledInYear = Number(settledDecimal);

  const paidInYear = totalPaidInYear;

  // 5. Contratos com saldo baixo (< 20%)
  const lowBalanceContracts = contracts
    .map((c) => {
      const gv = c.globalValue;
      let totalPaidDec = new Prisma.Decimal(0);
      for (const p of c.payments) {
        if (p.paidValue) totalPaidDec = totalPaidDec.add(p.paidValue);
      }
      const gvNum = Number(gv);
      const paidNum = Number(totalPaidDec);
      const balancePercentage = gvNum > 0 ? ((gvNum - paidNum) / gvNum) * 100 : 100;
      return {
        id: c.id,
        contractNumber: c.contractNumber,
        supplier: c.supplier,
        balancePercentage: Math.round(balancePercentage * 10) / 10,
      };
    })
    .filter((c) => c.balancePercentage < 20)
    .sort((a, b) => a.balancePercentage - b.balancePercentage);

  // 6. Contratos com vigencia vencendo (< 90 dias)
  const expiringContracts = contracts
    .map((c) => {
      const endDate = new Date(c.endDate);
      endDate.setHours(0, 0, 0, 0);
      const diffMs = endDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        contractNumber: c.contractNumber,
        daysRemaining,
      };
    })
    .filter((c) => c.daysRemaining >= 0 && c.daysRemaining <= 90)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // 7. Pagamentos pendentes: contratos FIXED sem pagamento no mes corrente ou anterior
  const currentMonth = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), 1)
  );
  const previousMonth = new Date(
    Date.UTC(today.getFullYear(), today.getMonth() - 1, 1)
  );

  const pendingPayments: DashboardData["pendingPayments"] = [];
  for (const c of contracts) {
    if (c.paymentType !== "FIXED") continue;
    const paymentMonths = new Set(
      c.payments.map((p) => {
        const d = new Date(p.referenceMonth);
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      })
    );

    for (const checkMonth of [previousMonth, currentMonth]) {
      if (checkMonth < new Date(c.startDate) || checkMonth > new Date(c.endDate))
        continue;
      const key = `${checkMonth.getUTCFullYear()}-${String(checkMonth.getUTCMonth() + 1).padStart(2, "0")}`;
      if (!paymentMonths.has(key)) {
        const monthLabel = checkMonth.toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        });
        pendingPayments.push({
          id: c.id,
          contractNumber: c.contractNumber,
          missingMonth: monthLabel,
        });
      }
    }
  }

  // 8. Evolucao mensal (ultimos 12 meses)
  const monthlyEvolution: DashboardData["monthlyEvolution"] = [];
  for (let i = 11; i >= 0; i--) {
    const monthDate = new Date(
      Date.UTC(today.getFullYear(), today.getMonth() - i, 1)
    );
    const monthEnd = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth() + 1,
        0,
        23,
        59,
        59,
        999
      )
    );

    let totalPaidMonthDecimal = new Prisma.Decimal(0);
    for (const c of contracts) {
      for (const p of c.payments) {
        if (p.paidAt && p.paidValue && p.paidAt >= monthDate && p.paidAt <= monthEnd) {
          totalPaidMonthDecimal = totalPaidMonthDecimal.add(p.paidValue);
        }
      }
    }

    const label = monthDate
      .toLocaleDateString("pt-BR", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      })
      .replace(".", "");

    monthlyEvolution.push({
      month: label.charAt(0).toUpperCase() + label.slice(1),
      totalPaid: Number(totalPaidMonthDecimal),
    });
  }

  // 9. Ranking por volume: top 10
  const rankingByVolume = contracts
    .map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      supplier: c.supplier,
      globalValue: Number(c.globalValue),
    }))
    .sort((a, b) => b.globalValue - a.globalValue)
    .slice(0, 10);

  void decimalToNumber; // suppress unused warning — helper kept for clarity

  return {
    activeContractsCount,
    totalContractedValue,
    totalPaidInYear,
    committedInYear,
    settledInYear,
    paidInYear,
    lowBalanceContracts,
    expiringContracts,
    pendingPayments,
    monthlyEvolution,
    rankingByVolume,
  };
}
