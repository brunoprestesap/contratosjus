"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireFiscal, UnauthorizedError } from "@/lib/auth-guard";
import { logAudit } from "@/lib/audit";
import {
  occurrenceCreateSchema,
  occurrenceUpdateSchema,
  type OccurrenceCreateInput,
  type OccurrenceUpdateInput,
} from "@/lib/validators/ocorrencia";
import type { Prisma } from "@/generated/prisma/client";
import type { ActionResponse } from "@/types";

function handleError(error: unknown): ActionResponse<never> {
  if (error instanceof UnauthorizedError) {
    return { success: false, error: error.message };
  }
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  return { success: false, error: message };
}

export async function createOccurrence(
  input: OccurrenceCreateInput,
): Promise<ActionResponse<{ id: string }>> {
  try {
    const session = await requireFiscal();
    const parsed = occurrenceCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const occ = await prisma.fiscalOccurrence.create({
      data: {
        contractId: parsed.data.contractId,
        reportedById: session.user.id,
        occurredAt: parsed.data.occurredAt,
        type: parsed.data.type,
        severity: parsed.data.severity,
        description: parsed.data.description,
        evidences: (parsed.data.evidences ?? []) as Prisma.InputJsonValue,
      },
    });

    await logAudit({
      entity: "FiscalOccurrence",
      entityId: occ.id,
      action: "CREATE",
      newValue: {
        contractId: occ.contractId,
        type: occ.type,
        severity: occ.severity,
      },
    });

    revalidatePath(`/contratos/${parsed.data.contractId}`);
    revalidatePath(`/contratos/${parsed.data.contractId}/ocorrencias`);
    return { success: true, data: { id: occ.id } };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateOccurrence(
  input: OccurrenceUpdateInput,
): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const parsed = occurrenceUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const existing = await prisma.fiscalOccurrence.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, contractId: true },
    });
    if (!existing) {
      return { success: false, error: "Ocorrência não encontrada" };
    }

    const updated = await prisma.fiscalOccurrence.update({
      where: { id: parsed.data.id },
      data: {
        occurredAt: parsed.data.occurredAt,
        type: parsed.data.type,
        severity: parsed.data.severity,
        description: parsed.data.description,
        evidences: (parsed.data.evidences ?? []) as Prisma.InputJsonValue,
      },
    });

    await logAudit({
      entity: "FiscalOccurrence",
      entityId: updated.id,
      action: "UPDATE",
      newValue: {
        type: updated.type,
        severity: updated.severity,
      },
    });

    revalidatePath(`/contratos/${existing.contractId}/ocorrencias`);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteOccurrence(id: string): Promise<ActionResponse<void>> {
  try {
    await requireFiscal();
    const existing = await prisma.fiscalOccurrence.findUnique({
      where: { id },
      select: { id: true, contractId: true },
    });
    if (!existing) {
      return { success: false, error: "Ocorrência não encontrada" };
    }

    await prisma.fiscalOccurrence.delete({ where: { id } });

    await logAudit({
      entity: "FiscalOccurrence",
      entityId: id,
      action: "DELETE",
      oldValue: { contractId: existing.contractId },
    });

    revalidatePath(`/contratos/${existing.contractId}/ocorrencias`);
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function listOccurrencesByContract(contractId: string): Promise<
  ActionResponse<
    Array<{
      id: string;
      occurredAt: Date;
      type: string;
      severity: string;
      description: string;
      reportedByName: string;
      createdAt: Date;
      hasRegistroDoc: boolean;
    }>
  >
> {
  try {
    await requireAuth();
    const [occs, existingDocs] = await Promise.all([
      prisma.fiscalOccurrence.findMany({
        where: { contractId },
        orderBy: { occurredAt: "desc" },
        include: { reportedBy: { select: { name: true } } },
      }),
      prisma.generatedDocument.findMany({
        where: {
          contractId,
          templateId: "fiscalizacao.registro-ocorrencia",
          status: { in: ["GENERATED", "SIGNED"] },
        },
        select: { fiscalOccurrenceId: true },
      }),
    ]);
    const withDoc = new Set(existingDocs.map((d) => d.fiscalOccurrenceId).filter(Boolean));

    return {
      success: true,
      data: occs.map((o) => ({
        id: o.id,
        occurredAt: o.occurredAt,
        type: o.type,
        severity: o.severity,
        description: o.description,
        reportedByName: o.reportedBy.name,
        createdAt: o.createdAt,
        hasRegistroDoc: withDoc.has(o.id),
      })),
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function getOccurrence(id: string): Promise<
  ActionResponse<{
    id: string;
    contractId: string;
    occurredAt: Date;
    type: string;
    severity: string;
    description: string;
    evidences: Array<{ descricao: string; referencia?: string }>;
  }>
> {
  try {
    await requireAuth();
    const occ = await prisma.fiscalOccurrence.findUnique({ where: { id } });
    if (!occ) return { success: false, error: "Ocorrência não encontrada" };

    const evidencesRaw = occ.evidences;
    const evidences: Array<{ descricao: string; referencia?: string }> = [];
    if (Array.isArray(evidencesRaw)) {
      for (const item of evidencesRaw) {
        if (typeof item === "object" && item !== null) {
          const obj = item as Record<string, unknown>;
          if (typeof obj.descricao === "string") {
            evidences.push({
              descricao: obj.descricao,
              referencia: typeof obj.referencia === "string" ? obj.referencia : undefined,
            });
          }
        }
      }
    }

    return {
      success: true,
      data: {
        id: occ.id,
        contractId: occ.contractId,
        occurredAt: occ.occurredAt,
        type: occ.type,
        severity: occ.severity,
        description: occ.description,
        evidences,
      },
    };
  } catch (error) {
    return handleError(error);
  }
}
