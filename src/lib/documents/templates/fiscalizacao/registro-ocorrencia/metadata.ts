import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "fiscalizacao.registro-ocorrencia",
  title: "Registro de Ocorrência",
  category: "FISCALIZACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Documento de registro formal de ocorrência apurada pelo fiscal durante a execução contratual (atraso, descumprimento, qualidade, segurança). Base: Manual CNJ de Gestão e Fiscalização de Contratos.",
  sections: [
    { id: "contrato", label: "Contrato-Alvo", kind: "DATA", required: true },
    { id: "classificacao", label: "Classificação (tipo e severidade)", kind: "DATA", required: true },
    { id: "fato", label: "Descrição do Fato", kind: "DATA", required: true },
    { id: "evidencias", label: "Evidências", kind: "DATA", required: false },
    { id: "providencias", label: "Providências Sugeridas", kind: "AI", required: false },
    { id: "assinatura", label: "Assinatura do Fiscal", kind: "DATA", required: true },
  ],
};
