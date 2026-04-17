import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatCurrencyPdf,
  formatDatePdf,
  formatDateTimePdf,
  formatCnpjPdf,
  formatMonthYearPdf,
} from "@/lib/pdf/styles";

export interface RelatorioFiscalData {
  contract: {
    number: string;
    processNumber: string;
    object: string;
    supplier: string;
    supplierCnpj: string;
    globalValue: number;
    startDate: Date;
    endDate: Date;
    fiscalHolder: string;
  };
  periodo: {
    inicio: Date;
    fim: Date;
  };
  financeiro: {
    totalPagoAcumulado: number;
    totalEmpenhadoAcumulado: number;
    saldoContratual: number;
    totalPagoPeriodo: number;
    totalEmpenhadoPeriodo: number;
  };
  pagamentos: Array<{
    referenceMonth: Date;
    invoiceValue: number | null;
    attestDate: Date | null;
    settlementDate: Date | null;
    paidAt: Date | null;
    paidValue: number | null;
    status: string;
  }>;
  empenhos: Array<{
    number: string;
    date: Date;
    value: number;
    type: "INITIAL" | "REINFORCEMENT";
  }>;
  aditivos: Array<{
    number: string;
    type: string;
    signatureDate: Date;
    newGlobalValue: number | null;
    newEndDate: Date | null;
  }>;
  ocorrencias: Array<{
    occurredAt: Date;
    type: string;
    severity: string;
    description: string;
  }>;
  conclusao: string;
}

const SEV_COR: Record<string, string> = {
  LEVE: "#0f766e",
  MEDIA: "#ca8a04",
  GRAVE: "#b91c1c",
};

export function RelatorioFiscalPdf({ data }: { data: RelatorioFiscalData }) {
  const pctPago =
    data.contract.globalValue > 0
      ? (data.financeiro.totalPagoAcumulado / data.contract.globalValue) * 100
      : 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Relatório de Fiscalização</Text>
            <Text style={styles.headerSubtitle}>
              {formatDatePdf(data.periodo.inicio)} a {formatDatePdf(data.periodo.fim)} · Gerado em {formatDateTimePdf()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerOrg}>JFAP/NUTEC</Text>
            <Text style={styles.headerOrgSub}>Sistema de Gestão de Contratos</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contrato</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Número</Text>
            <Text style={styles.infoValue}>{data.contract.number}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Processo</Text>
            <Text style={styles.infoValue}>{data.contract.processNumber}</Text>
          </View>
          <View style={styles.infoItemFull}>
            <Text style={styles.infoLabel}>Objeto</Text>
            <Text style={styles.infoValue}>{data.contract.object}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Contratado</Text>
            <Text style={styles.infoValue}>{data.contract.supplier}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CNPJ</Text>
            <Text style={styles.infoValue}>
              {formatCnpjPdf(data.contract.supplierCnpj)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Valor Global</Text>
            <Text style={styles.infoValue}>
              {formatCurrencyPdf(data.contract.globalValue)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Vigência</Text>
            <Text style={styles.infoValue}>
              {formatDatePdf(data.contract.startDate)} a {formatDatePdf(data.contract.endDate)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumo Financeiro (Acumulado)</Text>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total pago acumulado</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(data.financeiro.totalPagoAcumulado)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total empenhado acumulado</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(data.financeiro.totalEmpenhadoAcumulado)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Saldo contratual</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(data.financeiro.saldoContratual)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Execução financeira</Text>
            <Text style={styles.summaryTotalValue}>{pctPago.toFixed(2)}%</Text>
          </View>
        </View>

        <View style={{ ...styles.infoGrid, marginTop: 8 }}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Pago no período</Text>
            <Text style={styles.infoValue}>
              {formatCurrencyPdf(data.financeiro.totalPagoPeriodo)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Empenhado no período</Text>
            <Text style={styles.infoValue}>
              {formatCurrencyPdf(data.financeiro.totalEmpenhadoPeriodo)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Pagamentos do Período</Text>
        {data.pagamentos.length === 0 ? (
          <Text style={paragraphStyle}>Sem pagamentos registrados no período.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Mês Ref.</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>NF (R$)</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Ateste</Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Liquidação</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Pago (R$)</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Status</Text>
            </View>
            {data.pagamentos.map((p, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "18%" }]}>
                  {formatMonthYearPdf(p.referenceMonth)}
                </Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>
                  {p.invoiceValue !== null ? formatCurrencyPdf(p.invoiceValue) : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "14%" }]}>
                  {formatDatePdf(p.attestDate)}
                </Text>
                <Text style={[styles.tableCell, { width: "14%" }]}>
                  {formatDatePdf(p.settlementDate)}
                </Text>
                <Text style={[styles.tableCellBold, { width: "18%" }]}>
                  {p.paidValue !== null ? formatCurrencyPdf(p.paidValue) : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "18%" }]}>{p.status}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Empenhos do Período</Text>
        {data.empenhos.length === 0 ? (
          <Text style={paragraphStyle}>Sem empenhos registrados no período.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Número</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Data</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Valor</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Tipo</Text>
            </View>
            {data.empenhos.map((e, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "35%" }]}>{e.number}</Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatDatePdf(e.date)}
                </Text>
                <Text style={[styles.tableCellBold, { width: "25%" }]}>
                  {formatCurrencyPdf(e.value)}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {e.type === "INITIAL" ? "Inicial" : "Reforço"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {data.aditivos.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Aditivos Recentes</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Nº</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Tipo</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Assinado em</Text>
                <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Novo valor global</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Nova vigência</Text>
              </View>
              {data.aditivos.map((a, i) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: "15%" }]}>{a.number}</Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>{a.type}</Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>
                    {formatDatePdf(a.signatureDate)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "25%" }]}>
                    {a.newGlobalValue !== null
                      ? formatCurrencyPdf(a.newGlobalValue)
                      : "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>
                    {formatDatePdf(a.newEndDate)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {data.ocorrencias.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Ocorrências Registradas</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Data</Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Tipo</Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Severidade</Text>
                <Text style={[styles.tableHeaderCell, { width: "50%" }]}>Descrição</Text>
              </View>
              {data.ocorrencias.map((o, i) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: "15%" }]}>
                    {formatDatePdf(o.occurredAt)}
                  </Text>
                  <Text style={[styles.tableCell, { width: "20%" }]}>{o.type}</Text>
                  <Text
                    style={{
                      ...styles.tableCellBold,
                      width: "15%",
                      color: SEV_COR[o.severity] ?? "#000",
                    }}
                  >
                    {o.severity}
                  </Text>
                  <Text style={[styles.tableCell, { width: "50%" }]}>
                    {o.description.length > 140
                      ? o.description.slice(0, 140) + "…"
                      : o.description}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Conclusão do Fiscal</Text>
        <Text style={paragraphStyle}>{data.conclusao}</Text>

        <View style={signatureBlock}>
          <View style={signatureLine} />
          <Text style={signatureLabel}>{data.contract.fiscalHolder}</Text>
          <Text style={signatureRole}>Fiscal do Contrato</Text>
          <Text style={signatureDate}>
            Macapá/AP, {formatDatePdf(new Date())}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento gerado eletronicamente — JFAP/NUTEC
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}

const paragraphStyle = {
  fontSize: 10,
  lineHeight: 1.55,
  textAlign: "justify" as const,
  marginTop: 4,
  marginBottom: 10,
};
const signatureBlock = { marginTop: 60, alignItems: "center" as const };
const signatureLine = {
  width: 260,
  borderTopWidth: 0.8,
  borderTopColor: "#1a1a1a",
  marginBottom: 4,
};
const signatureLabel = { fontSize: 10, fontFamily: "Helvetica-Bold" };
const signatureRole = { fontSize: 9, color: "#555", marginTop: 2 };
const signatureDate = { fontSize: 9, color: "#555", marginTop: 12 };
