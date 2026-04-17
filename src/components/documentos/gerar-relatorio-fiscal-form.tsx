"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionAiField } from "@/components/documentos/section-ai-field";
import { generateDocument } from "@/actions/documentos";
import { FileText, Loader2 } from "lucide-react";

const TEMPLATE_ID = "fiscalizacao.relatorio-fiscal";

function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
function defaultEnd(): string {
  return new Date().toISOString().slice(0, 10);
}

interface GerarRelatorioFiscalFormProps {
  contractId: string;
  contractNumber: string;
}

export function GerarRelatorioFiscalForm({
  contractId,
  contractNumber,
}: GerarRelatorioFiscalFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [periodoInicio, setPeriodoInicio] = useState(defaultStart());
  const [periodoFim, setPeriodoFim] = useState(defaultEnd());
  const [conclusao, setConclusao] = useState("");

  async function handleSubmit() {
    if (!periodoInicio || !periodoFim) {
      toast.error("Informe período completo");
      return;
    }
    if (new Date(periodoFim) < new Date(periodoInicio)) {
      toast.error("Período final deve ser maior ou igual ao inicial");
      return;
    }
    if (!conclusao.trim()) {
      toast.error(
        "Preencha a 'Conclusão do Fiscal' — ou use 'Sugerir com IA'"
      );
      return;
    }

    setSubmitting(true);
    const result = await generateDocument({
      templateId: TEMPLATE_ID,
      contractId,
      manualFields: { periodoInicio, periodoFim },
      aiFields: { conclusao: conclusao.trim() },
    });
    setSubmitting(false);

    if (result.success && result.data) {
      toast.success("Relatório gerado com sucesso");
      startTransition(() => {
        router.push(
          `/contratos/${contractId}/documentos/${result.data!.documentId}`
        );
      });
    } else {
      toast.error(result.error ?? "Erro ao gerar relatório");
    }
  }

  const loading = submitting || pending;
  const hint = `Contrato nº ${contractNumber}, período de ${periodoInicio} a ${periodoFim}.`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="periodoInicio">Período inicial</Label>
          <Input
            id="periodoInicio"
            type="date"
            value={periodoInicio}
            onChange={(e) => setPeriodoInicio(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="periodoFim">Período final</Label>
          <Input
            id="periodoFim"
            type="date"
            value={periodoFim}
            onChange={(e) => setPeriodoFim(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <SectionAiField
        templateId={TEMPLATE_ID}
        contractId={contractId}
        sectionId="conclusao"
        label="Conclusão do Fiscal"
        placeholder="Observações sobre execução, qualidade, pontualidade, ocorrências e recomendações para o período."
        value={conclusao}
        onChange={setConclusao}
        disabled={loading}
        rows={7}
        hint={hint}
      />

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileText className="mr-1.5 size-3.5" />
          )}
          Gerar Relatório
        </Button>
      </div>
    </div>
  );
}
