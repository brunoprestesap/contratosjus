"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  generateItemJustificativaAI,
  setItemExceptionJustification,
  setItemReferenceMethod,
  updateItemJustificationText,
} from "@/actions/pesquisa-precos";
import { AlertTriangle, Calculator, Loader2, Save, Sparkles } from "lucide-react";
import type { WireResearchItem } from "@/lib/pesquisa-precos/mappers";

interface Props {
  item: WireResearchItem;
  disabled: boolean;
  onChanged: () => void;
  /** Chamado após salvar a justificativa. O pai decide se avança para finalizar. */
  onSaved?: () => void;
}

const METHOD_LABELS: Record<string, string> = {
  NONE: "— não definido —",
  MEAN: "Média",
  MEDIAN: "Mediana",
  MIN: "Menor valor",
  CUSTOM: "Valor customizado",
};

const MIN_SAMPLES = 3;

export function StepJustificativaItem({ item, disabled, onChanged, onSaved }: Props) {
  const [text, setText] = useState(item.justificationText ?? "");
  const [genLoading, setGenLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [methodLoading, setMethodLoading] = useState(false);
  const [exceptLoading, setExceptLoading] = useState(false);
  const [method, setMethod] = useState<string>(item.referenceMethod);
  const [adjustment, setAdjustment] = useState<string>(
    item.adjustmentPercent != null ? String(item.adjustmentPercent) : "",
  );
  const [customValue, setCustomValue] = useState<string>(
    item.referenceMethod === "CUSTOM" && item.referenceValue != null
      ? String(item.referenceValue)
      : "",
  );
  const [methodJust, setMethodJust] = useState<string>(item.methodJustification ?? "");
  const [exceptionJust, setExceptionJust] = useState<string>(item.exceptionJustification ?? "");

  const dirty = text !== (item.justificationText ?? "");
  const belowMinimum = item.sampleCountUsed < MIN_SAMPLES;

  async function gerar() {
    if (item.referenceValue == null) {
      toast.error("Defina e salve o método de referência antes de gerar a justificativa");
      return;
    }
    setGenLoading(true);
    const result = await generateItemJustificativaAI(item.id);
    setGenLoading(false);
    if (result.success && result.data) {
      setText(result.data.text);
      toast.success("Justificativa gerada");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro ao gerar");
    }
  }

  async function salvar() {
    setSaveLoading(true);
    const result = await updateItemJustificationText({ researchItemId: item.id, text });
    setSaveLoading(false);
    if (result.success) {
      toast.success("Justificativa salva");
      if (onSaved) {
        onSaved();
      } else {
        onChanged();
      }
    } else {
      toast.error(result.error ?? "Erro ao salvar");
    }
  }

  async function salvarMetodo() {
    setMethodLoading(true);
    const adjNum = adjustment.trim() === "" ? undefined : Number(adjustment);
    const customNum = customValue.trim() === "" ? undefined : Number(customValue);
    const result = await setItemReferenceMethod({
      researchItemId: item.id,
      method: method as never,
      adjustmentPercent: adjNum,
      customValue: customNum,
      methodJustification: methodJust.trim() || undefined,
    });
    setMethodLoading(false);
    if (result.success && result.data) {
      toast.success(
        result.data.referenceValue != null
          ? `Valor de referência: ${formatCurrency(result.data.referenceValue)}`
          : "Método atualizado",
      );
      onChanged();
    } else {
      toast.error(result.error ?? "Erro ao salvar método");
    }
  }

  async function salvarExcecao() {
    if (exceptionJust.trim().length < 20) {
      toast.error("Justificativa deve ter ao menos 20 caracteres");
      return;
    }
    setExceptLoading(true);
    const result = await setItemExceptionJustification({
      researchItemId: item.id,
      text: exceptionJust,
    });
    setExceptLoading(false);
    if (result.success) {
      toast.success("Excepcionalidade registrada");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Justificativa · Item #{item.contractItem.itemNumber}
            </CardTitle>
            <CardDescription className="line-clamp-1">
              {item.contractItem.description}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={gerar}
            disabled={disabled || genLoading || item.referenceValue == null}
          >
            {genLoading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 size-3.5" />
            )}
            Gerar com IA
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estatísticas */}
        {item.mean != null ? (
          <div className="grid gap-2 rounded-md border bg-muted/30 p-3 text-xs sm:grid-cols-4">
            <Stat label="Amostras" value={`${item.sampleCountUsed} de ${item.sampleCountTotal}`} />
            <Stat label="Média" value={formatCurrency(item.mean)} />
            <Stat label="Mediana" value={item.median != null ? formatCurrency(item.median) : "—"} />
            <Stat
              label="CV"
              value={item.coefVariation != null ? `${(item.coefVariation * 100).toFixed(1)}%` : "—"}
            />
          </div>
        ) : (
          <div className="rounded-md border bg-amber-50 p-3 text-xs text-amber-900">
            Calcule as estatísticas deste item no step anterior antes de gerar a justificativa.
          </div>
        )}

        {/* Método de preço de referência */}
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Label className="text-sm font-semibold">Preço de referência</Label>
              <p className="text-xs text-muted-foreground">
                Método estatístico adotado (IN SEGES/ME 65/2021 art. 6º).
              </p>
            </div>
            {item.referenceValue != null && (
              <div className="text-right">
                <div className="text-[10px] uppercase text-muted-foreground">Valor</div>
                <div className="font-mono font-semibold">{formatCurrency(item.referenceValue)}</div>
              </div>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor={`method-${item.id}`} className="text-xs">
                Método
              </Label>
              <Select value={method} onValueChange={(v) => setMethod(v ?? "NONE")}>
                <SelectTrigger id={`method-${item.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(METHOD_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`adj-${item.id}`} className="text-xs">
                Ajuste ± %
              </Label>
              <Input
                id={`adj-${item.id}`}
                type="number"
                step="0.1"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                placeholder="0"
              />
            </div>
            {method === "CUSTOM" && (
              <div className="space-y-1">
                <Label htmlFor={`custom-${item.id}`} className="text-xs">
                  Valor customizado
                </Label>
                <Input
                  id={`custom-${item.id}`}
                  type="number"
                  step="0.01"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor={`methjust-${item.id}`} className="text-xs">
              Justificativa do método {method === "CUSTOM" && "(obrigatória para CUSTOM)"}
            </Label>
            <Textarea
              id={`methjust-${item.id}`}
              rows={2}
              value={methodJust}
              onChange={(e) => setMethodJust(e.target.value)}
              placeholder="Ex: dispersão elevada, adotada mediana conforme Manual CNJ…"
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={salvarMetodo}
              disabled={disabled || methodLoading || item.sampleCountUsed === 0}
            >
              {methodLoading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Calculator className="mr-1.5 size-3.5" />
              )}
              Aplicar método
            </Button>
          </div>
        </div>

        {/* Excepcionalidade de < 3 amostras */}
        {belowMinimum && (
          <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 text-amber-700" />
              <div className="text-xs">
                <div className="font-semibold text-amber-900">
                  Menos de {MIN_SAMPLES} amostras válidas ({item.sampleCountUsed})
                </div>
                <p className="mt-0.5 text-amber-800">
                  IN SEGES/ME 65/2021 art. 6º, §4º admite a excepcionalidade com justificativa
                  robusta aprovada pela autoridade competente. Documente as tentativas de obter mais
                  preços.
                </p>
              </div>
            </div>
            <Textarea
              rows={3}
              value={exceptionJust}
              onChange={(e) => setExceptionJust(e.target.value)}
              placeholder="Descreva as fontes consultadas, tentativas sem resposta, singularidade do objeto…"
              className="text-xs"
            />
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={salvarExcecao}
                disabled={disabled || exceptLoading}
              >
                {exceptLoading ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 size-3.5" />
                )}
                Registrar excepcionalidade
              </Button>
            </div>
          </div>
        )}

        {/* Justificativa de economicidade */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Justificativa de economicidade</Label>
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled || genLoading}
            placeholder="Use 'Gerar com IA' ou escreva a justificativa manualmente…"
            className="font-mono text-xs"
          />
          <div className="flex justify-end">
            <Button onClick={salvar} disabled={disabled || saveLoading || !dirty}>
              {saveLoading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 size-3.5" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
