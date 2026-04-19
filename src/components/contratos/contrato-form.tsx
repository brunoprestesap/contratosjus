"use client";

import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CnpjInput } from "@/components/ui/cnpj-input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  contractBaseSchema,
  type ContractCreateInput,
} from "@/lib/validators/contrato";
import {
  LEGAL_REGIME_LABELS,
  BIDDING_MODALITY_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_PERIODICITY_LABELS,
} from "@/lib/constants";
import { createContract, updateContract } from "@/actions/contratos";
import { formatDateForInput } from "@/lib/format";

interface ContratoFormProps {
  defaultValues?: ContractCreateInput & { id: string };
}

export function ContratoForm({ defaultValues }: ContratoFormProps) {
  const router = useRouter();
  const isEditing = !!defaultValues;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ContractCreateInput>({
    // Known type mismatch between zod v4 coerce.date() and @hookform/resolvers
    // Validation works correctly at runtime — safe to cast
    resolver: zodResolver(contractBaseSchema) as never,
    defaultValues: defaultValues
      ? {
          ...defaultValues,
          signatureDate: formatDateForInput(defaultValues.signatureDate) as unknown as Date,
          startDate: formatDateForInput(defaultValues.startDate) as unknown as Date,
          endDate: formatDateForInput(defaultValues.endDate) as unknown as Date,
        }
      : {
          canExtend: false,
          paymentPeriodicity: "MONTHLY",
        },
  });

  const paymentType = watch("paymentType");
  const showMonthlyValue = paymentType === "FIXED" || paymentType === "MIXED";

  async function onSubmit(data: ContractCreateInput) {
    if (data.endDate < data.startDate) {
      toast.error(
        "Data de término deve ser igual ou posterior à data de início"
      );
      return;
    }
    if (
      (data.paymentType === "FIXED" || data.paymentType === "MIXED") &&
      (!data.estimatedMonthlyValue || data.estimatedMonthlyValue <= 0)
    ) {
      toast.error(
        "Valor mensal estimado é obrigatório para pagamento fixo ou misto"
      );
      return;
    }

    const result = isEditing
      ? await updateContract(defaultValues.id, data)
      : await createContract(data);

    if (result.success) {
      toast.success(
        isEditing
          ? "Contrato atualizado com sucesso"
          : "Contrato criado com sucesso"
      );
      if (isEditing) {
        router.push(`/contratos/${defaultValues.id}`);
      } else if ("data" in result && result.data) {
        router.push(`/contratos/${result.data.id}`);
      } else {
        router.push("/contratos");
      }
      router.refresh();
    } else {
      toast.error(result.error ?? "Erro ao salvar contrato");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
      {/* Identificação */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Identificação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contractNumber">Número do Contrato *</Label>
            <Input id="contractNumber" {...register("contractNumber")} />
            {errors.contractNumber && (
              <p className="text-sm text-destructive">
                {errors.contractNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="processNumber">Número do Processo *</Label>
            <Input id="processNumber" {...register("processNumber")} />
            {errors.processNumber && (
              <p className="text-sm text-destructive">
                {errors.processNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="object">Objeto *</Label>
            <textarea
              id="object"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("object")}
            />
            {errors.object && (
              <p className="text-sm text-destructive">
                {errors.object.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Fornecedor *</Label>
            <Input id="supplier" {...register("supplier")} />
            {errors.supplier && (
              <p className="text-sm text-destructive">
                {errors.supplier.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplierCnpj">CNPJ *</Label>
            <Controller
              name="supplierCnpj"
              control={control}
              render={({ field }) => (
                <CnpjInput
                  id="supplierCnpj"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.supplierCnpj && (
              <p className="text-sm text-destructive">
                {errors.supplierCnpj.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalRegime">Regime Legal *</Label>
            <Controller
              name="legalRegime"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={LEGAL_REGIME_LABELS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o regime" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEGAL_REGIME_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.legalRegime && (
              <p className="text-sm text-destructive">
                {errors.legalRegime.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="biddingModality">Modalidade de Licitação *</Label>
            <Controller
              name="biddingModality"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={BIDDING_MODALITY_LABELS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a modalidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BIDDING_MODALITY_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.biddingModality && (
              <p className="text-sm text-destructive">
                {errors.biddingModality.message}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Vigência */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Vigência</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="space-y-2">
            <Label htmlFor="startDate">Data de Início *</Label>
            <Input
              id="startDate"
              type="date"
              {...register("startDate")}
            />
            {errors.startDate && (
              <p className="text-sm text-destructive">
                {errors.startDate.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Data de Término *</Label>
            <Input
              id="endDate"
              type="date"
              {...register("endDate")}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive">
                {errors.endDate.message}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 md:col-span-3">
            <Controller
              name="canExtend"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="canExtend"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <Label htmlFor="canExtend" className="font-normal">
              Possibilidade de prorrogação
            </Label>
          </div>
        </div>
      </Card>

      {/* Financeiro */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Financeiro</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="globalValue">Valor Global *</Label>
            <Controller
              name="globalValue"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  id="globalValue"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.globalValue && (
              <p className="text-sm text-destructive">
                {errors.globalValue.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentType">Tipo de Pagamento *</Label>
            <Controller
              name="paymentType"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={PAYMENT_TYPE_LABELS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paymentType && (
              <p className="text-sm text-destructive">
                {errors.paymentType.message}
              </p>
            )}
          </div>

          {showMonthlyValue && (
            <div className="space-y-2">
              <Label htmlFor="estimatedMonthlyValue">
                Valor Mensal Estimado *
              </Label>
              <Controller
                name="estimatedMonthlyValue"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    id="estimatedMonthlyValue"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.estimatedMonthlyValue && (
                <p className="text-sm text-destructive">
                  {errors.estimatedMonthlyValue.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="paymentPeriodicity">Periodicidade *</Label>
            <Controller
              name="paymentPeriodicity"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  items={PAYMENT_PERIODICITY_LABELS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a periodicidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAYMENT_PERIODICITY_LABELS).map(
                      ([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paymentPeriodicity && (
              <p className="text-sm text-destructive">
                {errors.paymentPeriodicity.message}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Dotação Orçamentária */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Dotação Orçamentária</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="budgetProgram">Programa de Trabalho</Label>
            <Input id="budgetProgram" {...register("budgetProgram")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expenseNature">Natureza da Despesa</Label>
            <Input id="expenseNature" {...register("expenseNature")} />
          </div>
        </div>
      </Card>

      {/* Gestão */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-4">Gestão</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fiscalHolder">Fiscal Titular *</Label>
            <Input id="fiscalHolder" {...register("fiscalHolder")} />
            {errors.fiscalHolder && (
              <p className="text-sm text-destructive">
                {errors.fiscalHolder.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fiscalSubstitute">Fiscal Substituto</Label>
            <Input id="fiscalSubstitute" {...register("fiscalSubstitute")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contractManager">Gestor do Contrato</Label>
            <Input id="contractManager" {...register("contractManager")} />
          </div>
        </div>
      </Card>

      <Separator />

      {/* Botões */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar"}
        </Button>

        {isDirty ? (
          <Dialog>
            <DialogTrigger
              render={
                <Button type="button" variant="outline" />
              }
            >
              Cancelar
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Descartar alterações?</DialogTitle>
                <DialogDescription>
                  Você tem alterações não salvas. Deseja realmente sair?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button variant="outline" />
                  }
                >
                  Continuar editando
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={() => router.push("/contratos")}
                >
                  Descartar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/contratos")}
          >
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
