"use server";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/auth";
import type { ActionResponse } from "@/types";

export async function loginAction(
  formData: FormData
): Promise<ActionResponse> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    return { success: true };
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      error.type === "CredentialsSignin"
    ) {
      const cause = (error as { cause?: { err?: Error } }).cause?.err?.message;

      // Mapear mensagens internas para mensagens fixas ao cliente
      if (cause?.includes("bloqueada") && cause.includes("Contate")) {
        return { success: false, error: "Conta bloqueada. Contate o administrador." };
      }
      if (cause?.includes("temporariamente")) {
        return { success: false, error: "Conta temporariamente bloqueada. Tente novamente mais tarde." };
      }
      return { success: false, error: "Credenciais inválidas" };
    }

    // Erro inesperado (DB down, rede, etc.) — não expor ao cliente
    return { success: false, error: "Erro interno. Tente novamente." };
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirect: false });
}
