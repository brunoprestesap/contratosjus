import { z } from "zod/v4";

export const paymentCreateSchema = z
  .object({
    referenceMonth: z.coerce.date({
      error: "Mês de referência é obrigatório",
    }),
    invoiceValue: z.coerce
      .number()
      .positive("Valor da NF deve ser maior que zero")
      .optional(),
    attestDate: z.coerce.date({
      error: "Data do ateste é obrigatória",
    }),
    attestNotes: z.string().optional(),
    settlementDate: z.coerce.date().optional(),
    settledValue: z.coerce
      .number()
      .positive("Valor liquidado deve ser maior que zero")
      .optional(),
    paidAt: z.coerce.date().optional(),
    paidValue: z.coerce
      .number()
      .positive("Valor pago deve ser maior que zero")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.paidAt && !data.settlementDate) {
        return false;
      }
      return true;
    },
    {
      message: "Data de liquidação é obrigatória para informar pagamento",
      path: ["settlementDate"],
    }
  )
  .refine(
    (data) => {
      if (data.settlementDate && data.attestDate) {
        return data.settlementDate >= data.attestDate;
      }
      return true;
    },
    {
      message: "Data de liquidação deve ser igual ou posterior ao ateste",
      path: ["settlementDate"],
    }
  )
  .refine(
    (data) => {
      if (data.paidAt && data.settlementDate) {
        return data.paidAt >= data.settlementDate;
      }
      return true;
    },
    {
      message: "Data de pagamento deve ser igual ou posterior à liquidação",
      path: ["paidAt"],
    }
  );

export const paymentUpdateSchema = z
  .object({
    referenceMonth: z.coerce.date({
      error: "Mês de referência é obrigatório",
    }),
    invoiceValue: z.coerce
      .number()
      .positive("Valor da NF deve ser maior que zero")
      .optional(),
    attestDate: z.coerce.date({
      error: "Data do ateste é obrigatória",
    }),
    attestNotes: z.string().optional(),
    settlementDate: z.coerce.date().optional(),
    settledValue: z.coerce
      .number()
      .positive("Valor liquidado deve ser maior que zero")
      .optional(),
    paidAt: z.coerce.date().optional(),
    paidValue: z.coerce
      .number()
      .positive("Valor pago deve ser maior que zero")
      .optional(),
  })
  .refine(
    (data) => {
      if (data.settlementDate && !data.attestDate) {
        return false;
      }
      return true;
    },
    {
      message: "Data do ateste é obrigatória para informar liquidação",
      path: ["attestDate"],
    }
  )
  .refine(
    (data) => {
      if (data.paidAt && !data.settlementDate) {
        return false;
      }
      return true;
    },
    {
      message: "Data de liquidação é obrigatória para informar pagamento",
      path: ["settlementDate"],
    }
  )
  .refine(
    (data) => {
      if (data.settlementDate && data.attestDate) {
        return data.settlementDate >= data.attestDate;
      }
      return true;
    },
    {
      message: "Data de liquidação deve ser igual ou posterior ao ateste",
      path: ["settlementDate"],
    }
  )
  .refine(
    (data) => {
      if (data.paidAt && data.settlementDate) {
        return data.paidAt >= data.settlementDate;
      }
      return true;
    },
    {
      message: "Data de pagamento deve ser igual ou posterior à liquidação",
      path: ["paidAt"],
    }
  );

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof paymentUpdateSchema>;
