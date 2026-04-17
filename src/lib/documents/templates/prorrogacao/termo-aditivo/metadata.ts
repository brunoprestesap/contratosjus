import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "prorrogacao.termo-aditivo",
  title: "Minuta de Termo Aditivo",
  category: "PROROGACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Minuta de Termo Aditivo contratual (prorrogação, valor ou misto), gerada a partir de um aditivo já criado. Base legal automática conforme o regime: Lei 14.133/2021 (art. 107, 124 e 125) ou Lei 8.666/1993 (art. 57 e 65).",
  sections: [
    { id: "partes", label: "Partes", kind: "DATA", required: true },
    { id: "preambulo", label: "Preâmbulo", kind: "DATA", required: true },
    { id: "clausula1", label: "Objeto do Aditamento", kind: "DATA", required: true },
    { id: "clausula2", label: "Fundamentação Legal", kind: "DATA", required: true },
    { id: "clausula3", label: "Ratificação", kind: "DATA", required: true },
    { id: "consideracoes", label: "Considerações Adicionais", kind: "MANUAL", required: false },
    { id: "assinaturas", label: "Assinaturas", kind: "DATA", required: true },
  ],
};
