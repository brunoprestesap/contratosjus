import { z } from "zod/v4";

export const suggestFieldSchema = z.object({
  templateId: z.string().min(1, "Template é obrigatório"),
  contractId: z.string().min(1, "Contrato é obrigatório"),
  sectionId: z.string().min(1, "Seção é obrigatória"),
  existingText: z.string().optional(),
  userHint: z.string().optional(),
  extraContext: z.record(z.string(), z.unknown()).optional(),
});

export const checkCoherenceSchema = z.object({
  templateId: z.string().min(1),
  contractId: z.string().min(1),
  draft: z.record(z.string(), z.unknown()),
});

export const uploadSignedSchema = z.object({
  documentId: z.string().min(1),
});

export type SuggestFieldInput = z.infer<typeof suggestFieldSchema>;
export type CheckCoherenceInput = z.infer<typeof checkCoherenceSchema>;
export type UploadSignedInput = z.infer<typeof uploadSignedSchema>;
