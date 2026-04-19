"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { generateDocument } from "@/actions/documentos";
import { formatCurrency, formatDate, formatMonthYearLong } from "@/lib/format";
import { Loader2, FileCheck2 } from "lucide-react";

interface PaymentOption {
  id: string;
  referenceMonthIso: string;
  attestDateIso: string;
  invoiceValue: number | null;
  hasAteste: boolean;
}

interface GerarAtesteFormProps {
  contractId: string;
  payments: PaymentOption[];
}

const formatMonthYear = (iso: string) => formatMonthYearLong(iso);

export function GerarAtesteForm({
  contractId,
  payments,
}: GerarAtesteFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    payments.find((p) => !p.hasAteste)?.id ?? payments[0]?.id ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!selectedId) {
      toast.error("Selecione um pagamento");
      return;
    }
    setSubmitting(true);
    const result = await generateDocument({
      templateId: "fiscalizacao.ateste-nf",
      contractId,
      paymentId: selectedId,
    });
    setSubmitting(false);
    if (result.success && result.data) {
      toast.success("Ateste gerado com sucesso");
      startTransition(() => {
        router.push(
          `/contratos/${contractId}/documentos/${result.data!.documentId}`
        );
      });
    } else {
      toast.error(result.error ?? "Erro ao gerar ateste");
    }
  }

  const loading = submitting || pending;

  return (
    <div className="space-y-4">
      <RadioGroup
        value={selectedId ?? undefined}
        onValueChange={(v) => setSelectedId(v)}
        className="space-y-2"
      >
        {payments.map((p) => (
          <Label
            key={p.id}
            htmlFor={p.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/50 has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem
              id={p.id}
              value={p.id}
              className="mt-0.5"
              disabled={loading}
            />
            <div className="flex flex-1 flex-wrap items-baseline gap-2">
              <span className="font-medium capitalize">
                {formatMonthYear(p.referenceMonthIso)}
              </span>
              <span className="text-xs text-muted-foreground">
                · ateste em {formatDate(p.attestDateIso)}
              </span>
              <span className="ml-auto font-mono text-sm">
                {formatCurrency(p.invoiceValue)}
              </span>
              {p.hasAteste ? (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  já tem ateste
                </Badge>
              ) : null}
            </div>
          </Label>
        ))}
      </RadioGroup>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" onClick={handleSubmit} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <FileCheck2 className="mr-1.5 size-3.5" />
          )}
          Gerar Ateste
        </Button>
      </div>

      {payments.some((p) => p.hasAteste) ? (
        <p className="text-xs text-muted-foreground">
          Alguns pagamentos já possuem ateste gerado. Gerar novamente criará
          uma nova versão (a anterior fica marcada como "Substituído" mas
          permanece no histórico para auditoria).
        </p>
      ) : null}
    </div>
  );
}
