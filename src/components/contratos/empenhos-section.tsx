"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { commitmentSchema, type CommitmentInput } from "@/lib/validators/empenho";
import { BreakdownEditor, type BreakdownValue } from "@/components/contratos/breakdown-editor";
import { Separator } from "@/components/ui/separator";
import type { ContractItemView } from "@/types/contract-item";

// Form date inputs work with strings; Zod coerces them to Date on submit
type CommitmentFormDefaults = Omit<CommitmentInput, "commitmentDate"> & {
  commitmentDate: string | Date;
};
import { COMMITMENT_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateForInput } from "@/lib/format";
import {
  createCommitment,
  updateCommitment,
  deleteCommitment,
  syncCommitments,
} from "@/actions/empenhos";

interface Commitment {
  id: string;
  commitmentNumber: string;
  commitmentDate: Date;
  value: { toString(): string };
  type: string;
  notes: string | null;
  items?: Array<{
    contractItemId: string;
    value: { toString(): string };
  }>;
}

interface EmpenhosSectionProps {
  contractId: string;
  commitments: Commitment[];
  totalCommitted: number;
  totalSettled: number;
  canEdit: boolean;
  comprasnetId: number | null;
  contractItems: ContractItemView[];
}

export function EmpenhosSection({
  contractId,
  commitments,
  totalCommitted,
  totalSettled,
  canEdit,
  comprasnetId,
  contractItems,
}: EmpenhosSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const commitmentBalance = totalCommitted - totalSettled;

  function handleNew() {
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEdit(commitment: Commitment) {
    setEditingId(commitment.id);
    setFormOpen(true);
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      const result = await syncCommitments(contractId);
      if (result.success && result.data) {
        const { created, updated, unchanged } = result.data;
        toast.success(
          `Sincronização concluída: ${created} criado(s), ${updated} atualizado(s), ${unchanged} sem alteração`,
        );
      } else {
        toast.error(result.error ?? "Erro ao sincronizar empenhos");
      }
    } catch {
      toast.error("Erro ao sincronizar empenhos");
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;
    setIsDeleting(true);
    const result = await deleteCommitment(deletingId);
    setIsDeleting(false);
    if (result.success) {
      toast.success("Empenho excluído com sucesso");
      setDeletingId(null);
    } else {
      toast.error(result.error ?? "Erro ao excluir empenho");
    }
  }

  const editingCommitment = editingId ? commitments.find((c) => c.id === editingId) : undefined;

  return (
    <>
      <div className="space-y-4">
        {canEdit && (
          <div className="flex justify-end gap-2">
            {comprasnetId && (
              <Button size="sm" variant="outline" onClick={handleSync} disabled={isSyncing}>
                <RefreshCw className={`size-4 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Sincronizando..." : "Sincronizar Empenhos"}
              </Button>
            )}
            <Button size="sm" onClick={handleNew}>
              <Plus className="size-4 mr-1" />
              Novo Empenho
            </Button>
          </div>
        )}

        {commitments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum empenho registrado para este contrato.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>N° Empenho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Observações</TableHead>
                  {canEdit && <TableHead className="w-[80px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {commitments.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.commitmentNumber}</TableCell>
                    <TableCell>{formatDate(c.commitmentDate)}</TableCell>
                    <TableCell>
                      <Badge variant={c.type === "INITIAL" ? "default" : "outline"}>
                        {COMMITMENT_TYPE_LABELS[c.type] ?? c.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.items && c.items.length > 0 && (
                          <Layers
                            className="size-3 text-muted-foreground"
                            aria-label="Empenho com detalhamento por item"
                          />
                        )}
                        {formatCurrency(parseFloat(c.value.toString()))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[300px] truncate">
                      {c.notes ?? "—"}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(c)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingId(c.id)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between border-t pt-3 mt-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Saldo disponível: </span>
                <span className={`font-semibold ${commitmentBalance < 0 ? "text-red-600" : ""}`}>
                  {formatCurrency(commitmentBalance)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Total empenhado: </span>
                <span className="font-semibold">{formatCurrency(totalCommitted)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Empenho" : "Novo Empenho"}</DialogTitle>
          </DialogHeader>
          <EmpenhoForm
            contractId={contractId}
            editingId={editingId}
            contractItems={contractItems}
            existingBreakdown={
              editingCommitment?.items?.map((it) => ({
                contractItemId: it.contractItemId,
                value: parseFloat(it.value.toString()),
              })) ?? []
            }
            defaultValues={
              editingCommitment
                ? {
                    commitmentNumber: editingCommitment.commitmentNumber,
                    commitmentDate: formatDateForInput(editingCommitment.commitmentDate) as
                      | string
                      | Date,
                    value: parseFloat(editingCommitment.value.toString()),
                    type: editingCommitment.type as "INITIAL" | "REINFORCEMENT",
                    notes: editingCommitment.notes ?? undefined,
                  }
                : undefined
            }
            onSuccess={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empenho?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O empenho será removido permanentemente.
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

function EmpenhoForm({
  contractId,
  editingId,
  contractItems,
  existingBreakdown,
  defaultValues,
  onSuccess,
}: {
  contractId: string;
  editingId: string | null;
  contractItems: ContractItemView[];
  existingBreakdown: BreakdownValue[];
  defaultValues?: CommitmentFormDefaults;
  onSuccess: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CommitmentFormDefaults>({
    resolver: zodResolver(commitmentSchema) as never,
    defaultValues: defaultValues ?? {
      type: "INITIAL",
    },
  });

  const [breakdown, setBreakdown] = useState<BreakdownValue[]>(existingBreakdown);
  const value = useWatch({ control, name: "value" });
  const activeItems = contractItems.filter((i) => i.status === "ACTIVE");

  async function onSubmit(data: CommitmentFormDefaults) {
    const payload = {
      ...data,
      items: breakdown.length > 0 ? breakdown : undefined,
    };
    const result = editingId
      ? await updateCommitment(editingId, payload)
      : await createCommitment(contractId, payload);

    if (result.success) {
      toast.success(editingId ? "Empenho atualizado com sucesso" : "Empenho criado com sucesso");
      onSuccess();
    } else {
      toast.error(result.error ?? "Erro ao salvar empenho");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="commitmentNumber">N° Empenho *</Label>
          <Input
            id="commitmentNumber"
            placeholder="2026NE000123"
            {...register("commitmentNumber")}
          />
          {errors.commitmentNumber && (
            <p className="text-sm text-destructive">{errors.commitmentNumber.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="commitmentDate">Data *</Label>
          <Input id="commitmentDate" type="date" {...register("commitmentDate")} />
          {errors.commitmentDate && (
            <p className="text-sm text-destructive">{errors.commitmentDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="value">Valor *</Label>
          <Controller
            name="value"
            control={control}
            render={({ field }) => (
              <CurrencyInput
                id="value"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
          {errors.value && <p className="text-sm text-destructive">{errors.value.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COMMITMENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" className="min-h-[60px]" {...register("notes")} />
      </div>

      {activeItems.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Detalhamento por item
            </h4>
            <BreakdownEditor
              items={activeItems}
              total={typeof value === "number" ? value : undefined}
              value={breakdown}
              onChange={setBreakdown}
              hint="Distribua o valor do empenho entre os itens do contrato. Pode ficar em branco se preferir empenho sem rateio."
            />
          </div>
        </>
      )}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
