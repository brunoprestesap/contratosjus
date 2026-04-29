"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryPrecosPraticados, setLegalRegimeFilter } from "@/actions/pesquisa-precos";
import { Loader2, Search, Scale } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { StepProps } from "@/components/pesquisa-precos/steps/types";

const PODERES = ["Executivo", "Legislativo", "Judiciario"] as const;
const ESFERAS = ["Federal", "Estadual", "Municipal", "Distrital"] as const;

type Poder = (typeof PODERES)[number];
type Esfera = (typeof ESFERAS)[number];

function isPoder(v: string): v is Poder {
  return (PODERES as readonly string[]).includes(v);
}
function isEsfera(v: string): v is Esfera {
  return (ESFERAS as readonly string[]).includes(v);
}

function computeJanelaAlerta(dataInicio: string): string | null {
  if (!dataInicio) return null;
  const inicioTs = new Date(dataInicio).getTime();
  if (Number.isNaN(inicioTs)) return null;
  const diff = Date.now() - inicioTs;
  const seisMeses = 6 * 30 * 24 * 60 * 60 * 1000;
  const dozeMeses = 12 * 30 * 24 * 60 * 60 * 1000;
  if (diff > dozeMeses) return "> 12 meses";
  if (diff > seisMeses) return "> 6 meses";
  return null;
}

interface StepConsultaProps extends StepProps {
  /** Chamado após query bem-sucedida com o total de amostras inseridas. */
  onQueryCompleted?: (insertedCount: number) => void;
}

export function StepConsulta({
  research,
  disabled,
  onChanged,
  onQueryCompleted,
}: StepConsultaProps) {
  const hoje = new Date().toISOString().slice(0, 10);
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const [dataInicio, setDataInicio] = useState(umAnoAtras.toISOString().slice(0, 10));
  const [dataFim, setDataFim] = useState(hoje);
  const [estado, setEstado] = useState("");
  const [poder, setPoder] = useState("");
  const [esfera, setEsfera] = useState("");
  const [loading, setLoading] = useState(false);
  const [legalFilterOn, setLegalFilterOn] = useState(research.legalRegimeFilterOn);
  const [togglingFilter, setTogglingFilter] = useState(false);

  const regimeLabel =
    research.legalRegimeSnapshot === "LEI_14133_2021"
      ? "Lei 14.133/2021"
      : research.legalRegimeSnapshot === "LEI_8666_1993"
        ? "Lei 8.666/1993"
        : null;

  async function toggleLegalFilter(next: boolean) {
    setTogglingFilter(true);
    setLegalFilterOn(next);
    const result = await setLegalRegimeFilter({ researchId: research.id, enabled: next });
    setTogglingFilter(false);
    if (result.success && result.data) {
      if (next) {
        toast.success(
          result.data.excluded > 0
            ? `${result.data.excluded} amostras excluídas (regime incompatível)`
            : "Filtro ativado",
        );
      } else {
        toast.info(
          result.data.restored > 0
            ? `${result.data.restored} amostras restauradas`
            : "Filtro desativado",
        );
      }
      onChanged();
    } else {
      setLegalFilterOn(!next);
      toast.error(result.error ?? "Erro ao alterar filtro");
    }
  }

  // janelaAlerta é derivado no onChange da data (não no render) — regras
  // Manual CNJ / IN SEGES 65: mídia/pesquisa direta até 6 meses, contratações
  // similares até 12 meses. Alerta informativo; não bloqueia.
  const [janelaAlerta, setJanelaAlerta] = useState<string | null>(() =>
    computeJanelaAlerta(umAnoAtras.toISOString().slice(0, 10)),
  );

  function handleDataInicioChange(next: string) {
    setDataInicio(next);
    setJanelaAlerta(computeJanelaAlerta(next));
  }

  async function consultar() {
    setLoading(true);
    const result = await queryPrecosPraticados({
      researchId: research.id,
      dataCompraInicio: dataInicio ? new Date(dataInicio) : undefined,
      dataCompraFim: dataFim ? new Date(dataFim) : undefined,
      estado: estado.length === 2 ? estado.toUpperCase() : undefined,
      poder: isPoder(poder) ? poder : undefined,
      esfera: isEsfera(esfera) ? esfera : undefined,
    });
    setLoading(false);
    if (result.success && result.data) {
      toast.success(`${result.data.inserted} amostras inseridas`);
      if (onQueryCompleted) {
        onQueryCompleted(result.data.inserted);
      } else {
        onChanged();
      }
    } else {
      toast.error(result.error ?? "Erro na consulta");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Consultar preços praticados</CardTitle>
        <CardDescription>
          Fonte: API Dados Abertos compras.gov.br · módulo pesquisa-preco
          {research.mode === "PER_ITEM"
            ? " · consulta por item (itera CATMAT/CATSER de cada item). Substitui amostras anteriores."
            : research.itemType === "MATERIAL"
              ? " · /1_consultarMaterial. Consulta substitui amostras anteriores."
              : " · /3_consultarServico. Consulta substitui amostras anteriores."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {research.mode === "PER_ITEM" && regimeLabel ? (
          <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
            <Scale className="mt-0.5 size-4 text-muted-foreground" />
            <div className="flex-1 text-xs">
              <div className="font-medium">Filtro automático por base legal</div>
              <div className="mt-0.5 text-muted-foreground">
                Contrato regido pela {regimeLabel}. Amostras de modalidades incompatíveis são
                excluídas após a consulta.
              </div>
            </div>
            <Switch
              checked={legalFilterOn}
              onCheckedChange={toggleLegalFilter}
              disabled={disabled || togglingFilter}
              aria-label="Filtro de base legal"
            />
          </div>
        ) : null}
        {janelaAlerta ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
            <strong>Atenção:</strong> data inicial ultrapassa {janelaAlerta}. O Manual CNJ / IN
            SEGES 65 recomenda janela de 6 meses (mídia/pesquisa direta) ou 12 meses (contratações
            similares da Administração). Justifique nos autos se necessário.
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="inicio">Data inicial</Label>
            <Input
              id="inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => handleDataInicioChange(e.target.value)}
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
