"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Check, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { PAYMENT_STATUS_VARIANTS } from "@/lib/constants";
import { getPaymentStatus } from "@/lib/utils";
import { formatCurrency, formatMonthYear, formatShortDate } from "@/lib/format";
import { deletePayment } from "@/actions/pagamentos";
import { PagamentoFormModal } from "@/components/contratos/pagamento-form-modal";

interface Payment {
  id: string;
  referenceMonth: Date;
  invoiceValue: { toString(): string } | null;
  attestDate: Date | null;
  attestNotes: string | null;
  settlementDate: Date | null;
  settledValue: { toString(): string } | null;
  paidAt: Date | null;
  paidValue: { toString(): string } | null;
}

interface PagamentosSectionProps {
  contractId: string;
  contractEndDate: Date;
  globalValue: number;
  totalPaid: number;
  totalCommitted: number;
  payments: Payment[];
  canEdit: boolean;
  missingMonths?: Date[];
}

function DateCell({ date }: { date: Date | null }) {
  if (!date) {
    return (
      <span className="flex items-center gap-1 text-muted-foreground">
        <Clock className="size-3" />
        ---
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-green-600">
      <Check className="size-3" />
      {formatShortDate(date)}
    </span>
  );
}

export function PagamentosSection({
  contractId,
  contractEndDate,
  globalValue,
  totalPaid,
  totalCommitted,
  payments,
  canEdit,
  missingMonths = [],
}: PagamentosSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [prefilledMonth, setPrefilledMonth] = useState<Date | undefined>();
  const [showAllMissing, setShowAllMissing] = useState(false);

  const INITIAL_MISSING_LIMIT = 12;
  const visibleMissing = showAllMissing
    ? missingMonths
    : missingMonths.slice(0, INITIAL_MISSING_LIMIT);
  const hiddenMissingCount = missingMonths.length - INITIAL_MISSING_LIMIT;

  function handleNew(month?: Date) {
    setEditingPayment(undefined);
    setPrefilledMonth(month);
    setFormOpen(true);
  }

  function handleEdit(payment: Payment) {
    setEditingPayment(payment);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setIsDeleting(true);
    const result = await deletePayment(deletingId);
    setIsDeleting(false);
    if (result.success) {
      toast.success("Pagamento excluído com sucesso");
      setDeletingId(null);
    } else {
      toast.error(result.error ?? "Erro ao excluir pagamento");
    }
  }

  return (
    <>
      <div className="space-y-4">
        {missingMonths.length > 0 && (
          <Alert className="border-yellow-500/50 bg-yellow-500/10 dark:bg-yellow-500/5">
            <AlertTriangle className="size-4 text-yellow-600 dark:text-yellow-500" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-200">
              {missingMonths.length === 1
                ? "1 mês sem registro de pagamento"
                : `${missingMonths.length} meses sem registro de pagamento`}
            </AlertTitle>
            <AlertDescription className="text-yellow-800/90 dark:text-yellow-200/80">
              <div className="space-y-2">
                <div>
                  O contrato tem pagamento fixo mensal e os meses abaixo ainda não foram registrados
                  {canEdit ? " — clique para registrar" : ""}.
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visibleMissing.map((m) => {
                    const label = formatMonthYear(m);
                    const key = m.toISOString();
                    return canEdit ? (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleNew(m)}
                        className="inline-flex items-center rounded-md border border-yellow-500/40 bg-background/60 px-2 py-0.5 text-xs font-medium tabular-nums text-yellow-900 transition-colors hover:border-yellow-500 hover:bg-yellow-500/20 dark:bg-yellow-500/10 dark:text-yellow-200 dark:hover:bg-yellow-500/20"
                      >
                        {label}
                      </button>
                    ) : (
                      <span
                        key={key}
                        className="inline-flex items-center rounded-md border border-yellow-500/30 bg-background/40 px-2 py-0.5 text-xs font-medium tabular-nums text-yellow-900 dark:bg-yellow-500/5 dark:text-yellow-200"
                      >
                        {label}
                      </span>
                    );
                  })}
                  {hiddenMissingCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowAllMissing((v) => !v)}
                      className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-yellow-800 underline-offset-2 hover:underline dark:text-yellow-300"
                    >
                      {showAllMissing
                        ? "ver menos"
                        : `+${hiddenMissingCount} ${hiddenMissingCount === 1 ? "outro" : "outros"}`}
                    </button>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {canEdit && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => handleNew()}>
              <Plus className="size-4 mr-1" />
              Registrar Pagamento
            </Button>
          </div>
        )}

        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum pagamento registrado para este contrato.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead className="text-right">Valor NF</TableHead>
                  <TableHead>Ateste</TableHead>
                  <TableHead>Liquidação</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-[60px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const status = getPaymentStatus(p);
                  return (
                    <TableRow
                      key={p.id}
                      className={canEdit ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={() => canEdit && handleEdit(p)}
                    >
                      <TableCell className="font-medium capitalize">
                        {formatMonthYear(p.referenceMonth)}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.invoiceValue
                          ? formatCurrency(parseFloat(p.invoiceValue.toString()))
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <DateCell date={p.attestDate} />
                      </TableCell>
                      <TableCell>
                        <DateCell date={p.settlementDate} />
                      </TableCell>
                      <TableCell>
                        <DateCell date={p.paidAt} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={PAYMENT_STATUS_VARIANTS[status] ?? "secondary"}
                          className={
                            status === "Atestado"
                              ? "border-yellow-500 text-yellow-600"
                              : status === "Pago"
                                ? "bg-green-600"
                                : status === "Liquidado"
                                  ? "bg-blue-600 text-white"
                                  : ""
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(p.id);
                            }}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <PagamentoFormModal
        contractId={contractId}
        contractEndDate={contractEndDate}
        globalValue={globalValue}
        totalPaid={totalPaid}
        totalCommitted={totalCommitted}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setPrefilledMonth(undefined);
        }}
        editingPayment={editingPayment}
        prefilledMonth={prefilledMonth}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pagamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O registro de pagamento será removido
              permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
