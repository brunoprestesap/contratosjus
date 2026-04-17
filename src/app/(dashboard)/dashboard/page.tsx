import { getDashboardData } from "@/actions/dashboard";
import { Header } from "@/components/layout/header";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { ChartEmpenhoLiquidado } from "@/components/dashboard/chart-empenho-liquidado";
import { ChartEvolucaoDesembolso } from "@/components/dashboard/chart-evolucao-desembolso";
import { AlertListSaldo } from "@/components/dashboard/alert-list-saldo";
import { AlertListVigencia } from "@/components/dashboard/alert-list-vigencia";
import { AlertListPendentes } from "@/components/dashboard/alert-list-pendentes";
import { RankingContratos } from "@/components/dashboard/ranking-contratos";
import { FiscalYearSelect } from "@/components/dashboard/fiscal-year-select";

interface DashboardPageProps {
  searchParams: Promise<{ ano?: string }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const parsedYear = params.ano ? parseInt(params.ano, 10) : currentYear;
  const fiscalYear =
    !isNaN(parsedYear) && parsedYear >= 2000 && parsedYear <= currentYear + 1
      ? parsedYear
      : currentYear;
  const data = await getDashboardData(fiscalYear);

  return (
    <>
      <Header title="Dashboard" />
      <div className="flex-1 space-y-6 p-6">
        {/* Fiscal year filter */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Visão Geral</h2>
          <FiscalYearSelect currentYear={currentYear} />
        </div>

        {/* Row 1: Summary cards */}
        <SummaryCards
          activeContractsCount={data.activeContractsCount}
          totalContractedValue={data.totalContractedValue}
          totalPaidInYear={data.totalPaidInYear}
          fiscalYear={fiscalYear}
        />

        {/* Row 2: Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartEmpenhoLiquidado
            committedInYear={data.committedInYear}
            settledInYear={data.settledInYear}
            paidInYear={data.paidInYear}
            fiscalYear={fiscalYear}
          />
          <ChartEvolucaoDesembolso
            monthlyEvolution={data.monthlyEvolution}
          />
        </div>

        {/* Row 3: Alert lists */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AlertListSaldo contracts={data.lowBalanceContracts} />
          <AlertListVigencia contracts={data.expiringContracts} />
        </div>

        {/* Row 4: Pending + Ranking */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AlertListPendentes payments={data.pendingPayments} />
          <RankingContratos contracts={data.rankingByVolume} />
        </div>
      </div>
    </>
  );
}
