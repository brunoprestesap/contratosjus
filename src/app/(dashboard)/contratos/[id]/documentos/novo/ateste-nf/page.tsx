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
import { listPaymentsForAteste } from "@/actions/documentos";
import { auth } from "@/lib/auth";
import { GerarAtesteForm } from "@/components/documentos/gerar-ateste-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Gerar Ateste de Nota Fiscal | ContratosJUS",
};

export default async function GerarAtesteNfPage({
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

  const [contract, paymentsResp] = await Promise.all([
    getContract(id),
    listPaymentsForAteste(id),
  ]);
  if (!contract) notFound();

  const payments = paymentsResp.success ? (paymentsResp.data ?? []) : [];

  return (
    <>
      <Header title="Gerar Ateste de Nota Fiscal" />
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
              Selecione um pagamento com data de ateste preenchida para gerar o
              termo formal correspondente. Cada pagamento pode ter apenas um
              ateste vigente; gerar novamente substituirá o anterior (marcado
              como SUPERSEDED).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum pagamento deste contrato possui data de ateste
                preenchida. Preencha o ateste em um pagamento e volte aqui.
              </p>
            ) : (
              <GerarAtesteForm
                contractId={id}
                payments={payments.map((p) => ({
                  id: p.id,
                  referenceMonthIso: p.referenceMonth.toISOString(),
                  attestDateIso: p.attestDate.toISOString(),
                  invoiceValue: p.invoiceValue,
                  hasAteste: p.hasAteste,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
