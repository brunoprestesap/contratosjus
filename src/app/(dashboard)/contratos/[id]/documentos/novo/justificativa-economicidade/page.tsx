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
import { listFinalizedResearchesForContract } from "@/actions/documentos";
import { auth } from "@/lib/auth";
import { GerarJustificativaForm } from "@/components/documentos/gerar-justificativa-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Gerar Justificativa de Economicidade | ContratosJUS",
};

export default async function GerarJustificativaPage({
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

  const [contract, resp] = await Promise.all([
    getContract(id),
    listFinalizedResearchesForContract(id),
  ]);
  if (!contract) notFound();
  const researches = resp.success ? (resp.data ?? []) : [];

  return (
    <>
      <Header title="Gerar Justificativa de Economicidade" />
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
              A Justificativa de Economicidade é gerada a partir de uma
              pesquisa de preços já <strong>finalizada</strong>. Calcula
              automaticamente a comparação entre o valor do contrato e a média
              de mercado das amostras, classificando como vantajoso, dentro da
              média ou acima do mercado. Base: Lei 14.133/2021 art. 107 e
              Manual CNJ.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {researches.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Nenhuma pesquisa de preços finalizada para este contrato.
                </p>
                <Link
                  href={`/contratos/${id}/pesquisas`}
                  className={buttonVariants({ size: "sm" })}
                >
                  Criar/finalizar pesquisa de preços →
                </Link>
              </div>
            ) : (
              <GerarJustificativaForm
                contractId={id}
                contractNumber={contract.contractNumber}
                researches={researches.map((r) => ({
                  id: r.id,
                  itemType: r.itemType,
                  codigo:
                    r.itemType === "MATERIAL" ? r.catmatCode : r.catserCode,
                  mean: r.mean,
                  median: r.median,
                  stdDev: r.stdDev,
                  coefVariation: r.coefVariation,
                  samplesCount: r.samplesCount,
                  finalizedAtIso: r.finalizedAt
                    ? r.finalizedAt.toISOString()
                    : null,
                  hasJustificativaDoc: r.hasJustificativaDoc,
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
