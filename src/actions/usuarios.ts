"use server";

import { hashSync } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { userCreateSchema, userUpdateSchema } from "@/lib/validators/usuario";
import type { ActionResponse } from "@/types";
import { logAudit } from "@/lib/audit";
import { diffValues } from "@/lib/audit-diff";

class UnauthorizedError extends Error {
  constructor() {
    super("Acesso não autorizado");
  }
}

async function requireFiscal() {
  const session = await auth();
  if (!session?.user || session.user.role !== "FISCAL") {
    throw new UnauthorizedError();
  }
  return session;
}

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new UnauthorizedError();
  }
  return session;
}

export async function createUser(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireFiscal();

    const parsed = userCreateSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing) {
      return { success: false, error: "E-mail já cadastrado" };
    }

    const passwordHash = hashSync(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: parsed.data.role,
      },
    });

    revalidatePath("/usuarios");

    await logAudit({
      entity: "User",
      entityId: user.id,
      action: "CREATE",
      newValue: {
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    return { success: true, data: { id: user.id } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao criar usuário" };
  }
}

export async function updateUser(
  id: string,
  data: unknown
): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const parsed = userUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (existing && existing.id !== id) {
      return { success: false, error: "E-mail já cadastrado por outro usuário" };
    }

    const updateData: {
      name: string;
      email: string;
      role: "FISCAL" | "DIRETOR";
      passwordHash?: string;
    } = {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
    };

    if (parsed.data.password && parsed.data.password.length > 0) {
      updateData.passwordHash = hashSync(parsed.data.password, 12);
    }

    const oldUser = await prisma.user.findUnique({
      where: { id },
      select: { name: true, email: true, role: true },
    });

    await prisma.user.update({
      where: { id },
      data: updateData,
    });

    revalidatePath("/usuarios");

    if (oldUser) {
      const oldData: Record<string, unknown> = {
        name: oldUser.name,
        email: oldUser.email,
        role: oldUser.role,
      };
      const newData: Record<string, unknown> = {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
      };
      const diff = diffValues(oldData, newData);
      await logAudit({
        entity: "User",
        entityId: id,
        action: "UPDATE",
        oldValue: diff.oldValue,
        newValue: diff.newValue,
      });
    }

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao atualizar usuário" };
  }
}

export async function deleteUser(id: string): Promise<ActionResponse> {
  try {
    const session = await requireFiscal();

    if (session.user.id === id) {
      return { success: false, error: "Não é possível desativar seu próprio usuário" };
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { name: true, status: true },
    });

    await prisma.user.update({
      where: { id },
      data: { status: "BLOCKED" },
    });

    revalidatePath("/usuarios");

    await logAudit({
      entity: "User",
      entityId: id,
      action: "UPDATE",
      oldValue: { status: user?.status ?? "ACTIVE", name: user?.name },
      newValue: { status: "BLOCKED", name: user?.name },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao desativar usuário" };
  }
}

export async function reactivateUser(id: string): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const user = await prisma.user.findUnique({
      where: { id },
      select: { name: true, status: true },
    });

    await prisma.user.update({
      where: { id },
      data: {
        status: "ACTIVE",
        failedAttempts: 0,
        lockedUntil: null,
      },
    });

    revalidatePath("/usuarios");

    await logAudit({
      entity: "User",
      entityId: id,
      action: "UPDATE",
      oldValue: { status: user?.status ?? "BLOCKED", name: user?.name },
      newValue: { status: "ACTIVE", name: user?.name },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao reativar usuário" };
  }
}

export async function listUsers() {
  await requireAuth();

  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getUser(id: string) {
  await requireAuth();

  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });
}
