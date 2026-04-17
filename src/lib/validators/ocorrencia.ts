import { z } from "zod/v4";

export const occurrenceTypes = [
  "ATRASO",
  "DESCUMPRIMENTO",
  "QUALIDADE",
  "SEGURANCA",
  "OUTRO",
] as const;

export const occurrenceSeverities = ["LEVE", "MEDIA", "GRAVE"] as const;

export const evidenceSchema = z.object({
  descricao: z.string().min(1, "Descrição da evidência é obrigatória"),
  referencia: z.string().optional(),
});

export const occurrenceCreateSchema = z.object({
  contractId: z.string().min(1),
  occurredAt: z.coerce.date({ error: "Data da ocorrência é obrigatória" }),
  type: z.enum(occurrenceTypes, {
    error: "Tipo é obrigatório",
  }),
  severity: z.enum(occurrenceSeverities, {
    error: "Severidade é obrigatória",
  }),
  description: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres"),
  evidences: z.array(evidenceSchema).optional(),
});

export const occurrenceUpdateSchema = occurrenceCreateSchema
  .omit({ contractId: true })
  .extend({ id: z.string().min(1) });

export type OccurrenceCreateInput = z.infer<typeof occurrenceCreateSchema>;
export type OccurrenceUpdateInput = z.infer<typeof occurrenceUpdateSchema>;
export type EvidenceInput = z.infer<typeof evidenceSchema>;
