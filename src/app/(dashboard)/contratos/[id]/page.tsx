import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ContratoCardResumo } from "@/components/contratos/contrato-card-resumo";
import { ContratoSections } from "@/components/contratos/contrato-sections";
import { ContratoActions } from "@/components/contratos/contrato-actions";
import { getContract } from "@/actions/contratos";
import { auth } from "@/lib/auth";
import { computeFinancialTotals } from "@/lib/utils";

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
  const [contract, session] = await Promise.all([getContract(id), auth()]);

  if (!contract) {
    notFound();
  }

  const canEdit = session?.user?.role === "FISCAL";
  const financials = computeFinancialTotals(contract);

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
        <ContratoSections contract={contract} canEdit={canEdit} financials={financials} />
      </div>
    </>
  );
}
