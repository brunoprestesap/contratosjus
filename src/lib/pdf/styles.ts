import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: "#1a1a1a",
  },
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a5f",
  },
  headerTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  headerSubtitle: {
    fontSize: 9,
    color: "#666",
    marginTop: 2,
  },
  headerOrg: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  headerOrgSub: {
    fontSize: 8,
    color: "#666",
    textAlign: "right" as const,
  },
  // Sections
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  // Info grid
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  infoItem: {
    width: "50%",
    marginBottom: 6,
  },
  infoItemFull: {
    width: "100%",
    marginBottom: 6,
  },
  infoItemThird: {
    width: "33.33%",
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 7,
    color: "#888",
    textTransform: "uppercase" as const,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  // Tables
  table: {
    marginTop: 4,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e3a5f",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableHeaderCell: {
    color: "#fff",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase" as const,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    backgroundColor: "#f8f9fa",
  },
  tableCell: {
    fontSize: 8,
  },
  tableCellBold: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  // Summary box
  summaryBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0f4f8",
    borderWidth: 1,
    borderColor: "#1e3a5f",
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#333",
  },
  summaryValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  summaryDivider: {
    borderTopWidth: 1,
    borderTopColor: "#1e3a5f",
    marginVertical: 4,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  summaryTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  summaryTotalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1e3a5f",
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: "#999",
  },
  pageNumber: {
    fontSize: 7,
    color: "#999",
  },
});

export function formatCurrencyPdf(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDatePdf(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTimePdf(timestamp?: string): string {
  const value = timestamp ?? new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  return value;
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^\w\-\.]/g, "_");
}

export function formatCnpjPdf(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, "");
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

export function formatMonthYearPdf(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).replace(".", "");
}
