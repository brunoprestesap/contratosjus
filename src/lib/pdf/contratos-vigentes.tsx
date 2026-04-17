import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatCurrencyPdf,
  formatDatePdf,
  formatDateTimePdf,
} from "./styles";

interface ContratoVigenteItem {
  contractNumber: string;
  supplier: string;
  object: string;
  globalValue: number;
  totalPaid: number;
  balance: number;
  percentUsed: number;
  endDate: Date;
}

interface ContratosVigentesData {
  referenceDate: string;
  items: ContratoVigenteItem[];
  totalGlobalValue: number;
  totalPaid: number;
  totalBalance: number;
}

export function ContratosVigentesPdf({
  data,
}: {
  data: ContratosVigentesData;
}) {
  const generatedAt = formatDateTimePdf();

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              Contratos Vigentes
            </Text>
            <Text style={styles.headerSubtitle}>
              Data de referência: {formatDatePdf(data.referenceDate)}
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
          {data.items.length === 1 ? "contrato vigente" : "contratos vigentes"}
        </Text>

        {/* Tabela */}
        {data.items.length === 0 ? (
          <Text style={{ fontSize: 9, color: "#999", marginTop: 20 }}>
            Nenhum contrato vigente na data de referência informada.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "10%" }]}>
                Nº Contrato
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>
                Fornecedor
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "22%" }]}>
                Objeto
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "12%", textAlign: "right" },
                ]}
              >
                Valor Global
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "12%", textAlign: "right" },
                ]}
              >
                Total Pago
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "12%", textAlign: "right" },
                ]}
              >
                Saldo
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "7%", textAlign: "right" },
                ]}
              >
                % Usado
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "7%" }]}>
                Vigência
              </Text>
            </View>
            {data.items.map((item, i) => (
              <View
                key={i}
                style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCellBold, { width: "10%" }]}>
                  {item.contractNumber}
                </Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>
                  {item.supplier.length > 28
                    ? item.supplier.substring(0, 28) + "..."
                    : item.supplier}
                </Text>
                <Text style={[styles.tableCell, { width: "22%" }]}>
                  {item.object.length > 40
                    ? item.object.substring(0, 40) + "..."
                    : item.object}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "12%", textAlign: "right" },
                  ]}
                >
                  {formatCurrencyPdf(item.globalValue)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "12%", textAlign: "right" },
                  ]}
                >
                  {formatCurrencyPdf(item.totalPaid)}
                </Text>
                <Text
                  style={[
                    styles.tableCellBold,
                    { width: "12%", textAlign: "right" },
                  ]}
                >
                  {formatCurrencyPdf(item.balance)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    {
                      width: "7%",
                      textAlign: "right",
                      color:
                        item.percentUsed > 80
                          ? "#dc2626"
                          : item.percentUsed > 50
                            ? "#ca8a04"
                            : "#16a34a",
                    },
                  ]}
                >
                  {item.percentUsed.toFixed(1)}%
                </Text>
                <Text style={[styles.tableCell, { width: "7%" }]}>
                  {formatDatePdf(item.endDate)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Totalizadores */}
        {data.items.length > 0 && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Totalizadores</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Contratado</Text>
              <Text style={styles.summaryValue}>
                {formatCurrencyPdf(data.totalGlobalValue)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Pago</Text>
              <Text style={styles.summaryValue}>
                {formatCurrencyPdf(data.totalPaid)}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>
                Total Saldo Restante
              </Text>
              <Text
                style={[
                  styles.summaryTotalValue,
                  data.totalBalance < 0 ? { color: "#dc2626" } : {},
                ]}
              >
                {formatCurrencyPdf(data.totalBalance)}
                {data.totalBalance < 0 ? " (ultrapassado)" : ""}
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

export type { ContratosVigentesData, ContratoVigenteItem };
