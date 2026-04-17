"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { generateDocument } from "@/actions/documentos";
import { FileSignature, Loader2 } from "lucide-react";

const TEMPLATE_ID = "prorrogacao.termo-aditivo";

const TIPO_LABEL: Record<string, string> = {
  TERM: "Prorrogação",
  VALUE: "Valor",
  MIXED: "Prazo + Valor",
  READJUSTMENT: "Reajuste",
  APOSTILAMENTO: "Apostilamento",
};

interface AdditiveOption {
  id: string;
  additiveNumber: string;
  type: string;
  signatureDateIso: string;
  newEndDateIso: string | null;
  newGlobalValue: number | null;
  hasMinuta: boolean;
}

interface GerarTermoAditivoFormProps {
  contractId: string;
  additives: AdditiveOption[];
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}
function formatCurrency(v: number | null): string {
  if (v === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

export function GerarTermoAditivoForm({
  contractId,
  additives,
}: GerarTermoAditivoFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(
    additives.find((a) => !a.hasMinuta)?.id ?? additives[0]?.id ?? null
  );
  const [consideracoes, setConsideracoes] = useState("");

  async function handleSubmit() {
    if (!selectedId) {
      toast.error("Selecione um aditivo");
      return;
    }
    setSubmitting(true);
    const result = await generateDocument({
      templateId: TEMPLATE_ID,
      contractId,
      additiveId: selectedId,
      manualFields: consideracoes.trim()
        ? { consideracoes: consideracoes.trim() }
        : undefined,
    });
    setSubmitting(false);
    if (result.success && result.data) {
      toast.success("Minuta gerada com sucesso");
      startTransition(() => {
        router.push(
          `/contratos/${contractId}/documentos/${result.data!.documentId}`
        );
      });
    } else {
      toast.error(result.error ?? "Erro ao gerar minuta");
    }
  }

  const loading = submitting || pending;

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedId ?? undefined}
        onValueChange={(v) => setSelectedId(v)}
        className="space-y-2"
      >
        {additives.map((a) => (
          <Label
            key={a.id}
            htmlFor={a.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50 has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem
              id={a.id}
              value={a.id}
              className="mt-0.5"
              disabled={loading}
            />
            <div className="flex flex-1 flex-wrap items-baseline gap-2">
              <span className="font-medium">{a.additiveNumber}</span>
              <Badge variant="secondary" className="text-[10px]">
                {TIPO_LABEL[a.type] ?? a.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                assinado em {formatDate(a.signatureDateIso)}
              </span>
              {a.newEndDateIso ? (
                <span className="text-xs text-muted-foreground">
                  · nova vigência até {formatDate(a.newEndDateIso)}
                </span>
              ) : null}
              {a.newGlobalValue !== null ? (
                <span className="ml-auto font-mono text-sm">
                  {formatCurrency(a.newGlobalValue)}
                </span>
              ) : null}
              {a.hasMinuta ? (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  já tem minuta
                </Badge>
              ) : null}
            </div>
          </Label>
        ))}
      </RadioGroup>

      <div className="space-y-1.5">
        <Label htmlFor="consideracoes">
          Considerações adicionais (opcional)
        </Label>
        <Textarea
          id="consideracoes"
          placeholder="Cláusulas complementares, observações específicas do caso, informações que não se encaixem nas cláusulas automáticas."
          rows={4}
          value={consideracoes}
          onChange={(e) => setConsideracoes(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileSignature className="mr-1.5 size-3.5" />
          )}
          Gerar Minuta
        </Button>
      </div>

      {additives.some((a) => a.hasMinuta) ? (
        <p className="text-xs text-muted-foreground">
          Alguns aditivos já têm minuta gerada. Regenerar cria nova versão — a
          anterior fica marcada como "Substituído".
        </p>
      ) : null}
    </div>
  );
}
