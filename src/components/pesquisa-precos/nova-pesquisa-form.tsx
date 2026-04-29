"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { createPriceResearchPerItem } from "@/actions/pesquisa-precos";
import { Loader2, Package, Wrench, Hammer, Laptop } from "lucide-react";

export interface NovaPesquisaItem {
  id: string;
  itemNumber: string;
  description: string;
  itemType: "MATERIAL" | "SERVICE" | "WORK" | "IT_SOLUTION";
  catalogCode: string | null;
  unitOfMeasure: string;
  quantity: number;
  totalValue: number;
}

interface NovaPesquisaFormProps {
  contractId: string;
  items: NovaPesquisaItem[];
}

const TYPE_LABEL: Record<NovaPesquisaItem["itemType"], string> = {
  MATERIAL: "Material",
  SERVICE: "Serviço",
  WORK: "Obra",
  IT_SOLUTION: "Solução de TI",
};

const TYPE_ICON: Record<NovaPesquisaItem["itemType"], typeof Package> = {
  MATERIAL: Package,
  SERVICE: Wrench,
  WORK: Hammer,
  IT_SOLUTION: Laptop,
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function NovaPesquisaForm({ contractId, items }: NovaPesquisaFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && selected.size === items.length;

  const totalSelecionado = useMemo(() => {
    return items.filter((i) => selected.has(i.id)).reduce((acc, i) => acc + i.totalValue, 0);
  }, [items, selected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((i) => i.id)),
    );
  }

  async function handleSubmit() {
    if (selected.size === 0) {
      toast.error("Selecione ao menos um item");
      return;
    }
    setSubmitting(true);
    const result = await createPriceResearchPerItem({
      contractId,
      contractItemIds: Array.from(selected),
    });
    setSubmitting(false);
    if (result.success && result.data) {
      toast.success(`Pesquisa criada com ${selected.size} item(ns)`);
      startTransition(() => {
        router.push(`/contratos/${contractId}/pesquisas/${result.data!.researchId}`);
      });
    } else {
      toast.error(result.error ?? "Erro ao criar pesquisa");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Este contrato não tem itens ativos cadastrados. Cadastre os itens antes de iniciar uma
        pesquisa de preços.
      </div>
    );
  }

  const loading = submitting || pending;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 text-xs">
          <label className="flex items-center gap-2 font-medium text-muted-foreground">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Selecionar todos"
            />
            {selected.size} de {items.length} item(ns) selecionados
          </label>
          <span className="font-medium">Total: {brl.format(totalSelecionado)}</span>
        </div>
        <div className="divide-y">
          {items.map((item) => {
            const Icon = TYPE_ICON[item.itemType];
            const isChecked = selected.has(item.id);
            return (
              <label
                key={item.id}
                htmlFor={`item-${item.id}`}
                className="flex cursor-pointer items-start gap-3 px-3 py-2 text-sm hover:bg-muted/50 has-[[data-state=checked]]:bg-muted/30"
              >
                <Checkbox
                  id={`item-${item.id}`}
                  checked={isChecked}
                  onCheckedChange={() => toggle(item.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">#{item.itemNumber}</span>
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <Icon className="size-3" />
                      {TYPE_LABEL[item.itemType]}
                    </Badge>
                    {item.catalogCode ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {item.catalogCode}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-700">
                        sem código — IA sugerirá
                      </Badge>
                    )}
                  </div>
                  <div className="line-clamp-2 text-muted-foreground">{item.description}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.quantity.toLocaleString("pt-BR")} {item.unitOfMeasure} ·{" "}
                    {brl.format(item.totalValue)}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={loading || selected.size === 0}>
          {loading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          Criar pesquisa
        </Button>
      </div>
    </div>
  );
}
