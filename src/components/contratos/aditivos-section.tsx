"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Separator } from "@/components/ui/separator";
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
import { additiveSchema, type AdditiveInput } from "@/lib/validators/aditivo";

// React Hook Form date inputs work with strings ("yyyy-MM-dd"), but Zod coerces them to Date on submit.
// This type reflects the actual shape of defaultValues passed to useForm.
type AdditiveFormDefaults = Omit<AdditiveInput, "signatureDate" | "newEndDate"> & {
  signatureDate: string | Date;
  newEndDate?: string | Date;
};
import { ADDITIVE_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateForInput } from "@/lib/utils";
import { generateAdditivePreview, type AdditivePreview } from "@/lib/additive-preview";
import {
  createAdditive,
  updateAdditive,
  deleteAdditive,
} from "@/actions/aditivos";

interface Additive {
  id: string;
  additiveNumber: string;
  type: string;
  signatureDate: Date;
  newGlobalValue: { toString(): string } | null;
  newMonthlyValue: { toString(): string } | null;
  newEndDate: Date | null;
  justification: string;
}

interface ContractSnapshot {
  globalValue: { toString(): string };
  endDate: Date;
  estimatedMonthlyValue: { toString(): string } | null;
}

interface AditivosSectionProps {
  contractId: string;
  additives: Additive[];
  contract: ContractSnapshot;
  canEdit: boolean;
}

function buildEffectSummary(additive: Additive): string {
  const parts: string[] = [];
  if (additive.newGlobalValue) {
    parts.push(formatCurrency(parseFloat(additive.newGlobalValue.toString())));
  }
  if (additive.newEndDate) {
    parts.push(`até ${formatDate(additive.newEndDate)}`);
  }
  if (additive.newMonthlyValue) {
    parts.push(`mensal ${formatCurrency(parseFloat(additive.newMonthlyValue.toString()))}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function AditivosSection({
  contractId,
  additives,
  contract,
  canEdit,
}: AditivosSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleNew() {
    setEditingId(null);
    setFormOpen(true);
  }

  function handleEdit(additive: Additive) {
    setEditingId(additive.id);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deletingId) return;
    setIsDeleting(true);
    const result = await deleteAdditive(deletingId);
    setIsDeleting(false);
    if (result.success) {
      toast.success("Aditivo excluído com sucesso");
      setDeletingId(null);
    } else {
      toast.error(result.error ?? "Erro ao excluir aditivo");
    }
  }

  const editingAdditive = editingId
    ? additives.find((a) => a.id === editingId)
    : undefined;

  return (
    <>
      <div className="space-y-4">
        {canEdit && (
          <div className="flex justify-end">
            <Button size="sm" onClick={handleNew}>
              <Plus className="size-4 mr-1" />
              Registrar Aditivo
            </Button>
          </div>
        )}

        {additives.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum aditivo registrado para este contrato.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>N° TA</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Assinatura</TableHead>
                  <TableHead>Efeito</TableHead>
                  {canEdit && <TableHead className="w-[80px]">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {additives.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      {a.additiveNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ADDITIVE_TYPE_LABELS[a.type] ?? a.type}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(a.signatureDate)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {buildEffectSummary(a)}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleEdit(a)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingId(a.id)}
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
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Aditivo" : "Registrar Aditivo"}
            </DialogTitle>
          </DialogHeader>
          <AditivoForm
            contractId={contractId}
            contract={contract}
            editingId={editingId}
            defaultValues={
              editingAdditive
                ? {
                    additiveNumber: editingAdditive.additiveNumber,
                    type: editingAdditive.type as AdditiveInput["type"],
                    signatureDate: formatDateForInput(editingAdditive.signatureDate),
                    newGlobalValue: editingAdditive.newGlobalValue
                      ? parseFloat(editingAdditive.newGlobalValue.toString())
                      : undefined,
                    newMonthlyValue: editingAdditive.newMonthlyValue
                      ? parseFloat(editingAdditive.newMonthlyValue.toString())
                      : undefined,
                    newEndDate: editingAdditive.newEndDate
                      ? formatDateForInput(editingAdditive.newEndDate)
                      : undefined,
                    justification: editingAdditive.justification,
                  }
                : undefined
            }
            onSuccess={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aditivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O aditivo será removido
              permanentemente. Os valores do contrato poderão ser afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------- Form with confirmation step ----------

function AditivoForm({
  contractId,
  contract,
  editingId,
  defaultValues,
  onSuccess,
}: {
  contractId: string;
  contract: ContractSnapshot;
  editingId: string | null;
  defaultValues?: AdditiveFormDefaults;
  onSuccess: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [preview, setPreview] = useState<AdditivePreview | null>(null);
  const [pendingData, setPendingData] = useState<AdditiveInput | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdditiveFormDefaults>({
    resolver: zodResolver(additiveSchema) as never,
    defaultValues: defaultValues ?? {
      type: "TERM",
    },
  });

  const selectedType = watch("type");

  const showEndDate = selectedType === "TERM" || selectedType === "MIXED" || selectedType === "APOSTILAMENTO";
  const showGlobalValue = selectedType === "VALUE" || selectedType === "MIXED" || selectedType === "APOSTILAMENTO";
  const showMonthlyValue = selectedType === "READJUSTMENT" || selectedType === "APOSTILAMENTO";

  function onFormSubmit(data: AdditiveFormDefaults) {
    // After zodResolver, date fields are coerced to Date objects
    // After zodResolver, date fields are coerced to Date objects
    const coerced = data as AdditiveFormDefaults as unknown as AdditiveInput;
    const previewData = generateAdditivePreview(contract, coerced);
    setPreview(previewData);
    setPendingData(coerced);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!pendingData) return;
    setIsSaving(true);

    const result = editingId
      ? await updateAdditive(editingId, pendingData)
      : await createAdditive(contractId, pendingData);

    setIsSaving(false);
    if (result.success) {
      toast.success(
        editingId
          ? "Aditivo atualizado com sucesso"
          : "Aditivo registrado com sucesso"
      );
      setConfirmOpen(false);
      onSuccess();
    } else {
      toast.error(result.error ?? "Erro ao salvar aditivo");
      setConfirmOpen(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="additiveNumber">N° do Aditivo *</Label>
            <Input
              id="additiveNumber"
              placeholder="1º TA"
              {...register("additiveNumber")}
            />
            {errors.additiveNumber && (
              <p className="text-sm text-destructive">
                {errors.additiveNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={ADDITIVE_TYPE_LABELS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ADDITIVE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="signatureDate">Data de Assinatura *</Label>
            <Input
              id="signatureDate"
              type="date"
              {...register("signatureDate")}
            />
            {errors.signatureDate && (
              <p className="text-sm text-destructive">
                {errors.signatureDate.message}
              </p>
            )}
          </div>

          {showEndDate && (
            <div className="space-y-2">
              <Label htmlFor="newEndDate">
                Nova Data de Término {selectedType !== "APOSTILAMENTO" ? "*" : ""}
              </Label>
              <Input
                id="newEndDate"
                type="date"
                {...register("newEndDate")}
              />
              {errors.newEndDate && (
                <p className="text-sm text-destructive">
                  {errors.newEndDate.message}
                </p>
              )}
            </div>
          )}

          {showGlobalValue && (
            <div className="space-y-2">
              <Label htmlFor="newGlobalValue">
                Novo Valor Global {selectedType !== "APOSTILAMENTO" ? "*" : ""}
              </Label>
              <Controller
                name="newGlobalValue"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="newGlobalValue"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.newGlobalValue && (
                <p className="text-sm text-destructive">
                  {errors.newGlobalValue.message}
                </p>
              )}
            </div>
          )}

          {showMonthlyValue && (
            <div className="space-y-2">
              <Label htmlFor="newMonthlyValue">
                Novo Valor Mensal {selectedType === "READJUSTMENT" ? "*" : ""}
              </Label>
              <Controller
                name="newMonthlyValue"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="newMonthlyValue"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.newMonthlyValue && (
                <p className="text-sm text-destructive">
                  {errors.newMonthlyValue.message}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="justification">Justificativa *</Label>
          <Textarea
            id="justification"
            className="min-h-[60px]"
            placeholder="Descreva a justificativa para o aditivo..."
            {...register("justification")}
          />
          {errors.justification && (
            <p className="text-sm text-destructive">
              {errors.justification.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Validando..." : "Continuar"}
          </Button>
        </DialogFooter>
      </form>

      {/* Confirmation Modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Aditivo</DialogTitle>
          </DialogHeader>

          {preview && pendingData && (
            <div className="space-y-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Tipo: </span>
                <span className="font-medium">
                  {ADDITIVE_TYPE_LABELS[pendingData.type] ?? pendingData.type}
                </span>
              </div>

              <Separator />

              {preview.before.globalValue !== preview.after.globalValue && (
                <CompareRow
                  label="Valor Global"
                  before={formatCurrency(preview.before.globalValue)}
                  after={formatCurrency(preview.after.globalValue)}
                />
              )}

              {preview.before.endDate.getTime() !== preview.after.endDate.getTime() && (
                <CompareRow
                  label="Vigência"
                  before={formatDate(preview.before.endDate)}
                  after={formatDate(preview.after.endDate)}
                />
              )}

              {preview.before.monthlyValue !== preview.after.monthlyValue && (
                <CompareRow
                  label="Valor Mensal"
                  before={
                    preview.before.monthlyValue
                      ? formatCurrency(preview.before.monthlyValue)
                      : "—"
                  }
                  after={
                    preview.after.monthlyValue
                      ? formatCurrency(preview.after.monthlyValue)
                      : "—"
                  }
                />
              )}

              {preview.before.globalValue === preview.after.globalValue &&
                preview.before.endDate.getTime() === preview.after.endDate.getTime() &&
                preview.before.monthlyValue === preview.after.monthlyValue && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma alteração nos valores ou vigência do contrato.
                  </p>
                )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Voltar
            </Button>
            <Button onClick={handleConfirm} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Confirmar e Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CompareRow({
  label,
  before,
  after,
}: {
  label: string;
  before: string;
  after: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium">{label}</p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Antes</span>
          <p>{before}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Depois</span>
          <p className="font-medium text-primary">{after}</p>
        </div>
      </div>
    </div>
  );
}
