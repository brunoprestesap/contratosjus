import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatCurrencyPdf,
  formatDatePdf,
  formatDateTimePdf,
  formatCnpjPdf,
} from "@/lib/pdf/styles";

export interface PesquisaPrecosData {
  contract: {
    number: string;
    processNumber: string;
    object: string;
    supplier: string;
    supplierCnpj: string;
    globalValue: number;
    monthlyValue: number | null;
    startDate: Date;
    endDate: Date;
  };
  catalogo: {
    tipo: "MATERIAL" | "SERVICE";
    codigo: string | null;
  };
  periodo: {
    inicio: string | null;
    fim: string | null;
    fonte: string;
  };
  samples: Array<{
    orgao: string | null;
    cnpjFornecedor: string | null;
    objetoResumo: string;
    valorGlobal: number;
    dataAssinatura: Date | null;
    modalidade: string | null;
    uf: string | null;
    excluded: boolean;
    exclusionReason: string | null;
  }>;
  statistics: {
    count: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    coefVariation: number;
  };
  justification: string;
}

export function PesquisaPrecosPdf({ data }: { data: PesquisaPrecosData }) {
  const samplesValid = data.samples.filter((s) => !s.excluded);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Pesquisa de Preços</Text>
            <Text style={styles.headerSubtitle}>
              Memória de cálculo · gerado em {formatDateTimePdf()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerOrg}>JFAP/NUTEC</Text>
            <Text style={styles.headerOrgSub}>Sistema de Gestão de Contratos</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Contrato-Alvo</Text>
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
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Valor Global</Text>
            <Text style={styles.infoValue}>
              {formatCurrencyPdf(data.contract.globalValue)}
            </Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Valor Mensal</Text>
            <Text style={styles.infoValue}>
              {data.contract.monthlyValue !== null
                ? formatCurrencyPdf(data.contract.monthlyValue)
                : "—"}
            </Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Vigência</Text>
            <Text style={styles.infoValue}>
              {formatDatePdf(data.contract.startDate)} a {formatDatePdf(data.contract.endDate)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Metodologia</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Tipo de item</Text>
            <Text style={styles.infoValue}>
              {data.catalogo.tipo === "MATERIAL" ? "Material (CATMAT)" : "Serviço (CATSER)"}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Código do catálogo</Text>
            <Text style={styles.infoValue}>{data.catalogo.codigo ?? "—"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Período consultado</Text>
            <Text style={styles.infoValue}>
              {data.periodo.inicio ?? "—"} a {data.periodo.fim ?? "—"}
            </Text>
          </View>
          <View style={styles.infoItemFull}>
            <Text style={styles.infoLabel}>Fonte</Text>
            <Text style={styles.infoValue}>{data.periodo.fonte}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Estatísticas (amostras válidas: {samplesValid.length})</Text>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Média</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPdf(data.statistics.mean)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mediana</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPdf(data.statistics.median)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mínimo</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPdf(data.statistics.min)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Máximo</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPdf(data.statistics.max)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Desvio-padrão</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPdf(data.statistics.stdDev)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Coef. de variação</Text>
            <Text style={styles.summaryTotalValue}>
              {(data.statistics.coefVariation * 100).toFixed(2)}%
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Amostras de Preços</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "34%" }]}>Objeto</Text>
            <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Órgão</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Data</Text>
            <Text style={[styles.tableHeaderCell, { width: "6%" }]}>UF</Text>
            <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Valor</Text>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Status</Text>
          </View>
          {data.samples.map((s, i) => (
            <View
              key={i}
              style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={[styles.tableCell, { width: "34%" }]}>
                {s.objetoResumo.length > 80
                  ? s.objetoResumo.slice(0, 80) + "…"
                  : s.objetoResumo}
              </Text>
              <Text style={[styles.tableCell, { width: "20%" }]}>{s.orgao ?? "—"}</Text>
              <Text style={[styles.tableCell, { width: "12%" }]}>
                {formatDatePdf(s.dataAssinatura)}
              </Text>
              <Text style={[styles.tableCell, { width: "6%" }]}>{s.uf ?? "—"}</Text>
              <Text style={[styles.tableCellBold, { width: "18%" }]}>
                {formatCurrencyPdf(s.valorGlobal)}
              </Text>
              <Text style={[styles.tableCell, { width: "10%" }]}>
                {s.excluded ? "Excluída" : "Válida"}
              </Text>
            </View>
          ))}
        </View>

        {data.justification ? (
          <>
            <Text style={styles.sectionTitle} break>
              Justificativa de Economicidade
            </Text>
            <Text style={justificationStyle}>{data.justification}</Text>
          </>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento gerado pelo Sistema de Gestão de Contratos — JFAP/NUTEC · Fonte: compras.gov.br
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}

const justificationStyle = {
  fontSize: 10,
  lineHeight: 1.5,
  textAlign: "justify" as const,
  marginTop: 6,
  marginBottom: 12,
};
