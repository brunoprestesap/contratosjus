import { z } from "zod/v4";

export function datesCoherenceRefinement(
  data: {
    attestDate?: Date | null;
    settlementDate?: Date | null;
    paidAt?: Date | null;
  },
  ctx: z.RefinementCtx,
) {
  if (data.settlementDate && !data.attestDate) {
    ctx.addIssue({
      code: "custom",
      message: "Data do ateste é obrigatória para informar liquidação",
      path: ["attestDate"],
    });
  }
  if (data.paidAt && !data.settlementDate) {
    ctx.addIssue({
      code: "custom",
      message: "Data de liquidação é obrigatória para informar pagamento",
      path: ["settlementDate"],
    });
  }
  if (data.settlementDate && data.attestDate && data.settlementDate < data.attestDate) {
    ctx.addIssue({
      code: "custom",
      message: "Data de liquidação deve ser igual ou posterior ao ateste",
      path: ["settlementDate"],
    });
  }
  if (data.paidAt && data.settlementDate && data.paidAt < data.settlementDate) {
    ctx.addIssue({
      code: "custom",
      message: "Data de pagamento deve ser igual ou posterior à liquidação",
      path: ["paidAt"],
    });
  }
}

const paymentBaseShape = {
  referenceMonth: z.coerce.date({
    error: "Mês de referência é obrigatório",
  }),
  invoiceValue: z.coerce.number().positive("Valor da NF deve ser maior que zero").optional(),
  attestDate: z.coerce.date({
    error: "Data do ateste é obrigatória",
  }),
  attestNotes: z.string().optional(),
  settlementDate: z.coerce.date().optional(),
  settledValue: z.coerce.number().positive("Valor liquidado deve ser maior que zero").optional(),
  paidAt: z.coerce.date().optional(),
  paidValue: z.coerce.number().positive("Valor pago deve ser maior que zero").optional(),
};

export const paymentCreateSchema = z.object(paymentBaseShape).superRefine(datesCoherenceRefinement);

export const paymentUpdateSchema = z.object(paymentBaseShape).superRefine(datesCoherenceRefinement);

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;
