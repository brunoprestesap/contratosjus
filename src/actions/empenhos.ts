"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireFiscal } from "@/lib/auth-guard";
import { commitmentSchema } from "@/lib/validators/empenho";
import type { ActionResponse } from "@/types";
import { logAudit } from "@/lib/audit";
import { diffValues } from "@/lib/audit-diff";

export async function createCommitment(
  contractId: string,
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireFiscal();

    const parsed = commitmentSchema.safeParse(data);
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

    const commitment = await prisma.commitment.create({
      data: {
        contractId,
        commitmentNumber: parsed.data.commitmentNumber,
        commitmentDate: parsed.data.commitmentDate,
        value: parsed.data.value,
        type: parsed.data.type,
        notes: parsed.data.notes || null,
      },
    });

    revalidatePath(`/contratos/${contractId}`);

    await logAudit({
      entity: "Commitment",
      entityId: commitment.id,
      action: "CREATE",
      newValue: {
        commitmentNumber: commitment.commitmentNumber,
        value: commitment.value.toString(),
        type: commitment.type,
        contractId,
      },
    });

    return { success: true, data: { id: commitment.id } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao criar empenho" };
  }
}

export async function updateCommitment(
  id: string,
  data: unknown
): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const parsed = commitmentSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const existing = await prisma.commitment.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Empenho não encontrado" };
    }

    await prisma.commitment.update({
      where: { id },
      data: {
        commitmentNumber: parsed.data.commitmentNumber,
        commitmentDate: parsed.data.commitmentDate,
        value: parsed.data.value,
        type: parsed.data.type,
        notes: parsed.data.notes || null,
      },
    });

    revalidatePath(`/contratos/${existing.contractId}`);

    const oldData: Record<string, unknown> = {
      commitmentNumber: existing.commitmentNumber,
      value: existing.value.toString(),
      type: existing.type,
    };
    const newData: Record<string, unknown> = {
      commitmentNumber: parsed.data.commitmentNumber,
      value: String(parsed.data.value),
      type: parsed.data.type,
    };
    const diff = diffValues(oldData, newData);
    await logAudit({
      entity: "Commitment",
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
    return { success: false, error: "Erro ao atualizar empenho" };
  }
}

export async function deleteCommitment(id: string): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const existing = await prisma.commitment.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Empenho não encontrado" };
    }

    await prisma.commitment.delete({ where: { id } });

    revalidatePath(`/contratos/${existing.contractId}`);

    await logAudit({
      entity: "Commitment",
      entityId: id,
      action: "DELETE",
      oldValue: {
        commitmentNumber: existing.commitmentNumber,
        value: existing.value.toString(),
        type: existing.type,
        contractId: existing.contractId,
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao excluir empenho" };
  }
}
