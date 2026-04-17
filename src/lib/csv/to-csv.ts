/**
 * Serializador CSV para Excel BR:
 * - Delimitador `;`
 * - BOM UTF-8 no início do arquivo
 * - Escape de aspas duplas
 * - Newline CRLF (compatível Excel Windows)
 */

const DELIMITER = ";";
const NEWLINE = "\r\n";
const BOM = "\uFEFF";

export type CsvValue = string | number | boolean | null | undefined | Date;

function escapeField(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (value instanceof Date) {
    s = isNaN(value.getTime()) ? "" : value.toISOString();
  } else if (typeof value === "number") {
    s = Number.isFinite(value) ? value.toString().replace(".", ",") : "";
  } else {
    s = String(value);
  }
  const mustQuote =
    s.includes(DELIMITER) ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r");
  if (!mustQuote) return s;
  return `"${s.replace(/"/g, '""')}"`;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => CsvValue;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeField(c.header)).join(DELIMITER);
  const bodyLines = rows.map((row) =>
    columns.map((c) => escapeField(c.value(row))).join(DELIMITER)
  );
  return BOM + [headerLine, ...bodyLines].join(NEWLINE) + NEWLINE;
}
