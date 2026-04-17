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
import { listAdditivesForContract } from "@/actions/documentos";
import { auth } from "@/lib/auth";
import { GerarTermoAditivoForm } from "@/components/documentos/gerar-termo-aditivo-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Gerar Minuta de Termo Aditivo | ContratosJUS",
};

export default async function GerarTermoAditivoPage({
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

  const [contract, additivesResp] = await Promise.all([
    getContract(id),
    listAdditivesForContract(id),
  ]);
  if (!contract) notFound();
  const additives = additivesResp.success ? (additivesResp.data ?? []) : [];

  return (
    <>
      <Header title="Gerar Minuta de Termo Aditivo" />
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
              Selecione o aditivo já registrado no sistema para gerar a minuta
              formal correspondente. Para criar um novo aditivo, utilize antes
              a área de Aditivos do contrato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {additives.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este contrato ainda não possui aditivos registrados. Registre
                um aditivo antes de gerar a minuta.
              </p>
            ) : (
              <GerarTermoAditivoForm
                contractId={id}
                additives={additives.map((a) => ({
                  id: a.id,
                  additiveNumber: a.additiveNumber,
                  type: a.type,
                  signatureDateIso: a.signatureDate.toISOString(),
                  newEndDateIso: a.newEndDate
                    ? a.newEndDate.toISOString()
                    : null,
                  newGlobalValue: a.newGlobalValue,
                  hasMinuta: a.hasMinuta,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
