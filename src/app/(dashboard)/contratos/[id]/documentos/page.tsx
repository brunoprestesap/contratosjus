import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getContract } from "@/actions/contratos";
import { listDocumentsByContract } from "@/actions/documentos";
import { ArrowLeft, FileText, Plus } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  GENERATED: "Gerado",
  SIGNED: "Assinado",
  ARCHIVED: "Arquivado",
  SUPERSEDED: "Substituído",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  GENERATED: "secondary",
  SIGNED: "default",
  ARCHIVED: "outline",
  SUPERSEDED: "outline",
};

const CATEGORY_LABEL: Record<string, string> = {
  PROROGACAO: "Prorrogação",
  FISCALIZACAO: "Fiscalização",
  CONTRATACAO: "Contratação",
  ENCERRAMENTO: "Encerramento",
};

function formatDateBr(d: Date | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await getContract(id);
  return {
    title: contract
      ? `Documentos — Contrato ${contract.contractNumber} | ContratosJUS`
      : "Documentos | ContratosJUS",
  };
}

export default async function DocumentosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [contract, docsResp] = await Promise.all([
    getContract(id),
    listDocumentsByContract(id),
  ]);
  if (!contract) notFound();
  const docs = docsResp.success ? (docsResp.data ?? []) : [];

  const porCategoria = docs.reduce<Record<string, typeof docs>>(
    (acc, d) => {
      const key = d.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    },
    {}
  );

  return (
    <>
      <Header title={`Documentos — ${contract.contractNumber}`} />
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
              href={`/contratos/${id}/documentos/novo`}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="mr-1.5 size-3.5" />
              Novo documento
            </Link>
          </div>
        </div>

        {docs.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nenhum documento gerado</CardTitle>
              <CardDescription>
                Este contrato ainda não tem documentos no sistema. Use "Novo
                documento" para escolher um template do catálogo e gerar o
                primeiro artefato (ateste, notificação, termo aditivo,
                justificativa etc).
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          Object.entries(porCategoria).map(([categoria, lista]) => (
            <Card key={categoria}>
              <CardHeader>
                <CardTitle className="text-base">
                  {CATEGORY_LABEL[categoria] ?? categoria}
                </CardTitle>
                <CardDescription>
                  {lista.length}{" "}
                  {lista.length === 1 ? "documento" : "documentos"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead className="w-20">Versão</TableHead>
                      <TableHead className="w-28">Status</TableHead>
                      <TableHead className="w-36">Gerado em</TableHead>
                      <TableHead className="w-20 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/contratos/${id}/documentos/${d.id}`}
                            className="hover:underline"
                          >
                            {d.title}
                          </Link>
                        </TableCell>
                        <TableCell>v{d.version}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[d.status] ?? "outline"}>
                            {STATUS_LABEL[d.status] ?? d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateBr(d.generatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/api/documentos/${d.id}/pdf`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "sm",
                            })}
                            prefetch={false}
                          >
                            <FileText className="size-3.5" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
