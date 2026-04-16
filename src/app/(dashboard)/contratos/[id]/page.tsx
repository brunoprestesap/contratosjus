import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ContratoCardResumo } from "@/components/contratos/contrato-card-resumo";
import { ContratoSections } from "@/components/contratos/contrato-sections";
import { ContratoActions } from "@/components/contratos/contrato-actions";
import { getContract } from "@/actions/contratos";
import { auth } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  return {
    title: contract
      ? `Contrato ${contract.contractNumber} | JFAP Contratos`
      : "Contrato | JFAP Contratos",
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

  return (
    <>
      <Header title={`Contrato ${contract.contractNumber}`} />
      <div className="p-6 space-y-6">
        <ContratoActions
          contractId={contract.id}
          contractNumber={contract.contractNumber}
          canEdit={canEdit}
        />
        <ContratoCardResumo contract={contract} />
        <ContratoSections contract={contract} />
      </div>
    </>
  );
}
