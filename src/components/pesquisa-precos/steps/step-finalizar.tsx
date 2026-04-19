"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { finalizeResearch } from "@/actions/pesquisa-precos";
import { MIN_SAMPLES_TO_FINALIZE } from "@/lib/pesquisa-precos/constants";
import { CheckCircle2, Download, FileSignature, Loader2 } from "lucide-react";
import { CheckItem } from "@/components/pesquisa-precos/steps/check-item";
import type { StepProps } from "@/components/pesquisa-precos/steps/types";

interface StepFinalizarProps extends StepProps {
  validCount: number;
}

export function StepFinalizar({ research, validCount, disabled, onChanged }: StepFinalizarProps) {
  const [finalizing, setFinalizing] = useState(false);

  const hasMinSamples = validCount >= MIN_SAMPLES_TO_FINALIZE;
  const hasStats = research.mean !== null;
  const hasJustification = !!research.justificationText && research.justificationText.length >= 10;
  const canFinalize = hasMinSamples && hasStats && hasJustification;

  async function finalizar() {
    setFinalizing(true);
    const result = await finalizeResearch(research.id);
    setFinalizing(false);
    if (result.success) {
      toast.success("Pesquisa finalizada — PDF gerado");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro ao finalizar");
    }
  }

  const isFinalized = research.status === "FINALIZED";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Finalizar pesquisa</CardTitle>
        <CardDescription>
          Ao finalizar, o sistema gera o PDF de memória de cálculo (Pesquisa de Preços) e marca a
          pesquisa como FINALIZED (não-editável). Novas versões requerem arquivar esta e criar
          outra.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-1.5 text-sm">
          <CheckItem
            ok={hasMinSamples}
            label={`${validCount} amostras válidas (mínimo ${MIN_SAMPLES_TO_FINALIZE} — Manual CNJ)`}
          />
          <CheckItem ok={hasStats} label="Estatísticas calculadas" />
          <CheckItem ok={hasJustification} label="Justificativa preenchida" />
        </ul>

        {isFinalized ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium text-emerald-700">
              <CheckCircle2 className="size-4" />
              Pesquisa finalizada
            </div>
            {research.generatedDocumentId ? (
              <div className="mt-2">
                <Link
                  href={`/contratos/${research.contractId}/documentos/${research.generatedDocumentId}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <Download className="mr-1.5 size-3.5" />
                  Abrir documento gerado
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex justify-end">
            <Button onClick={finalizar} disabled={disabled || finalizing || !canFinalize}>
              {finalizing ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <FileSignature className="mr-1.5 size-3.5" />
              )}
              Finalizar e gerar PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
