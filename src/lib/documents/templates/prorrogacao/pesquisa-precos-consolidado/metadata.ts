import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "prorrogacao.pesquisa-precos-consolidado",
  title: "Pesquisa de Preços (consolidada por item)",
  category: "PROROGACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Memória de cálculo consolidada com uma seção por item do contrato. Cada item traz seu CATMAT/CATSER, amostras filtradas pela base legal, estatísticas descritivas e justificativa de economicidade. Base: Lei 14.133/2021 (art. 23 e 107) ou Lei 8.666/1993 (art. 57); Manual CNJ.",
  sections: [
    { id: "contract", label: "Contrato-Alvo", kind: "DATA", required: true },
    { id: "items-summary", label: "Itens Pesquisados", kind: "DATA", required: true },
    { id: "item-section", label: "Seções por Item", kind: "DATA", required: true },
  ],
};
