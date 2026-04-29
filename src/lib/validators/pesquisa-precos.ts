import { z } from "zod/v4";

const itemTypes = ["SERVICE", "MATERIAL"] as const;

// Aceita cuid/cuid2/uuid — o Prisma gera cuids por default. Rejeita
// strings vazias, paths relativos, payloads gigantes que não casem com
// um id de recurso.
const idSchema = z.string().min(1).max(64);

export const researchIdSchema = idSchema;
export const contractIdSchema = idSchema;
export const researchItemIdSchema = idSchema;
export const contractItemIdSchema = idSchema;

const codeSourceValues = ["PENDING", "ITEM", "AI", "MANUAL"] as const;

/**
 * Criação legada (por contrato) — mantida para compatibilidade com fluxos
 * que ainda chamam a action com `itemType`. Novas criações devem usar
 * `createResearchPerItemSchema`.
 */
export const createResearchSchema = z.object({
  contractId: z.string().min(1, "Contrato é obrigatório"),
  additiveId: z.string().optional(),
  itemType: z.enum(itemTypes, { error: "Tipo de item é obrigatório" }),
});

/**
 * Criação por item — fiscal seleciona 1+ itens do contrato. Cada item gera
 * um `PriceResearchItem` com seu próprio CATMAT/CATSER.
 */
export const createResearchPerItemSchema = z.object({
  contractId: z.string().min(1, "Contrato é obrigatório"),
  additiveId: z.string().optional(),
  contractItemIds: z
    .array(contractItemIdSchema)
    .min(1, "Selecione ao menos um item")
    .max(50, "Máximo de 50 itens por pesquisa"),
});

export const confirmCatalogoCodeSchema = z
  .object({
    researchId: z.string().min(1),
    itemType: z.enum(itemTypes),
    catmatCode: z.string().optional(),
    catserCode: z.string().optional(),
  })
  .refine(
    (d) =>
      (d.itemType === "MATERIAL" && !!d.catmatCode) || (d.itemType === "SERVICE" && !!d.catserCode),
    {
      message: "Informe catmatCode para MATERIAL ou catserCode para SERVICE",
      path: ["catmatCode"],
    },
  );

export const confirmItemCodeSchema = z
  .object({
    researchItemId: z.string().min(1),
    itemType: z.enum(itemTypes),
    catmatCode: z.string().optional(),
    catserCode: z.string().optional(),
    codeSource: z.enum(codeSourceValues),
    codeDescricao: z.string().optional(),
    codeTrail: z.unknown().optional(),
  })
  .refine(
    (d) =>
      (d.itemType === "MATERIAL" && !!d.catmatCode) || (d.itemType === "SERVICE" && !!d.catserCode),
    {
      message: "Informe catmatCode para MATERIAL ou catserCode para SERVICE",
      path: ["catmatCode"],
    },
  );

export const setLegalRegimeFilterSchema = z.object({
  researchId: z.string().min(1),
  enabled: z.boolean(),
});

const sampleSourceValues = [
  "PAINEL_PRECOS",
  "CONTRATO_PUBLICO",
  "MIDIA",
  "COTACAO_DIRETA",
  "SINAPI",
  "CATALOGO_TIC",
  "OUTRO",
] as const;

export const createManualSampleSchema = z.object({
  researchItemId: z.string().min(1),
  source: z.enum(sampleSourceValues),
  supplierName: z.string().trim().max(200).optional(),
  orgao: z.string().trim().max(200).optional(),
  objetoResumo: z.string().trim().min(5, "Descreva o objeto da amostra").max(2000),
  valorGlobal: z.coerce.number().positive("Valor deve ser maior que zero"),
  valorMensal: z.coerce.number().positive().optional(),
  dataAssinatura: z.coerce.date().optional(),
  modalidade: z.string().trim().max(100).optional(),
  uf: z.string().trim().length(2).optional(),
  sourceNotes: z.string().trim().max(2000).optional(),
});

export const deleteSampleSchema = z.object({
  sampleId: z.string().min(1),
});

const referenceMethodValues = ["NONE", "MEAN", "MEDIAN", "MIN", "CUSTOM"] as const;

export const setItemReferenceMethodSchema = z
  .object({
    researchItemId: z.string().min(1),
    method: z.enum(referenceMethodValues),
    adjustmentPercent: z.coerce
      .number()
      .min(-50, "Ajuste mínimo -50%")
      .max(50, "Ajuste máximo 50%")
      .optional(),
    customValue: z.coerce.number().positive().optional(),
    methodJustification: z.string().trim().max(2000).optional(),
  })
  .refine((d) => d.method !== "CUSTOM" || d.customValue != null, {
    message: "Informe o valor customizado",
    path: ["customValue"],
  });

export const setItemExceptionJustificationSchema = z.object({
  researchItemId: z.string().min(1),
  text: z.string().trim().min(20, "Justificativa deve ter ao menos 20 caracteres").max(4000),
});

export const updateItemJustificationSchema = z.object({
  researchItemId: z.string().min(1),
  text: z.string().trim().min(10, "Justificativa deve ter ao menos 10 caracteres").max(10_000),
});

export const queryPrecosFiltersSchema = z.object({
  researchId: z.string().min(1),
  dataCompraInicio: z.coerce.date().optional(),
  dataCompraFim: z.coerce.date().optional(),
  estado: z.string().length(2).optional(),
  poder: z.enum(["Executivo", "Legislativo", "Judiciario"]).optional(),
  esfera: z.enum(["Federal", "Estadual", "Municipal", "Distrital"]).optional(),
});

export const toggleExclusionSchema = z.object({
  sampleId: z.string().min(1),
  excluded: z.boolean(),
  reason: z.string().optional(),
});

export const updateJustificationSchema = z.object({
  researchId: z.string().min(1),
  text: z.string().min(10, "Justificativa muito curta"),
});

export const linkAdditiveSchema = z.object({
  researchId: z.string().min(1),
  additiveId: z.string().min(1),
});

export type CreateResearchInput = z.infer<typeof createResearchSchema>;
export type CreateResearchPerItemInput = z.infer<typeof createResearchPerItemSchema>;
export type ConfirmCatalogoCodeInput = z.infer<typeof confirmCatalogoCodeSchema>;
export type ConfirmItemCodeInput = z.infer<typeof confirmItemCodeSchema>;
export type QueryPrecosFilters = z.infer<typeof queryPrecosFiltersSchema>;
export type ToggleExclusionInput = z.infer<typeof toggleExclusionSchema>;
export type UpdateJustificationInput = z.infer<typeof updateJustificationSchema>;
export type LinkAdditiveInput = z.infer<typeof linkAdditiveSchema>;
export type SetLegalRegimeFilterInput = z.infer<typeof setLegalRegimeFilterSchema>;
export type CreateManualSampleInput = z.infer<typeof createManualSampleSchema>;
export type DeleteSampleInput = z.infer<typeof deleteSampleSchema>;
export type SetItemReferenceMethodInput = z.infer<typeof setItemReferenceMethodSchema>;
export type SetItemExceptionJustificationInput = z.infer<
  typeof setItemExceptionJustificationSchema
>;
export type UpdateItemJustificationInput = z.infer<typeof updateItemJustificationSchema>;
