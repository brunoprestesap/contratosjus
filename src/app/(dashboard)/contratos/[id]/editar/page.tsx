import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ContratoForm } from "@/components/contratos/contrato-form";
import { getContract } from "@/actions/contratos";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  return {
    title: contract
      ? `Editar Contrato ${contract.contractNumber} | JFAP Contratos`
      : "Editar Contrato | JFAP Contratos",
  };
}

interface EditarContratoPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarContratoPage({
  params,
}: EditarContratoPageProps) {
  const { id } = await params;
  const contract = await getContract(id);

  if (!contract) {
    notFound();
  }

  const formValues = {
    id: contract.id,
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
    globalValue: Number(contract.globalValue),
    paymentType: contract.paymentType,
    estimatedMonthlyValue: contract.estimatedMonthlyValue
      ? Number(contract.estimatedMonthlyValue)
      : undefined,
    paymentPeriodicity: contract.paymentPeriodicity,
    budgetProgram: contract.budgetProgram ?? undefined,
    expenseNature: contract.expenseNature ?? undefined,
    fiscalHolder: contract.fiscalHolder,
    fiscalSubstitute: contract.fiscalSubstitute ?? undefined,
    contractManager: contract.contractManager ?? undefined,
  };

  return (
    <>
      <Header title={`Editar Contrato ${contract.contractNumber}`} />
      <div className="p-6">
        <ContratoForm defaultValues={formValues} />
      </div>
    </>
  );
}
