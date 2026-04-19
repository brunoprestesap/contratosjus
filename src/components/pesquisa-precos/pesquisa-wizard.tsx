"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  confirmCatalogoCode,
  computeAndPersistStatistics,
  filterSamplesWithAI,
  finalizeResearch,
  generateJustificativaAI,
  queryPrecosPraticados,
  suggestCodigoForResearch,
  toggleSampleExclusion,
  updateJustificationText,
} from "@/actions/pesquisa-precos";
import { formatCurrency, formatDate } from "@/lib/format";
import type { WireResearchDetail } from "@/lib/pesquisa-precos/mappers";
import {
  CheckCircle2,
  Download,
  FileSignature,
  Loader2,
  Search,
  Sparkles,
  XCircle,
} from "lucide-react";

type ResearchDetail = WireResearchDetail;

interface PesquisaWizardProps {
  research: ResearchDetail;
  canEdit: boolean;
}

export function PesquisaWizard({ research, canEdit }: PesquisaWizardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const codigo = research.itemType === "MATERIAL" ? research.catmatCode : research.catserCode;
  const hasCodigo = !!codigo;
  const hasSamples = research.samples.length > 0;
  const validSamples = research.samples.filter((s) => !s.excluded);
  const isFinalized = research.status === "FINALIZED";

  const [tab, setTab] = useState(() => {
    if (isFinalized) return "finalizar";
    if (!hasCodigo) return "codigo";
    if (!hasSamples) return "consulta";
    if (research.status === "PNCP_QUERIED") return "amostras";
    if (research.status === "AI_FILTERED" && !research.justificationText) return "justificativa";
    return "amostras";
  });

  function refresh() {
    startTransition(() => router.refresh());
  }

  const disabled = !canEdit || pending || isFinalized;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {research.contract.contractNumber} ·{" "}
                {research.itemType === "MATERIAL" ? "Material (CATMAT)" : "Serviço (CATSER)"}
              </CardTitle>
              <CardDescription className="max-w-2xl">{research.contract.object}</CardDescription>
            </div>
            <Badge variant={isFinalized ? "default" : "secondary"}>{research.status}</Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="codigo">1. Código</TabsTrigger>
          <TabsTrigger value="consulta" disabled={!hasCodigo}>
            2. Consulta
          </TabsTrigger>
          <TabsTrigger value="amostras" disabled={!hasSamples}>
            3. Amostras
          </TabsTrigger>
          <TabsTrigger value="justificativa" disabled={!hasSamples}>
            4. Justificativa
          </TabsTrigger>
          <TabsTrigger value="finalizar" disabled={!hasSamples}>
            5. Finalizar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="codigo">
          <StepCodigo research={research} disabled={disabled} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="consulta">
          <StepConsulta research={research} disabled={disabled} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="amostras">
          <StepAmostras research={research} disabled={disabled} onChanged={refresh} />
        </TabsContent>
        <TabsContent value="justificativa">
          <StepJustificativa
            research={research}
            validCount={validSamples.length}
            disabled={disabled}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="finalizar">
          <StepFinalizar
            research={research}
            validCount={validSamples.length}
            disabled={!canEdit || pending}
            onChanged={refresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Step 1: Código ──────────────────────────────────────────────

function StepCodigo({
  research,
  disabled,
  onChanged,
}: {
  research: ResearchDetail;
  disabled: boolean;
  onChanged: () => void;
}) {
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [manualCode, setManualCode] = useState(
    (research.itemType === "MATERIAL" ? research.catmatCode : research.catserCode) ?? "",
  );
  const [lastSuggestion, setLastSuggestion] = useState<{
    codigo: number;
    descricao: string;
    confidence: string;
  } | null>(null);

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

// ── Step 2: Consulta ────────────────────────────────────────────

function StepConsulta({
  research,
  disabled,
  onChanged,
}: {
  research: ResearchDetail;
  disabled: boolean;
  onChanged: () => void;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const [dataInicio, setDataInicio] = useState(umAnoAtras.toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(hoje);
  const [estado, setEstado] = useState("");
  const [poder, setPoder] = useState("");
  const [esfera, setEsfera] = useState("");
  const [loading, setLoading] = useState(false);

  async function consultar() {
    setLoading(true);
    const result = await queryPrecosPraticados({
      researchId: research.id,
      dataCompraInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataCompraFim: dataFim ? new Date(dataFim) : undefined,
      estado: estado.length === 2 ? estado.toUpperCase() : undefined,
      poder:
        poder === "Executivo" || poder === "Legislativo" || poder === "Judiciario"
          ? poder
          : undefined,
      esfera:
        esfera === "Federal" ||
        esfera === "Estadual" ||
        esfera === "Municipal" ||
        esfera === "Distrital"
          ? esfera
          : undefined,
    });
    setLoading(false);
    if (result.success && result.data) {
      toast.success(`${result.data.inserted} amostras inseridas`);
      onChanged();
    } else {
      toast.error(result.error ?? "Erro na consulta");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Consultar preços praticados</CardTitle>
        <CardDescription>
          Fonte: API Dados Abertos compras.gov.br · módulo pesquisa-preco ·{" "}
          {research.itemType === "MATERIAL" ? "/1_consultarMaterial" : "/3_consultarServico"}.
          Consulta substitui amostras anteriores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inicio">Data inicial</Label>
            <Input
              id="inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              disabled={disabled || loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fim">Data final</Label>
            <Input
              id="fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              disabled={disabled || loading}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="uf">UF (opcional)</Label>
            <Input
              id="uf"
              maxLength={2}
              placeholder="Ex: AP"
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase())}
              disabled={disabled || loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="poder">Poder (opcional)</Label>
            <Select
              value={poder}
              onValueChange={(v) => setPoder(v ?? "")}
              disabled={disabled || loading}
            >
              <SelectTrigger id="poder">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Executivo">Executivo</SelectItem>
                <SelectItem value="Legislativo">Legislativo</SelectItem>
                <SelectItem value="Judiciario">Judiciário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="esfera">Esfera (opcional)</Label>
            <Select
              value={esfera}
              onValueChange={(v) => setEsfera(v ?? "")}
              disabled={disabled || loading}
            >
              <SelectTrigger id="esfera">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Federal">Federal</SelectItem>
                <SelectItem value="Estadual">Estadual</SelectItem>
                <SelectItem value="Municipal">Municipal</SelectItem>
                <SelectItem value="Distrital">Distrital</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={consultar} disabled={disabled || loading}>
            {loading ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Search className="mr-1.5 size-3.5" />
            )}
            Consultar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Step 3: Amostras ────────────────────────────────────────────

function StepAmostras({
  research,
  disabled,
  onChanged,
}: {
  research: ResearchDetail;
  disabled: boolean;
  onChanged: () => void;
}) {
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

// ── Step 4: Justificativa ────────────────────────────────────────

function StepJustificativa({
  research,
  validCount,
  disabled,
  onChanged,
}: {
  research: ResearchDetail;
  validCount: number;
  disabled: boolean;
  onChanged: () => void;
}) {
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

// ── Step 5: Finalizar ────────────────────────────────────────────

function StepFinalizar({
  research,
  validCount,
  disabled,
  onChanged,
}: {
  research: ResearchDetail;
  validCount: number;
  disabled: boolean;
  onChanged: () => void;
}) {
  const [finalizing, setFinalizing] = useState(false);

  const canFinalize =
    validCount >= 3 &&
    !!research.justificationText &&
    research.justificationText.length >= 10 &&
    research.mean !== null;

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
          <Check
            ok={validCount >= 3}
            label={`${validCount} amostras válidas (mínimo 3 — Manual CNJ)`}
          />
          <Check ok={research.mean !== null} label="Estatísticas calculadas" />
          <Check
            ok={!!research.justificationText && research.justificationText.length >= 10}
            label="Justificativa preenchida"
          />
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

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <CheckCircle2 className="size-4 text-emerald-600" />
      ) : (
        <XCircle className="size-4 text-muted-foreground" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}
