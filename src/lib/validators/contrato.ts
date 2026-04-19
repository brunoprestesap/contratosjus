import { z } from "zod/v4";
import { validateCNPJ } from "@/lib/format";

export const contractBaseSchema = z.object({
  // Identificacao
  contractNumber: z.string().min(1, "Numero do contrato e obrigatorio"),
  processNumber: z.string().min(1, "Numero do processo e obrigatorio"),
  object: z.string().min(1, "Objeto do contrato e obrigatorio"),
  supplier: z.string().min(1, "Fornecedor e obrigatorio"),
  supplierCnpj: z
    .string()
    .min(1, "CNPJ e obrigatorio")
    .refine((val) => validateCNPJ(val), "CNPJ invalido"),
  legalRegime: z.enum(["LEI_14133_2021", "LEI_8666_1993"], {
    error: "Regime legal e obrigatorio",
  }),
  biddingModality: z.enum(
    [
      "PREGAO_ELETRONICO",
      "PREGAO_PRESENCIAL",
      "DISPENSA",
      "INEXIGIBILIDADE",
      "CONCORRENCIA",
      "TOMADA_PRECOS",
      "CONVITE",
      "DIALOGO_COMPETITIVO",
      "OUTROS",
    ],
    { error: "Modalidade de licitacao e obrigatoria" },
  ),

  // Vigencia
  signatureDate: z.coerce.date({ error: "Data de assinatura e obrigatoria" }),
  startDate: z.coerce.date({ error: "Data de inicio e obrigatoria" }),
  endDate: z.coerce.date({ error: "Data de termino e obrigatoria" }),
  canExtend: z.boolean().default(false),

  // Financeiro
  globalValue: z.coerce
    .number({ error: "Valor global e obrigatorio" })
    .positive("Valor global deve ser maior que zero"),
  paymentType: z.enum(["FIXED", "VARIABLE", "MIXED"], {
    error: "Tipo de pagamento e obrigatorio",
  }),
  estimatedMonthlyValue: z.coerce
    .number()
    .positive("Valor mensal deve ser maior que zero")
    .optional(),
  paymentPeriodicity: z.enum(["MONTHLY", "BIMONTHLY", "ON_DEMAND"], {
    error: "Periodicidade e obrigatoria",
  }),

  // Dotacao
  budgetProgram: z.string().optional(),
  expenseNature: z.string().optional(),

  // Gestao
  fiscalHolder: z.string().min(1, "Fiscal titular e obrigatorio"),
  fiscalSubstitute: z.string().optional(),
  contractManager: z.string().optional(),
});

export const contractCreateSchema = contractBaseSchema
  .refine((data) => data.endDate >= data.startDate, {
    message: "Data de termino deve ser igual ou posterior a data de inicio",
    path: ["endDate"],
  })
  .refine(
    (data) => {
      if (data.paymentType === "FIXED" || data.paymentType === "MIXED") {
        return data.estimatedMonthlyValue !== undefined && data.estimatedMonthlyValue > 0;
      }
      return true;
    },
    {
      message: "Valor mensal estimado e obrigatorio para pagamento fixo ou misto",
      path: ["estimatedMonthlyValue"],
    },
  );

export const contractUpdateSchema = contractCreateSchema;

export type ContractCreateInput = z.infer<typeof contractBaseSchema>;
export type ContractUpdateInput = z.infer<typeof contractBaseSchema>;
