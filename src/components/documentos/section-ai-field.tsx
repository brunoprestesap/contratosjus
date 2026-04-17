"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { suggestFieldText } from "@/actions/documentos";

interface SectionAiFieldProps {
  templateId: string;
  contractId: string;
  sectionId: string;
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  hint?: string;
}

export function SectionAiField({
  templateId,
  contractId,
  sectionId,
  label,
  value,
  onChange,
  placeholder,
  rows = 5,
  disabled,
  hint,
}: SectionAiFieldProps) {
  const [loading, setLoading] = useState(false);

  async function handleSuggest() {
    setLoading(true);
    try {
      const result = await suggestFieldText({
        templateId,
        contractId,
        sectionId,
        existingText: value || undefined,
        userHint: hint,
      });
      if (result.success && result.data) {
        onChange(result.data.text);
        toast.success("Texto sugerido — revise antes de finalizar");
      } else {
        toast.error(result.error ?? "Erro ao sugerir texto");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={sectionId}>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggest}
          disabled={loading || disabled}
        >
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1.5 size-3.5" />
          )}
          Sugerir com IA
        </Button>
      </div>
      <Textarea
        id={sectionId}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}
