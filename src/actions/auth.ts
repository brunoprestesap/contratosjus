"use server";

import { signIn, signOut } from "@/lib/auth";
import { loginSchema } from "@/lib/validators/auth";
import type { ActionResponse } from "@/types";

/**
 * Coleta tipos e mensagens em toda a cadeia de erros.
 * Auth.js v5 embrulha CredentialsSignin dentro de CallbackRouteError
 * com `cause = { err, provider, ... }` (objeto plano, sem instance Error).
 * Por isso precisamos visitar `cause`, `err` e `error` em cada nível.
 */
function inspectError(error: unknown): { types: Set<string>; chain: string } {
  const types = new Set<string>();
  const messages: string[] = [];
  const visited = new WeakSet<object>();
  const queue: unknown[] = [error];

  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    if (visited.has(node as object)) continue;
    visited.add(node as object);

    const record = node as Record<string, unknown>;
    for (const key of ["type", "name", "code"] as const) {
      const value = record[key];
      if (typeof value === "string") types.add(value);
    }
    if (typeof record.message === "string") messages.push(record.message);

    for (const key of ["cause", "err", "error"] as const) {
      if (key in record) queue.push(record[key]);
    }
  }

  return { types, chain: messages.join(" ") };
}

export async function loginAction(formData: FormData): Promise<ActionResponse> {
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
    // Auth.js v5 pode lançar NEXT_REDIRECT internamente — re-lançar para o Next.js tratar
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    const { types, chain } = inspectError(error);
    const isCredentials =
      types.has("CredentialsSignin") ||
      types.has("CallbackRouteError") ||
      chain.includes("Credenciais inválidas");

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
