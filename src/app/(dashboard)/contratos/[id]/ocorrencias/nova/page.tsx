import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContract } from "@/actions/contratos";
import { auth } from "@/lib/auth";
import { OcorrenciaForm } from "@/components/ocorrencias/ocorrencia-form";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Nova ocorrência | ContratosJUS" };

export default async function NovaOcorrenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "FISCAL") {
    redirect(`/contratos/${id}/ocorrencias`);
  }
  const contract = await getContract(id);
  if (!contract) notFound();

  return (
    <>
      <Header title="Nova ocorrência" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/contratos/${id}/ocorrencias`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contrato {contract.contractNumber}</CardTitle>
            <CardDescription>
              Registre a ocorrência apurada durante a execução contratual. O registro pode depois
              ser usado para gerar o PDF formal de Registro de Ocorrência.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OcorrenciaForm contractId={id} mode="create" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
