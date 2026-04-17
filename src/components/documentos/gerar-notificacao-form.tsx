"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionAiField } from "@/components/documentos/section-ai-field";
import { generateDocument } from "@/actions/documentos";
import { FileSignature, Loader2 } from "lucide-react";

const TEMPLATE_ID = "fiscalizacao.notificacao";

type Tipo = "ATRASO" | "DESCUMPRIMENTO" | "ORIENTACAO";

interface GerarNotificacaoFormProps {
  contractId: string;
  contractNumber: string;
  supplier: string;
}

export function GerarNotificacaoForm({
  contractId,
  contractNumber,
  supplier,
}: GerarNotificacaoFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [tipo, setTipo] = useState<Tipo>("ATRASO");
  const [prazoDias, setPrazoDias] = useState("5");
  const [prazoBase, setPrazoBase] = useState<"úteis" | "corridos">("úteis");
  const [fato, setFato] = useState("");
  const [fundamentacao, setFundamentacao] = useState("");

  async function handleSubmit() {
    const prazoNum = parseInt(prazoDias, 10);
    if (!Number.isFinite(prazoNum) || prazoNum <= 0) {
      toast.error("Prazo em dias deve ser um número positivo");
      return;
    }
    if (!fato.trim() || !fundamentacao.trim()) {
      toast.error("Preencha 'Fato apurado' e 'Fundamentação' antes de gerar");
      return;
    }

    setSubmitting(true);
    const result = await generateDocument({
      templateId: TEMPLATE_ID,
      contractId,
      manualFields: {
        tipo,
        prazoDias: String(prazoNum),
        prazoBase,
      },
      aiFields: {
        fato: fato.trim(),
        fundamentacao: fundamentacao.trim(),
      },
    });
    setSubmitting(false);

    if (result.success && result.data) {
      toast.success("Notificação gerada com sucesso");
      startTransition(() => {
        router.push(
          `/contratos/${contractId}/documentos/${result.data!.documentId}`
        );
      });
    } else {
      toast.error(result.error ?? "Erro ao gerar notificação");
    }
  }

  const loading = submitting || pending;
  const hintContext = `Contrato nº ${contractNumber}, contratado ${supplier}. Notificação do tipo ${tipo.toLowerCase()}.`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tipo">Tipo de notificação</Label>
          <Select
            value={tipo}
            onValueChange={(v) => setTipo(v as Tipo)}
            disabled={loading}
          >
            <SelectTrigger id="tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ATRASO">Atraso na execução</SelectItem>
              <SelectItem value="DESCUMPRIMENTO">
                Descumprimento contratual
              </SelectItem>
              <SelectItem value="ORIENTACAO">Orientação / advertência</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="prazoDias">Prazo</Label>
            <Input
              id="prazoDias"
              type="number"
              min={1}
              value={prazoDias}
              onChange={(e) => setPrazoDias(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prazoBase">Base</Label>
            <Select
              value={prazoBase}
              onValueChange={(v) => setPrazoBase(v as "úteis" | "corridos")}
              disabled={loading}
            >
              <SelectTrigger id="prazoBase" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="úteis">dias úteis</SelectItem>
                <SelectItem value="corridos">dias corridos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <SectionAiField
        templateId={TEMPLATE_ID}
        contractId={contractId}
        sectionId="fato"
        label="Fato apurado"
        placeholder="Descreva objetivamente o fato que motiva a notificação, com datas e evidências."
        value={fato}
        onChange={setFato}
        disabled={loading}
        hint={hintContext}
      />

      <SectionAiField
        templateId={TEMPLATE_ID}
        contractId={contractId}
        sectionId="fundamentacao"
        label="Fundamentação contratual/legal"
        placeholder="Cite a cláusula contratual violada ou o dispositivo legal aplicável."
        value={fundamentacao}
        onChange={setFundamentacao}
        disabled={loading}
        hint={hintContext}
      />

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileSignature className="mr-1.5 size-3.5" />
          )}
          Gerar Notificação
        </Button>
      </div>
    </div>
  );
}
