import { z } from "zod/v4";

export const commitmentSchema = z.object({
  commitmentNumber: z
    .string()
    .min(1, "Número do empenho é obrigatório"),
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
});

export type CommitmentInput = z.infer<typeof commitmentSchema>;
