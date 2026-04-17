import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatCurrencyPdf,
  formatDatePdf,
  formatDateTimePdf,
  formatMonthYearPdf,
} from "./styles";

interface DesembolsoItem {
  contractNumber: string;
  supplier: string;
  referenceMonth: Date;
  invoiceValue: number | null;
  paidAt: Date | null;
  paidValue: number | null;
}

interface DesembolsoPeriodoData {
  startDate: string;
  endDate: string;
  items: DesembolsoItem[];
}

export function DesembolsoPeriodoPdf({
  data,
}: {
  data: DesembolsoPeriodoData;
}) {
  const totalPaid = data.items.reduce(
    (sum, item) => sum + (item.paidValue ?? 0),
    0
  );
  const generatedAt = formatDateTimePdf();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Relatório de Desembolso</Text>
            <Text style={styles.headerSubtitle}>
              Período: {formatDatePdf(data.startDate)} a{" "}
              {formatDatePdf(data.endDate)}
            </Text>
          </View>
          <View>
            <Text style={styles.headerOrg}>NUTEC / JFAP</Text>
            <Text style={styles.headerOrgSub}>
              Justiça Federal — Seção Judiciária do Amapá
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 8, color: "#666", marginBottom: 12 }}>
          Gerado em {generatedAt} — {data.items.length}{" "}
          {data.items.length === 1 ? "registro" : "registros"} encontrados
        </Text>

        {/* Tabela */}
        {data.items.length === 0 ? (
          <Text style={{ fontSize: 9, color: "#999", marginTop: 20 }}>
            Nenhum pagamento encontrado no período informado.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>
                Contrato
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>
                Fornecedor
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>
                Mês Ref.
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "16%", textAlign: "right" },
                ]}
              >
                Valor NF
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>
                Data Pgto.
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "18%", textAlign: "right" },
                ]}
              >
                Valor Pago
              </Text>
            </View>
            {data.items.map((item, i) => (
              <View
                key={i}
                style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { width: "15%" }]}>
                  {item.contractNumber}
                </Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>
                  {item.supplier.length > 30
                    ? item.supplier.substring(0, 30) + "..."
                    : item.supplier}
                </Text>
                <Text style={[styles.tableCell, { width: "12%" }]}>
                  {formatMonthYearPdf(item.referenceMonth)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "16%", textAlign: "right" },
                  ]}
                >
                  {item.invoiceValue != null
                    ? formatCurrencyPdf(item.invoiceValue)
                    : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "14%" }]}>
                  {formatDatePdf(item.paidAt)}
                </Text>
                <Text
                  style={[
                    styles.tableCellBold,
                    { width: "18%", textAlign: "right" },
                  ]}
                >
                  {item.paidValue != null
                    ? formatCurrencyPdf(item.paidValue)
                    : "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totalizador */}
        {data.items.length > 0 && (
          <View style={styles.summaryBox}>
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>
                Total desembolsado no período
              </Text>
              <Text style={styles.summaryTotalValue}>
                {formatCurrencyPdf(totalPaid)}
              </Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Gerado em {generatedAt} — Sistema de Gestão de Contratos
            NUTEC/JFAP
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

export type { DesembolsoPeriodoData, DesembolsoItem };
