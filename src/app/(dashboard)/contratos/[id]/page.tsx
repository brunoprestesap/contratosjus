import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ContratoCardResumo } from "@/components/contratos/contrato-card-resumo";
import { ContratoSections } from "@/components/contratos/contrato-sections";
import { ContratoActions } from "@/components/contratos/contrato-actions";
import { getContract } from "@/actions/contratos";
import { auth } from "@/lib/auth";
import { computeFinancialTotals } from "@/lib/utils";
import { loadContractItemBalances } from "@/lib/item-balance-loader";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  return {
    title: contract
      ? `Contrato ${contract.contractNumber} | ContratosJUS`
      : "Contrato | ContratosJUS",
  };
}

interface ContratoPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContratoPage({ params }: ContratoPageProps) {
  const { id } = await params;
  // Os 3 fetches são independentes: loadContractItemBalances só precisa do id
  // (vem dos params, não do contract). Rodam em paralelo.
  const [contract, session, itemBalancesMap] = await Promise.all([
    getContract(id),
    auth(),
    loadContractItemBalances(id),
  ]);

  if (!contract) {
    notFound();
  }

  const canEdit = session?.user?.role === "FISCAL";
  const financials = computeFinancialTotals(contract);
  const itemBalances = Object.fromEntries(
    Array.from(itemBalancesMap.entries()).map(([k, v]) => [
      k,
      {
        totalCommitted: v.totalCommitted.toString(),
        totalSettled: v.totalSettled.toString(),
        totalPaid: v.totalPaid.toString(),
        balance: v.balance.toString(),
        uncommittedBalance: v.uncommittedBalance.toString(),
        consumedPercentage: v.consumedPercentage,
      },
    ]),
  );

  return (
    <>
      <Header
        title={`Contrato ${contract.contractNumber}`}
        subtitle={contract.supplier}
        breadcrumbs={[
          { label: "Contratos", href: "/contratos" },
          { label: contract.contractNumber },
        ]}
      />
      <div className="mx-auto w-full max-w-6xl space-y-4 p-3 sm:space-y-6 sm:p-4 lg:p-6">
        <ContratoActions
          contractId={contract.id}
          contractNumber={contract.contractNumber}
          canEdit={canEdit}
        />
        <ContratoCardResumo contract={contract} financials={financials} />
        <ContratoSections
          contract={contract}
          canEdit={canEdit}
          financials={financials}
          itemBalances={itemBalances}
        />
      </div>
    </>
  );
}
