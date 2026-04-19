"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { createPriceResearch } from "@/actions/pesquisa-precos";
import { Loader2, Package, Wrench } from "lucide-react";

interface NovaPesquisaFormProps {
  contractId: string;
  contractObject: string;
}

export function NovaPesquisaForm({ contractId, contractObject }: NovaPesquisaFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [itemType, setItemType] = useState<"MATERIAL" | "SERVICE">("SERVICE");

  async function handleSubmit() {
    setSubmitting(true);
    const result = await createPriceResearch({ contractId, itemType });
    setSubmitting(false);
    if (result.success && result.data) {
      toast.success("Pesquisa criada");
      startTransition(() => {
        router.push(`/contratos/${contractId}/pesquisas/${result.data!.researchId}`);
      });
    } else {
      toast.error(result.error ?? "Erro ao criar pesquisa");
    }
  }

  const loading = submitting || pending;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-3 text-xs">
        <div className="font-medium text-muted-foreground">Objeto do contrato:</div>
        <div>{contractObject}</div>
      </div>

      <RadioGroup
        value={itemType}
        onValueChange={(v) => setItemType(v as "MATERIAL" | "SERVICE")}
        className="grid gap-2 sm:grid-cols-2"
      >
        <Label
          htmlFor="service"
          className="flex cursor-pointer items-start gap-3 rounded-md border p-4 hover:bg-muted/50 has-[[data-state=checked]]:border-primary"
        >
          <RadioGroupItem id="service" value="SERVICE" className="mt-0.5" />
          <div>
            <div className="flex items-center gap-1.5 font-medium">
              <Wrench className="size-4" />
              Serviço (CATSER)
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Contratações de prestação de serviços continuados ou eventuais.
            </div>
          </div>
        </Label>

        <Label
          htmlFor="material"
          className="flex cursor-pointer items-start gap-3 rounded-md border p-4 hover:bg-muted/50 has-[[data-state=checked]]:border-primary"
        >
          <RadioGroupItem id="material" value="MATERIAL" className="mt-0.5" />
          <div>
            <div className="flex items-center gap-1.5 font-medium">
              <Package className="size-4" />
              Material (CATMAT)
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Aquisição de bens, materiais de consumo ou permanentes.
            </div>
          </div>
        </Label>
      </RadioGroup>

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
          Criar pesquisa
        </Button>
      </div>
    </div>
  );
}
