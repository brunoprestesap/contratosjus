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
import { listOccurrencesByContract } from "@/actions/ocorrencias";
import { auth } from "@/lib/auth";
import { GerarRegistroOcorrenciaForm } from "@/components/documentos/gerar-registro-ocorrencia-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Gerar Registro de Ocorrência | ContratosJUS",
};

export default async function GerarRegistroOcorrenciaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ occ?: string }>;
}) {
  const { id } = await params;
  const { occ } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "FISCAL") {
    redirect(`/contratos/${id}/documentos`);
  }

  const [contract, resp] = await Promise.all([
    getContract(id),
    listOccurrencesByContract(id),
  ]);
  if (!contract) notFound();
  const ocorrencias = resp.success ? (resp.data ?? []) : [];

  return (
    <>
      <Header title="Gerar Registro de Ocorrência" />
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
              Selecione uma ocorrência registrada no sistema para gerar o
              documento formal de Registro de Ocorrência. Para registrar uma
              nova ocorrência, acesse a área de Ocorrências do contrato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ocorrencias.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Nenhuma ocorrência registrada para este contrato.
                </p>
                <Link
                  href={`/contratos/${id}/ocorrencias/nova`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Registrar ocorrência →
                </Link>
              </div>
            ) : (
              <GerarRegistroOcorrenciaForm
                contractId={id}
                preselectedId={occ}
                ocorrencias={ocorrencias.map((o) => ({
                  id: o.id,
                  occurredAtIso: o.occurredAt.toISOString(),
                  type: o.type,
                  severity: o.severity,
                  description: o.description,
                  reportedByName: o.reportedByName,
                  hasRegistroDoc: o.hasRegistroDoc,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
