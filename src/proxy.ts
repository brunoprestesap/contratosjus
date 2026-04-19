import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = ["/login"];
const apiAuthPrefix = "/api/auth";
const e2eApiPrefix = "/api/e2e";
const fiscalOnlyRoutes = ["/usuarios"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir rotas de API auth
  if (pathname.startsWith(apiAuthPrefix)) {
    return NextResponse.next();
  }

  // Endpoints de suporte a E2E — gated por env explícita definida
  // apenas em `.env.test`. A route em si também checa a env antes de
  // executar o seed (defesa em profundidade).
  if (process.env.E2E_ENABLED === "true" && pathname.startsWith(e2eApiPrefix)) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET não configurado");
  }
  const token = await getToken({ req, secret });

  // Permitir rotas públicas
  if (publicRoutes.includes(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL("/contratos", req.url));
    }
    return NextResponse.next();
  }

  // Proteger rotas privadas
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Verificar autorização por perfil
  if (token.role === "DIRETOR") {
    const isRestricted = fiscalOnlyRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/"),
    );
    if (isRestricted) {
      // Proxy roda em Edge Runtime — pino não é suportado, usar console.warn com JSON.
      console.warn(
        JSON.stringify({
          event: "access.denied",
          reason: "role_restricted",
          role: token.role,
          userId: token.id,
          pathname,
          time: new Date().toISOString(),
        }),
      );
      return NextResponse.redirect(new URL("/contratos", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
