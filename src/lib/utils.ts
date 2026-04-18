import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

export function formatCnpj(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, "");

  if (digits.length !== 14) return false;

  // Reject all same digits
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // Validate first check digit
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (Number(digits[12]) !== firstDigit) return false;

  // Validate second check digit
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(digits[i]) * weights2[i];
  }
  remainder = sum % 11;
  const secondDigit = remainder < 2 ? 0 : 11 - remainder;
  if (Number(digits[13]) !== secondDigit) return false;

  return true;
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

export function parseCurrencyToNumber(value: string): number {
  const cleaned = value
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
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

export function formatMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return monthYearFormatter.format(d).replace(".", "");
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

export function formatDateForInput(
  date: Date | string | undefined | null,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

export function formatMonthForInput(
  date: Date | string | undefined | null,
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function formatShortDate(
  date: Date | string | null | undefined,
): string {
  if (!date) return "---";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "---";
  return shortDateFormatter.format(d);
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
