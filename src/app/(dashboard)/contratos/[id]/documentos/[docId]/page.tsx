import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UploadSignedForm } from "@/components/documentos/upload-signed-form";
import { formatDateTime } from "@/lib/format";
import { ArrowLeft, Download, FileCheck2 } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  GENERATED: "Gerado",
  SIGNED: "Assinado",
  ARCHIVED: "Arquivado",
  SUPERSEDED: "Substituído",
};

const formatDate = (d: Date | null) => formatDateTime(d);

export default async function DocumentoDetalhePage({
  params,
}: {
  params: Promise<{ id: string; docId: string }>;
}) {
  const { id, docId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canUpload = session.user.role === "FISCAL";

  const doc = await prisma.generatedDocument.findUnique({
    where: { id: docId },
    include: {
      contract: { select: { contractNumber: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!doc || doc.contractId !== id) notFound();

  const versoesAnteriores = await prisma.generatedDocument.findMany({
    where: {
      contractId: id,
      templateId: doc.templateId,
      version: { lt: doc.version },
    },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      generatedAt: true,
      pdfChecksum: true,
    },
  });

  return (
    <>
      <Header title={`${doc.title} v${doc.version}`} />
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/contratos/${id}/documentos`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="mr-1.5 size-3.5" />
            Voltar à lista
          </Link>
          <div className="sm:ml-auto">
            <Link
              href={`/api/documentos/${doc.id}/pdf`}
              className={buttonVariants({ size: "sm" })}
              prefetch={false}
            >
              <Download className="mr-1.5 size-3.5" />
              Baixar PDF
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{doc.title}</CardTitle>
                <CardDescription>
                  Contrato {doc.contract.contractNumber} · Template {doc.templateId}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">v{doc.version}</Badge>
                <Badge
                  variant={
                    doc.status === "SIGNED"
                      ? "default"
                      : doc.status === "SUPERSEDED"
                      ? "outline"
                      : "secondary"
                  }
                >
                  {STATUS_LABEL[doc.status] ?? doc.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Categoria</div>
              <div>{doc.category}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Regime legal</div>
              <div>{doc.regime}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Gerado por</div>
              <div>{doc.createdBy.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Gerado em</div>
              <div>{formatDate(doc.generatedAt)}</div>
            </div>
            {doc.pdfChecksum ? (
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">SHA-256</div>
                <div className="font-mono text-[11px] break-all">
                  {doc.pdfChecksum}
                </div>
              </div>
            ) : null}
            {doc.signedAt ? (
              <div>
                <div className="text-xs text-muted-foreground">Assinado em</div>
                <div className="flex items-center gap-1">
                  <FileCheck2 className="size-3.5 text-emerald-600" />
                  {formatDate(doc.signedAt)}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {doc.status !== "SUPERSEDED" ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">PDF Assinado</CardTitle>
              <CardDescription>
                Se o documento foi assinado digitalmente fora do sistema
                (gov.br, ICP-Brasil etc.), faça o upload aqui para manter
                anexado à trilha de auditoria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {doc.signedPdfPath ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <FileCheck2 className="size-4 text-emerald-600" />
                  <span>PDF assinado disponível</span>
                  {doc.signedChecksum ? (
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {doc.signedChecksum.slice(0, 16)}…
                    </span>
                  ) : null}
                  <Link
                    href={`/api/documentos/${doc.id}/signed`}
                    className={
                      "ml-auto " +
                      buttonVariants({ variant: "outline", size: "sm" })
                    }
                    prefetch={false}
                  >
                    <Download className="mr-1.5 size-3.5" />
                    Baixar assinado
                  </Link>
                </div>
              ) : null}
              {canUpload ? (
                <UploadSignedForm
                  documentId={doc.id}
                  hasSignedAlready={!!doc.signedPdfPath}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Somente usuários com perfil Fiscal podem anexar PDF
                  assinado.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {versoesAnteriores.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Versões anteriores ({versoesAnteriores.length})
              </CardTitle>
              <CardDescription>
                Cada regeneração cria uma nova versão; versões anteriores são
                marcadas como substituídas mas permanecem acessíveis para
                auditoria.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Versão</TableHead>
                    <TableHead className="w-36">Gerado em</TableHead>
                    <TableHead className="w-32">Status</TableHead>
                    <TableHead>Checksum</TableHead>
                    <TableHead className="w-20 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {versoesAnteriores.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>v{v.version}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(v.generatedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {STATUS_LABEL[v.status] ?? v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        {v.pdfChecksum?.slice(0, 16) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/api/documentos/${v.id}/pdf`}
                          className={buttonVariants({
                            variant: "ghost",
                            size: "sm",
                          })}
                          prefetch={false}
                        >
                          <Download className="size-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
