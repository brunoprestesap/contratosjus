"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SectionAiField } from "@/components/documentos/section-ai-field";
import { generateDocument } from "@/actions/documentos";
import { FileText, Loader2, Paperclip } from "lucide-react";

const TEMPLATE_ID = "prorrogacao.solicitacao-parecer";

interface AnexoInfo {
  title: string;
  version: number;
}

interface GerarSolicitacaoParecerFormProps {
  contractId: string;
  contractNumber: string;
  supplier: string;
  anexos: AnexoInfo[];
}

export function GerarSolicitacaoParecerForm({
  contractId,
  contractNumber,
  supplier,
  anexos,
}: GerarSolicitacaoParecerFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [destinatario, setDestinatario] = useState(
    "Assessoria Jurídica da Justiça Federal do Amapá",
  );
  const [quesitos, setQuesitos] = useState("");
  const [resumoFato, setResumoFato] = useState("");
  const [fundamentacao, setFundamentacao] = useState("");

  async function handleSubmit() {
    if (!destinatario.trim()) {
      toast.error("Informe o destinatário");
      return;
    }
    if (!resumoFato.trim() || !fundamentacao.trim()) {
      toast.error("Preencha 'Resumo Fático' e 'Fundamentação Preliminar' antes de gerar");
      return;
    }

    setSubmitting(true);
    const manualFields: Record<string, string> = {
      destinatario: destinatario.trim(),
    };
    if (quesitos.trim()) manualFields.quesitos = quesitos.trim();

    const result = await generateDocument({
      templateId: TEMPLATE_ID,
      contractId,
      manualFields,
      aiFields: {
        resumoFato: resumoFato.trim(),
        fundamentacao: fundamentacao.trim(),
      },
    });
    setSubmitting(false);

    if (result.success && result.data) {
      toast.success("Solicitação gerada com sucesso");
      startTransition(() => {
        router.push(`/contratos/${contractId}/documentos/${result.data!.documentId}`);
      });
    } else {
      toast.error(result.error ?? "Erro ao gerar solicitação");
    }
  }

  const loading = submitting || pending;
  const hint = `Contrato nº ${contractNumber}, contratado ${supplier}. Solicitação de parecer jurídico para prorrogação.`;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="destinatario">Destinatário</Label>
        <Input
          id="destinatario"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="rounded-md border bg-muted/30 p-3 text-xs">
        <div className="mb-1.5 flex items-center gap-1.5 font-medium text-muted-foreground">
          <Paperclip className="size-3" />
          Anexos que serão referenciados automaticamente
        </div>
        {anexos.length === 0 ? (
          <div className="text-muted-foreground">
            Nenhum documento de Prorrogação foi gerado ainda para este contrato. Considere gerar
            primeiro a pesquisa de preços, justificativa e minuta do aditivo.
          </div>
        ) : (
          <ul className="ml-4 list-disc space-y-0.5">
            {anexos.map((a, i) => (
              <li key={i}>
                {a.title} <span className="text-muted-foreground">v{a.version}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SectionAiField
        templateId={TEMPLATE_ID}
        contractId={contractId}
        sectionId="resumoFato"
        label="Resumo fático"
        placeholder="Contextualize a situação atual do contrato e o motivo da solicitação do parecer."
        value={resumoFato}
        onChange={setResumoFato}
        disabled={loading}
        hint={hint}
      />

      <SectionAiField
        templateId={TEMPLATE_ID}
        contractId={contractId}
        sectionId="fundamentacao"
        label="Fundamentação preliminar"
        placeholder="Indique a base legal e operacional que sustenta a prorrogação."
        value={fundamentacao}
        onChange={setFundamentacao}
        disabled={loading}
        hint={hint}
      />

      <div className="space-y-1.5">
        <Label htmlFor="quesitos">
          Quesitos ao parecerista (opcional — em branco usa os 4 quesitos default)
        </Label>
        <Textarea
          id="quesitos"
          placeholder={
            "1. Há óbice jurídico à prorrogação?\n2. A minuta de termo aditivo observa as exigências formais?\n..."
          }
          rows={5}
          value={quesitos}
          onChange={(e) => setQuesitos(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileText className="mr-1.5 size-3.5" />
          )}
          Gerar Solicitação
        </Button>
      </div>
    </div>
  );
}
