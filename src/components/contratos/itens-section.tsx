"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContractItemFormModal } from "@/components/contratos/contract-item-form-modal";
import { deleteContractItem } from "@/actions/contract-items";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  ContractItemView,
  ContractItemType as ItemType,
  ContractItemStatus as ItemStatus,
  ContractItemUnitOfMeasure,
} from "@/types/contract-item";
import type { ItemBalanceSerialized } from "@/components/contratos/contrato-sections";

type LegalRegime = "LEI_14133_2021" | "LEI_8666_1993";

interface ItensSectionProps {
  contractId: string;
  legalRegime: LegalRegime;
  canEdit: boolean;
  itens: ContractItemView[];
  itemBalances: Record<string, ItemBalanceSerialized>;
}

const ITEM_TYPE_LABEL: Record<ItemType, string> = {
  MATERIAL: "Material",
  SERVICE: "Serviço",
  WORK: "Obra",
  IT_SOLUTION: "TI",
};

const STATUS_VARIANT: Record<ItemStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  SUSPENDED: "secondary",
  CANCELED: "outline",
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  CANCELED: "Cancelado",
};

function decimalToNumber(val: { toString(): string } | null): number | null {
  if (val == null) return null;
  const n = parseFloat(val.toString());
  return isNaN(n) ? null : n;
}

function balanceColorClass(pct: number): string {
  if (pct >= 80) return "bg-red-500";
  if (pct >= 50) return "bg-yellow-500";
  return "bg-green-500";
}

const UNIT_SHORT: Record<ContractItemUnitOfMeasure, string> = {
  UN: "un",
  CX: "cx",
  KG: "kg",
  G: "g",
  TON: "ton",
  L: "L",
  ML: "ml",
  M: "m",
  CM: "cm",
  MM: "mm",
  M2: "m²",
  M3: "m³",
  MES: "mês",
  DIA: "dia",
  HORA: "h",
  ANO: "ano",
  H_H: "h/h",
  HOMEM_MES: "hm/mês",
  POSTO: "posto",
  PAR: "par",
  DZ: "dz",
  PC: "pç",
  RL: "rl",
  GL: "gl",
  PCT: "pct",
  KIT: "kit",
  JG: "jg",
  LOTE: "lote",
  VERBA: "vb",
  SERVICO: "serv",
  FL: "fl",
  FR: "fr",
  AMPOLA: "amp",
  TUBO: "tb",
  UND_MEDICA: "un med",
  OTHER: "—",
};

function formatUnit(unit: ContractItemUnitOfMeasure, other: string | null): string {
  if (unit === "OTHER") return other ?? "outro";
  return UNIT_SHORT[unit];
}

export function ItensSection({
  contractId,
  legalRegime,
  canEdit,
  itens,
  itemBalances,
}: ItensSectionProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContractItemView | undefined>();
  const [pendingDelete, setPendingDelete] = useState<ContractItemView | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openCreate() {
    setEditingItem(undefined);
    setFormOpen(true);
  }

  function openEdit(item: ContractItemView) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deleteContractItem(pendingDelete.id);
    setDeleting(false);
    if (result.success) {
      toast.success("Item excluído");
      setPendingDelete(null);
    } else {
      toast.error(result.error ?? "Erro ao excluir item");
    }
  }

  const total = itens.reduce((sum, i) => {
    const qtd = decimalToNumber(i.quantity);
    const unit = decimalToNumber(i.unitValue);
    if (qtd != null && unit != null) return sum + qtd * unit;
    return sum;
  }, 0);

  return (
    <div className="pt-2 space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" /> Novo item
          </Button>
        </div>
      )}

      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          Nenhum item registrado. {canEdit && "Clique em \u201CNovo item\u201D para adicionar."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Unid.</TableHead>
                <TableHead className="text-right">Qtd.</TableHead>
                <TableHead className="text-right">Valor Unit.</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Pago / Saldo</TableHead>
                <TableHead>Status</TableHead>
                {canEdit && <TableHead className="w-16"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((i) => {
                const qtd = decimalToNumber(i.quantity);
                const unit = decimalToNumber(i.unitValue);
                const tot = qtd != null && unit != null ? qtd * unit : null;
                const balance = itemBalances[i.id];
                const paid = balance ? parseFloat(balance.totalPaid) : 0;
                const remaining = balance ? parseFloat(balance.balance) : (tot ?? 0);
                const pct = balance ? Math.min(100, balance.consumedPercentage) : 0;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span>{i.itemNumber}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ITEM_TYPE_LABEL[i.itemType]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <p className="text-sm truncate">{i.description}</p>
                      {i.catalogCode && (
                        <p className="text-xs text-muted-foreground">cód.: {i.catalogCode}</p>
                      )}
                    </TableCell>
                    <TableCell>{formatUnit(i.unitOfMeasure, i.unitOfMeasureOther)}</TableCell>
                    <TableCell className="text-right">
                      {qtd != null ? formatNumber(qtd) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {unit != null ? formatCurrency(unit) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {tot != null ? formatCurrency(tot) : "—"}
                    </TableCell>
                    <TableCell className="text-right min-w-[160px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-end gap-1 text-xs whitespace-nowrap">
                          {balance && balance.consumedPercentage > 100 && (
                            <AlertTriangle
                              className="size-3 text-red-600"
                              aria-label="Item superpago"
                            />
                          )}
                          <span
                            className={
                              balance && balance.consumedPercentage > 100
                                ? "text-red-600 font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {formatCurrency(paid)} / {formatCurrency(remaining)}
                          </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full transition-all ${balanceColorClass(balance?.consumedPercentage ?? 0)}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[i.status]}>{STATUS_LABEL[i.status]}</Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar item"
                            onClick={() => openEdit(i)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir item"
                            onClick={() => setPendingDelete(i)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex justify-end border-t pt-3 mt-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Total dos itens: </span>
              <span className="font-semibold">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      )}

      {canEdit && (
        <ContractItemFormModal
          contractId={contractId}
          legalRegime={legalRegime}
          open={formOpen}
          onOpenChange={setFormOpen}
          editingItem={editingItem}
        />
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Itens com empenhos ou pagamentos vinculados não podem
              ser excluídos — cancele o item em vez disso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
