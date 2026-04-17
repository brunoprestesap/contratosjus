"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { paymentCreateSchema, paymentUpdateSchema } from "@/lib/validators/pagamento";
import type { ActionResponse } from "@/types";
import { Prisma } from "@/generated/prisma/client";
import { logAudit } from "@/lib/audit";
import { diffValues } from "@/lib/audit-diff";

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

export async function createPayment(
  contractId: string,
  data: unknown
): Promise<ActionResponse<{ id: string }>> {
  try {
    await requireFiscal();

    const parsed = paymentCreateSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        payments: { select: { paidValue: true } },
        commitments: { select: { value: true } },
      },
    });
    if (!contract) {
      return { success: false, error: "Contrato não encontrado" };
    }

    // BLOQUEAR: contrato expirado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(contract.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < today) {
      return {
        success: false,
        error: "Não é possível registrar pagamento em contrato expirado",
      };
    }

    // Verificar unicidade de referenceMonth
    const existing = await prisma.payment.findUnique({
      where: {
        contractId_referenceMonth: {
          contractId,
          referenceMonth: parsed.data.referenceMonth,
        },
      },
    });
    if (existing) {
      return {
        success: false,
        error: "Já existe um registro para este mês de referência",
      };
    }

    const payment = await prisma.payment.create({
      data: {
        contractId,
        referenceMonth: parsed.data.referenceMonth,
        invoiceValue: parsed.data.invoiceValue ?? null,
        attestDate: parsed.data.attestDate,
        attestNotes: parsed.data.attestNotes || null,
        settlementDate: parsed.data.settlementDate ?? null,
        settledValue: parsed.data.settledValue ?? null,
        paidAt: parsed.data.paidAt ?? null,
        paidValue: parsed.data.paidValue ?? null,
      },
    });

    revalidatePath(`/contratos/${contractId}`);

    await logAudit({
      entity: "Payment",
      entityId: payment.id,
      action: "CREATE",
      newValue: {
        referenceMonth: parsed.data.referenceMonth.toISOString(),
        invoiceValue: parsed.data.invoiceValue ? String(parsed.data.invoiceValue) : null,
        paidValue: parsed.data.paidValue ? String(parsed.data.paidValue) : null,
        contractId,
      },
    });

    // ALERTAR: estouro de valor global
    // Usar saldo não-liquidado dos empenhos (empenhado - liquidado)
    const totalPaid = contract.payments.reduce(
      (sum, p) => sum.add(p.paidValue ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0)
    );
    const newPaid = parsed.data.paidValue
      ? totalPaid.add(new Prisma.Decimal(parsed.data.paidValue))
      : totalPaid;
    const totalCommitted = contract.commitments.reduce(
      (sum, c) => sum.add(c.value),
      new Prisma.Decimal(0)
    );
    // Saldo de empenho = empenhado - liquidado (não conta o que já foi liquidado)
    const totalSettled = contract.payments.reduce(
      (sum, p) => sum.add(p.paidValue ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0)
    );
    const uncommittedBalance = totalCommitted.sub(totalSettled);
    const effectiveCommitted = uncommittedBalance.gt(new Prisma.Decimal(0))
      ? uncommittedBalance
      : new Prisma.Decimal(0);

    if (newPaid.add(effectiveCommitted).gt(contract.globalValue)) {
      return {
        success: true,
        data: { id: payment.id },
        warning:
          "Atenção: o total pago + saldo de empenho excede o valor global do contrato",
      };
    }

    return { success: true, data: { id: payment.id } };
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
        error: "Já existe um registro para este mês de referência",
      };
    }
    return { success: false, error: "Erro ao criar pagamento" };
  }
}

export async function updatePayment(
  id: string,
  data: unknown
): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const parsed = paymentUpdateSchema.safeParse(data);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return { success: false, error: firstError };
    }

    const existing = await prisma.payment.findUnique({
      where: { id },
      include: {
        contract: {
          include: {
            payments: { select: { id: true, paidValue: true } },
            commitments: { select: { value: true } },
          },
        },
      },
    });
    if (!existing) {
      return { success: false, error: "Pagamento não encontrado" };
    }

    // BLOQUEAR: contrato expirado
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(existing.contract.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (endDate < today) {
      return {
        success: false,
        error: "Não é possível editar pagamento em contrato expirado",
      };
    }

    await prisma.payment.update({
      where: { id },
      data: {
        referenceMonth: parsed.data.referenceMonth,
        invoiceValue: parsed.data.invoiceValue ?? null,
        attestDate: parsed.data.attestDate ?? null,
        attestNotes: parsed.data.attestNotes || null,
        settlementDate: parsed.data.settlementDate ?? null,
        settledValue: parsed.data.settledValue ?? null,
        paidAt: parsed.data.paidAt ?? null,
        paidValue: parsed.data.paidValue ?? null,
      },
    });

    revalidatePath(`/contratos/${existing.contractId}`);

    const oldData: Record<string, unknown> = {
      referenceMonth: existing.referenceMonth.toISOString(),
      invoiceValue: existing.invoiceValue?.toString() ?? null,
      settledValue: existing.settledValue?.toString() ?? null,
      paidValue: existing.paidValue?.toString() ?? null,
    };
    const newData: Record<string, unknown> = {
      referenceMonth: parsed.data.referenceMonth.toISOString(),
      invoiceValue: parsed.data.invoiceValue ? String(parsed.data.invoiceValue) : null,
      settledValue: parsed.data.settledValue ? String(parsed.data.settledValue) : null,
      paidValue: parsed.data.paidValue ? String(parsed.data.paidValue) : null,
    };
    const diff = diffValues(oldData, newData);
    await logAudit({
      entity: "Payment",
      entityId: id,
      action: "UPDATE",
      oldValue: diff.oldValue,
      newValue: diff.newValue,
    });

    // ALERTAR: estouro de valor global (usar saldo não-liquidado)
    const otherPayments = existing.contract.payments.filter((p) => p.id !== id);
    const totalPaid = otherPayments.reduce(
      (sum, p) => sum.add(p.paidValue ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0)
    );
    const newPaid = parsed.data.paidValue
      ? totalPaid.add(new Prisma.Decimal(parsed.data.paidValue))
      : totalPaid;
    const totalCommitted = existing.contract.commitments.reduce(
      (sum, c) => sum.add(c.value),
      new Prisma.Decimal(0)
    );
    const totalSettledUp = existing.contract.payments.reduce(
      (sum, p) => sum.add(p.paidValue ?? new Prisma.Decimal(0)),
      new Prisma.Decimal(0)
    );
    const uncommittedBal = totalCommitted.sub(totalSettledUp);
    const effectiveComm = uncommittedBal.gt(new Prisma.Decimal(0))
      ? uncommittedBal
      : new Prisma.Decimal(0);

    if (newPaid.add(effectiveComm).gt(existing.contract.globalValue)) {
      return {
        success: true,
        warning:
          "Atenção: o total pago + empenhado excede o valor global do contrato",
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao atualizar pagamento" };
  }
}

export async function deletePayment(id: string): Promise<ActionResponse> {
  try {
    await requireFiscal();

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Pagamento não encontrado" };
    }

    await prisma.payment.delete({ where: { id } });

    revalidatePath(`/contratos/${existing.contractId}`);

    await logAudit({
      entity: "Payment",
      entityId: id,
      action: "DELETE",
      oldValue: {
        referenceMonth: existing.referenceMonth.toISOString(),
        invoiceValue: existing.invoiceValue?.toString() ?? null,
        paidValue: existing.paidValue?.toString() ?? null,
        contractId: existing.contractId,
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Erro ao excluir pagamento" };
  }
}
