import { auth } from "@/lib/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Acesso não autorizado");
  }
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function requireFiscal() {
  const session = await auth();
  if (!session?.user || session.user.role !== "FISCAL") {
    throw new UnauthorizedError();
  }
  return session;
}
