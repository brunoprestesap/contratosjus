import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatCurrencyPdf,
  formatDatePdf,
  formatDateTimePdf,
  formatCnpjPdf,
  formatMonthYearPdf,
} from "./styles";
import {
  LEGAL_REGIME_LABELS,
  BIDDING_MODALITY_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_PERIODICITY_LABELS,
  COMMITMENT_TYPE_LABELS,
  ADDITIVE_TYPE_LABELS,
} from "@/lib/constants";
import { getPaymentStatus } from "@/lib/utils";

interface ExtratoContratoData {
  contractNumber: string;
  processNumber: string;
  object: string;
  supplier: string;
  supplierCnpj: string;
  legalRegime: string;
  biddingModality: string;
  signatureDate: Date;
  startDate: Date;
  endDate: Date;
  canExtend: boolean;
  globalValue: number;
  paymentType: string;
  estimatedMonthlyValue: number | null;
  paymentPeriodicity: string;
  budgetProgram: string | null;
  expenseNature: string | null;
  fiscalHolder: string;
  fiscalSubstitute: string | null;
  contractManager: string | null;
  status: string;
  commitments: {
    commitmentNumber: string;
    commitmentDate: Date;
    value: number;
    type: string;
    notes: string | null;
  }[];
  payments: {
    referenceMonth: Date;
    invoiceValue: number | null;
    attestDate: Date | null;
    settlementDate: Date | null;
    settledValue: number | null;
    paidAt: Date | null;
    paidValue: number | null;
  }[];
  additives: {
    additiveNumber: string;
    type: string;
    signatureDate: Date;
    newGlobalValue: number | null;
    newEndDate: Date | null;
    justification: string;
  }[];
}

export function ExtratoContratoPdf({ data }: { data: ExtratoContratoData }) {
  const totalPaid = data.payments.reduce(
    (sum, p) => sum + (p.paidValue ?? 0),
    0
  );
  const totalSettled = data.payments.reduce(
    (sum, p) => sum + (p.settledValue ?? 0),
    0
  );
  const totalCommitted = data.commitments.reduce(
    (sum, c) => sum + c.value,
    0
  );
  const balance = data.globalValue - totalPaid;
  const generatedAt = formatDateTimePdf();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              Extrato do Contrato {data.contractNumber}
            </Text>
            <Text style={styles.headerSubtitle}>
              Gerado em {generatedAt}
            </Text>
          </View>
          <View>
            <Text style={styles.headerOrg}>ContratosJUS</Text>
            <Text style={styles.headerOrgSub}>
              Justiça Federal — Seção Judiciária do Amapá
            </Text>
          </View>
        </View>

        {/* Identificação */}
        <Text style={styles.sectionTitle}>Identificação</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nº do Contrato</Text>
            <Text style={styles.infoValue}>{data.contractNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nº do Processo</Text>
            <Text style={styles.infoValue}>{data.processNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fornecedor</Text>
            <Text style={styles.infoValue}>{data.supplier}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CNPJ</Text>
            <Text style={styles.infoValue}>
              {formatCnpjPdf(data.supplierCnpj)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Regime Legal</Text>
            <Text style={styles.infoValue}>
              {LEGAL_REGIME_LABELS[data.legalRegime] ?? data.legalRegime}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Modalidade</Text>
            <Text style={styles.infoValue}>
              {BIDDING_MODALITY_LABELS[data.biddingModality] ??
                data.biddingModality}
            </Text>
          </View>
          <View style={styles.infoItemFull}>
            <Text style={styles.infoLabel}>Objeto</Text>
            <Text style={styles.infoValue}>{data.object}</Text>
          </View>
        </View>

        {/* Vigência */}
        <Text style={styles.sectionTitle}>Vigência</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Data de Assinatura</Text>
            <Text style={styles.infoValue}>
              {formatDatePdf(data.signatureDate)}
            </Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Início</Text>
            <Text style={styles.infoValue}>
              {formatDatePdf(data.startDate)}
            </Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Término</Text>
            <Text style={styles.infoValue}>
              {formatDatePdf(data.endDate)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Possibilidade de Prorrogação</Text>
            <Text style={styles.infoValue}>
              {data.canExtend ? "Sim" : "Não"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Situação</Text>
            <Text style={styles.infoValue}>
              {data.status === "ACTIVE" ? "Ativo" : "Encerrado"}
            </Text>
          </View>
        </View>

        {/* Financeiro */}
        <Text style={styles.sectionTitle}>Financeiro</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Valor Global</Text>
            <Text style={styles.infoValue}>
              {formatCurrencyPdf(data.globalValue)}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Tipo de Pagamento</Text>
            <Text style={styles.infoValue}>
              {PAYMENT_TYPE_LABELS[data.paymentType] ?? data.paymentType}
            </Text>
          </View>
          {data.estimatedMonthlyValue != null && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Valor Mensal Estimado</Text>
              <Text style={styles.infoValue}>
                {formatCurrencyPdf(data.estimatedMonthlyValue)}
              </Text>
            </View>
          )}
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Periodicidade</Text>
            <Text style={styles.infoValue}>
              {PAYMENT_PERIODICITY_LABELS[data.paymentPeriodicity] ??
                data.paymentPeriodicity}
            </Text>
          </View>
        </View>

        {/* Dotação */}
        {(data.budgetProgram || data.expenseNature) && (
          <>
            <Text style={styles.sectionTitle}>Dotação Orçamentária</Text>
            <View style={styles.infoGrid}>
              {data.budgetProgram && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Programa de Trabalho</Text>
                  <Text style={styles.infoValue}>{data.budgetProgram}</Text>
                </View>
              )}
              {data.expenseNature && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Natureza da Despesa</Text>
                  <Text style={styles.infoValue}>{data.expenseNature}</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Gestão */}
        <Text style={styles.sectionTitle}>Gestão</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Fiscal Titular</Text>
            <Text style={styles.infoValue}>{data.fiscalHolder}</Text>
          </View>
          {data.fiscalSubstitute && (
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Fiscal Substituto</Text>
              <Text style={styles.infoValue}>{data.fiscalSubstitute}</Text>
            </View>
          )}
          {data.contractManager && (
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Gestor do Contrato</Text>
              <Text style={styles.infoValue}>{data.contractManager}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            ContratosJUS
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>

      {/* Page 2: Empenhos + Pagamentos */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              Extrato do Contrato {data.contractNumber}
            </Text>
            <Text style={styles.headerSubtitle}>
              Empenhos e Pagamentos
            </Text>
          </View>
          <View>
            <Text style={styles.headerOrg}>ContratosJUS</Text>
          </View>
        </View>

        {/* Empenhos */}
        <Text style={styles.sectionTitle}>
          Empenhos ({data.commitments.length})
        </Text>
        {data.commitments.length === 0 ? (
          <Text style={{ fontSize: 8, color: "#999", marginBottom: 8 }}>
            Nenhum empenho registrado.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>
                Nota
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>
                Data
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>
                Tipo
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "20%", textAlign: "right" },
                ]}
              >
                Valor
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>
                Observações
              </Text>
            </View>
            {data.commitments.map((c, i) => (
              <View
                key={i}
                style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {c.commitmentNumber}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatDatePdf(c.commitmentDate)}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {COMMITMENT_TYPE_LABELS[c.type] ?? c.type}
                </Text>
                <Text
                  style={[
                    styles.tableCellBold,
                    { width: "20%", textAlign: "right" },
                  ]}
                >
                  {formatCurrencyPdf(c.value)}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {c.notes ?? "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Pagamentos */}
        <Text style={styles.sectionTitle}>
          Pagamentos ({data.payments.length})
        </Text>
        {data.payments.length === 0 ? (
          <Text style={{ fontSize: 8, color: "#999", marginBottom: 8 }}>
            Nenhum pagamento registrado.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>
                Mês Ref.
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "14%", textAlign: "right" },
                ]}
              >
                Valor NF
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>
                Ateste
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>
                Liquidação
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>
                Pagamento
              </Text>
              <Text
                style={[
                  styles.tableHeaderCell,
                  { width: "16%", textAlign: "right" },
                ]}
              >
                Valor Pago
              </Text>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>
                Status
              </Text>
            </View>
            {data.payments.map((p, i) => (
              <View
                key={i}
                style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={[styles.tableCell, { width: "14%" }]}>
                  {formatMonthYearPdf(p.referenceMonth)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    { width: "14%", textAlign: "right" },
                  ]}
                >
                  {p.invoiceValue != null
                    ? formatCurrencyPdf(p.invoiceValue)
                    : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "14%" }]}>
                  {formatDatePdf(p.attestDate)}
                </Text>
                <Text style={[styles.tableCell, { width: "14%" }]}>
                  {formatDatePdf(p.settlementDate)}
                </Text>
                <Text style={[styles.tableCell, { width: "14%" }]}>
                  {formatDatePdf(p.paidAt)}
                </Text>
                <Text
                  style={[
                    styles.tableCellBold,
                    { width: "16%", textAlign: "right" },
                  ]}
                >
                  {p.paidValue != null
                    ? formatCurrencyPdf(p.paidValue)
                    : "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "14%" }]}>
                  {getPaymentStatus(p)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Aditivos */}
        {data.additives.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Aditivos ({data.additives.length})
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "12%" }]}>
                  Nº TA
                </Text>
                <Text style={[styles.tableHeaderCell, { width: "20%" }]}>
                  Tipo
                </Text>
                <Text style={[styles.tableHeaderCell, { width: "15%" }]}>
                  Data
                </Text>
                <Text style={[styles.tableHeaderCell, { width: "53%" }]}>
                  Efeito
                </Text>
              </View>
              {data.additives.map((a, i) => {
                const effects: string[] = [];
                if (a.newGlobalValue != null) {
                  effects.push(
                    `Novo valor global: ${formatCurrencyPdf(a.newGlobalValue)}`
                  );
                }
                if (a.newEndDate) {
                  effects.push(
                    `Nova vigência até: ${formatDatePdf(a.newEndDate)}`
                  );
                }
                return (
                  <View
                    key={i}
                    style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                  >
                    <Text style={[styles.tableCell, { width: "12%" }]}>
                      {a.additiveNumber}
                    </Text>
                    <Text style={[styles.tableCell, { width: "20%" }]}>
                      {ADDITIVE_TYPE_LABELS[a.type] ?? a.type}
                    </Text>
                    <Text style={[styles.tableCell, { width: "15%" }]}>
                      {formatDatePdf(a.signatureDate)}
                    </Text>
                    <Text style={[styles.tableCell, { width: "53%" }]}>
                      {effects.length > 0 ? effects.join("; ") : a.justification}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Resumo Financeiro */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Resumo Financeiro</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Valor Global do Contrato</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(data.globalValue)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Empenhado</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(totalCommitted)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Liquidado</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(totalSettled)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Pago</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(totalPaid)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Saldo Restante</Text>
            <Text
              style={[
                styles.summaryTotalValue,
                balance < 0 ? { color: "#dc2626" } : {},
              ]}
            >
              {formatCurrencyPdf(balance)}
              {balance < 0 ? " (ultrapassado)" : ""}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            ContratosJUS
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

export type { ExtratoContratoData };
