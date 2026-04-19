"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { Prisma } from "@/generated/prisma/client";
import { formatMonthYear, formatMonthYearShort } from "@/lib/format";

export interface DashboardData {
  activeContractsCount: number;
  totalContractedValue: number;
  totalPaidInYear: number;
  totalPaidPreviousYear: number;
  totalBalanceRemaining: number;
  settledNotPaid: number;
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
  expiringGuarantees: {
    id: string;
    contractId: string;
    contractNumber: string;
    tipo: string;
    valor: number;
    daysRemaining: number;
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

export async function getAvailableFiscalYears(): Promise<number[]> {
  await requireAuth();

  const oldest = await prisma.contract.findFirst({
    orderBy: { startDate: "asc" },
    select: { startDate: true },
  });

  const currentYear = new Date().getFullYear();
  const startYear = oldest ? oldest.startDate.getFullYear() : currentYear;

  const years: number[] = [];
  for (let y = currentYear; y >= startYear; y--) {
    years.push(y);
  }
  return years;
}

export async function getDashboardData(
  fiscalYear: number
): Promise<DashboardData> {
  await requireAuth();

  const yearStart = new Date(Date.UTC(fiscalYear, 0, 1));
  const yearEnd = new Date(Date.UTC(fiscalYear, 11, 31, 23, 59, 59, 999));
  const prevYearStart = new Date(Date.UTC(fiscalYear - 1, 0, 1));
  const prevYearEnd = new Date(Date.UTC(fiscalYear - 1, 11, 31, 23, 59, 59, 999));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentYear = today.getFullYear();

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
      garantias: {
        select: {
          id: true,
          tipo: true,
          valor: true,
          vencimento: true,
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

  // 3. Total pago no exercicio + exercicio anterior (para YoY) + liquidado nao pago.
  // settledNotPaid é snapshot global (fluxo de caixa pendente atual), não filtrado
  // por exercício — mesma semântica de totalBalanceRemaining e activeContractsCount.
  let totalPaidInYearDecimal = new Prisma.Decimal(0);
  let totalPaidPrevYearDecimal = new Prisma.Decimal(0);
  let settledNotPaidDecimal = new Prisma.Decimal(0);
  for (const c of contracts) {
    for (const p of c.payments) {
      if (p.paidAt && p.paidValue) {
        if (p.paidAt >= yearStart && p.paidAt <= yearEnd) {
          totalPaidInYearDecimal = totalPaidInYearDecimal.add(p.paidValue);
        } else if (p.paidAt >= prevYearStart && p.paidAt <= prevYearEnd) {
          totalPaidPrevYearDecimal = totalPaidPrevYearDecimal.add(p.paidValue);
        }
      }
      if (p.settledValue && p.settlementDate && !p.paidAt) {
        settledNotPaidDecimal = settledNotPaidDecimal.add(p.settledValue);
      }
    }
  }
  const totalPaidInYear = Number(totalPaidInYearDecimal);
  const totalPaidPreviousYear = Number(totalPaidPrevYearDecimal);
  const settledNotPaid = Number(settledNotPaidDecimal);

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


  // 5. Contratos com saldo baixo (< 20%) + saldo total a executar (soma dos saldos)
  let totalBalanceRemainingDecimal = new Prisma.Decimal(0);
  const lowBalanceContracts = contracts
    .map((c) => {
      const gv = c.globalValue;
      let totalPaidDec = new Prisma.Decimal(0);
      for (const p of c.payments) {
        if (p.paidValue) totalPaidDec = totalPaidDec.add(p.paidValue);
      }
      const remaining = new Prisma.Decimal(gv).sub(totalPaidDec);
      if (remaining.gt(0)) {
        totalBalanceRemainingDecimal = totalBalanceRemainingDecimal.add(remaining);
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
  const totalBalanceRemaining = Number(totalBalanceRemainingDecimal);

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

  // 6b. Garantias vencidas (ate 30 dias atras) ou vencendo (<= 90 dias)
  const expiringGuarantees: DashboardData["expiringGuarantees"] = [];
  for (const c of contracts) {
    for (const g of c.garantias) {
      if (!g.vencimento) continue;
      const venc = new Date(g.vencimento);
      venc.setHours(0, 0, 0, 0);
      const diffMs = venc.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining < -30 || daysRemaining > 90) continue;
      expiringGuarantees.push({
        id: g.id,
        contractId: c.id,
        contractNumber: c.contractNumber,
        tipo: g.tipo,
        valor: Number(g.valor),
        daysRemaining,
      });
    }
  }
  expiringGuarantees.sort((a, b) => a.daysRemaining - b.daysRemaining);

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
        const monthLabel = formatMonthYear(checkMonth);
        pendingPayments.push({
          id: c.id,
          contractNumber: c.contractNumber,
          missingMonth: monthLabel,
        });
      }
    }
  }

  // 8. Evolucao mensal: se fiscalYear for o ano corrente, mostra últimos 12 meses rolling;
  // caso contrário, mostra jan-dez do exercício selecionado para coerência com os demais indicadores.
  const monthlyEvolution: DashboardData["monthlyEvolution"] = [];
  const isCurrentYear = fiscalYear === currentYear;
  for (let i = 11; i >= 0; i--) {
    const monthDate = isCurrentYear
      ? new Date(Date.UTC(currentYear, today.getMonth() - i, 1))
      : new Date(Date.UTC(fiscalYear, 11 - i, 1));
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

    const label = formatMonthYearShort(monthDate);

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

  return {
    activeContractsCount,
    totalContractedValue,
    totalPaidInYear,
    totalPaidPreviousYear,
    totalBalanceRemaining,
    settledNotPaid,
    committedInYear,
    settledInYear,
    paidInYear: totalPaidInYear,
    lowBalanceContracts,
    expiringContracts,
    pendingPayments,
    expiringGuarantees,
    monthlyEvolution,
    rankingByVolume,
  };
}
