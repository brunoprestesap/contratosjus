"use server";

import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireAuth } from "@/lib/auth-guard";
import { Prisma } from "@/generated/prisma/client";

interface ListAuditLogsParams {
  page?: number;
  perPage?: number;
  userId?: string;
  entity?: string;
  action?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogItem {
  id: string;
  createdAt: string;
  userName: string;
  entity: string;
  entityId: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

const VALID_ENTITIES = ["Contract", "Payment", "Commitment", "Additive", "User"];
const VALID_ACTIONS = ["CREATE", "UPDATE", "DELETE"];

export async function listAuditLogs(params: ListAuditLogsParams = {}): Promise<{
  logs: AuditLogItem[];
  total: number;
  totalPages: number;
}> {
  try {
    await requireAuth();

    const page = params.page ?? 1;
    const perPage = params.perPage ?? 50;
    const skip = (page - 1) * perPage;

    const where: Prisma.AuditLogWhereInput = {};

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.entity && VALID_ENTITIES.includes(params.entity)) {
      where.entity = params.entity;
    }

    if (params.action && VALID_ACTIONS.includes(params.action)) {
      where.action = params.action;
    }

    if (params.entityId) {
      where.entityId = params.entityId;
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) {
        const from = new Date(params.dateFrom);
        if (!isNaN(from.getTime())) {
          where.createdAt.gte = from;
        }
      }
      if (params.dateTo) {
        const to = new Date(params.dateTo);
        if (!isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          where.createdAt.lte = to;
        }
      }
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs: logs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        userName: log.user.name,
        entity: log.entity,
        entityId: log.entityId,
        action: log.action,
        oldValue: log.oldValue as Record<string, unknown> | null,
        newValue: log.newValue as Record<string, unknown> | null,
      })),
      total,
      totalPages: Math.ceil(total / perPage),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new Error("Erro ao buscar registros de auditoria");
  }
}

export async function listAuditUsers(): Promise<{ id: string; name: string }[]> {
  await requireAuth();
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return users;
}

export async function getContractAuditLogs(contractId: string): Promise<AuditLogItem[]> {
  await requireAuth();

  // Get audit logs for the contract itself and its sub-resources
  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: "Contract", entityId: contractId },
        {
          entity: { in: ["Payment", "Commitment", "Additive"] },
          newValue: { path: ["contractId"], equals: contractId },
        },
        {
          entity: { in: ["Payment", "Commitment", "Additive"] },
          oldValue: { path: ["contractId"], equals: contractId },
        },
      ],
    },
    include: {
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    userName: log.user.name,
    entity: log.entity,
    entityId: log.entityId,
    action: log.action,
    oldValue: log.oldValue as Record<string, unknown> | null,
    newValue: log.newValue as Record<string, unknown> | null,
  }));
}
