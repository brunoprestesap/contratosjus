"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmCatalogoCode, suggestCodigoForResearch } from "@/actions/pesquisa-precos";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { StepProps } from "@/components/pesquisa-precos/steps/types";

interface Suggestion {
  codigo: number;
  descricao: string;
  confidence: string;
}

export function StepCodigo({ research, disabled, onChanged }: StepProps) {
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [manualCode, setManualCode] = useState(
    (research.itemType === "MATERIAL" ? research.catmatCode : research.catserCode) ?? "",
  );
  const [lastSuggestion, setLastSuggestion] = useState<Suggestion | null>(null);

  async function sugerir() {
    setLoadingSugg(true);
    try {
      const result = await suggestCodigoForResearch(research.id);
      if (result.success && result.data) {
        if (result.data.codigo) {
          setLastSuggestion({
            codigo: result.data.codigo,
            descricao: result.data.descricao ?? "",
            confidence: result.data.confidence ?? "—",
          });
          setManualCode(String(result.data.codigo));
          toast.success(`IA sugeriu: ${result.data.codigo} (confidence ${result.data.confidence})`);
        } else {
          toast.warning(result.data.reason ?? "IA não encontrou código");
        }
      } else {
        toast.error(result.error ?? "Erro ao sugerir código");
      }
    } finally {
      setLoadingSugg(false);
    }
  }

  async function confirmar() {
    if (!manualCode.trim()) {
      toast.error("Informe um código");
      return;
    }
    setSavingCode(true);
    const result = await confirmCatalogoCode({
      researchId: research.id,
      itemType: research.itemType,
      catmatCode: research.itemType === "MATERIAL" ? manualCode.trim() : undefined,
      catserCode: research.itemType === "SERVICE" ? manualCode.trim() : undefined,
    });
    setSavingCode(false);
    if (result.success) {
      toast.success("Código confirmado");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Código do catálogo ({research.itemType === "MATERIAL" ? "CATMAT" : "CATSER"})
        </CardTitle>
        <CardDescription>
          Use &quot;Sugerir com IA&quot; (navegação hierárquica de 3-4 níveis com Sabiá 3.1) ou
          insira manualmente o código do edital/TR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Ex: 459879"
              inputMode="numeric"
              disabled={disabled || savingCode}
            />
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={sugerir} disabled={disabled || loadingSugg}>
              {loadingSugg ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 size-3.5" />
              )}
              Sugerir com IA
            </Button>
          </div>
          <div className="flex items-end">
            <Button onClick={confirmar} disabled={disabled || savingCode || !manualCode.trim()}>
              {savingCode ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 size-3.5" />
              )}
              Confirmar
            </Button>
          </div>
        </div>

        {lastSuggestion ? (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="font-medium">
              IA sugeriu: [{lastSuggestion.codigo}] ({lastSuggestion.confidence})
            </div>
            <div className="mt-0.5 text-muted-foreground">{lastSuggestion.descricao}</div>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          A sugestão hierárquica faz 3-4 chamadas de IA. Para CATSER (serviço) a qualidade varia
          conforme cadastro no catálogo público — confirme a descrição antes de seguir.
        </p>
      </CardContent>
    </Card>
  );
}
