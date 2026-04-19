"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadSignedDocument } from "@/actions/documentos";
import { FileCheck2, Loader2, Upload } from "lucide-react";

interface UploadSignedFormProps {
  documentId: string;
  hasSignedAlready: boolean;
}

export function UploadSignedForm({ documentId, hasSignedAlready }: UploadSignedFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) {
      toast.error("Selecione um arquivo PDF");
      return;
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Apenas arquivos PDF são aceitos");
      return;
    }

    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = await uploadSignedDocument({
        documentId,
        pdfBytes: new Uint8Array(buffer),
      });
      if (result.success) {
        toast.success("PDF assinado anexado com sucesso");
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error(result.error ?? "Erro no upload");
      }
    } finally {
      setUploading(false);
    }
  }

  const loading = uploading || pending;

  return (
    <div className="space-y-2">
      <Label htmlFor="signed-pdf">
        {hasSignedAlready ? "Substituir PDF assinado" : "Anexar PDF assinado digitalmente"}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          ref={inputRef}
          id="signed-pdf"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={loading}
          className="file:mr-2"
        />
        <Button onClick={handleUpload} disabled={loading || !file}>
          {loading ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : hasSignedAlready ? (
            <FileCheck2 className="mr-1.5 size-3.5" />
          ) : (
            <Upload className="mr-1.5 size-3.5" />
          )}
          {hasSignedAlready ? "Substituir" : "Anexar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Faça o download do PDF original, assine-o no gov.br ou outra ferramenta e faça o upload
        aqui. Limite 20 MB. O documento ficará marcado como &quot;Assinado&quot; e mantém o PDF
        original para comparação/auditoria.
      </p>
    </div>
  );
}
