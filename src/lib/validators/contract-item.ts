import { z } from "zod/v4";

export const itemTypeEnum = z.enum(["MATERIAL", "SERVICE", "WORK", "IT_SOLUTION"], {
  error: "Tipo do item é obrigatório",
});

export const catalogTypeEnum = z.enum(["CATMAT", "CATSER"], {
  error: "Tipo do catálogo é obrigatório",
});

export const itemStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "CANCELED"]);

export const adjustmentIndexEnum = z.enum([
  "NONE",
  "IPCA",
  "IGPM",
  "INCC",
  "IPC_FIPE",
  "SINAPI",
  "OTHER",
]);

export const unitOfMeasureValues = [
  "UN",
  "CX",
  "KG",
  "G",
  "TON",
  "L",
  "ML",
  "M",
  "CM",
  "MM",
  "M2",
  "M3",
  "MES",
  "DIA",
  "HORA",
  "ANO",
  "H_H",
  "HOMEM_MES",
  "POSTO",
  "PAR",
  "DZ",
  "PC",
  "RL",
  "GL",
  "PCT",
  "KIT",
  "JG",
  "LOTE",
  "VERBA",
  "SERVICO",
  "FL",
  "FR",
  "AMPOLA",
  "TUBO",
  "UND_MEDICA",
  "OTHER",
] as const;

export const unitOfMeasureEnum = z.enum(unitOfMeasureValues, {
  error: "Unidade de medida é obrigatória",
});

export type UnitOfMeasure = (typeof unitOfMeasureValues)[number];

const optionalString = () =>
  z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalPositive = () => z.coerce.number().positive().optional();

const optionalInt = () => z.coerce.number().int().nonnegative().optional();

export const contractItemBaseSchema = z.object({
  itemNumber: z.string().trim().min(1, "Número do item é obrigatório"),
  lotNumber: optionalString(),
  itemType: itemTypeEnum,
  catalogType: catalogTypeEnum,
  catalogCode: optionalString(),
  description: z
    .string()
    .trim()
    .min(1, "Descrição é obrigatória")
    .max(200, "Descrição deve ter até 200 caracteres"),
  detailedSpecification: z.string().trim().min(1, "Especificação técnica é obrigatória"),

  unitOfMeasure: unitOfMeasureEnum,
  unitOfMeasureOther: optionalString(),
  quantity: z.coerce
    .number({ error: "Quantidade é obrigatória" })
    .positive("Quantidade deve ser maior que zero"),
  unitValue: z.coerce
    .number({ error: "Valor unitário é obrigatório" })
    .positive("Valor unitário deve ser maior que zero"),

  isAdjustable: z.boolean().default(false),
  adjustmentIndex: adjustmentIndexEnum.default("NONE"),
  // Aceita string (HTML input type=date), Date (re-hidratado por Server Action
  // do Next) ou null/undefined. Em Zod v4, `z.coerce.date()` pode rejeitar
  // instâncias Date cross-realm com "expected date, received Date" — evitamos
  // o coerce transformando manualmente.
  nextAdjustmentDate: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }),

  budgetProgram: optionalString(),
  expenseNature: optionalString(),
  fundingSource: optionalString(),

  // MATERIAL
  brand: optionalString(),
  model: optionalString(),
  manufacturer: optionalString(),
  countryOfOrigin: optionalString(),
  warrantyMonths: optionalInt(),
  deliveryLocation: optionalString(),
  deliveryDeadlineDays: optionalInt(),

  // SERVICE/WORK
  executionLocation: optionalString(),
  executionDeadlineDays: optionalInt(),
  isContinuousService: z.boolean().default(false),
  slaIndicators: z.unknown().optional(),
  penaltyRules: optionalString(),

  // WORK
  bdiPercentage: optionalPositive(),
  socialChargesPercentage: optionalPositive(),
  sinapiReference: optionalString(),

  // IT_SOLUTION
  pctiReference: optionalString(),
  itServiceCategory: optionalString(),

  sustainabilityCriteria: z.unknown().optional(),
  status: itemStatusEnum.default("ACTIVE"),
});

export type ContractItemInput = z.infer<typeof contractItemBaseSchema>;

export type LegalRegime = "LEI_14133_2021" | "LEI_8666_1993";

export function contractItemSchema(legalRegime: LegalRegime) {
  return contractItemBaseSchema.superRefine((data, ctx) => {
    // Lei 14.133 exige código de catálogo (CATMAT/CATSER)
    if (legalRegime === "LEI_14133_2021" && !data.catalogCode) {
      ctx.addIssue({
        code: "custom",
        path: ["catalogCode"],
        message: "Código CATMAT/CATSER é obrigatório para contratos regidos pela Lei 14.133/2021",
      });
    }

    // Coerência catalogType ↔ itemType
    if (data.itemType === "MATERIAL" && data.catalogType !== "CATMAT") {
      ctx.addIssue({
        code: "custom",
        path: ["catalogType"],
        message: "Itens de material devem usar catálogo CATMAT",
      });
    }
    if (
      (data.itemType === "SERVICE" ||
        data.itemType === "WORK" ||
        data.itemType === "IT_SOLUTION") &&
      data.catalogType !== "CATSER"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["catalogType"],
        message: "Itens de serviço/obra/TI devem usar catálogo CATSER",
      });
    }

    // MATERIAL exige local de entrega
    if (data.itemType === "MATERIAL" && !data.deliveryLocation) {
      ctx.addIssue({
        code: "custom",
        path: ["deliveryLocation"],
        message: "Local de entrega é obrigatório para material",
      });
    }

    // WORK (obra de engenharia) exige BDI e encargos sociais
    if (data.itemType === "WORK") {
      if (data.bdiPercentage === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["bdiPercentage"],
          message: "BDI é obrigatório para obras de engenharia",
        });
      }
      if (data.socialChargesPercentage === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["socialChargesPercentage"],
          message: "Percentual de encargos sociais é obrigatório para obras",
        });
      }
    }

    // IT_SOLUTION exige vínculo com PCTI (Res. CNJ 182/2013)
    if (data.itemType === "IT_SOLUTION" && !data.pctiReference) {
      ctx.addIssue({
        code: "custom",
        path: ["pctiReference"],
        message: "Vínculo com Plano de Contratações de TI (PCTI) é obrigatório",
      });
    }

    // Coerência de reajuste
    if (data.isAdjustable && data.adjustmentIndex === "NONE") {
      ctx.addIssue({
        code: "custom",
        path: ["adjustmentIndex"],
        message: "Selecione o índice de reajuste",
      });
    }

    // Unidade OTHER exige descrição livre
    if (data.unitOfMeasure === "OTHER" && !data.unitOfMeasureOther) {
      ctx.addIssue({
        code: "custom",
        path: ["unitOfMeasureOther"],
        message: 'Descreva a unidade quando selecionar "Outro"',
      });
    }
  });
}
