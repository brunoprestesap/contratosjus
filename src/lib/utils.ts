import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateContractBalance(
  globalValue: number,
  totalPaid: number,
): number {
  return globalValue - totalPaid;
}

export function getBalancePercentage(
  globalValue: number,
  totalPaid: number,
): number {
  if (globalValue === 0) return 0;
  return ((globalValue - totalPaid) / globalValue) * 100;
}

export function getBalanceColor(
  percentage: number,
): "green" | "yellow" | "red" {
  if (percentage > 50) return "green";
  if (percentage >= 20) return "yellow";
  return "red";
}

export type PaymentStatus = "Pendente" | "Atestado" | "Liquidado" | "Pago";

export function getPaymentStatus(payment: {
  attestDate?: Date | null;
  settlementDate?: Date | null;
  paidAt?: Date | null;
}): PaymentStatus {
  if (payment.paidAt) return "Pago";
  if (payment.settlementDate) return "Liquidado";
  if (payment.attestDate) return "Atestado";
  return "Pendente";
}

export function isContractExpired(endDate: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return end < today;
}

export function isOverBudget(
  totalPaid: number,
  totalCommitted: number,
  globalValue: number,
): boolean {
  return totalPaid + totalCommitted > globalValue;
}

export function calculateCommitmentBalance(
  totalCommitted: number,
  totalSettled: number,
): number {
  return totalCommitted - totalSettled;
}

export interface ContractFinancialTotals {
  totalPaid: number;
  totalSettled: number;
  totalCommitted: number;
  globalValue: number;
  balance: number;
  balancePercentage: number;
  balanceColor: "green" | "yellow" | "red";
}

export function computeFinancialTotals(contract: {
  globalValue: { toString(): string };
  payments: {
    paidValue: { toString(): string } | null;
    settledValue: { toString(): string } | null;
  }[];
  commitments: { value: { toString(): string } }[];
}): ContractFinancialTotals {
  const totalPaid = contract.payments.reduce(
    (sum, p) => sum + (p.paidValue ? parseFloat(p.paidValue.toString()) : 0),
    0,
  );
  const totalSettled = contract.payments.reduce(
    (sum, p) =>
      sum + (p.settledValue ? parseFloat(p.settledValue.toString()) : 0),
    0,
  );
  const totalCommitted = contract.commitments.reduce(
    (sum, c) => sum + parseFloat(c.value.toString()),
    0,
  );
  const globalValue = parseFloat(contract.globalValue.toString());
  const balance = globalValue - totalPaid;
  const balancePercentage = getBalancePercentage(globalValue, totalPaid);
  const balanceColor = getBalanceColor(balancePercentage);

  return {
    totalPaid,
    totalSettled,
    totalCommitted,
    globalValue,
    balance,
    balancePercentage,
    balanceColor,
  };
}

export function getInitials(name: string, fallback = "U"): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("") || fallback
  );
}
