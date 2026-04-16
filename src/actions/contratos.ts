"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  contractCreateSchema,
  contractUpdateSchema,
} from "@/lib/validators/contrato";
import type { ActionResponse } from "@/types";
import { Prisma } from "@/generated/prisma/client";

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

const VALID_STATUSES = ["ACTIVE", "EXPIRED"] as const;
const VALID_LEGAL_REGIMES = ["LEI_14133_2021", "LEI_8666_1993"] as const;

export async function createContract(
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
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
    return { success: true, data: { id: contract.id } };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "Número de contrato já cadastrado" };
    }
    return { success: false, error: "Erro ao criar contrato" };
  }
}

export async function updateContract(
  id: string,
  data: unknown
): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const parsed = contractUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const existing = await prisma.contract.findUnique({
      where: { contractNumber: parsed.data.contractNumber },
    });
    if (existing && existing.id !== id) {
      return {
        success: false,
        error: "Número de contrato já cadastrado por outro contrato",
      };
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
    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
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
}

export async function listContracts(
  params: ListContractsParams = {}
): Promise<{
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
      where.OR = [
        { contractNumber: { contains: params.search, mode: "insensitive" } },
        { supplier: { contains: params.search, mode: "insensitive" } },
        { object: { contains: params.search, mode: "insensitive" } },
      ];
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
      where.legalRegime = params.legalRegime as
        | "LEI_14133_2021"
        | "LEI_8666_1993";
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        select: {
          id: true,
          contractNumber: true,
          supplier: true,
          object: true,
          endDate: true,
          globalValue: true,
          status: true,
          payments: {
            select: { paidValue: true },
            where: { paidValue: { not: null } },
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
        new Prisma.Decimal(0)
      );

      return {
        id: c.id,
        contractNumber: c.contractNumber,
        supplier: c.supplier,
        object: c.object,
        endDate: c.endDate,
        globalValue: c.globalValue.toFixed(2),
        status: c.status,
        totalPaid: totalPaidDecimal.toFixed(2),
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

export async function getContract(id: string) {
  try {
    await requireAuth();

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        commitments: { orderBy: { commitmentDate: "desc" } },
        payments: { orderBy: { referenceMonth: "desc" } },
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

    return contract;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    return null;
  }
}
