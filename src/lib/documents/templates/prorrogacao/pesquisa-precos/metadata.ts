import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "prorrogacao.pesquisa-precos",
  title: "Pesquisa de Preços",
  category: "PROROGACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Memória de cálculo da pesquisa de preços para prorrogação contratual, incluindo amostras consultadas na API Dados Abertos compras.gov.br, estatísticas descritivas (média, mediana, desvio-padrão) e justificativa de economicidade. Base: Lei 14.133/2021 (art. 23 e 107) ou Lei 8.666/1993 (art. 57); Manual CNJ.",
  sections: [
    { id: "contract", label: "Contrato-Alvo", kind: "DATA", required: true },
    { id: "methodology", label: "Metodologia", kind: "DATA", required: true },
    { id: "samples", label: "Amostras de Preços", kind: "DATA", required: true },
    { id: "statistics", label: "Estatísticas", kind: "DATA", required: true },
    { id: "justification", label: "Justificativa de Economicidade", kind: "AI", required: true },
  ],
};
