"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  FileDown,
  Loader2,
  FileText,
  CalendarRange,
  ListChecks,
} from "lucide-react";

interface Contract {
  id: string;
  contractNumber: string;
  supplier: string;
}

interface RelatoriosClientProps {
  contracts: Contract[];
}

export function RelatoriosClient({ contracts }: RelatoriosClientProps) {
  const [extratoContractId, setExtratoContractId] = useState("");
  const [extratoLoading, setExtratoLoading] = useState(false);

  const [desembolsoStartDate, setDesembolsoStartDate] = useState("");
  const [desembolsoEndDate, setDesembolsoEndDate] = useState("");
  const [desembolsoLoading, setDesembolsoLoading] = useState(false);

  const [vigentesDate, setVigentesDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [vigentesLoading, setVigentesLoading] = useState(false);

  async function downloadPdf(url: string, setLoading: (v: boolean) => void) {
    setLoading(true);
    let blobUrl: string | null = null;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error ?? "Erro ao gerar relatório");
      }

      const blob = await response.blob();
      blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;

      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      link.download = filenameMatch?.[1] ?? "relatorio.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Relatório gerado com sucesso");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao gerar relatório"
      );
    } finally {
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
      setLoading(false);
    }
  }

  function handleExtrato() {
    if (!extratoContractId) {
      toast.error("Selecione um contrato");
      return;
    }
    downloadPdf(
      `/api/relatorios/extrato/${extratoContractId}`,
      setExtratoLoading
    );
  }

  function handleDesembolso() {
    if (!desembolsoStartDate || !desembolsoEndDate) {
      toast.error("Informe as datas de início e fim");
      return;
    }
    if (desembolsoStartDate > desembolsoEndDate) {
      toast.error("Data de início deve ser anterior à data de fim");
      return;
    }
    downloadPdf(
      `/api/relatorios/desembolso?startDate=${desembolsoStartDate}&endDate=${desembolsoEndDate}`,
      setDesembolsoLoading
    );
  }

  function handleVigentes() {
    if (!vigentesDate) {
      toast.error("Informe a data de referência");
      return;
    }
    downloadPdf(
      `/api/relatorios/vigentes?referenceDate=${vigentesDate}`,
      setVigentesLoading
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Extrato Completo */}
      <Card className="flex flex-col">
        <CardHeader className="flex-1">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Extrato Completo
              </CardTitle>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Todos os dados de um contrato: identificação, vigência,
                financeiro, empenhos, pagamentos e aditivos.
              </p>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Contrato</Label>
            <Select
              value={extratoContractId}
              onValueChange={(val) => setExtratoContractId(val ?? "")}
              items={contracts.map((c) => ({
                value: c.id,
                label: `${c.contractNumber} — ${c.supplier}`,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um contrato..." />
              </SelectTrigger>
              <SelectContent>
                {contracts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.contractNumber} — {c.supplier}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleExtrato}
            disabled={extratoLoading || !extratoContractId}
            className="w-full"
          >
            {extratoLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 size-4" />
            )}
            Gerar PDF
          </Button>
        </CardContent>
      </Card>

      {/* Card 2: Desembolso por Período */}
      <Card className="flex flex-col">
        <CardHeader className="flex-1">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <CalendarRange className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Desembolso por Período
              </CardTitle>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Pagamentos efetuados em um intervalo de datas, com total
                desembolsado no período.
              </p>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="desembolso-inicio">Início</Label>
              <Input
                id="desembolso-inicio"
                type="date"
                value={desembolsoStartDate}
                onChange={(e) => setDesembolsoStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desembolso-fim">Fim</Label>
              <Input
                id="desembolso-fim"
                type="date"
                value={desembolsoEndDate}
                onChange={(e) => setDesembolsoEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleDesembolso}
            disabled={
              desembolsoLoading || !desembolsoStartDate || !desembolsoEndDate
            }
            className="w-full"
          >
            {desembolsoLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 size-4" />
            )}
            Gerar PDF
          </Button>
        </CardContent>
      </Card>

      {/* Card 3: Contratos Vigentes */}
      <Card className="flex flex-col sm:col-span-2 lg:col-span-1">
        <CardHeader className="flex-1">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <ListChecks className="size-5 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base font-semibold">
                Contratos Vigentes
              </CardTitle>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Contratos ativos com saldos atualizados, ordenados por consumo
                (mais urgentes primeiro).
              </p>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="vigentes-data">Data de Referência</Label>
            <Input
              id="vigentes-data"
              type="date"
              value={vigentesDate}
              onChange={(e) => setVigentesDate(e.target.value)}
            />
          </div>

          <Button
            onClick={handleVigentes}
            disabled={vigentesLoading || !vigentesDate}
            className="w-full"
          >
            {vigentesLoading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 size-4" />
            )}
            Gerar PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
