"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SectionAiField } from "@/components/documentos/section-ai-field";
import { generateDocument } from "@/actions/documentos";
import { formatCurrency, formatDate } from "@/lib/format";
import { FileSignature, Loader2 } from "lucide-react";

const TEMPLATE_ID = "prorrogacao.justificativa-economicidade";

interface ResearchOption {
  id: string;
  itemType: "MATERIAL" | "SERVICE";
  codigo: string | null;
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  coefVariation: number | null;
  samplesCount: number;
  finalizedAtIso: string | null;
  hasJustificativaDoc: boolean;
}

interface GerarJustificativaFormProps {
  contractId: string;
  contractNumber: string;
  researches: ResearchOption[];
}

const fmt = (v: number | null) => formatCurrency(v);
const fmtDate = (iso: string | null) => formatDate(iso);

export function GerarJustificativaForm({
  contractId,
  contractNumber,
  researches,
}: GerarJustificativaFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(
    researches.find((r) => !r.hasJustificativaDoc)?.id ?? researches[0]?.id ?? null
  );
  const [fundamentacao, setFundamentacao] = useState("");

  const selected = researches.find((r) => r.id === selectedId) ?? null;

  async function handleSubmit() {
    if (!selectedId) {
      toast.error("Selecione uma pesquisa");
      return;
    }
    setSubmitting(true);
    const aiFields: Record<string, string> | undefined =
      fundamentacao.trim().length >= 10
        ? { fundamentacao: fundamentacao.trim() }
        : undefined;
    const result = await generateDocument({
      templateId: TEMPLATE_ID,
      contractId,
      priceResearchId: selectedId,
      aiFields,
    });
    setSubmitting(false);
    if (result.success && result.data) {
      toast.success("Justificativa gerada com sucesso");
      startTransition(() => {
        router.push(
          `/contratos/${contractId}/documentos/${result.data!.documentId}`
        );
      });
    } else {
      toast.error(result.error ?? "Erro ao gerar justificativa");
    }
  }

  const loading = submitting || pending;
  const hint = selected
    ? `Contrato ${contractNumber}, baseado na pesquisa código ${selected.codigo ?? "—"} com ${selected.samplesCount} amostras válidas.`
    : undefined;

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedId ?? undefined}
        onValueChange={(v) => setSelectedId(v)}
        className="space-y-2"
      >
        {researches.map((r) => (
          <Label
            key={r.id}
            htmlFor={r.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50 has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem
              id={r.id}
              value={r.id}
              className="mt-0.5"
              disabled={loading}
            />
            <div className="grid flex-1 gap-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">
                  {r.itemType === "MATERIAL" ? "CATMAT" : "CATSER"} {r.codigo ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground">
                  · finalizada em {fmtDate(r.finalizedAtIso)}
                </span>
                {r.hasJustificativaDoc ? (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    já tem justificativa
                  </Badge>
                ) : null}
              </div>
              <div className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-4">
                <span>
                  <b>{r.samplesCount}</b> amostras
                </span>
                <span>
                  média {fmt(r.mean)}
                </span>
                <span>
                  mediana {fmt(r.median)}
                </span>
                <span>
                  coef. var{" "}
                  {r.coefVariation !== null
                    ? (r.coefVariation * 100).toFixed(1) + "%"
                    : "—"}
                </span>
              </div>
            </div>
          </Label>
        ))}
      </RadioGroup>

      <SectionAiField
        templateId={TEMPLATE_ID}
        contractId={contractId}
        sectionId="fundamentacao"
        label="Fundamentação (opcional — em branco usa a justificativa da pesquisa)"
        placeholder="Se deixar em branco, o PDF usa a justificativa gravada na pesquisa selecionada. Use o botão 'Sugerir com IA' para gerar uma nova versão específica para este documento."
        value={fundamentacao}
        onChange={setFundamentacao}
        disabled={loading || !selectedId}
        rows={7}
        hint={hint}
      />

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" onClick={handleSubmit} disabled={loading || !selectedId}>
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileSignature className="mr-1.5 size-3.5" />
          )}
          Gerar Justificativa
        </Button>
      </div>

      {researches.some((r) => r.hasJustificativaDoc) ? (
        <p className="text-xs text-muted-foreground">
          Algumas pesquisas já têm justificativa gerada. Regenerar cria nova
          versão — a anterior fica marcada como "Substituída".
        </p>
      ) : null}
    </div>
  );
}
