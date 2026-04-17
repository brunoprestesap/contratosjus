/**
 * Detects months without payment registration for contracts
 * with fixed monthly payment type.
 */

interface ContractForMissingPayments {
  paymentType: string;
  paymentPeriodicity: string;
  startDate: Date | string;
  endDate: Date | string;
  payments: { referenceMonth: Date | string }[];
}

/**
 * Returns an array of Date objects (first day of each month)
 * for which no Payment record exists, between startDate and today
 * (capped at endDate if the contract has expired).
 *
 * Only applies to contracts with paymentType=FIXED and paymentPeriodicity=MONTHLY.
 */
export function getMissingPaymentMonths(
  contract: ContractForMissingPayments
): Date[] {
  if (
    contract.paymentType !== "FIXED" ||
    contract.paymentPeriodicity !== "MONTHLY"
  ) {
    return [];
  }

  const start = new Date(contract.startDate);
  const end = new Date(contract.endDate);
  const now = new Date();

  // Cap at endDate or today, whichever is earlier
  const limit = end < now ? end : now;

  // Build a set of existing payment months as "YYYY-MM" strings
  const existingMonths = new Set(
    contract.payments.map((p) => {
      const d = new Date(p.referenceMonth);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    })
  );

  const missing: Date[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  const limitMonth = new Date(Date.UTC(limit.getUTCFullYear(), limit.getUTCMonth(), 1));

  while (cursor <= limitMonth) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!existingMonths.has(key)) {
      missing.push(new Date(cursor));
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return missing;
}
