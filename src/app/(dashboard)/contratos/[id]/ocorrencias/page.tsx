import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getContract } from "@/actions/contratos";
import { listOccurrencesByContract } from "@/actions/ocorrencias";
import { auth } from "@/lib/auth";
import { ArrowLeft, Plus, Pencil, FileText } from "lucide-react";

const TIPO_LABEL: Record<string, string> = {
  ATRASO: "Atraso",
  DESCUMPRIMENTO: "Descumprimento",
  QUALIDADE: "Qualidade",
  SEGURANCA: "Segurança",
  OUTRO: "Outro",
};

const SEV_CLASS: Record<string, string> = {
  LEVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MEDIA: "bg-amber-100 text-amber-800 border-amber-200",
  GRAVE: "bg-red-100 text-red-800 border-red-200",
};

function formatDateBr(d: Date) {
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
      ? `Ocorrências — ${contract.contractNumber} | ContratosJUS`
      : "Ocorrências | ContratosJUS",
  };
}

export default async function OcorrenciasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const canEdit = session?.user?.role === "FISCAL";

  const [contract, resp] = await Promise.all([
    getContract(id),
    listOccurrencesByContract(id),
  ]);
  if (!contract) notFound();
  const ocorrencias = resp.success ? (resp.data ?? []) : [];

  return (
    <>
      <Header title={`Ocorrências — ${contract.contractNumber}`} />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/contratos/${id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar ao contrato
          </Link>
          {canEdit ? (
            <div className="sm:ml-auto">
              <Link
                href={`/contratos/${id}/ocorrencias/nova`}
                className={buttonVariants({ size: "sm" })}
              >
                <Plus className="mr-1.5 size-3.5" />
                Nova ocorrência
              </Link>
            </div>
          ) : null}
        </div>

        {ocorrencias.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sem ocorrências</CardTitle>
              <CardDescription>
                Registre ocorrências relevantes da execução contratual — atraso,
                descumprimento, problemas de qualidade ou segurança. Cada
                ocorrência pode ser usada para gerar um Registro de Ocorrência em
                PDF.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {ocorrencias.length}{" "}
                {ocorrencias.length === 1 ? "ocorrência" : "ocorrências"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-32">Reportado por</TableHead>
                    <TableHead className="w-36 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ocorrencias.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{formatDateBr(o.occurredAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {TIPO_LABEL[o.type] ?? o.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium " +
                            (SEV_CLASS[o.severity] ?? "")
                          }
                        >
                          {o.severity}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="line-clamp-2 text-xs" title={o.description}>
                          {o.description}
                        </div>
                        {o.hasRegistroDoc ? (
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            <FileText className="mr-1 size-3" />
                            PDF gerado
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.reportedByName}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canEdit ? (
                            <Link
                              href={`/contratos/${id}/ocorrencias/${o.id}/editar`}
                              className={buttonVariants({
                                variant: "ghost",
                                size: "sm",
                              })}
                            >
                              <Pencil className="size-3.5" />
                            </Link>
                          ) : null}
                          <Link
                            href={`/contratos/${id}/documentos/novo/registro-ocorrencia?occ=${o.id}`}
                            className={buttonVariants({
                              variant: "ghost",
                              size: "sm",
                            })}
                          >
                            <FileText className="size-3.5" />
                          </Link>
                        </div>
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
