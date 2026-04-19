"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filterSamplesWithAI, toggleSampleExclusion } from "@/actions/pesquisa-precos";
import { formatCurrency, formatDate } from "@/lib/format";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";
import type { StepProps } from "@/components/pesquisa-precos/steps/types";

export function StepAmostras({ research, disabled, onChanged }: StepProps) {
  const [filterLoading, setFilterLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function filtrarIA() {
    setFilterLoading(true);
    const result = await filterSamplesWithAI(research.id);
    setFilterLoading(false);
    if (result.success && result.data) {
      toast.success(
        `IA excluiu ${result.data.excluded} amostra${result.data.excluded === 1 ? "" : "s"}`,
      );
      onChanged();
    } else {
      toast.error(result.error ?? "Erro no filtro");
    }
  }

  async function toggle(sampleId: string, currentExcluded: boolean) {
    setTogglingId(sampleId);
    const result = await toggleSampleExclusion({
      sampleId,
      excluded: !currentExcluded,
      reason: !currentExcluded ? "Exclusão manual pelo fiscal" : undefined,
    });
    setTogglingId(null);
    if (result.success) {
      toast.success(currentExcluded ? "Amostra reincluída" : "Amostra excluída");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro");
    }
  }

  const validCount = research.samples.filter((s) => !s.excluded).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Amostras ({validCount} válidas de {research.samples.length})
            </CardTitle>
            <CardDescription>
              Marque como excluídas as amostras não comparáveis. IA pode sugerir exclusões
              automaticamente.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={filtrarIA}
            disabled={disabled || filterLoading}
          >
            {filterLoading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 size-3.5" />
            )}
            Filtrar com IA
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Objeto</TableHead>
              <TableHead>Órgão</TableHead>
              <TableHead className="w-16">UF</TableHead>
              <TableHead className="w-28">Data</TableHead>
              <TableHead className="w-28 text-right">Valor</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-20 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {research.samples.map((s) => (
              <TableRow key={s.id} className={s.excluded ? "opacity-60" : undefined}>
                <TableCell className="max-w-md">
                  <div
                    className={"line-clamp-2 text-xs " + (s.excluded ? "line-through" : "")}
                    title={s.objetoResumo}
                  >
                    {s.objetoResumo}
                  </div>
                  {s.excluded && s.exclusionReason ? (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      Motivo: {s.exclusionReason}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-xs">{s.orgao ?? "—"}</TableCell>
                <TableCell className="text-xs">{s.uf ?? "—"}</TableCell>
                <TableCell className="text-xs">{formatDate(s.dataAssinatura)}</TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatCurrency(s.valorGlobal)}
                </TableCell>
                <TableCell>
                  {s.excluded ? (
                    <Badge variant="outline" className="text-[10px]">
                      Excluída{s.excludedByAI ? " · IA" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      Válida
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggle(s.id, s.excluded)}
                    disabled={disabled || togglingId === s.id}
                  >
                    {togglingId === s.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : s.excluded ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="size-3.5 text-destructive" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
