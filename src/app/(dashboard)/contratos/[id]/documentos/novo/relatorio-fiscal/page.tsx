import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getContract } from "@/actions/contratos";
import { auth } from "@/lib/auth";
import { GerarRelatorioFiscalForm } from "@/components/documentos/gerar-relatorio-fiscal-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Gerar Relatório de Fiscalização | ContratosJUS",
};

export default async function GerarRelatorioFiscalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "FISCAL") {
    redirect(`/contratos/${id}/documentos`);
  }

  const contract = await getContract(id);
  if (!contract) notFound();

  return (
    <>
      <Header title="Gerar Relatório de Fiscalização" />
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/contratos/${id}/documentos/novo`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar ao catálogo
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Contrato {contract.contractNumber}
            </CardTitle>
            <CardDescription>
              O relatório consolida pagamentos, empenhos, aditivos e
              ocorrências do período selecionado. Período default: últimos 30
              dias. A conclusão pode ser escrita manualmente ou sugerida pela
              IA após visualizar o consolidado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GerarRelatorioFiscalForm
              contractId={id}
              contractNumber={contract.contractNumber}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
