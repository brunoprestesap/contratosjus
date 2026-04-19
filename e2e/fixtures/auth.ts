import { encode } from "@auth/core/jwt";
import type { BrowserContext } from "@playwright/test";

/**
 * Cookie de sessão do NextAuth/Auth.js v5. Em http (sem TLS), o nome
 * é `authjs.session-token` (sem prefixo `__Secure-`). Valor é JWT
 * assinado pelo mesmo segredo configurado em `.env.test`.
 */
const SESSION_COOKIE_NAME = "authjs.session-token";
const SESSION_MAX_AGE_SECONDS = 30 * 60;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "FISCAL" | "DIRETOR";
}

/**
 * Forja cookie de sessão para o usuário seed e injeta no contexto do
 * browser. Evita passar pela UI de login em todo teste — é a forma
 * recomendada pela doc do Auth.js para storageState em E2E.
 */
export async function loginAs(context: BrowserContext, user: SessionUser): Promise<void> {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET/AUTH_SECRET não definido em .env.test");
  }

  // O `salt` é o próprio nome do cookie (contrato interno do Auth.js v5
  // que deriva a chave de criptografia). Token carrega `sub` + campos
  // exportados via callback `jwt` do projeto (role no claim).
  const token = await encode({
    token: {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    salt: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      expires: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
    },
  ]);
}
