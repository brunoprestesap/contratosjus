import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "prorrogacao.solicitacao-parecer",
  title: "Solicitação de Parecer Jurídico",
  category: "PROROGACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Ofício dirigido à assessoria/procuradoria jurídica solicitando manifestação sobre minuta de aditivo contratual. Anexa pesquisa de preços, justificativa de economicidade e minuta do aditivo. Base: Lei 14.133/2021 art. 53 ou Lei 8.666/1993 art. 38, parágrafo único.",
  sections: [
    { id: "cabecalho", label: "Cabeçalho e Destinatário", kind: "DATA", required: true },
    { id: "contrato", label: "Identificação do Contrato", kind: "DATA", required: true },
    { id: "resumoFato", label: "Resumo Fático", kind: "AI", required: true },
    { id: "fundamentacao", label: "Fundamentação Preliminar", kind: "AI", required: true },
    { id: "quesitos", label: "Quesitos ao Parecerista", kind: "MANUAL", required: false },
    { id: "anexos", label: "Anexos Referenciados", kind: "DATA", required: true },
    { id: "assinatura", label: "Assinatura do Fiscal", kind: "DATA", required: true },
  ],
};
