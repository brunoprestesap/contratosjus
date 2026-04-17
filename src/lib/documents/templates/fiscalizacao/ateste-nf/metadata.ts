import type { TemplateMetadata } from "@/lib/documents/engine/types";

export const metadata: TemplateMetadata = {
  id: "fiscalizacao.ateste-nf",
  title: "Ateste de Nota Fiscal",
  category: "FISCALIZACAO",
  regimes: ["LEI_14133_2021", "LEI_8666_1993"],
  description:
    "Declaração formal do fiscal atestando a execução dos serviços ou entrega dos bens objeto do contrato, referente a uma nota fiscal específica. Base: Lei 14.133/2021 art. 117.",
  sections: [
    { id: "contract", label: "Dados do Contrato", kind: "DATA", required: true },
    { id: "payment", label: "Nota Fiscal / Referência", kind: "DATA", required: true },
    { id: "fiscal", label: "Fiscal Responsável", kind: "DATA", required: true },
    { id: "declaration", label: "Declaração", kind: "DATA", required: true },
  ],
};
