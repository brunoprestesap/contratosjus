import { z } from "zod/v4";

const itemTypes = ["SERVICE", "MATERIAL"] as const;

// Aceita cuid/cuid2/uuid — o Prisma gera cuids por default. Rejeita
// strings vazias, paths relativos, payloads gigantes que não casem com
// um id de recurso.
const idSchema = z.string().min(1).max(64);

export const researchIdSchema = idSchema;
export const contractIdSchema = idSchema;

export const createResearchSchema = z.object({
  contractId: z.string().min(1, "Contrato é obrigatório"),
  additiveId: z.string().optional(),
  itemType: z.enum(itemTypes, { error: "Tipo de item é obrigatório" }),
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
export type ConfirmCatalogoCodeInput = z.infer<typeof confirmCatalogoCodeSchema>;
export type QueryPrecosFilters = z.infer<typeof queryPrecosFiltersSchema>;
export type ToggleExclusionInput = z.infer<typeof toggleExclusionSchema>;
export type UpdateJustificationInput = z.infer<typeof updateJustificationSchema>;
export type LinkAdditiveInput = z.infer<typeof linkAdditiveSchema>;
