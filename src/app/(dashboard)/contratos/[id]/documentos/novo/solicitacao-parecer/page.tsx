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
import { listDocumentsByContract } from "@/actions/documentos";
import { auth } from "@/lib/auth";
import { GerarSolicitacaoParecerForm } from "@/components/documentos/gerar-solicitacao-parecer-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Gerar Solicitação de Parecer Jurídico | ContratosJUS",
};

export default async function GerarSolicitacaoParecerPage({
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

  const [contract, docsResp] = await Promise.all([
    getContract(id),
    listDocumentsByContract(id),
  ]);
  if (!contract) notFound();

  const docs = docsResp.success ? (docsResp.data ?? []) : [];
  const anexosPotenciais = docs.filter(
    (d) =>
      d.category === "PROROGACAO" &&
      d.templateId !== "prorrogacao.solicitacao-parecer" &&
      (d.status === "GENERATED" || d.status === "SIGNED")
  );

  return (
    <>
      <Header title="Gerar Solicitação de Parecer Jurídico" />
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
              Gere o ofício ao jurídico pedindo parecer sobre prorrogação.
              O sistema anexa automaticamente todos os documentos de
              Prorrogação já gerados para este contrato (pesquisa de preços,
              justificativa, minuta do aditivo). Quesitos default podem ser
              substituídos por uma lista personalizada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GerarSolicitacaoParecerForm
              contractId={id}
              contractNumber={contract.contractNumber}
              supplier={contract.supplier}
              anexos={anexosPotenciais.map((a) => ({
                title: a.title,
                version: a.version,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
