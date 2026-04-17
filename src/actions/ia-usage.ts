"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, UnauthorizedError } from "@/lib/auth-guard";
import type { ActionResponse } from "@/types";

/**
 * Agrega consumo de IA a partir dos logs em `audit_logs`.
 *
 * Nós gravamos chamadas IA via `logAudit` com newValue contendo
 * aiPurpose, aiModel, inputTokens, outputTokens. Essa função agrega por
 * usuário (e por modelo) dentro de um intervalo de datas.
 */

export interface IaUsageRow {
  userId: string;
  userName: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  lastAt: Date;
  byPurpose: Record<string, number>;
}

export interface IaUsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface IaUsageReport {
  period: { start: Date; end: Date };
  totals: IaUsageTotals;
  byUser: IaUsageRow[];
  byModel: Array<{ model: string; calls: number; tokens: number }>;
}

function coerceInt(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function getAiUsageReport(params: {
  start: Date;
  end: Date;
}): Promise<ActionResponse<IaUsageReport>> {
  try {
    await requireAuth();

    // Chamadas de IA agora têm entidade dedicada "AICall" — filtro simples
    // em SQL no campo indexado `entity`. O `newValue` carrega aiPurpose,
    // aiModel, tokens.
    const logs = await prisma.auditLog.findMany({
      where: {
        createdAt: { gte: params.start, lte: params.end },
        entity: "AICall",
      },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });

    const byUserMap = new Map<string, IaUsageRow>();
    const byModelMap = new Map<string, { calls: number; tokens: number }>();
    let totalCalls = 0;
    let totalInput = 0;
    let totalOutput = 0;

    for (const log of logs) {
      const nv = log.newValue as Record<string, unknown> | null;
      if (!nv || typeof nv.aiPurpose !== "string") continue;
      const purpose = nv.aiPurpose;
      const model =
        typeof nv.aiModel === "string" ? nv.aiModel : "unknown";
      const inputTokens = coerceInt(nv.inputTokens);
      const outputTokens = coerceInt(nv.outputTokens);

      totalCalls++;
      totalInput += inputTokens;
      totalOutput += outputTokens;

      const existing = byUserMap.get(log.userId);
      if (existing) {
        existing.calls++;
        existing.inputTokens += inputTokens;
        existing.outputTokens += outputTokens;
        existing.byPurpose[purpose] = (existing.byPurpose[purpose] ?? 0) + 1;
        if (log.createdAt > existing.lastAt) existing.lastAt = log.createdAt;
      } else {
        byUserMap.set(log.userId, {
          userId: log.userId,
          userName: log.user.name,
          calls: 1,
          inputTokens,
          outputTokens,
          lastAt: log.createdAt,
          byPurpose: { [purpose]: 1 },
        });
      }

      const mEntry = byModelMap.get(model) ?? { calls: 0, tokens: 0 };
      mEntry.calls++;
      mEntry.tokens += inputTokens + outputTokens;
      byModelMap.set(model, mEntry);
    }

    const byUser = Array.from(byUserMap.values()).sort(
      (a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens)
    );
    const byModel = Array.from(byModelMap.entries())
      .map(([model, v]) => ({ model, calls: v.calls, tokens: v.tokens }))
      .sort((a, b) => b.tokens - a.tokens);

    return {
      success: true,
      data: {
        period: { start: params.start, end: params.end },
        totals: {
          calls: totalCalls,
          inputTokens: totalInput,
          outputTokens: totalOutput,
        },
        byUser,
        byModel,
      },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao consultar uso de IA" };
  }
}
