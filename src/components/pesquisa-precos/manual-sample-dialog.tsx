"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createManualSampleSchema } from "@/lib/validators/pesquisa-precos";
import { createManualSample } from "@/actions/pesquisa-precos";
import { Loader2 } from "lucide-react";

// Schema do form = schema da action menos `researchItemId` (passado por prop).
const formSchema = createManualSampleSchema.omit({ researchItemId: true });
type FormValues = z.infer<typeof formSchema>;
type SampleSource = FormValues["source"];

const SOURCE_LABELS: Record<SampleSource, string> = {
  PAINEL_PRECOS: "Painel de Preços (compras.gov.br)",
  CONTRATO_PUBLICO: "Contrato público (outro órgão)",
  MIDIA: "Mídia especializada",
  COTACAO_DIRETA: "Cotação direta com fornecedor",
  SINAPI: "SINAPI",
  CATALOGO_TIC: "Catálogo TIC SEGES",
  OUTRO: "Outro",
};

interface Props {
  researchItemId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function ManualSampleDialog({ researchItemId, open, onOpenChange, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as never,
    defaultValues: { source: "COTACAO_DIRETA" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await createManualSample({
      researchItemId,
      ...values,
    });
    setSubmitting(false);
    if (result.success) {
      toast.success("Amostra adicionada");
      reset();
      onCreated();
      onOpenChange(false);
    } else {
      toast.error(result.error ?? "Erro ao adicionar amostra");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar amostra manualmente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="source">Fonte *</Label>
              <Controller
                name="source"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger id="source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOURCE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.source && <p className="text-sm text-destructive">{errors.source.message}</p>}
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="objetoResumo">Descrição do objeto pesquisado *</Label>
              <Textarea
                id="objetoResumo"
                rows={2}
                placeholder="Ex: Serviço de vigilância armada, 24h, 8 postos…"
                {...register("objetoResumo")}
              />
              {errors.objetoResumo && (
                <p className="text-sm text-destructive">{errors.objetoResumo.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supplierName">Fornecedor / Fonte</Label>
              <Input id="supplierName" {...register("supplierName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="orgao">Órgão contratante</Label>
              <Input id="orgao" {...register("orgao")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valorGlobal">Valor total *</Label>
              <Input
                id="valorGlobal"
                type="number"
                step="0.01"
                {...register("valorGlobal", {
                  setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                })}
              />
              {errors.valorGlobal && (
                <p className="text-sm text-destructive">{errors.valorGlobal.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valorMensal">Valor mensal (opc.)</Label>
              <Input
                id="valorMensal"
                type="number"
                step="0.01"
                {...register("valorMensal", {
                  setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
                })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataAssinatura">Data da compra/assinatura</Label>
              <Input
                id="dataAssinatura"
                type="date"
                {...register("dataAssinatura", {
                  setValueAs: (v) => (v === "" || v == null ? undefined : new Date(String(v))),
                })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="modalidade">Modalidade</Label>
              <Input id="modalidade" {...register("modalidade")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uf">UF</Label>
              <Input
                id="uf"
                maxLength={2}
                {...register("uf", {
                  setValueAs: (v) => {
                    const s = String(v ?? "")
                      .trim()
                      .toUpperCase();
                    return s.length === 0 ? undefined : s;
                  },
                })}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="sourceNotes">Observações / link da fonte</Label>
              <Textarea id="sourceNotes" rows={2} {...register("sourceNotes")} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
