"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  computeAndPersistStatistics,
  generateJustificativaAI,
  updateJustificationText,
} from "@/actions/pesquisa-precos";
import { formatCurrency } from "@/lib/format";
import { Loader2, Sparkles } from "lucide-react";
import type { StepProps } from "@/components/pesquisa-precos/steps/types";

interface StepJustificativaProps extends StepProps {
  validCount: number;
}

export function StepJustificativa({
  research,
  validCount,
  disabled,
  onChanged,
}: StepJustificativaProps) {
  const [computing, setComputing] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [texto, setTexto] = useState(research.justificationText ?? "");

  async function recalcular() {
    setComputing(true);
    const result = await computeAndPersistStatistics(research.id);
    setComputing(false);
    if (result.success) {
      toast.success("Estatísticas recalculadas");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro");
    }
  }

  async function gerarIA() {
    setGeneratingAI(true);
    const result = await generateJustificativaAI(research.id);
    setGeneratingAI(false);
    if (result.success && result.data) {
      setTexto(result.data.text);
      toast.success("Justificativa sugerida — revise antes de finalizar");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro ao gerar justificativa");
    }
  }

  async function salvar() {
    if (texto.trim().length < 10) {
      toast.error("Justificativa muito curta");
      return;
    }
    setSaving(true);
    const result = await updateJustificationText({
      researchId: research.id,
      text: texto.trim(),
    });
    setSaving(false);
    if (result.success) {
      toast.success("Justificativa salva");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro ao salvar");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Estatísticas e justificativa</CardTitle>
            <CardDescription>
              Calcule as estatísticas sobre {validCount} amostras válidas, depois escreva ou peça à
              IA uma justificativa de economicidade.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={recalcular} disabled={disabled || computing}>
            {computing ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            Recalcular stats
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 rounded-md border p-3 text-xs sm:grid-cols-3">
          <div>
            <div className="text-muted-foreground">Média</div>
            <div className="font-medium">{formatCurrency(research.mean)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Mediana</div>
            <div className="font-medium">{formatCurrency(research.median)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Desvio-padrão</div>
            <div className="font-medium">{formatCurrency(research.stdDev)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Mínimo</div>
            <div className="font-medium">{formatCurrency(research.minValue)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Máximo</div>
            <div className="font-medium">{formatCurrency(research.maxValue)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Coef. variação</div>
            <div className="font-medium">
              {research.coefVariation !== null
                ? (research.coefVariation * 100).toFixed(2) + "%"
                : "—"}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="just">Justificativa de economicidade</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={gerarIA}
              disabled={disabled || generatingAI || research.mean === null}
            >
              {generatingAI ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 size-3.5" />
              )}
              Sugerir com IA
            </Button>
          </div>
          <Textarea
            id="just"
            rows={10}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Use 'Sugerir com IA' ou escreva manualmente seguindo o Manual CNJ e o art. 107 da Lei 14.133/2021."
            disabled={disabled}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={salvar} disabled={disabled || saving || texto.trim().length < 10}>
            {saving ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : null}
            Salvar justificativa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
