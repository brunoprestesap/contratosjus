"use server";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/auth";
import type { ActionResponse } from "@/types";

/** Mensagens da cadeia de erros (Auth.js v5 pode usar CallbackRouteError em volta de CredentialsSignin). */
function collectErrorMessages(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  let depth = 0;
  while (current && depth < 10) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
    } else if (
      typeof current === "object" &&
      current !== null &&
      "message" in current
    ) {
      parts.push(String((current as { message: unknown }).message));
      current =
        "cause" in current
          ? (current as { cause: unknown }).cause
          : undefined;
    } else {
      break;
    }
    depth++;
  }
  return parts.join(" ");
}

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
    const chain = collectErrorMessages(error);
    const isCredentials =
      (typeof error === "object" &&
        error !== null &&
        "type" in error &&
        (error as { type: string }).type === "CredentialsSignin") ||
      chain.includes("Credenciais inválidas") ||
      chain.includes("CredentialsSignin");

    if (isCredentials) {
      if (chain.includes("bloqueada") && chain.includes("Contate")) {
        return {
          success: false,
          error: "Conta bloqueada. Contate o administrador.",
        };
      }
      if (chain.includes("temporariamente")) {
        return {
          success: false,
          error: "Conta temporariamente bloqueada. Tente novamente mais tarde.",
        };
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
