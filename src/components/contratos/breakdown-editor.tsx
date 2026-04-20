"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calculator } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { distributeProportionalNumbers } from "@/lib/distribute";
import { formatCurrency } from "@/lib/format";
import { BREAKDOWN_TOLERANCE } from "@/lib/validators/breakdown";
import type { ContractItemView, ContractItemType } from "@/types/contract-item";

export interface BreakdownValue {
  contractItemId: string;
  value: number;
}

interface BreakdownEditorProps {
  items: ContractItemView[];
  total: number | undefined;
  value: BreakdownValue[];
  onChange: (next: BreakdownValue[]) => void;
  disabled?: boolean;
  hint?: string;
}

const ITEM_TYPE_LABEL: Record<ContractItemType, string> = {
  MATERIAL: "Material",
  SERVICE: "Serviço",
  WORK: "Obra",
  IT_SOLUTION: "TI",
};

export function BreakdownEditor({
  items,
  total,
  value,
  onChange,
  disabled,
  hint,
}: BreakdownEditorProps) {
  const byItemId = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of value) map.set(v.contractItemId, v.value);
    return map;
  }, [value]);

  const sum = value.reduce((s, v) => s + v.value, 0);
  const hasMismatch =
    total !== undefined &&
    total > 0 &&
    Math.abs(Math.round(sum * 100) - Math.round(total * 100)) >
      Math.round(BREAKDOWN_TOLERANCE * 100);

  function setItemValue(itemId: string, next: number) {
    const others = value.filter((v) => v.contractItemId !== itemId);
    const updated: BreakdownValue[] =
      next > 0 || byItemId.has(itemId)
        ? [...others, { contractItemId: itemId, value: next }]
        : others;
    onChange(updated);
  }

  function autoDistribute() {
    if (total === undefined || total <= 0 || items.length === 0) return;
    const weights = items.map((i) => {
      const q = parseFloat(i.quantity.toString());
      const u = parseFloat(i.unitValue.toString());
      const tot = q * u;
      return isNaN(tot) ? 0 : tot;
    });
    const parts = distributeProportionalNumbers(total, weights);
    const next: BreakdownValue[] = items.map((item, idx) => ({
      contractItemId: item.id,
      value: parts[idx],
    }));
    onChange(next);
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Cadastre os itens do contrato para detalhar o rateio.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={autoDistribute}
          disabled={disabled || !total}
        >
          <Calculator className="size-4 mr-1" /> Rateio proporcional
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[500px]">
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-[180px] text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const v = byItemId.get(item.id) ?? 0;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.itemNumber}</TableCell>
                  <TableCell className="max-w-[260px]">
                    <p className="text-sm truncate">{item.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ITEM_TYPE_LABEL[item.itemType]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyInput
                      value={v}
                      onChange={(next) => setItemValue(item.id, next ?? 0)}
                      disabled={disabled}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-between text-sm pt-2 border-t">
        <span className="text-muted-foreground">Soma do detalhamento:</span>
        <span className={`font-semibold ${hasMismatch ? "text-destructive" : ""}`}>
          {formatCurrency(sum)}
          {total !== undefined && (
            <span className="text-muted-foreground font-normal"> / {formatCurrency(total)}</span>
          )}
        </span>
      </div>
      {hasMismatch && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            A soma do detalhamento difere do total. Ajuste os valores ou clique em &ldquo;Rateio
            proporcional&rdquo;.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
