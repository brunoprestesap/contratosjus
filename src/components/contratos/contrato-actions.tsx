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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { deleteContract } from "@/actions/contratos";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, FileDown } from "lucide-react";

interface ContratoActionsProps {
  contractId: string;
  contractNumber: string;
  canEdit: boolean;
}

export function ContratoActions({
  contractId,
  contractNumber,
  canEdit,
}: ContratoActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/contratos"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        <ArrowLeft className="mr-1.5 size-3.5" />
        Voltar
      </Link>

      {canEdit && (
        <div className="flex items-center gap-2">
          <Link
            href={`/contratos/${contractId}/editar`}
            className={buttonVariants({ size: "sm" })}
          >
            <Pencil className="mr-1.5 size-3.5" />
            Editar
          </Link>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button variant="destructive" size="sm" disabled={loading} />
              }
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Excluir
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir contrato?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o contrato {contractNumber}?
                  Esta ação não pode ser desfeita. Todos os pagamentos e
                  empenhos vinculados serão excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <div className="sm:ml-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="outline" size="sm" disabled />
              }
            >
              <FileDown className="mr-1.5 size-3.5" />
              Exportar PDF
            </TooltipTrigger>
            <TooltipContent>
              <p>Disponível na Onda 3</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
