"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireFiscal } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { contractItemSchema } from "@/lib/validators/contract-item";
import type { ActionResponse } from "@/types";
import { logAudit } from "@/lib/audit";
import { diffValues } from "@/lib/audit-diff";
import { Prisma } from "@/generated/prisma/client";

function buildItemData(parsed: ReturnType<typeof contractItemSchema>["_output"]) {
  const quantity = new Prisma.Decimal(parsed.quantity.toString());
  const unitValue = new Prisma.Decimal(parsed.unitValue.toString());
  const totalValue = quantity.mul(unitValue).toDecimalPlaces(2);

  return {
    itemNumber: parsed.itemNumber,
    lotNumber: parsed.lotNumber ?? null,
    itemType: parsed.itemType,
    catalogType: parsed.catalogType,
    catalogCode: parsed.catalogCode ?? null,
    description: parsed.description,
    detailedSpecification: parsed.detailedSpecification,
    unitOfMeasure: parsed.unitOfMeasure,
    unitOfMeasureOther: parsed.unitOfMeasureOther ?? null,
    quantity,
    unitValue,
    totalValue,

    isAdjustable: parsed.isAdjustable,
    adjustmentIndex: parsed.adjustmentIndex,
    nextAdjustmentDate: parsed.nextAdjustmentDate ?? null,

    budgetProgram: parsed.budgetProgram ?? null,
    expenseNature: parsed.expenseNature ?? null,
    fundingSource: parsed.fundingSource ?? null,

    brand: parsed.brand ?? null,
    model: parsed.model ?? null,
    manufacturer: parsed.manufacturer ?? null,
    countryOfOrigin: parsed.countryOfOrigin ?? null,
    warrantyMonths: parsed.warrantyMonths ?? null,
    deliveryLocation: parsed.deliveryLocation ?? null,
    deliveryDeadlineDays: parsed.deliveryDeadlineDays ?? null,

    executionLocation: parsed.executionLocation ?? null,
    executionDeadlineDays: parsed.executionDeadlineDays ?? null,
    isContinuousService: parsed.isContinuousService,
    slaIndicators:
      parsed.slaIndicators === undefined || parsed.slaIndicators === null
        ? Prisma.DbNull
        : (parsed.slaIndicators as Prisma.InputJsonValue),
    penaltyRules: parsed.penaltyRules ?? null,

    bdiPercentage: parsed.bdiPercentage
      ? new Prisma.Decimal(parsed.bdiPercentage.toString())
      : null,
    socialChargesPercentage: parsed.socialChargesPercentage
      ? new Prisma.Decimal(parsed.socialChargesPercentage.toString())
      : null,
    sinapiReference: parsed.sinapiReference ?? null,

    pctiReference: parsed.pctiReference ?? null,
    itServiceCategory: parsed.itServiceCategory ?? null,

    sustainabilityCriteria:
      parsed.sustainabilityCriteria === undefined || parsed.sustainabilityCriteria === null
        ? Prisma.DbNull
        : (parsed.sustainabilityCriteria as Prisma.InputJsonValue),
    status: parsed.status,
  };
}

export async function createContractItem(
  contractId: string,
  data: unknown,
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireFiscal();

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, legalRegime: true },
    });
    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    const schema = contractItemSchema(contract.legalRegime);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const payload = buildItemData(parsed.data);

    const item = await prisma.contractItem.create({
      data: {
        contractId,
        ...payload,
        needsReview: false,
      },
    });

    revalidatePath(`/contratos/${contractId}`);

    await logAudit({
      entity: "ContractItem",
      entityId: item.id,
      action: "CREATE",
      newValue: {
        itemNumber: item.itemNumber,
        itemType: item.itemType,
        description: item.description,
        totalValue: item.totalValue.toString(),
        contractId,
      },
    });

    return { success: true, data: { id: item.id } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: "Já existe um item com este número neste contrato",
      };
    }
    logger.error(
      { err: error, action: "createContractItem", contractId },
      "Erro ao criar item de contrato",
    );
    return { success: false, error: "Erro ao criar item" };
  }
}

export async function updateContractItem(id: string, data: unknown): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const existing = await prisma.contractItem.findUnique({
      where: { id },
      include: { contract: { select: { legalRegime: true } } },
    });
    if (!existing) {
      return { success: false, error: "Item não encontrado" };
    }

    const schema = contractItemSchema(existing.contract.legalRegime);
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const payload = buildItemData(parsed.data);

    await prisma.contractItem.update({
      where: { id },
      data: {
        ...payload,
        needsReview: false,
      },
    });

    revalidatePath(`/contratos/${existing.contractId}`);

    const oldData: Record<string, unknown> = {
      itemNumber: existing.itemNumber,
      itemType: existing.itemType,
      description: existing.description,
      totalValue: existing.totalValue.toString(),
      status: existing.status,
    };
    const newData: Record<string, unknown> = {
      itemNumber: payload.itemNumber,
      itemType: payload.itemType,
      description: payload.description,
      totalValue: payload.totalValue.toString(),
      status: payload.status,
    };
    const diff = diffValues(oldData, newData);
    await logAudit({
      entity: "ContractItem",
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
      return {
        success: false,
        error: "Já existe um item com este número neste contrato",
      };
    }
    logger.error(
      { err: error, action: "updateContractItem", itemId: id },
      "Erro ao atualizar item de contrato",
    );
    return { success: false, error: "Erro ao atualizar item" };
  }
}

export async function deleteContractItem(id: string): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const existing = await prisma.contractItem.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            commitmentItems: true,
            paymentItems: true,
            researchItems: true,
          },
        },
      },
    });
    if (!existing) {
      return { success: false, error: "Item não encontrado" };
    }

    if (existing._count.commitmentItems > 0 || existing._count.paymentItems > 0) {
      return {
        success: false,
        error:
          "Não é possível excluir item com empenhos ou pagamentos vinculados. Cancele-o em vez de excluir.",
      };
    }

    if (existing._count.researchItems > 0) {
      return {
        success: false,
        error:
          "Item está vinculado a uma ou mais pesquisas de preços. Remova-o das pesquisas ou cancele-o em vez de excluir.",
      };
    }

    await prisma.contractItem.delete({ where: { id } });

    revalidatePath(`/contratos/${existing.contractId}`);

    await logAudit({
      entity: "ContractItem",
      entityId: id,
      action: "DELETE",
      oldValue: {
        itemNumber: existing.itemNumber,
        itemType: existing.itemType,
        description: existing.description,
        totalValue: existing.totalValue.toString(),
        contractId: existing.contractId,
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        error:
          "Item possui vínculos em outras tabelas e não pode ser excluído. Cancele-o em vez de excluir.",
      };
    }
    logger.error(
      { err: error, action: "deleteContractItem", itemId: id },
      "Erro ao excluir item de contrato",
    );
    return { success: false, error: "Erro ao excluir item" };
  }
}
