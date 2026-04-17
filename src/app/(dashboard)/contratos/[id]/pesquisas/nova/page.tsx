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
import { NovaPesquisaForm } from "@/components/pesquisa-precos/nova-pesquisa-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Nova pesquisa de preços | ContratosJUS",
};

export default async function NovaPesquisaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "FISCAL") {
    redirect(`/contratos/${id}/pesquisas`);
  }
  const contract = await getContract(id);
  if (!contract) notFound();

  return (
    <>
      <Header title="Nova pesquisa de preços" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/contratos/${id}/pesquisas`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Contrato {contract.contractNumber}
            </CardTitle>
            <CardDescription>
              Escolha o tipo de item do contrato. Isso determina qual catálogo
              será consultado (CATMAT para materiais ou CATSER para serviços).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NovaPesquisaForm contractId={id} contractObject={contract.object} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
