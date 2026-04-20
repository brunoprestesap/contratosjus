import { Prisma } from "@/generated/prisma/client";

const zero = () => new Prisma.Decimal(0);

function toDecimal(v: Prisma.Decimal | number | null | undefined): Prisma.Decimal {
  if (v === null || v === undefined) return zero();
  return v instanceof Prisma.Decimal ? v : new Prisma.Decimal(v);
}

/** Saldo do item = valor total − Σ paidValue dos pagamentos vinculados. */
export function getItemBalance(
  totalValue: Prisma.Decimal | number,
  totalPaid: Prisma.Decimal | number,
): Prisma.Decimal {
  return toDecimal(totalValue).sub(toDecimal(totalPaid));
}

/** Saldo de empenho do item = Σ CommitmentItem.value − Σ PaymentItem.settledValue. */
export function getItemCommittedBalance(
  totalCommitted: Prisma.Decimal | number,
  totalSettled: Prisma.Decimal | number,
): Prisma.Decimal {
  return toDecimal(totalCommitted).sub(toDecimal(totalSettled));
}

/** Saldo não empenhado do item = valor total − Σ CommitmentItem.value. */
export function getItemUncommittedBalance(
  totalValue: Prisma.Decimal | number,
  totalCommitted: Prisma.Decimal | number,
): Prisma.Decimal {
  return toDecimal(totalValue).sub(toDecimal(totalCommitted));
}

/** % consumido = (totalPaid / totalValue) × 100. Retorna 0 se totalValue = 0. */
export function getItemConsumedPercentage(
  totalValue: Prisma.Decimal | number,
  totalPaid: Prisma.Decimal | number,
): number {
  const tv = toDecimal(totalValue);
  if (tv.isZero()) return 0;
  return toDecimal(totalPaid).mul(100).div(tv).toNumber();
}

export interface ItemBalance {
  itemId: string;
  totalValue: Prisma.Decimal;
  totalCommitted: Prisma.Decimal;
  totalSettled: Prisma.Decimal;
  totalPaid: Prisma.Decimal;
  balance: Prisma.Decimal;
  uncommittedBalance: Prisma.Decimal;
  consumedPercentage: number;
}
