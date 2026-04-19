"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { deleteContract } from "@/actions/contratos";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, FileDown, Loader2, Files, AlertTriangle } from "lucide-react";

interface ContratoActionsProps {
  contractId: string;
  contractNumber: string;
  canEdit: boolean;
}

export function ContratoActions({ contractId, contractNumber, canEdit }: ContratoActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    const result = await deleteContract(contractId);
    if (result.success) {
      toast.success("Contrato excluído com sucesso");
      router.push("/contratos");
    } else {
      toast.error(result.error ?? "Erro ao excluir contrato");
    }
    setLoading(false);
  }

  async function handleExportPdf() {
    setPdfLoading(true);
    let blobUrl: string | null = null;
    try {
      const response = await fetch(`/api/relatorios/extrato/${contractId}`);
      if (!response.ok) {
        throw new Error("Erro ao gerar PDF");
      }
      const blob = await response.blob();
      blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const safeName = contractNumber.replace(/[^\w.-]/g, "_");
      link.download = `extrato-${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF gerado com sucesso");
    } catch {
      toast.error("Erro ao gerar PDF do extrato");
    } finally {
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
      setPdfLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href="/contratos" className={buttonVariants({ variant: "outline", size: "sm" })}>
        <ArrowLeft className="mr-1.5 size-3.5" />
        Voltar
      </Link>

      <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
        <Link
          href={`/contratos/${contractId}/ocorrencias`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <AlertTriangle className="mr-1.5 size-3.5" />
          Ocorrências
        </Link>
        <Link
          href={`/contratos/${contractId}/documentos`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <Files className="mr-1.5 size-3.5" />
          Documentos
        </Link>
        <Button variant="outline" size="sm" disabled={pdfLoading} onClick={handleExportPdf}>
          {pdfLoading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileDown className="mr-1.5 size-3.5" />
          )}
          Exportar PDF
        </Button>

        {canEdit && (
          <>
            <Separator orientation="vertical" className="mx-0.5 hidden h-6 sm:block" />
            <Link
              href={`/contratos/${contractId}/editar`}
              className={buttonVariants({ size: "sm" })}
            >
              <Pencil className="mr-1.5 size-3.5" />
              Editar
            </Link>

            <AlertDialog>
              <AlertDialogTrigger
                render={<Button variant="destructive" size="sm" disabled={loading} />}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Excluir
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir o contrato {contractNumber}? Esta ação não pode
                    ser desfeita. Todos os pagamentos e empenhos vinculados serão excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleDelete}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  );
}
