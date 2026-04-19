"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { createOccurrence, updateOccurrence } from "@/actions/ocorrencias";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

type Tipo = "ATRASO" | "DESCUMPRIMENTO" | "QUALIDADE" | "SEGURANCA" | "OUTRO";
type Sev = "LEVE" | "MEDIA" | "GRAVE";

interface EvidenceItem {
  descricao: string;
  referencia?: string;
}

interface OcorrenciaFormPropsCommon {
  contractId: string;
}
interface CreateMode extends OcorrenciaFormPropsCommon {
  mode: "create";
}
interface EditMode extends OcorrenciaFormPropsCommon {
  mode: "edit";
  initial: {
    id: string;
    occurredAtIso: string;
    type: Tipo;
    severity: Sev;
    description: string;
    evidences: EvidenceItem[];
  };
}

type OcorrenciaFormProps = CreateMode | EditMode;

export function OcorrenciaForm(props: OcorrenciaFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initial : null;

  const [occurredAt, setOccurredAt] = useState(
    initial ? initial.occurredAtIso.slice(0, 10) : new Date().toISOString().slice(0, 10),
  );
  const [type, setType] = useState<Tipo>(initial?.type ?? "ATRASO");
  const [severity, setSeverity] = useState<Sev>(initial?.severity ?? "MEDIA");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [evidences, setEvidences] = useState<EvidenceItem[]>(initial?.evidences ?? []);

  function addEvidence() {
    setEvidences((prev) => [...prev, { descricao: "", referencia: "" }]);
  }
  function removeEvidence(idx: number) {
    setEvidences((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateEvidence(idx: number, field: keyof EvidenceItem, value: string) {
    setEvidences((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  async function handleSubmit() {
    if (description.trim().length < 10) {
      toast.error("Descrição deve ter ao menos 10 caracteres");
      return;
    }
    const cleanEvidences = evidences
      .map((e) => ({
        descricao: e.descricao.trim(),
        referencia: e.referencia?.trim() || undefined,
      }))
      .filter((e) => e.descricao.length > 0);

    setSubmitting(true);
    const common = {
      occurredAt: new Date(occurredAt),
      type,
      severity,
      description: description.trim(),
      evidences: cleanEvidences,
    };
    const result = isEdit
      ? await updateOccurrence({ id: props.initial.id, ...common })
      : await createOccurrence({ contractId: props.contractId, ...common });
    setSubmitting(false);

    if (result.success) {
      toast.success(isEdit ? "Ocorrência atualizada" : "Ocorrência registrada");
      startTransition(() => {
        router.push(`/contratos/${props.contractId}/ocorrencias`);
      });
    } else {
      toast.error(result.error ?? "Erro ao salvar");
    }
  }

  const loading = submitting || pending;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="occurredAt">Data da ocorrência</Label>
          <Input
            id="occurredAt"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="type">Tipo</Label>
          <Select
            value={type}
            onValueChange={(v) => setType((v as Tipo) ?? "ATRASO")}
            disabled={loading}
          >
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ATRASO">Atraso</SelectItem>
              <SelectItem value="DESCUMPRIMENTO">Descumprimento</SelectItem>
              <SelectItem value="QUALIDADE">Qualidade</SelectItem>
              <SelectItem value="SEGURANCA">Segurança</SelectItem>
              <SelectItem value="OUTRO">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="severity">Severidade</Label>
          <Select
            value={severity}
            onValueChange={(v) => setSeverity((v as Sev) ?? "MEDIA")}
            disabled={loading}
          >
            <SelectTrigger id="severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LEVE">Leve</SelectItem>
              <SelectItem value="MEDIA">Média</SelectItem>
              <SelectItem value="GRAVE">Grave</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição do fato</Label>
        <Textarea
          id="description"
          rows={6}
          placeholder="Descreva objetivamente o que ocorreu, quando, onde, quem observou, consequências e indícios."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Evidências (opcional)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEvidence}
            disabled={loading}
          >
            <Plus className="mr-1.5 size-3.5" />
            Adicionar
          </Button>
        </div>
        {evidences.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Adicione fotos, e-mails, protocolos, boletins etc. que suportem a ocorrência. Cada
            evidência tem uma descrição e uma referência (ex: número de protocolo, link, nome de
            arquivo).
          </p>
        ) : (
          <div className="space-y-2">
            {evidences.map((e, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-md border p-2 sm:grid-cols-[2fr_1fr_auto]"
              >
                <Input
                  placeholder="Descrição"
                  value={e.descricao}
                  onChange={(ev) => updateEvidence(i, "descricao", ev.target.value)}
                  disabled={loading}
                />
                <Input
                  placeholder="Referência"
                  value={e.referencia ?? ""}
                  onChange={(ev) => updateEvidence(i, "referencia", ev.target.value)}
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEvidence(i)}
                  disabled={loading}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 size-3.5" />
          )}
          {isEdit ? "Salvar alterações" : "Registrar ocorrência"}
        </Button>
      </div>
    </div>
  );
}
