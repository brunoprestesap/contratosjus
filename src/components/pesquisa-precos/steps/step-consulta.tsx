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
import { queryPrecosPraticados } from "@/actions/pesquisa-precos";
import { Loader2, Search } from "lucide-react";
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

export function StepConsulta({ research, disabled, onChanged }: StepProps) {
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
      poder: isPoder(poder) ? poder : undefined,
      esfera: isEsfera(esfera) ? esfera : undefined,
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
