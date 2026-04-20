"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useForm, Controller, useWatch } from "react-hook-form";
import type { CatalogSelection, CatalogMode } from "@/components/contratos/catalog-picker-modal";

// Dynamic import: modal pesado (ícones, 6 Server Actions, 4 níveis de
// navegação) só sobe quando o fiscal clicar em "Catálogo".
const CatalogPickerModal = dynamic(
  () =>
    import("@/components/contratos/catalog-picker-modal").then((m) => ({
      default: m.CatalogPickerModal,
    })),
  { ssr: false },
);
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { contractItemSchema } from "@/lib/validators/contract-item";
import { createContractItem, updateContractItem } from "@/actions/contract-items";
import { formatDateForInput } from "@/lib/format";
import type {
  ContractItemView,
  ContractItemType as ItemType,
  ContractItemCatalogType as CatalogType,
  ContractItemStatus as ItemStatus,
  ContractItemAdjustmentIndex as AdjustmentIndex,
  ContractItemUnitOfMeasure as UnitOfMeasure,
} from "@/types/contract-item";

type LegalRegime = "LEI_14133_2021" | "LEI_8666_1993";

export const UNIT_OF_MEASURE_LABELS: Record<UnitOfMeasure, string> = {
  UN: "UN — Unidade",
  CX: "CX — Caixa",
  KG: "KG — Quilograma",
  G: "G — Grama",
  TON: "TON — Tonelada",
  L: "L — Litro",
  ML: "ML — Mililitro",
  M: "M — Metro",
  CM: "CM — Centímetro",
  MM: "MM — Milímetro",
  M2: "M² — Metro quadrado",
  M3: "M³ — Metro cúbico",
  MES: "MÊS — Mês",
  DIA: "DIA — Dia",
  HORA: "HORA — Hora",
  ANO: "ANO — Ano",
  H_H: "H/H — Homem-hora",
  HOMEM_MES: "HOMEM/MÊS — Homem-mês",
  POSTO: "POSTO — Posto de serviço",
  PAR: "PAR — Par",
  DZ: "DZ — Dúzia",
  PC: "PC — Peça",
  RL: "RL — Rolo",
  GL: "GL — Galão",
  PCT: "PCT — Pacote",
  KIT: "KIT — Kit",
  JG: "JG — Jogo",
  LOTE: "LOTE — Lote",
  VERBA: "VERBA — Verba",
  SERVICO: "SERVIÇO — Serviço",
  FL: "FL — Folha",
  FR: "FR — Frasco",
  AMPOLA: "AMPOLA — Ampola",
  TUBO: "TUBO — Tubo",
  UND_MEDICA: "UND MÉD. — Unidade médica",
  OTHER: "OUTRO — especificar",
};

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  MATERIAL: "Material",
  SERVICE: "Serviço",
  WORK: "Obra / Engenharia",
  IT_SOLUTION: "Solução de TI",
};

const CATALOG_TYPE_LABELS: Record<CatalogType, string> = {
  CATMAT: "CATMAT (Material)",
  CATSER: "CATSER (Serviço/Obra)",
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CANCELED: "Cancelado",
};

const ADJUSTMENT_INDEX_LABELS: Record<AdjustmentIndex, string> = {
  NONE: "Sem reajuste",
  IPCA: "IPCA",
  IGPM: "IGP-M",
  INCC: "INCC",
  IPC_FIPE: "IPC-FIPE",
  SINAPI: "SINAPI",
  OTHER: "Outro",
};

interface ContractItemFormModalProps {
  contractId: string;
  legalRegime: LegalRegime;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: ContractItemView;
}

interface FormValues {
  itemNumber: string;
  lotNumber?: string;
  itemType: ItemType;
  catalogType: CatalogType;
  catalogCode?: string;
  description: string;
  detailedSpecification: string;
  unitOfMeasure: UnitOfMeasure;
  unitOfMeasureOther?: string;
  quantity: number;
  unitValue: number;
  isAdjustable: boolean;
  adjustmentIndex: AdjustmentIndex;
  nextAdjustmentDate?: string | Date;
  budgetProgram?: string;
  expenseNature?: string;
  fundingSource?: string;
  brand?: string;
  model?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  warrantyMonths?: number;
  deliveryLocation?: string;
  deliveryDeadlineDays?: number;
  executionLocation?: string;
  executionDeadlineDays?: number;
  isContinuousService: boolean;
  penaltyRules?: string;
  bdiPercentage?: number;
  socialChargesPercentage?: number;
  sinapiReference?: string;
  pctiReference?: string;
  itServiceCategory?: string;
  status: ItemStatus;
}

function toOptionalNumber(d: { toString(): string } | null | undefined): number | undefined {
  if (d == null) return undefined;
  const n = parseFloat(d.toString());
  return isNaN(n) ? undefined : n;
}

export function ContractItemFormModal({
  contractId,
  legalRegime,
  open,
  onOpenChange,
  editingItem,
}: ContractItemFormModalProps) {
  const isEditing = !!editingItem;
  const schema = useMemo(() => contractItemSchema(legalRegime), [legalRegime]);

  const defaultVals: Partial<FormValues> = editingItem
    ? {
        itemNumber: editingItem.itemNumber,
        lotNumber: editingItem.lotNumber ?? undefined,
        itemType: editingItem.itemType,
        catalogType: editingItem.catalogType,
        catalogCode: editingItem.catalogCode ?? undefined,
        description: editingItem.description,
        detailedSpecification: editingItem.detailedSpecification,
        unitOfMeasure: editingItem.unitOfMeasure,
        unitOfMeasureOther: editingItem.unitOfMeasureOther ?? undefined,
        quantity: parseFloat(editingItem.quantity.toString()),
        unitValue: parseFloat(editingItem.unitValue.toString()),
        isAdjustable: editingItem.isAdjustable,
        adjustmentIndex: editingItem.adjustmentIndex,
        nextAdjustmentDate: editingItem.nextAdjustmentDate
          ? formatDateForInput(editingItem.nextAdjustmentDate)
          : undefined,
        budgetProgram: editingItem.budgetProgram ?? undefined,
        expenseNature: editingItem.expenseNature ?? undefined,
        fundingSource: editingItem.fundingSource ?? undefined,
        brand: editingItem.brand ?? undefined,
        model: editingItem.model ?? undefined,
        manufacturer: editingItem.manufacturer ?? undefined,
        countryOfOrigin: editingItem.countryOfOrigin ?? undefined,
        warrantyMonths: editingItem.warrantyMonths ?? undefined,
        deliveryLocation: editingItem.deliveryLocation ?? undefined,
        deliveryDeadlineDays: editingItem.deliveryDeadlineDays ?? undefined,
        executionLocation: editingItem.executionLocation ?? undefined,
        executionDeadlineDays: editingItem.executionDeadlineDays ?? undefined,
        isContinuousService: editingItem.isContinuousService,
        penaltyRules: editingItem.penaltyRules ?? undefined,
        bdiPercentage: toOptionalNumber(editingItem.bdiPercentage),
        socialChargesPercentage: toOptionalNumber(editingItem.socialChargesPercentage),
        sinapiReference: editingItem.sinapiReference ?? undefined,
        pctiReference: editingItem.pctiReference ?? undefined,
        itServiceCategory: editingItem.itServiceCategory ?? undefined,
        status: editingItem.status,
      }
    : {
        itemType: "SERVICE",
        catalogType: "CATSER",
        unitOfMeasure: "MES",
        isAdjustable: false,
        adjustmentIndex: "NONE",
        isContinuousService: false,
        status: "ACTIVE",
      };

  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: defaultVals,
  });

  const [catalogOpen, setCatalogOpen] = useState(false);

  const itemType = useWatch({ control, name: "itemType" });
  const quantity = useWatch({ control, name: "quantity" });
  const unitValue = useWatch({ control, name: "unitValue" });
  const isAdjustable = useWatch({ control, name: "isAdjustable" });
  const unitOfMeasure = useWatch({ control, name: "unitOfMeasure" });

  const totalPreview =
    quantity && unitValue
      ? (quantity * unitValue).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : null;

  function applyCatalogSelection(selection: CatalogSelection) {
    setValue("catalogCode", selection.code, { shouldValidate: true });
    setValue("catalogType", selection.catalogType, { shouldValidate: true });
    const currentDesc = getValues("description");
    if (!currentDesc || !currentDesc.trim()) {
      setValue("description", selection.description.slice(0, 200), {
        shouldValidate: true,
      });
    }
    const currentSpec = getValues("detailedSpecification");
    if (!currentSpec || !currentSpec.trim()) {
      setValue("detailedSpecification", selection.description, {
        shouldValidate: true,
      });
    }
  }

  async function onSubmit(values: FormValues) {
    const result = isEditing
      ? await updateContractItem(editingItem!.id, values)
      : await createContractItem(contractId, values);

    if (result.success) {
      toast.success(isEditing ? "Item atualizado" : "Item adicionado");
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Erro ao salvar item");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Item do Contrato" : "Adicionar Item ao Contrato"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Identificação */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Identificação
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="itemNumber">Nº do item *</Label>
                <Input id="itemNumber" {...register("itemNumber")} />
                {errors.itemNumber && (
                  <p className="text-sm text-destructive">{errors.itemNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lotNumber">Lote / Grupo</Label>
                <Input id="lotNumber" {...register("lotNumber")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemType">Tipo *</Label>
                <Controller
                  name="itemType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        const next = val === "MATERIAL" ? "CATMAT" : "CATSER";
                        setValue("catalogType", next);
                      }}
                      items={ITEM_TYPE_LABELS}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ITEM_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.itemType && (
                  <p className="text-sm text-destructive">{errors.itemType.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalogType">Catálogo *</Label>
                <Controller
                  name="catalogType"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={CATALOG_TYPE_LABELS}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATALOG_TYPE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.catalogType && (
                  <p className="text-sm text-destructive">{errors.catalogType.message}</p>
                )}
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="catalogCode">
                  Código CATMAT/CATSER {legalRegime === "LEI_14133_2021" && "*"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="catalogCode"
                    {...register("catalogCode")}
                    className="flex-1 font-mono tabular-nums"
                    placeholder="Código ou clique em Catálogo"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCatalogOpen(true)}
                    className="gap-1.5"
                  >
                    <Search className="size-4" />
                    Catálogo
                  </Button>
                </div>
                {errors.catalogCode && (
                  <p className="text-sm text-destructive">{errors.catalogCode.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Descrição */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Descrição
            </h4>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição resumida *</Label>
              <Input id="description" maxLength={200} {...register("description")} />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="detailedSpecification">Especificação técnica *</Label>
              <Textarea
                id="detailedSpecification"
                rows={3}
                {...register("detailedSpecification")}
              />
              {errors.detailedSpecification && (
                <p className="text-sm text-destructive">{errors.detailedSpecification.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Quantitativos */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Quantitativos
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="unitOfMeasure">Unidade *</Label>
                <Controller
                  name="unitOfMeasure"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={UNIT_OF_MEASURE_LABELS}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unidade" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} className="min-w-[280px]">
                        {Object.entries(UNIT_OF_MEASURE_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.unitOfMeasure && (
                  <p className="text-sm text-destructive">{errors.unitOfMeasure.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.0001"
                  {...register("quantity", { valueAsNumber: true })}
                />
                {errors.quantity && (
                  <p className="text-sm text-destructive">{errors.quantity.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitValue">Valor unitário *</Label>
                <Controller
                  name="unitValue"
                  control={control}
                  render={({ field }) => (
                    <CurrencyInput
                      id="unitValue"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {errors.unitValue && (
                  <p className="text-sm text-destructive">{errors.unitValue.message}</p>
                )}
              </div>
            </div>
            {unitOfMeasure === "OTHER" && (
              <div className="space-y-2 mt-3">
                <Label htmlFor="unitOfMeasureOther">Descreva a unidade *</Label>
                <Input
                  id="unitOfMeasureOther"
                  placeholder="Ex: m² pintado, visita técnica, ponto"
                  {...register("unitOfMeasureOther")}
                />
                {errors.unitOfMeasureOther && (
                  <p className="text-sm text-destructive">{errors.unitOfMeasureOther.message}</p>
                )}
              </div>
            )}
            {totalPreview && (
              <p className="text-sm text-muted-foreground mt-2">
                Valor total (qtd × unit.):{" "}
                <span className="font-medium text-foreground">{totalPreview}</span>
              </p>
            )}
          </div>

          <Separator />

          {/* Campos condicionais por tipo */}
          {itemType === "MATERIAL" && (
            <>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Material
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marca</Label>
                    <Input id="brand" {...register("brand")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Input id="model" {...register("model")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Fabricante</Label>
                    <Input id="manufacturer" {...register("manufacturer")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="countryOfOrigin">País de origem</Label>
                    <Input id="countryOfOrigin" {...register("countryOfOrigin")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warrantyMonths">Garantia (meses)</Label>
                    <Input
                      id="warrantyMonths"
                      type="number"
                      {...register("warrantyMonths", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDeadlineDays">Prazo de entrega (dias)</Label>
                    <Input
                      id="deliveryDeadlineDays"
                      type="number"
                      {...register("deliveryDeadlineDays", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="deliveryLocation">Local de entrega *</Label>
                    <Input id="deliveryLocation" {...register("deliveryLocation")} />
                    {errors.deliveryLocation && (
                      <p className="text-sm text-destructive">{errors.deliveryLocation.message}</p>
                    )}
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {(itemType === "SERVICE" || itemType === "WORK") && (
            <>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Execução
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="executionLocation">Local de execução</Label>
                    <Input id="executionLocation" {...register("executionLocation")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="executionDeadlineDays">Prazo (dias)</Label>
                    <Input
                      id="executionDeadlineDays"
                      type="number"
                      {...register("executionDeadlineDays", { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <div className="flex items-center gap-2">
                      <Controller
                        name="isContinuousService"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="isContinuousService"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="isContinuousService" className="font-normal">
                        Serviço continuado
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="penaltyRules">Regras de penalidade (IMR / SLA)</Label>
                    <Textarea id="penaltyRules" rows={2} {...register("penaltyRules")} />
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {itemType === "WORK" && (
            <>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Engenharia
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="bdiPercentage">BDI (%) *</Label>
                    <Input
                      id="bdiPercentage"
                      type="number"
                      step="0.01"
                      {...register("bdiPercentage", { valueAsNumber: true })}
                    />
                    {errors.bdiPercentage && (
                      <p className="text-sm text-destructive">{errors.bdiPercentage.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="socialChargesPercentage">Encargos sociais (%) *</Label>
                    <Input
                      id="socialChargesPercentage"
                      type="number"
                      step="0.01"
                      {...register("socialChargesPercentage", { valueAsNumber: true })}
                    />
                    {errors.socialChargesPercentage && (
                      <p className="text-sm text-destructive">
                        {errors.socialChargesPercentage.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sinapiReference">Referência SINAPI</Label>
                    <Input id="sinapiReference" {...register("sinapiReference")} />
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {itemType === "IT_SOLUTION" && (
            <>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Solução de TI (Res. CNJ 182/2013)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="pctiReference">Vínculo com PCTI (item do plano) *</Label>
                    <Input id="pctiReference" {...register("pctiReference")} />
                    {errors.pctiReference && (
                      <p className="text-sm text-destructive">{errors.pctiReference.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="itServiceCategory">Categoria de serviço de TI</Label>
                    <Input id="itServiceCategory" {...register("itServiceCategory")} />
                  </div>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Reajuste */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none">
              Reajuste
            </summary>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="space-y-2 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <Controller
                    name="isAdjustable"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id="isAdjustable"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor="isAdjustable" className="font-normal">
                    Tem reajuste?
                  </Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adjustmentIndex">Índice</Label>
                <Controller
                  name="adjustmentIndex"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      items={ADJUSTMENT_INDEX_LABELS}
                      disabled={!isAdjustable}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ADJUSTMENT_INDEX_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.adjustmentIndex && (
                  <p className="text-sm text-destructive">{errors.adjustmentIndex.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="nextAdjustmentDate">Próximo reajuste</Label>
                <Input
                  id="nextAdjustmentDate"
                  type="date"
                  disabled={!isAdjustable}
                  {...register("nextAdjustmentDate")}
                />
              </div>
            </div>
          </details>

          {/* Dotação orçamentária */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground uppercase tracking-wide select-none">
              Dotação orçamentária (sobrescreve do contrato)
            </summary>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="space-y-2">
                <Label htmlFor="budgetProgram">Programa de trabalho</Label>
                <Input id="budgetProgram" {...register("budgetProgram")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expenseNature">Natureza da despesa</Label>
                <Input id="expenseNature" {...register("expenseNature")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fundingSource">Fonte de recursos</Label>
                <Input id="fundingSource" {...register("fundingSource")} />
              </div>
            </div>
          </details>

          <Separator />

          {/* Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} items={STATUS_LABELS}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>

        {catalogOpen && (
          <CatalogPickerModal
            open={catalogOpen}
            initialMode={(itemType === "MATERIAL" ? "CATMAT" : "CATSER") as CatalogMode}
            onOpenChange={setCatalogOpen}
            onSelect={applyCatalogSelection}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
