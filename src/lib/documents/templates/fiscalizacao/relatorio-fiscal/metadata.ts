import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "fiscalizacao.relatorio-fiscal",
  title: "Relatório de Fiscalização",
  category: "FISCALIZACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Relatório periódico de fiscalização consolidando pagamentos, empenhos, ocorrências e aditivos de um contrato para um intervalo de tempo definido. Base: Manual CNJ de Gestão e Fiscalização de Contratos.",
  sections: [
    { id: "contrato", label: "Contrato-Alvo", kind: "DATA", required: true },
    { id: "periodo", label: "Período do Relatório", kind: "MANUAL", required: false },
    { id: "financeiro", label: "Resumo Financeiro", kind: "DATA", required: true },
    { id: "pagamentos", label: "Pagamentos do Período", kind: "DATA", required: true },
    { id: "empenhos", label: "Empenhos do Período", kind: "DATA", required: true },
    { id: "aditivos", label: "Aditivos Recentes", kind: "DATA", required: false },
    { id: "ocorrencias", label: "Ocorrências Registradas", kind: "DATA", required: false },
    { id: "conclusao", label: "Conclusão do Fiscal", kind: "AI", required: true },
    { id: "assinatura", label: "Assinatura do Fiscal", kind: "DATA", required: true },
  ],
};
