import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button";
import { getPriceResearchDetail } from "@/actions/pesquisa-precos";
import { auth } from "@/lib/auth";
import { PesquisaWizard } from "@/components/pesquisa-precos/pesquisa-wizard";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Pesquisa de preços | ContratosJUS",
};

export default async function PesquisaDetailPage({
  params,
}: {
  params: Promise<{ id: string; researchId: string }>;
}) {
  const { id, researchId } = await params;
  const session = await auth();
  const canEdit = session?.user?.role === "FISCAL";

  const resp = await getPriceResearchDetail(researchId);
  if (!resp.success || !resp.data) notFound();
  const research = resp.data;
  if (research.contractId !== id) notFound();

  return (
    <>
      <Header title={`Pesquisa — ${research.contract.contractNumber}`} />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Link
            href={`/contratos/${id}/pesquisas`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar
          </Link>
        </div>

        <PesquisaWizard research={research} canEdit={canEdit} />
      </div>
    </>
  );
}
