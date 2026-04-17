import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "prorrogacao.justificativa-economicidade",
  title: "Justificativa de Economicidade",
  category: "PROROGACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Justificativa formal de economicidade para prorrogação contratual, vinculada a uma pesquisa de preços finalizada. A base legal é escolhida automaticamente conforme o regime do contrato: Lei 14.133/2021 art. 107 ou Lei 8.666/1993 art. 57. Manual CNJ de Gestão e Fiscalização de Contratos.",
  sections: [
    { id: "contract", label: "Contrato-Alvo", kind: "DATA", required: true },
    { id: "pesquisa", label: "Resumo da Pesquisa de Preços", kind: "DATA", required: true },
    { id: "comparacao", label: "Comparação Valor × Mercado", kind: "DATA", required: true },
    { id: "fundamentacao", label: "Fundamentação e Conclusão", kind: "AI", required: true },
  ],
};
