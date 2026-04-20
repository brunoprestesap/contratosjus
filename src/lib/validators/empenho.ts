import { z } from "zod/v4";
import {
  breakdownItemSchema,
  assertBreakdownMatches,
  assertBreakdownUnique,
} from "@/lib/validators/breakdown";

export const commitmentSchema = z.object({
  commitmentNumber: z.string().min(1, "Número do empenho é obrigatório"),
  commitmentDate: z.coerce.date({
    error: "Data do empenho é obrigatória",
  }),
  value: z.coerce
    .number({ error: "Valor é obrigatório" })
    .positive("Valor deve ser maior que zero"),
  type: z.enum(["INITIAL", "REINFORCEMENT"], {
    error: "Tipo de empenho é obrigatório",
  }),
  notes: z.string().optional(),
  items: z.array(breakdownItemSchema).optional(),
});

export const commitmentWithBreakdownSchema = commitmentSchema.superRefine((data, ctx) => {
  if (data.items && data.items.length > 0) {
    assertBreakdownUnique(data.items, ctx, ["items"]);
    assertBreakdownMatches(data.items, data.value, ctx, ["items"]);
  }
});

export type CommitmentInput = z.infer<typeof commitmentSchema>;
