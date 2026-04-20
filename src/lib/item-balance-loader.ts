import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  type ItemBalance,
  getItemBalance,
  getItemConsumedPercentage,
  getItemUncommittedBalance,
} from "@/lib/item-balance";

const zero = () => new Prisma.Decimal(0);

/**
 * Carrega os saldos calculados de todos os itens de um contrato.
 * Faz 2 aggregates em paralelo (commitment, paymentItem) e monta o mapa por item.
 */
export async function loadContractItemBalances(
  contractId: string,
): Promise<Map<string, ItemBalance>> {
  const items = await prisma.contractItem.findMany({
    where: { contractId },
    select: { id: true, totalValue: true },
  });

  if (items.length === 0) return new Map();

  const itemIds = items.map((i) => i.id);

  const [commitmentSums, paymentSums] = await Promise.all([
    prisma.commitmentItem.groupBy({
      by: ["contractItemId"],
      where: { contractItemId: { in: itemIds } },
      _sum: { value: true },
    }),
    prisma.paymentItem.groupBy({
      by: ["contractItemId"],
      where: { contractItemId: { in: itemIds } },
      _sum: { settledValue: true, paidValue: true },
    }),
  ]);

  const commitmentByItem = new Map(
    commitmentSums.map((c) => [c.contractItemId, c._sum.value ?? zero()]),
  );
  const paymentByItem = new Map(
    paymentSums.map((p) => [
      p.contractItemId,
      {
        settled: p._sum.settledValue ?? zero(),
        paid: p._sum.paidValue ?? zero(),
      },
    ]),
  );

  const result = new Map<string, ItemBalance>();
  for (const item of items) {
    const totalValue =
      item.totalValue instanceof Prisma.Decimal
        ? item.totalValue
        : new Prisma.Decimal(String(item.totalValue));
    const totalCommitted = commitmentByItem.get(item.id) ?? zero();
    const payments = paymentByItem.get(item.id) ?? {
      settled: zero(),
      paid: zero(),
    };

    result.set(item.id, {
      itemId: item.id,
      totalValue,
      totalCommitted,
      totalSettled: payments.settled,
      totalPaid: payments.paid,
      balance: getItemBalance(totalValue, payments.paid),
      uncommittedBalance: getItemUncommittedBalance(totalValue, totalCommitted),
      consumedPercentage: getItemConsumedPercentage(totalValue, payments.paid),
    });
  }

  return result;
}
