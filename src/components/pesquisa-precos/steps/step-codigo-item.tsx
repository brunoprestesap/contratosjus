"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { confirmItemCode, suggestItemCode } from "@/actions/pesquisa-precos";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type { WireResearchItem } from "@/lib/pesquisa-precos/mappers";

interface Props {
  item: WireResearchItem;
  disabled: boolean;
  onChanged: () => void;
  /** Chamado após confirmar o código. O pai decide se avança para a próxima tab. */
  onCodeConfirmed?: (itemId: string) => void;
}

interface Suggestion {
  codigo: number;
  descricao: string;
  confidence: string;
}

const CODE_SOURCE_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  ITEM: "Cadastro do item",
  AI: "Sugestão da IA",
  MANUAL: "Informado manualmente",
};

export function StepCodigoItem({ item, disabled, onChanged, onCodeConfirmed }: Props) {
  const initialCode = item.itemType === "MATERIAL" ? item.catmatCode : item.catserCode;
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [manualCode, setManualCode] = useState(initialCode ?? "");
  const [lastSuggestion, setLastSuggestion] = useState<Suggestion | null>(null);

  async function sugerir() {
    setLoadingSugg(true);
    try {
      const result = await suggestItemCode(item.id);
      if (result.success && result.data) {
        if (result.data.codigo) {
          setLastSuggestion({
            codigo: result.data.codigo,
            descricao: result.data.descricao ?? "",
            confidence: result.data.confidence ?? "—",
          });
          setManualCode(String(result.data.codigo));
          toast.success(`IA sugeriu: ${result.data.codigo}`);
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

  async function confirmar(source: "AI" | "MANUAL") {
    if (!manualCode.trim()) {
      toast.error("Informe um código");
      return;
    }
    setSavingCode(true);
    const result = await confirmItemCode({
      researchItemId: item.id,
      itemType: item.itemType,
      catmatCode: item.itemType === "MATERIAL" ? manualCode.trim() : undefined,
      catserCode: item.itemType === "SERVICE" ? manualCode.trim() : undefined,
      codeSource: source,
      codeDescricao: lastSuggestion?.descricao,
    });
    setSavingCode(false);
    if (result.success) {
      toast.success("Código confirmado");
      // `onCodeConfirmed` chama refresh internamente no pai e decide se
      // avança a tab. Caímos de volta em `onChanged` se o pai não passou
      // o callback novo (compat com uso fora do wizard per-item).
      if (onCodeConfirmed) {
        onCodeConfirmed(item.id);
      } else {
        onChanged();
      }
    } else {
      toast.error(result.error ?? "Erro");
    }
  }

  const catalogoLabel = item.itemType === "MATERIAL" ? "CATMAT" : "CATSER";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Código {catalogoLabel} do item #{item.contractItem.itemNumber}
            </CardTitle>
            <CardDescription>{item.contractItem.description}</CardDescription>
          </div>
          <Badge variant="outline">{CODE_SOURCE_LABEL[item.codeSource] ?? item.codeSource}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1.5">
            <Label htmlFor={`codigo-${item.id}`}>Código</Label>
            <Input
              id={`codigo-${item.id}`}
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
            <Button
              onClick={() => confirmar(lastSuggestion ? "AI" : "MANUAL")}
              disabled={disabled || savingCode || !manualCode.trim()}
            >
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

        {item.codeDescricao ? (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="font-medium">Descrição oficial</div>
            <div className="mt-0.5 text-muted-foreground">{item.codeDescricao}</div>
          </div>
        ) : null}

        <p className="text-xs text-muted-foreground">
          A sugestão da IA usa a descrição + especificação do item (não o objeto do contrato),
          ganhando muito em precisão.
        </p>
      </CardContent>
    </Card>
  );
}
