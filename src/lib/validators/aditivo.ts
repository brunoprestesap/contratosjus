import { z } from "zod/v4";

const additiveTypes = ["TERM", "VALUE", "MIXED", "READJUSTMENT", "APOSTILAMENTO"] as const;

export const additiveSchema = z
  .object({
    additiveNumber: z.string().min(1, "Número do aditivo é obrigatório"),
    type: z.enum(additiveTypes, {
      error: "Tipo de aditivo é obrigatório",
    }),
    signatureDate: z.coerce.date({
      error: "Data de assinatura é obrigatória",
    }),
    newGlobalValue: z.coerce
      .number({ error: "Valor global é obrigatório" })
      .positive("Valor global deve ser maior que zero")
      .optional(),
    newMonthlyValue: z.coerce
      .number({ error: "Valor mensal inválido" })
      .positive("Valor mensal deve ser maior que zero")
      .optional(),
    newEndDate: z.coerce.date({ error: "Nova data de término inválida" }).optional(),
    justification: z.string().min(1, "Justificativa é obrigatória"),
  })
  .refine(
    (data) => {
      if (data.type === "TERM" || data.type === "MIXED") {
        return !!data.newEndDate;
      }
      return true;
    },
    {
      message: "Nova data de término é obrigatória para este tipo de aditivo",
      path: ["newEndDate"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "VALUE" || data.type === "MIXED") {
        return !!data.newGlobalValue;
      }
      return true;
    },
    {
      message: "Novo valor global é obrigatório para este tipo de aditivo",
      path: ["newGlobalValue"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "READJUSTMENT") {
        return !!data.newMonthlyValue;
      }
      return true;
    },
    {
      message: "Novo valor mensal é obrigatório para reajuste/repactuação",
      path: ["newMonthlyValue"],
    }
  )
  .refine(
    (data) => {
      if (data.type === "APOSTILAMENTO") {
        return !!data.newGlobalValue || !!data.newEndDate || !!data.newMonthlyValue;
      }
      return true;
    },
    {
      message: "Apostilamento deve alterar pelo menos um valor ou prazo",
      path: ["type"],
    }
  );

export type AdditiveInput = z.infer<typeof additiveSchema>;
