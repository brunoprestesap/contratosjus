"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SectionAiField } from "@/components/documentos/section-ai-field";
import { generateDocument } from "@/actions/documentos";
import { FileText, Loader2 } from "lucide-react";

const TEMPLATE_ID = "fiscalizacao.registro-ocorrencia";

const SEV_CLASS: Record<string, string> = {
  LEVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  MEDIA: "bg-amber-100 text-amber-800 border-amber-200",
  GRAVE: "bg-red-100 text-red-800 border-red-200",
};

const TIPO_LABEL: Record<string, string> = {
  ATRASO: "Atraso",
  DESCUMPRIMENTO: "Descumprimento",
  QUALIDADE: "Qualidade",
  SEGURANCA: "Segurança",
  OUTRO: "Outro",
};

interface OcorrenciaOption {
  id: string;
  occurredAtIso: string;
  type: string;
  severity: string;
  description: string;
  reportedByName: string;
  hasRegistroDoc: boolean;
}

interface GerarRegistroOcorrenciaFormProps {
  contractId: string;
  preselectedId?: string;
  ocorrencias: OcorrenciaOption[];
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function GerarRegistroOcorrenciaForm({
  contractId,
  preselectedId,
  ocorrencias,
}: GerarRegistroOcorrenciaFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(
    preselectedId && ocorrencias.some((o) => o.id === preselectedId)
      ? preselectedId
      : ocorrencias.find((o) => !o.hasRegistroDoc)?.id ?? ocorrencias[0]?.id ?? null
  );
  const [providencias, setProvidencias] = useState("");

  const selected = ocorrencias.find((o) => o.id === selectedId) ?? null;

  async function handleSubmit() {
    if (!selectedId) {
      toast.error("Selecione uma ocorrência");
      return;
    }
    setSubmitting(true);
    const aiFields: Record<string, string> | undefined =
      providencias.trim().length >= 10
        ? { providencias: providencias.trim() }
        : undefined;
    const result = await generateDocument({
      templateId: TEMPLATE_ID,
      contractId,
      fiscalOccurrenceId: selectedId,
      aiFields,
    });
    setSubmitting(false);
    if (result.success && result.data) {
      toast.success("Registro gerado com sucesso");
      startTransition(() => {
        router.push(
          `/contratos/${contractId}/documentos/${result.data!.documentId}`
        );
      });
    } else {
      toast.error(result.error ?? "Erro ao gerar registro");
    }
  }

  const loading = submitting || pending;
  const hint = selected
    ? `Ocorrência do tipo ${selected.type} (severidade ${selected.severity}) ocorrida em ${fmtDate(selected.occurredAtIso)}: ${selected.description.slice(0, 200)}`
    : undefined;

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedId ?? undefined}
        onValueChange={(v) => setSelectedId(v)}
        className="space-y-2"
      >
        {ocorrencias.map((o) => (
          <Label
            key={o.id}
            htmlFor={o.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50 has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem
              id={o.id}
              value={o.id}
              className="mt-0.5"
              disabled={loading}
            />
            <div className="grid flex-1 gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{fmtDate(o.occurredAtIso)}</span>
                <Badge variant="outline" className="text-[10px]">
                  {TIPO_LABEL[o.type] ?? o.type}
                </Badge>
                <span
                  className={
                    "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium " +
                    (SEV_CLASS[o.severity] ?? "")
                  }
                >
                  {o.severity}
                </span>
                <span className="text-xs text-muted-foreground">
                  · por {o.reportedByName}
                </span>
                {o.hasRegistroDoc ? (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    já tem registro
                  </Badge>
                ) : null}
              </div>
              <div className="line-clamp-2 text-xs text-muted-foreground">
                {o.description}
              </div>
            </div>
          </Label>
        ))}
      </RadioGroup>

      <SectionAiField
        templateId={TEMPLATE_ID}
        contractId={contractId}
        sectionId="providencias"
        label="Providências sugeridas (opcional)"
        placeholder="Deixe em branco para uma nota genérica no PDF, ou escreva as providências específicas a serem adotadas (notificar contratado, reunir partes, aplicar sanção, retenção etc)."
        value={providencias}
        onChange={setProvidencias}
        disabled={loading || !selectedId}
        rows={5}
        hint={hint}
      />

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !selectedId}
        >
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileText className="mr-1.5 size-3.5" />
          )}
          Gerar Registro
        </Button>
      </div>
    </div>
  );
}
