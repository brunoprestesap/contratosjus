import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "fiscalizacao.notificacao",
  title: "Notificação ao Contratado",
  category: "FISCALIZACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Ofício formal ao contratado com 3 variações: atraso na execução, descumprimento de cláusula contratual ou orientação/advertência. Base: Lei 14.133/2021 art. 137-139.",
  sections: [
    { id: "tipo", label: "Tipo de Notificação", kind: "MANUAL", required: true },
    { id: "cabecalho", label: "Cabeçalho", kind: "DATA", required: true },
    { id: "fato", label: "Fato Apurado", kind: "AI", required: true },
    { id: "fundamentacao", label: "Fundamentação Contratual/Legal", kind: "AI", required: true },
    { id: "prazoResposta", label: "Prazo para Manifestação", kind: "MANUAL", required: true },
    { id: "assinatura", label: "Assinatura do Fiscal", kind: "DATA", required: true },
  ],
};
