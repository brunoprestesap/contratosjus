"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
import {
  computeAndPersistItemStatistics,
  deleteManualSample,
  filterSamplesWithAI,
  toggleSampleExclusion,
} from "@/actions/pesquisa-precos";
import { formatCurrency, formatDate } from "@/lib/format";
import { CheckCircle2, Calculator, Loader2, Plus, Sparkles, Trash2, XCircle } from "lucide-react";
import type { WireResearchItem } from "@/lib/pesquisa-precos/mappers";

// Dialog pesado (RHF + zodResolver + 9 inputs) só entra no bundle quando
// o fiscal abre o modal — raríssimo em relação à listagem de amostras.
const ManualSampleDialog = dynamic(
  () =>
    import("@/components/pesquisa-precos/manual-sample-dialog").then((m) => ({
      default: m.ManualSampleDialog,
    })),
  { ssr: false },
);

const SOURCE_SHORT: Record<string, string> = {
  PAINEL_PRECOS: "Painel",
  CONTRATO_PUBLICO: "Contrato",
  MIDIA: "Mídia",
  COTACAO_DIRETA: "Cotação",
  SINAPI: "SINAPI",
  CATALOGO_TIC: "Cat. TIC",
  OUTRO: "Outro",
};

interface Props {
  researchId: string;
  item: WireResearchItem;
  disabled: boolean;
  onChanged: () => void;
  /**
   * Flag do transition do wizard: quando true, um router.refresh está em
   * curso. Usamos para mostrar skeleton em vez de "Sem amostras" no gap
   * entre auto-avanço da tab e chegada dos novos dados do RSC.
   */
  refreshing?: boolean;
}

function regimeLabel(regime: "LEI_14133_2021" | "LEI_8666_1993" | null): string | null {
  if (regime === "LEI_14133_2021") return "L. 14.133";
  if (regime === "LEI_8666_1993") return "L. 8.666";
  return null;
}

export function StepAmostrasItem({ researchId, item, disabled, onChanged, refreshing }: Props) {
  const [filterLoading, setFilterLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  // Uma vez aberto, mantemos o modal montado para evitar reabrir o chunk.
  // Antes da primeira abertura, o componente nem chega a ser renderizado —
  // o chunk permanece fora do bundle inicial.
  const [manualEverOpened, setManualEverOpened] = useState(false);

  function openManual() {
    setManualEverOpened(true);
    setManualOpen(true);
  }

  async function removerManual(sampleId: string) {
    setDeletingId(sampleId);
    const result = await deleteManualSample({ sampleId });
    setDeletingId(null);
    if (result.success) {
      toast.success("Amostra removida");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro ao remover");
    }
  }

  async function filtrarIA() {
    setFilterLoading(true);
    // filterSamplesWithAI opera no nível da pesquisa e já itera por item.
    const result = await filterSamplesWithAI(researchId);
    setFilterLoading(false);
    if (result.success && result.data) {
      toast.success(`IA excluiu ${result.data.excluded} amostra(s) no total`);
      onChanged();
    } else {
      toast.error(result.error ?? "Erro no filtro");
    }
  }

  async function calcularStats() {
    setStatsLoading(true);
    const result = await computeAndPersistItemStatistics(item.id);
    setStatsLoading(false);
    if (result.success) {
      toast.success("Estatísticas atualizadas");
      onChanged();
    } else {
      toast.error(result.error ?? "Erro ao calcular estatísticas");
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

  const validCount = item.samples.filter((s) => !s.excluded).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              Amostras do item #{item.contractItem.itemNumber} ({validCount} válidas de{" "}
              {item.samples.length})
            </CardTitle>
            <CardDescription className="line-clamp-1">
              {item.contractItem.description}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openManual} disabled={disabled}>
              <Plus className="mr-1.5 size-3.5" />
              Adicionar amostra
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={calcularStats}
              disabled={disabled || statsLoading || item.samples.length === 0}
            >
              {statsLoading ? (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              ) : (
                <Calculator className="mr-1.5 size-3.5" />
              )}
              Recalcular
            </Button>
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
        </div>
      </CardHeader>
      {manualEverOpened && (
        <ManualSampleDialog
          researchItemId={item.id}
          open={manualOpen}
          onOpenChange={setManualOpen}
          onCreated={onChanged}
        />
      )}
      <CardContent className="p-0">
        {item.samples.length === 0 ? (
          refreshing ? (
            <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando amostras…
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Sem amostras. Rode a consulta no step anterior.
            </div>
          )
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Objeto</TableHead>
                <TableHead className="w-20">Fonte</TableHead>
                <TableHead>Órgão/Fornec.</TableHead>
                <TableHead className="w-16">UF</TableHead>
                <TableHead className="w-20">Regime</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead className="w-28 text-right">Valor</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24 text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {item.samples.map((s) => (
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
                  <TableCell>
                    <Badge
                      variant={s.createdManually ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {SOURCE_SHORT[s.source] ?? s.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{s.supplierName ?? s.orgao ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.uf ?? "—"}</TableCell>
                  <TableCell>
                    {regimeLabel(s.legalRegimeInferred) ? (
                      <Badge variant="outline" className="text-[10px]">
                        {regimeLabel(s.legalRegimeInferred)}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
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
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggle(s.id, s.excluded)}
                        disabled={disabled || togglingId === s.id}
                        title={s.excluded ? "Reincluir" : "Excluir"}
                      >
                        {togglingId === s.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : s.excluded ? (
                          <CheckCircle2 className="size-3.5 text-emerald-600" />
                        ) : (
                          <XCircle className="size-3.5 text-destructive" />
                        )}
                      </Button>
                      {s.createdManually && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removerManual(s.id)}
                          disabled={disabled || deletingId === s.id}
                          title="Remover amostra manual"
                        >
                          {deletingId === s.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
