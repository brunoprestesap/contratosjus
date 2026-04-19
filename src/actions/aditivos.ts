"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireFiscal } from "@/lib/auth-guard";
import { additiveSchema } from "@/lib/validators/aditivo";
import type { ActionResponse } from "@/types";
import { Prisma, type AdditiveType } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { diffValues } from "@/lib/audit-diff";

export async function createAdditive(
  contractId: string,
  data: unknown,
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireFiscal();

    const parsed = additiveSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });
    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    const { type } = parsed.data;

    // Only TERM and MIXED additives can reactivate an expired contract
    if (contract.status === "EXPIRED" && type !== "TERM" && type !== "MIXED") {
      return {
        success: false,
        error:
          "Não é possível registrar este tipo de aditivo em um contrato encerrado. Use aditivo de prazo para reativar.",
      };
    }

    const {
      additiveNumber,
      signatureDate,
      newGlobalValue,
      newMonthlyValue,
      newEndDate,
      justification,
    } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
      const additive = await tx.additive.create({
        data: {
          contractId,
          additiveNumber,
          type: type as AdditiveType,
          signatureDate,
          newGlobalValue: newGlobalValue != null ? new Prisma.Decimal(newGlobalValue) : null,
          newMonthlyValue: newMonthlyValue != null ? new Prisma.Decimal(newMonthlyValue) : null,
          newEndDate: newEndDate ?? null,
          // Store original contract values for rollback on deletion
          originalGlobalValue: contract.globalValue,
          originalEndDate: contract.endDate,
          originalMonthlyValue: contract.estimatedMonthlyValue,
          justification,
        },
      });

      // Update contract fields based on additive
      const contractUpdate: Prisma.ContractUpdateInput = {};

      if (newGlobalValue != null) {
        contractUpdate.globalValue = new Prisma.Decimal(newGlobalValue);
      }
      if (newEndDate) {
        contractUpdate.endDate = newEndDate;
        if (newEndDate > new Date()) {
          contractUpdate.status = "ACTIVE";
        }
      }
      if (newMonthlyValue != null) {
        contractUpdate.estimatedMonthlyValue = new Prisma.Decimal(newMonthlyValue);
      }

      if (Object.keys(contractUpdate).length > 0) {
        await tx.contract.update({
          where: { id: contractId },
          data: contractUpdate,
        });
      }

      return additive;
    });

    revalidatePath(`/contratos/${contractId}`);
    revalidatePath("/contratos");

    await logAudit({
      entity: "Additive",
      entityId: result.id,
      action: "CREATE",
      newValue: {
        additiveNumber,
        type,
        newGlobalValue: newGlobalValue != null ? String(newGlobalValue) : null,
        newEndDate: newEndDate?.toISOString() ?? null,
        originalGlobalValue: contract.globalValue.toString(),
        originalEndDate: contract.endDate.toISOString(),
        contractId,
      },
    });

    return { success: true, data: { id: result.id } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Já existe um aditivo com este número neste contrato" };
    }
    return { success: false, error: "Erro ao criar aditivo" };
  }
}

export async function updateAdditive(id: string, data: unknown): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const parsed = additiveSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const existing = await prisma.additive.findUnique({
      where: { id },
      include: { contract: { select: { status: true, endDate: true } } },
    });
    if (!existing) {
      return { success: false, error: "Aditivo não encontrado" };
    }

    const { type } = parsed.data;

    // Block editing additives on expired contracts (same rule as create)
    if (existing.contract.status === "EXPIRED" && type !== "TERM" && type !== "MIXED") {
      return {
        success: false,
        error: "Não é possível editar este tipo de aditivo em um contrato encerrado",
      };
    }

    const {
      additiveNumber,
      signatureDate,
      newGlobalValue,
      newMonthlyValue,
      newEndDate,
      justification,
    } = parsed.data;

    await prisma.$transaction(async (tx) => {
      await tx.additive.update({
        where: { id },
        data: {
          additiveNumber,
          type: type as AdditiveType,
          signatureDate,
          newGlobalValue: newGlobalValue != null ? new Prisma.Decimal(newGlobalValue) : null,
          newMonthlyValue: newMonthlyValue != null ? new Prisma.Decimal(newMonthlyValue) : null,
          newEndDate: newEndDate ?? null,
          justification,
        },
      });

      await recalculateContractFromAdditives(tx, existing.contractId);
    });

    revalidatePath(`/contratos/${existing.contractId}`);
    revalidatePath("/contratos");

    const oldData: Record<string, unknown> = {
      additiveNumber: existing.additiveNumber,
      type: existing.type,
      newGlobalValue: existing.newGlobalValue?.toString() ?? null,
      newEndDate: existing.newEndDate?.toISOString() ?? null,
    };
    const newDataMap: Record<string, unknown> = {
      additiveNumber,
      type,
      newGlobalValue: newGlobalValue != null ? String(newGlobalValue) : null,
      newEndDate: newEndDate?.toISOString() ?? null,
    };
    const diff = diffValues(oldData, newDataMap);
    await logAudit({
      entity: "Additive",
      entityId: id,
      action: "UPDATE",
      oldValue: diff.oldValue,
      newValue: diff.newValue,
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Já existe um aditivo com este número neste contrato" };
    }
    return { success: false, error: "Erro ao atualizar aditivo" };
  }
}

export async function deleteAdditive(id: string): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const existing = await prisma.additive.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Aditivo não encontrado" };
    }

    await prisma.$transaction(async (tx) => {
      // Before deleting, check if this is the earliest additive — if so,
      // propagate its original snapshot to the next-earliest so rollback remains correct.
      const allBeforeDelete = await tx.additive.findMany({
        where: { contractId: existing.contractId },
        orderBy: [{ signatureDate: "asc" }, { createdAt: "asc" }],
      });
      const isEarliest = allBeforeDelete.length > 0 && allBeforeDelete[0].id === id;

      await tx.additive.delete({ where: { id } });

      const remaining = await tx.additive.findMany({
        where: { contractId: existing.contractId },
        orderBy: [{ signatureDate: "asc" }, { createdAt: "asc" }],
      });

      if (remaining.length === 0) {
        // No additives left — restore contract to original values from deleted additive's snapshot
        await tx.contract.update({
          where: { id: existing.contractId },
          data: {
            globalValue: existing.originalGlobalValue,
            endDate: existing.originalEndDate,
            estimatedMonthlyValue: existing.originalMonthlyValue,
            status: existing.originalEndDate > new Date() ? "ACTIVE" : "EXPIRED",
          },
        });
      } else {
        // If we deleted the earliest, propagate its original snapshot to the new earliest
        if (isEarliest) {
          await tx.additive.update({
            where: { id: remaining[0].id },
            data: {
              originalGlobalValue: existing.originalGlobalValue,
              originalEndDate: existing.originalEndDate,
              originalMonthlyValue: existing.originalMonthlyValue,
            },
          });
        }
        await recalculateContractFromAdditives(tx, existing.contractId);
      }
    });

    revalidatePath(`/contratos/${existing.contractId}`);
    revalidatePath("/contratos");

    await logAudit({
      entity: "Additive",
      entityId: id,
      action: "DELETE",
      oldValue: {
        additiveNumber: existing.additiveNumber,
        type: existing.type,
        newGlobalValue: existing.newGlobalValue?.toString() ?? null,
        newEndDate: existing.newEndDate?.toISOString() ?? null,
        contractId: existing.contractId,
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao excluir aditivo" };
  }
}

/**
 * Recalculates contract values from the full additive chain.
 * For each field (globalValue, endDate, monthlyValue):
 * - If any additive sets that field, use the most recent one (by signatureDate, then createdAt for determinism).
 * - If no additive sets that field, restore from the earliest additive's original snapshot.
 */
async function recalculateContractFromAdditives(tx: Prisma.TransactionClient, contractId: string) {
  const allAdditives = await tx.additive.findMany({
    where: { contractId },
    orderBy: [{ signatureDate: "desc" }, { createdAt: "desc" }],
  });

  if (allAdditives.length === 0) return;

  // The earliest additive holds the original contract values before any additive was applied
  const earliest = allAdditives[allAdditives.length - 1];

  const contractUpdate: Prisma.ContractUpdateInput = {};

  // Global value
  const latestWithGlobal = allAdditives.find((a) => a.newGlobalValue !== null);
  contractUpdate.globalValue = latestWithGlobal
    ? latestWithGlobal.newGlobalValue!
    : earliest.originalGlobalValue;

  // End date
  const latestWithEnd = allAdditives.find((a) => a.newEndDate !== null);
  if (latestWithEnd) {
    contractUpdate.endDate = latestWithEnd.newEndDate!;
    contractUpdate.status = latestWithEnd.newEndDate! > new Date() ? "ACTIVE" : "EXPIRED";
  } else {
    contractUpdate.endDate = earliest.originalEndDate;
  }

  // Monthly value
  const latestWithMonthly = allAdditives.find((a) => a.newMonthlyValue !== null);
  if (latestWithMonthly) {
    contractUpdate.estimatedMonthlyValue = latestWithMonthly.newMonthlyValue;
  } else if (earliest.originalMonthlyValue !== null) {
    contractUpdate.estimatedMonthlyValue = earliest.originalMonthlyValue;
  }

  await tx.contract.update({
    where: { id: contractId },
    data: contractUpdate,
  });
}
