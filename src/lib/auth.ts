import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutos
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          throw new Error("Credenciais inválidas");
        }

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          throw new Error("Credenciais inválidas");
        }

        // Verificar se conta está bloqueada permanentemente
        if (user.status === "BLOCKED") {
          throw new Error("Conta bloqueada. Contate o administrador.");
        }

        // Verificar bloqueio temporário
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("Conta temporariamente bloqueada. Tente novamente mais tarde.");
        }

        // Se lockedUntil expirou, limpar
        if (user.lockedUntil && user.lockedUntil <= new Date()) {
          await prisma.user.update({
            where: { id: user.id },
            data: { lockedUntil: null, failedAttempts: 0 },
          });
        }

        const passwordMatch = await compare(password, user.passwordHash);

        if (!passwordMatch) {
          // Incremento atômico para evitar race condition em tentativas concorrentes
          const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
              failedAttempts: { increment: 1 },
            },
            select: { failedAttempts: true },
          });

          if (updated.failedAttempts >= 5) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
              },
            });
          }

          throw new Error("Credenciais inválidas");
        }

        // Login bem-sucedido: resetar contadores
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    // Nota: role é gravada no JWT no login e não é re-lida do banco.
    // Se o perfil do usuário mudar, a alteração só vale após novo login.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});
