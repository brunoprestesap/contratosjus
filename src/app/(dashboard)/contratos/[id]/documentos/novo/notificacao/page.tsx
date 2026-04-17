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
import { GerarNotificacaoForm } from "@/components/documentos/gerar-notificacao-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Gerar Notificação ao Contratado | ContratosJUS",
};

export default async function GerarNotificacaoPage({
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
      <Header title="Gerar Notificação ao Contratado" />
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
              Produza ofício formal ao contratado conforme a variação
              apropriada (atraso, descumprimento ou orientação). Campos em cinza
              são preenchidos automaticamente; os campos abaixo precisam de
              entrada manual ou sugestão da IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GerarNotificacaoForm
              contractId={id}
              contractNumber={contract.contractNumber}
              supplier={contract.supplier}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
