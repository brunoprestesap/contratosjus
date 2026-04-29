import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getContract } from "@/actions/contratos";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/decimal";
import {
  NovaPesquisaForm,
  type NovaPesquisaItem,
} from "@/components/pesquisa-precos/nova-pesquisa-form";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Nova pesquisa de preços | ContratosJUS",
};

export default async function NovaPesquisaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "FISCAL") {
    redirect(`/contratos/${id}/pesquisas`);
  }

  // `getContract` e a listagem de itens são independentes — paralelizar evita
  // waterfall de duas queries sequenciais na renderização da página.
  const [contract, itens] = await Promise.all([
    getContract(id),
    prisma.contractItem.findMany({
      where: { contractId: id, status: "ACTIVE" },
      orderBy: { itemNumber: "asc" },
      select: {
        id: true,
        itemNumber: true,
        description: true,
        itemType: true,
        catalogCode: true,
        unitOfMeasure: true,
        quantity: true,
        totalValue: true,
      },
    }),
  ]);
  if (!contract) notFound();

  const items: NovaPesquisaItem[] = itens.map((i) => ({
    id: i.id,
    itemNumber: i.itemNumber,
    description: i.description,
    itemType: i.itemType,
    catalogCode: i.catalogCode,
    unitOfMeasure: i.unitOfMeasure,
    quantity: toNumber(i.quantity),
    totalValue: toNumber(i.totalValue),
  }));

  return (
    <>
      <Header title="Nova pesquisa de preços" />
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
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
            <CardTitle className="text-base">Contrato {contract.contractNumber}</CardTitle>
            <CardDescription>
              Selecione os itens do contrato para pesquisar preços. Cada item terá sua própria
              consulta no catálogo (CATMAT/CATSER) e suas estatísticas. Amostras serão filtradas
              automaticamente pela base legal do contrato (
              {contract.legalRegime === "LEI_14133_2021" ? "Lei 14.133/2021" : "Lei 8.666/1993"}).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NovaPesquisaForm contractId={id} items={items} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
