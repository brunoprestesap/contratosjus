"use server";

import { prisma } from "@/lib/prisma";
import { UnauthorizedError, requireAuth } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import { Prisma } from "@/generated/prisma/client";

interface ListAllPaymentsParams {
  page?: number;
  perPage?: number;
  contractId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface TransversalPaymentItem {
  id: string;
  contractId: string;
  contractNumber: string;
  supplier: string;
  referenceMonth: string;
  invoiceValue: number | null;
  attestDate: string | null;
  settlementDate: string | null;
  paidAt: string | null;
  paidValue: number | null;
}

const VALID_STATUSES = ["Pendente", "Atestado", "Liquidado", "Pago"];
const CUID_REGEX = /^c[a-z0-9]{24}$/;

function buildStatusFilter(status: string): Prisma.PaymentWhereInput {
  switch (status) {
    case "Pago":
      return { paidAt: { not: null } };
    case "Liquidado":
      return { settlementDate: { not: null }, paidAt: null };
    case "Atestado":
      return { attestDate: { not: null }, settlementDate: null };
    case "Pendente":
      return { attestDate: null };
    default:
      return {};
  }
}

export async function listAllPayments(params: ListAllPaymentsParams = {}): Promise<{
  payments: TransversalPaymentItem[];
  total: number;
  totalPages: number;
}> {
  try {
    await requireAuth();

    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;
    const skip = (page - 1) * perPage;

    const where: Prisma.PaymentWhereInput = {};

    if (params.contractId && CUID_REGEX.test(params.contractId)) {
      where.contractId = params.contractId;
    }

    if (params.startDate || params.endDate) {
      where.referenceMonth = {};
      if (params.startDate) {
        const from = new Date(params.startDate + "-01");
        if (!isNaN(from.getTime())) {
          (where.referenceMonth as Prisma.DateTimeFilter).gte = from;
        }
      }
      if (params.endDate) {
        const to = new Date(params.endDate + "-01");
        if (!isNaN(to.getTime())) {
          // End of month: set to last day
          to.setMonth(to.getMonth() + 1);
          to.setDate(0);
          to.setHours(23, 59, 59, 999);
          (where.referenceMonth as Prisma.DateTimeFilter).lte = to;
        }
      }
    }

    if (params.status && VALID_STATUSES.includes(params.status)) {
      const statusFilter = buildStatusFilter(params.status);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        statusFilter,
      ];
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          contract: {
            select: {
              id: true,
              contractNumber: true,
              supplier: true,
            },
          },
        },
        orderBy: { referenceMonth: "desc" },
        skip,
        take: perPage,
      }),
      prisma.payment.count({ where }),
    ]);

    const serialized: TransversalPaymentItem[] = payments.map((p) => ({
      id: p.id,
      contractId: p.contract.id,
      contractNumber: p.contract.contractNumber,
      supplier: p.contract.supplier,
      referenceMonth: p.referenceMonth.toISOString(),
      invoiceValue: p.invoiceValue ? Number(p.invoiceValue) : null,
      attestDate: p.attestDate?.toISOString() ?? null,
      settlementDate: p.settlementDate?.toISOString() ?? null,
      paidAt: p.paidAt?.toISOString() ?? null,
      paidValue: p.paidValue ? Number(p.paidValue) : null,
    }));

    return {
      payments: serialized,
      total,
      totalPages: Math.ceil(total / perPage),
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    logger.error({ err: error, action: "listPagamentosTransversal" }, "Erro ao listar pagamentos");
    return { payments: [], total: 0, totalPages: 0 };
  }
}

export async function listContractsForFilter(): Promise<
  { id: string; contractNumber: string; supplier: string }[]
> {
  try {
    await requireAuth();

    const contracts = await prisma.contract.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        contractNumber: true,
        supplier: true,
      },
      orderBy: { contractNumber: "asc" },
    });

    return contracts;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    logger.error(
      { err: error, action: "listContractsForFilter" },
      "Erro ao listar contratos para filtro",
    );
    return [];
  }
}
