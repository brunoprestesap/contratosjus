"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertTriangle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { paymentCreateSchema, paymentUpdateSchema } from "@/lib/validators/pagamento";
import { createPayment, updatePayment } from "@/actions/pagamentos";
import { isContractExpired } from "@/lib/utils";
import { formatDateForInput, formatMonthForInput } from "@/lib/format";

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

interface PagamentoFormModalProps {
  contractId: string;
  contractEndDate: Date;
  globalValue: number;
  totalPaid: number;
  totalCommitted: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPayment?: Payment;
  prefilledMonth?: Date;
}

// Form fields use string values for date inputs; Zod coerces them to Date on submit
interface FormData {
  referenceMonth: string | Date;
  invoiceValue?: number;
  attestDate?: string | Date;
  attestNotes?: string;
  settlementDate?: string | Date;
  settledValue?: number;
  paidAt?: string | Date;
  paidValue?: number;
}

export function PagamentoFormModal({
  contractId,
  contractEndDate,
  globalValue,
  totalPaid,
  totalCommitted,
  open,
  onOpenChange,
  editingPayment,
  prefilledMonth,
}: PagamentoFormModalProps) {
  const isEditing = !!editingPayment;
  const expired = isContractExpired(contractEndDate);
  const schema = isEditing ? paymentUpdateSchema : paymentCreateSchema;

  const defaultVals: Partial<FormData> = editingPayment
    ? {
        referenceMonth: formatMonthForInput(editingPayment.referenceMonth) as unknown as Date,
        invoiceValue: editingPayment.invoiceValue
          ? parseFloat(editingPayment.invoiceValue.toString())
          : undefined,
        attestDate: editingPayment.attestDate
          ? formatDateForInput(editingPayment.attestDate)
          : undefined,
        attestNotes: editingPayment.attestNotes ?? undefined,
        settlementDate: editingPayment.settlementDate
          ? formatDateForInput(editingPayment.settlementDate)
          : undefined,
        settledValue: editingPayment.settledValue
          ? parseFloat(editingPayment.settledValue.toString())
          : undefined,
        paidAt: editingPayment.paidAt ? formatDateForInput(editingPayment.paidAt) : undefined,
        paidValue: editingPayment.paidValue
          ? parseFloat(editingPayment.paidValue.toString())
          : undefined,
      }
    : {
        ...(prefilledMonth
          ? { referenceMonth: formatMonthForInput(prefilledMonth) as unknown as Date }
          : {}),
      };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaultVals,
  });

  const attestDate = useWatch({ control, name: "attestDate" });
  const settlementDate = useWatch({ control, name: "settlementDate" });
  const paidValue = useWatch({ control, name: "paidValue" });

  const hasAttest = !!attestDate;
  const hasSettlement = !!settlementDate;

  // Check if new paidValue would cause overbudget
  const currentPaidValue = editingPayment?.paidValue
    ? parseFloat(editingPayment.paidValue.toString())
    : 0;
  const effectivePaidValue = paidValue ?? 0;
  const projectedTotal = totalPaid - currentPaidValue + effectivePaidValue + totalCommitted;
  const wouldOverBudget = projectedTotal > globalValue;

  async function onSubmit(data: FormData) {
    // Convert month input to first day of month in UTC
    const rawMonth =
      typeof data.referenceMonth === "string"
        ? data.referenceMonth
        : data.referenceMonth.toISOString().substring(0, 7);
    const refMonth = new Date(`${rawMonth}-01T00:00:00Z`);

    const payload = { ...data, referenceMonth: refMonth };

    const result = isEditing
      ? await updatePayment(editingPayment.id, payload)
      : await createPayment(contractId, payload);

    if (result.success) {
      toast.success(
        isEditing ? "Pagamento atualizado com sucesso" : "Pagamento registrado com sucesso",
      );
      if (result.warning) {
        toast.warning(result.warning);
      }
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Erro ao salvar pagamento");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Pagamento" : "Registrar Pagamento"}</DialogTitle>
        </DialogHeader>

        {expired && (
          <Alert variant="destructive">
            <Ban className="size-4" />
            <AlertTitle>Contrato expirado</AlertTitle>
            <AlertDescription>
              Não é possível registrar pagamentos em contratos expirados.
            </AlertDescription>
          </Alert>
        )}

        {wouldOverBudget && !expired && (
          <Alert>
            <AlertTriangle className="size-4 text-yellow-600" />
            <AlertTitle className="text-yellow-600">Alerta de estouro</AlertTitle>
            <AlertDescription>
              O total pago + empenhado excederá o valor global do contrato.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Referência */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Referência
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="referenceMonth">Mês/Ano *</Label>
                <Input
                  id="referenceMonth"
                  type="month"
                  disabled={expired}
                  {...register("referenceMonth")}
                />
                {errors.referenceMonth && (
                  <p className="text-sm text-destructive">{errors.referenceMonth.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceValue">Valor da NF</Label>
                <Controller
                  name="invoiceValue"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="invoiceValue"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={expired}
                    />
                  )}
                />
                {errors.invoiceValue && (
                  <p className="text-sm text-destructive">{errors.invoiceValue.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Ateste */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Ateste
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attestDate">Data do Ateste {!isEditing && "*"}</Label>
                <Input id="attestDate" type="date" disabled={expired} {...register("attestDate")} />
                {errors.attestDate && (
                  <p className="text-sm text-destructive">{errors.attestDate.message}</p>
                )}
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="attestNotes">Observações do Ateste</Label>
                <Input id="attestNotes" disabled={expired} {...register("attestNotes")} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Liquidação */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Liquidação
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settlementDate">Data da Liquidação</Label>
                <Input
                  id="settlementDate"
                  type="date"
                  disabled={expired || !hasAttest}
                  {...register("settlementDate")}
                />
                {errors.settlementDate && (
                  <p className="text-sm text-destructive">{errors.settlementDate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="settledValue">Valor Liquidado</Label>
                <Controller
                  name="settledValue"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="settledValue"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={expired || !hasAttest}
                    />
                  )}
                />
                {errors.settledValue && (
                  <p className="text-sm text-destructive">{errors.settledValue.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Pagamento */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Pagamento
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paidAt">Data do Pagamento</Label>
                <Input
                  id="paidAt"
                  type="date"
                  disabled={expired || !hasSettlement}
                  {...register("paidAt")}
                />
                {errors.paidAt && (
                  <p className="text-sm text-destructive">{errors.paidAt.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="paidValue">Valor Pago</Label>
                <Controller
                  name="paidValue"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="paidValue"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={expired || !hasSettlement}
                    />
                  )}
                />
                {errors.paidValue && (
                  <p className="text-sm text-destructive">{errors.paidValue.message}</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={isSubmitting || expired}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
