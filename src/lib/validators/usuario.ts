import { z } from "zod/v4";

export const passwordSchema = z
  .string()
  .min(12, "Mínimo de 12 caracteres")
  .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
  .regex(/[a-z]/, "Deve conter ao menos uma letra minúscula")
  .regex(/[0-9]/, "Deve conter ao menos um número")
  .regex(/[^A-Za-z0-9]/, "Deve conter ao menos um caractere especial");

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const result = passwordSchema.safeParse(password);
  return {
    valid: result.success,
    errors: result.success ? [] : result.error.issues.map((i) => i.message),
  };
}

export const userCreateSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.email("E-mail inválido"),
  password: passwordSchema,
  role: z.enum(["FISCAL", "DIRETOR"], {
    error: "Perfil inválido",
  }),
});

export const userUpdateSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  email: z.email("E-mail inválido"),
  password: z
    .union([z.literal(""), passwordSchema])
    .optional(),
  role: z.enum(["FISCAL", "DIRETOR"], {
    error: "Perfil inválido",
  }),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
