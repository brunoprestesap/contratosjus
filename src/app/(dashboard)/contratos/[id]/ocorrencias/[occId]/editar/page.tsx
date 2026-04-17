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
import { getOccurrence } from "@/actions/ocorrencias";
import { auth } from "@/lib/auth";
import { OcorrenciaForm } from "@/components/ocorrencias/ocorrencia-form";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Editar ocorrência | ContratosJUS" };

export default async function EditarOcorrenciaPage({
  params,
}: {
  params: Promise<{ id: string; occId: string }>;
}) {
  const { id, occId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "FISCAL") {
    redirect(`/contratos/${id}/ocorrencias`);
  }

  const [contract, resp] = await Promise.all([
    getContract(id),
    getOccurrence(occId),
  ]);
  if (!contract) notFound();
  if (!resp.success || !resp.data) notFound();
  if (resp.data.contractId !== id) notFound();

  return (
    <>
      <Header title="Editar ocorrência" />
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
            <CardTitle className="text-base">
              Ocorrência — Contrato {contract.contractNumber}
            </CardTitle>
            <CardDescription>
              Edite a ocorrência registrada. Alterações ficam registradas no
              log de auditoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OcorrenciaForm
              contractId={id}
              mode="edit"
              initial={{
                id: resp.data.id,
                occurredAtIso: resp.data.occurredAt.toISOString(),
                type: resp.data.type as
                  | "ATRASO"
                  | "DESCUMPRIMENTO"
                  | "QUALIDADE"
                  | "SEGURANCA"
                  | "OUTRO",
                severity: resp.data.severity as "LEVE" | "MEDIA" | "GRAVE",
                description: resp.data.description,
                evidences: resp.data.evidences,
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
