"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireFiscal } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { commitmentSchema } from "@/lib/validators/empenho";
import type { ActionResponse } from "@/types";
import { logAudit } from "@/lib/audit";
import { diffValues } from "@/lib/audit-diff";
import { getEmpenhosByContrato } from "@/lib/comprasnet";
import { parseVal, safeDateOrFallback } from "@/lib/comprasnet-utils";

export async function createCommitment(
  contractId: string,
  data: unknown,
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

export async function updateCommitment(id: string, data: unknown): Promise<ActionResponse> {
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

export interface SyncResult {
  created: number;
  updated: number;
  unchanged: number;
  total: number;
}

export async function syncCommitments(contractId: string): Promise<ActionResponse<SyncResult>> {
  try {
    await requireFiscal();

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, comprasnetId: true },
    });

    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    if (!contract.comprasnetId) {
      return {
        success: false,
        error: "Contrato não possui vínculo com o Comprasnet",
      };
    }

    let remoteEmpenhos: Awaited<ReturnType<typeof getEmpenhosByContrato>>;
    try {
      remoteEmpenhos = await getEmpenhosByContrato(contract.comprasnetId);
    } catch {
      return {
        success: false,
        error:
          "Não foi possível consultar empenhos na API do Comprasnet. Tente novamente mais tarde.",
      };
    }

    if (!Array.isArray(remoteEmpenhos)) {
      remoteEmpenhos = [];
    }

    const localCommitments = await prisma.commitment.findMany({
      where: { contractId },
    });

    const byComprasnetId = new Map(
      localCommitments.filter((c) => c.comprasnetId != null).map((c) => [c.comprasnetId!, c]),
    );
    const byNumber = new Map(localCommitments.map((c) => [c.commitmentNumber, c]));

    let created = 0;
    let updated = 0;
    let unchanged = 0;

    for (const remote of remoteEmpenhos) {
      if (!remote.numero || !remote.data_emissao) continue;

      const existing = byComprasnetId.get(remote.id) ?? byNumber.get(remote.numero);

      const newValue = parseVal(remote.empenhado);
      const newDate = safeDateOrFallback(remote.data_emissao);
      const newNotes = [
        remote.credor,
        remote.naturezadespesa,
        remote.fonte_recurso ? `Fonte: ${remote.fonte_recurso}` : null,
        remote.programa_trabalho ? `PT: ${remote.programa_trabalho}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      if (existing) {
        const valueChanged = existing.value.toString() !== newValue;
        const dateChanged = existing.commitmentDate.getTime() !== newDate.getTime();
        const comprasnetIdMissing = existing.comprasnetId == null;

        if (valueChanged || dateChanged || comprasnetIdMissing) {
          const oldValue = existing.value.toString();

          await prisma.commitment.update({
            where: { id: existing.id },
            data: {
              comprasnetId: remote.id,
              ...(valueChanged && { value: newValue }),
              ...(dateChanged && { commitmentDate: newDate }),
              notes: newNotes,
            },
          });

          await logAudit({
            entity: "Commitment",
            entityId: existing.id,
            action: "UPDATE",
            oldValue: { source: "sync", value: oldValue },
            newValue: {
              source: "sync",
              value: newValue,
              comprasnetId: remote.id,
            },
          });
          updated++;
        } else {
          unchanged++;
        }
      } else {
        const commitment = await prisma.commitment.create({
          data: {
            contractId,
            comprasnetId: remote.id,
            commitmentNumber: remote.numero,
            commitmentDate: newDate,
            value: newValue,
            type: "INITIAL",
            notes: newNotes,
          },
        });

        await logAudit({
          entity: "Commitment",
          entityId: commitment.id,
          action: "CREATE",
          newValue: {
            source: "sync",
            commitmentNumber: remote.numero,
            value: newValue,
            comprasnetId: remote.id,
            contractId,
          },
        });
        created++;
      }
    }

    revalidatePath(`/contratos/${contractId}`);

    return {
      success: true,
      data: { created, updated, unchanged, total: remoteEmpenhos.length },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    logger.error({ err: error, action: "syncEmpenhos" }, "Erro ao sincronizar empenhos");
    return { success: false, error: "Erro ao sincronizar empenhos" };
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
