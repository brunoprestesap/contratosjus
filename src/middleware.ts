import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = ["/login"];
const apiAuthPrefix = "/api/auth";
const fiscalOnlyRoutes = ["/usuarios"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir rotas de API auth
  if (pathname.startsWith(apiAuthPrefix)) {
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
      return NextResponse.redirect(new URL("/contratos", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
