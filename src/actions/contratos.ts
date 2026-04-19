"use server";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireFiscal, requireAuth } from "@/lib/auth-guard";
import { contractCreateSchema, contractUpdateSchema } from "@/lib/validators/contrato";
import type { ActionResponse } from "@/types";
import { Prisma } from "@/generated/prisma/client";
import { getMissingPaymentMonths } from "@/lib/missing-payments";
import { logAudit } from "@/lib/audit";
import { diffValues } from "@/lib/audit-diff";

/** Converte Prisma.Decimal → string para o boundary RSC, preservando Date. */
function serializeDecimals<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Prisma.Decimal) return value.toString() as unknown as T;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((item) => serializeDecimals(item)) as unknown as T;
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
      out[key] = serializeDecimals(source[key]);
    }
    return out as T;
  }
  return value;
}

const VALID_STATUSES = ["ACTIVE", "EXPIRED"] as const;
const VALID_LEGAL_REGIMES = ["LEI_14133_2021", "LEI_8666_1993"] as const;

export async function createContract(data: unknown): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireFiscal();

    const parsed = contractCreateSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const contract = await prisma.contract.create({
      data: {
        contractNumber: parsed.data.contractNumber,
        processNumber: parsed.data.processNumber,
        object: parsed.data.object,
        supplier: parsed.data.supplier,
        supplierCnpj: parsed.data.supplierCnpj.replace(/\D/g, ""),
        legalRegime: parsed.data.legalRegime,
        biddingModality: parsed.data.biddingModality,
        signatureDate: parsed.data.signatureDate,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        canExtend: parsed.data.canExtend,
        globalValue: parsed.data.globalValue,
        paymentType: parsed.data.paymentType,
        estimatedMonthlyValue: parsed.data.estimatedMonthlyValue ?? null,
        paymentPeriodicity: parsed.data.paymentPeriodicity,
        budgetProgram: parsed.data.budgetProgram || null,
        expenseNature: parsed.data.expenseNature || null,
        fiscalHolder: parsed.data.fiscalHolder,
        fiscalSubstitute: parsed.data.fiscalSubstitute || null,
        contractManager: parsed.data.contractManager || null,
      },
    });

    revalidatePath("/contratos");

    await logAudit({
      entity: "Contract",
      entityId: contract.id,
      action: "CREATE",
      newValue: {
        contractNumber: contract.contractNumber,
        supplier: contract.supplier,
        globalValue: contract.globalValue.toString(),
        startDate: contract.startDate.toISOString(),
        endDate: contract.endDate.toISOString(),
      },
    });

    return { success: true, data: { id: contract.id } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "Número de contrato já cadastrado" };
    }
    return { success: false, error: "Erro ao criar contrato" };
  }
}

export async function updateContract(id: string, data: unknown): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const parsed = contractUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const duplicateCheck = await prisma.contract.findUnique({
      where: { contractNumber: parsed.data.contractNumber },
    });
    if (duplicateCheck && duplicateCheck.id !== id) {
      return {
        success: false,
        error: "Número de contrato já cadastrado por outro contrato",
      };
    }

    const oldContract = await prisma.contract.findUnique({ where: { id } });
    if (!oldContract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    await prisma.contract.update({
      where: { id },
      data: {
        contractNumber: parsed.data.contractNumber,
        processNumber: parsed.data.processNumber,
        object: parsed.data.object,
        supplier: parsed.data.supplier,
        supplierCnpj: parsed.data.supplierCnpj.replace(/\D/g, ""),
        legalRegime: parsed.data.legalRegime,
        biddingModality: parsed.data.biddingModality,
        signatureDate: parsed.data.signatureDate,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        canExtend: parsed.data.canExtend,
        globalValue: parsed.data.globalValue,
        paymentType: parsed.data.paymentType,
        estimatedMonthlyValue: parsed.data.estimatedMonthlyValue ?? null,
        paymentPeriodicity: parsed.data.paymentPeriodicity,
        budgetProgram: parsed.data.budgetProgram || null,
        expenseNature: parsed.data.expenseNature || null,
        fiscalHolder: parsed.data.fiscalHolder,
        fiscalSubstitute: parsed.data.fiscalSubstitute || null,
        contractManager: parsed.data.contractManager || null,
      },
    });

    revalidatePath("/contratos");
    revalidatePath(`/contratos/${id}`);

    const oldData: Record<string, unknown> = {
      contractNumber: oldContract.contractNumber,
      supplier: oldContract.supplier,
      globalValue: oldContract.globalValue.toString(),
      endDate: oldContract.endDate.toISOString(),
      fiscalHolder: oldContract.fiscalHolder,
    };
    const newData: Record<string, unknown> = {
      contractNumber: parsed.data.contractNumber,
      supplier: parsed.data.supplier,
      globalValue: String(parsed.data.globalValue),
      endDate: parsed.data.endDate.toISOString(),
      fiscalHolder: parsed.data.fiscalHolder,
    };
    const diff = diffValues(oldData, newData);
    await logAudit({
      entity: "Contract",
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
        error: "Número de contrato já cadastrado por outro contrato",
      };
    }
    return { success: false, error: "Erro ao atualizar contrato" };
  }
}

export async function deleteContract(id: string): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const existing = await prisma.contract.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Contrato não encontrado" };
    }

    await prisma.contract.delete({
      where: { id },
    });

    revalidatePath("/contratos");

    await logAudit({
      entity: "Contract",
      entityId: id,
      action: "DELETE",
      oldValue: {
        contractNumber: existing.contractNumber,
        supplier: existing.supplier,
        globalValue: existing.globalValue.toString(),
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao excluir contrato" };
  }
}

interface ListContractsParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  legalRegime?: string;
}

interface ContractListItem {
  id: string;
  contractNumber: string;
  supplier: string;
  object: string;
  endDate: Date;
  globalValue: string;
  status: string;
  totalPaid: string;
  missingPaymentCount: number;
}

export async function listContracts(params: ListContractsParams = {}): Promise<{
  contracts: ContractListItem[];
  total: number;
  totalPages: number;
}> {
  try {
    await requireAuth();

    const page = params.page ?? 1;
    const perPage = params.perPage ?? 10;
    const skip = (page - 1) * perPage;

    const where: Prisma.ContractWhereInput = {};

    if (params.search) {
      const or: Prisma.ContractWhereInput[] = [
        { contractNumber: { contains: params.search, mode: "insensitive" } },
        { supplier: { contains: params.search, mode: "insensitive" } },
        { object: { contains: params.search, mode: "insensitive" } },
      ];
      const digits = params.search.replace(/\D/g, "");
      if (digits.length > 0) {
        or.push({ supplierCnpj: { contains: digits } });
      }
      where.OR = or;
    }

    if (
      params.status &&
      params.status !== "ALL" &&
      (VALID_STATUSES as readonly string[]).includes(params.status)
    ) {
      where.status = params.status as "ACTIVE" | "EXPIRED";
    }

    if (
      params.legalRegime &&
      params.legalRegime !== "ALL" &&
      (VALID_LEGAL_REGIMES as readonly string[]).includes(params.legalRegime)
    ) {
      where.legalRegime = params.legalRegime as "LEI_14133_2021" | "LEI_8666_1993";
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        select: {
          id: true,
          contractNumber: true,
          supplier: true,
          object: true,
          startDate: true,
          endDate: true,
          globalValue: true,
          status: true,
          paymentType: true,
          paymentPeriodicity: true,
          payments: {
            select: { paidValue: true, referenceMonth: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.contract.count({ where }),
    ]);

    const contractsWithTotals = contracts.map((c) => {
      const totalPaidDecimal = c.payments.reduce(
        (sum, p) => sum.add(p.paidValue ?? new Prisma.Decimal(0)),
        new Prisma.Decimal(0),
      );

      const missingMonths = getMissingPaymentMonths({
        paymentType: c.paymentType,
        paymentPeriodicity: c.paymentPeriodicity,
        startDate: c.startDate,
        endDate: c.endDate,
        payments: c.payments,
      });

      return {
        id: c.id,
        contractNumber: c.contractNumber,
        supplier: c.supplier,
        object: c.object,
        endDate: c.endDate,
        globalValue: c.globalValue.toFixed(2),
        status: c.status,
        totalPaid: totalPaidDecimal.toFixed(2),
        missingPaymentCount: missingMonths.length,
      };
    });

    return {
      contracts: contractsWithTotals,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    return { contracts: [], total: 0, totalPages: 0 };
  }
}

export const getContract = cache(async (id: string) => {
  try {
    await requireAuth();

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        commitments: { orderBy: { commitmentDate: "desc" } },
        payments: { orderBy: { referenceMonth: "desc" } },
        additives: { orderBy: { signatureDate: "desc" } },
        historicos: { orderBy: { criadoEm: "desc" } },
        cronogramas: { orderBy: { anoRef: "desc" } },
        garantias: true,
        itens: true,
        prepostos: true,
        ocorrencias: { orderBy: { data: "desc" } },
        terceirizados: true,
        arquivos: true,
        faturas: { orderBy: { anoRef: "desc" } },
        publicacoes: { orderBy: { dataPublicacao: "desc" } },
      },
    });

    if (!contract) return null;

    return serializeDecimals(contract);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    return null;
  }
});
