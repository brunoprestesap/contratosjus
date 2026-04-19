import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getContract } from "@/actions/contratos";
import { listPriceResearchesByContract } from "@/actions/pesquisa-precos";
import { formatCurrency, formatDate } from "@/lib/format";
import { ArrowLeft, Plus, SearchCode } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  PNCP_QUERIED: "Amostras consultadas",
  AI_FILTERED: "Amostras filtradas",
  FINALIZED: "Finalizada",
  ARCHIVED: "Arquivada",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  DRAFT: "outline",
  PNCP_QUERIED: "secondary",
  AI_FILTERED: "secondary",
  FINALIZED: "default",
  ARCHIVED: "outline",
};

const formatDateBr = (d: Date | null) => formatDate(d);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await getContract(id);
  return {
    title: contract
      ? `Pesquisas de Preço — ${contract.contractNumber} | ContratosJUS`
      : "Pesquisas de Preço | ContratosJUS",
  };
}

export default async function PesquisasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contract, resp] = await Promise.all([getContract(id), listPriceResearchesByContract(id)]);
  if (!contract) notFound();
  const pesquisas = resp.success ? (resp.data ?? []) : [];

  return (
    <>
      <Header title={`Pesquisas de Preço — ${contract.contractNumber}`} />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/contratos/${id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar ao contrato
          </Link>
          <div className="sm:ml-auto">
            <Link
              href={`/contratos/${id}/pesquisas/nova`}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="mr-1.5 size-3.5" />
              Nova pesquisa
            </Link>
          </div>
        </div>

        {pesquisas.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <SearchCode className="size-4" />
                Nenhuma pesquisa
              </CardTitle>
              <CardDescription>
                Pesquisas de preço são usadas para comprovar a economicidade de prorrogações
                contratuais (Lei 14.133 art. 107). O sistema consulta a API Dados Abertos
                compras.gov.br e usa IA (Sabiá 3.1) para sugerir CATMAT/CATSER e filtrar amostras.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {pesquisas.length} {pesquisas.length === 1 ? "pesquisa" : "pesquisas"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Criada em</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Média de mercado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20 text-right">Abrir</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pesquisas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{formatDateBr(p.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {p.itemType === "MATERIAL" ? "CATMAT" : "CATSER"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.catmatCode ?? p.catserCode ?? "—"}
                      </TableCell>
                      <TableCell>{formatCurrency(p.mean)}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[p.status] ?? "outline"}>
                          {STATUS_LABEL[p.status] ?? p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/contratos/${id}/pesquisas/${p.id}`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                        >
                          Abrir →
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
