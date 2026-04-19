"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateAlerts, type Alert } from "@/lib/alerts";
import type { ActionResponse } from "@/types";

export async function getAlerts(): Promise<Alert[]> {
  const session = await auth();
  if (!session?.user) return [];

  const [contracts, dismissed] = await Promise.all([
    prisma.contract.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        contractNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        globalValue: true,
        paymentType: true,
        paymentPeriodicity: true,
        payments: {
          select: {
            paidValue: true,
            referenceMonth: true,
          },
        },
      },
    }),
    prisma.dismissedAlert.findMany({
      where: { userId: session.user.id },
      select: { alertId: true },
    }),
  ]);

  const dismissedIds = new Set(dismissed.map((d) => d.alertId));
  const allAlerts = generateAlerts(contracts);

  return allAlerts.map((alert) => ({
    ...alert,
    read: dismissedIds.has(alert.id),
  }));
}

export async function dismissAlert(alertId: string): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Acesso não autorizado" };
    }

    await prisma.dismissedAlert.upsert({
      where: {
        userId_alertId: {
          userId: session.user.id,
          alertId,
        },
      },
      create: {
        userId: session.user.id,
        alertId,
      },
      update: {},
    });

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao marcar alerta como lido" };
  }
}

export async function dismissAllAlerts(alertIds: string[]): Promise<ActionResponse> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Acesso não autorizado" };
    }

    if (alertIds.length > 200) {
      return { success: false, error: "Limite de alertas excedido" };
    }

    await prisma.$transaction(
      alertIds.map((alertId) =>
        prisma.dismissedAlert.upsert({
          where: {
            userId_alertId: {
              userId: session.user.id,
              alertId,
            },
          },
          create: {
            userId: session.user.id,
            alertId,
          },
          update: {},
        }),
      ),
    );

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return { success: false, error: "Erro ao marcar alertas como lidos" };
  }
}
