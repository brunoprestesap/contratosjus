type DecimalLike = { toString(): string };
type Numberish = number | string | DecimalLike | null | undefined;
type Dateish = Date | string | null | undefined;

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

const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const monthYearLongFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const monthYearShortFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

const PLACEHOLDER = "—";

function toNumber(value: Numberish): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = typeof value === "string" ? value : value.toString();
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: Dateish): Date | null {
  if (value === null || value === undefined) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return isNaN(d.getTime()) ? null : d;
}

export function formatCurrency(value: Numberish): string {
  const n = toNumber(value);
  return n === null ? PLACEHOLDER : currencyFormatter.format(n);
}

export function formatDate(date: Dateish): string {
  const d = toDate(date);
  return d ? dateFormatter.format(d) : PLACEHOLDER;
}

export function formatShortDate(date: Dateish): string {
  const d = toDate(date);
  return d ? shortDateFormatter.format(d) : PLACEHOLDER;
}

export function formatMonthYear(date: Dateish): string {
  const d = toDate(date);
  return d ? monthYearFormatter.format(d).replace(".", "") : PLACEHOLDER;
}

export function formatMonthYearLong(date: Dateish): string {
  const d = toDate(date);
  return d ? monthYearLongFormatter.format(d) : PLACEHOLDER;
}

export function formatMonthYearShort(date: Dateish): string {
  const d = toDate(date);
  return d ? monthYearShortFormatter.format(d).replace(".", "") : PLACEHOLDER;
}

export function formatDateTime(value: Dateish): string {
  const d = toDate(value);
  return d ? dateTimeFormatter.format(d) : PLACEHOLDER;
}

export function formatDateForInput(date: Dateish): string {
  const d = toDate(date);
  if (!d) return "";
  return d.toISOString().split("T")[0];
}

export function formatMonthForInput(date: Dateish): string {
  const d = toDate(date);
  if (!d) return "";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
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
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const firstDigit = remainder < 2 ? 0 : 11 - remainder;
  if (Number(digits[12]) !== firstDigit) return false;

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

export function formatNumber(
  value: number,
  opts?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return PLACEHOLDER;
  return opts
    ? new Intl.NumberFormat("pt-BR", opts).format(value)
    : numberFormatter.format(value);
}

export function parseCurrencyInput(input: string): number {
  const cleaned = input
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseDateBR(input: string): Date {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(input.trim());
  if (!match) {
    throw new Error("Data inválida");
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("Data inválida");
  }
  return date;
}
