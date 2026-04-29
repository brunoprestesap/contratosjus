import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatCurrencyPdf,
  formatDatePdf,
  formatDateTimePdf,
  formatCnpjPdf,
} from "@/lib/pdf/styles";

export interface PesquisaPrecosConsolidadoItem {
  itemNumber: string;
  description: string;
  unitOfMeasure: string;
  quantity: number;
  unitValue: number;
  totalValue: number;
  itemType: "MATERIAL" | "SERVICE";
  catalogoCodigo: string | null;
  codeDescricao: string | null;
  stats: {
    count: number;
    countTotal: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    stdDev: number;
    coefVariation: number;
  };
  reference: {
    method: "NONE" | "MEAN" | "MEDIAN" | "MIN" | "CUSTOM";
    value: number | null;
    adjustmentPercent: number | null;
    methodJustification: string | null;
  };
  exceptionJustification: string | null;
  samples: Array<{
    orgao: string | null;
    supplierName: string | null;
    objetoResumo: string;
    valorGlobal: number;
    dataAssinatura: Date | null;
    modalidade: string | null;
    uf: string | null;
    source: string;
    excluded: boolean;
    exclusionReason: string | null;
    regimeInferred: "LEI_14133_2021" | "LEI_8666_1993" | null;
  }>;
  justification: string;
}

export interface PesquisaPrecosConsolidadoData {
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
    legalRegime: "LEI_14133_2021" | "LEI_8666_1993";
  };
  periodo: {
    inicio: string | null;
    fim: string | null;
    fonte: string;
  };
  items: PesquisaPrecosConsolidadoItem[];
}

function regimeLabel(regime: "LEI_14133_2021" | "LEI_8666_1993"): string {
  return regime === "LEI_14133_2021" ? "Lei 14.133/2021" : "Lei 8.666/1993";
}

function regimeShort(regime: "LEI_14133_2021" | "LEI_8666_1993" | null): string {
  if (regime === "LEI_14133_2021") return "L. 14.133";
  if (regime === "LEI_8666_1993") return "L. 8.666";
  return "—";
}

const SOURCE_LABEL: Record<string, string> = {
  PAINEL_PRECOS: "Painel",
  CONTRATO_PUBLICO: "Contrato",
  MIDIA: "Mídia",
  COTACAO_DIRETA: "Cotação",
  SINAPI: "SINAPI",
  CATALOGO_TIC: "Cat. TIC",
  OUTRO: "Outro",
};

const METHOD_LABEL: Record<string, string> = {
  NONE: "—",
  MEAN: "Média",
  MEDIAN: "Mediana",
  MIN: "Menor valor",
  CUSTOM: "Customizado",
};

export function PesquisaPrecosConsolidadoPdf({ data }: { data: PesquisaPrecosConsolidadoData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Pesquisa de Preços — Consolidada</Text>
            <Text style={styles.headerSubtitle}>
              Memória de cálculo por item · gerado em {formatDateTimePdf()}
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
            <Text style={styles.infoValue}>{formatCnpjPdf(data.contract.supplierCnpj)}</Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Valor Global</Text>
            <Text style={styles.infoValue}>{formatCurrencyPdf(data.contract.globalValue)}</Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Vigência</Text>
            <Text style={styles.infoValue}>
              {formatDatePdf(data.contract.startDate)} a {formatDatePdf(data.contract.endDate)}
            </Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Base legal</Text>
            <Text style={styles.infoValue}>{regimeLabel(data.contract.legalRegime)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Itens Pesquisados ({data.items.length})</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "8%" }]}>#</Text>
            <Text style={[styles.tableHeaderCell, { width: "42%" }]}>Descrição</Text>
            <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Catálogo</Text>
            <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Amostras</Text>
            <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Valor médio</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={[styles.tableCell, { width: "8%" }]}>{item.itemNumber}</Text>
              <Text style={[styles.tableCell, { width: "42%" }]}>
                {item.description.length > 100
                  ? item.description.slice(0, 100) + "…"
                  : item.description}
              </Text>
              <Text style={[styles.tableCell, { width: "16%" }]}>
                {item.itemType === "MATERIAL" ? "CATMAT " : "CATSER "}
                {item.catalogoCodigo ?? "—"}
              </Text>
              <Text style={[styles.tableCell, { width: "12%" }]}>
                {item.stats.count} / {item.stats.countTotal}
              </Text>
              <Text style={[styles.tableCellBold, { width: "22%" }]}>
                {formatCurrencyPdf(item.stats.mean)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Período de consulta</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>De</Text>
            <Text style={styles.infoValue}>{data.periodo.inicio ?? "—"}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Até</Text>
            <Text style={styles.infoValue}>{data.periodo.fim ?? "—"}</Text>
          </View>
          <View style={styles.infoItemFull}>
            <Text style={styles.infoLabel}>Fonte</Text>
            <Text style={styles.infoValue}>{data.periodo.fonte}</Text>
          </View>
        </View>
      </Page>

      {/* Uma página por item */}
      {data.items.map((item, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Item #{item.itemNumber}</Text>
              <Text style={styles.headerSubtitle}>
                {item.itemType === "MATERIAL" ? "Material (CATMAT)" : "Serviço (CATSER)"}
                {item.catalogoCodigo ? ` · ${item.catalogoCodigo}` : ""}
              </Text>
            </View>
            <View>
              <Text style={styles.headerOrg}>{data.contract.number}</Text>
              <Text style={styles.headerOrgSub}>JFAP/NUTEC</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Descrição do Item</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItemFull}>
              <Text style={styles.infoLabel}>Descrição</Text>
              <Text style={styles.infoValue}>{item.description}</Text>
            </View>
            {item.codeDescricao ? (
              <View style={styles.infoItemFull}>
                <Text style={styles.infoLabel}>Descrição no catálogo</Text>
                <Text style={styles.infoValue}>{item.codeDescricao}</Text>
              </View>
            ) : null}
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Unidade</Text>
              <Text style={styles.infoValue}>{item.unitOfMeasure}</Text>
            </View>
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Quantidade</Text>
              <Text style={styles.infoValue}>{item.quantity.toLocaleString("pt-BR")}</Text>
            </View>
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Valor unitário</Text>
              <Text style={styles.infoValue}>{formatCurrencyPdf(item.unitValue)}</Text>
            </View>
            <View style={styles.infoItemFull}>
              <Text style={styles.infoLabel}>Valor total do item</Text>
              <Text style={styles.infoValue}>{formatCurrencyPdf(item.totalValue)}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Estatísticas ({item.stats.count} válidas de {item.stats.countTotal})
          </Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Média</Text>
              <Text style={styles.summaryValue}>{formatCurrencyPdf(item.stats.mean)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mediana</Text>
              <Text style={styles.summaryValue}>{formatCurrencyPdf(item.stats.median)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mínimo</Text>
              <Text style={styles.summaryValue}>{formatCurrencyPdf(item.stats.min)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Máximo</Text>
              <Text style={styles.summaryValue}>{formatCurrencyPdf(item.stats.max)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Desvio-padrão</Text>
              <Text style={styles.summaryValue}>{formatCurrencyPdf(item.stats.stdDev)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryTotal}>
              <Text style={styles.summaryTotalLabel}>Coef. de variação</Text>
              <Text style={styles.summaryTotalValue}>
                {(item.stats.coefVariation * 100).toFixed(2)}%
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Preço de Referência Adotado</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Método</Text>
              <Text style={styles.infoValue}>
                {METHOD_LABEL[item.reference.method] ?? item.reference.method}
              </Text>
            </View>
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Ajuste</Text>
              <Text style={styles.infoValue}>
                {item.reference.adjustmentPercent != null
                  ? `${item.reference.adjustmentPercent > 0 ? "+" : ""}${item.reference.adjustmentPercent.toFixed(2)}%`
                  : "—"}
              </Text>
            </View>
            <View style={styles.infoItemThird}>
              <Text style={styles.infoLabel}>Valor adotado</Text>
              <Text style={styles.infoValue}>
                {item.reference.value != null ? formatCurrencyPdf(item.reference.value) : "—"}
              </Text>
            </View>
            {item.reference.methodJustification ? (
              <View style={styles.infoItemFull}>
                <Text style={styles.infoLabel}>Justificativa do método</Text>
                <Text style={styles.infoValue}>{item.reference.methodJustification}</Text>
              </View>
            ) : null}
          </View>

          {item.exceptionJustification ? (
            <>
              <Text style={styles.sectionTitle}>
                Excepcionalidade — Menos de 3 amostras (IN SEGES 65 art. 6º §4º)
              </Text>
              <Text style={justificationStyle}>{item.exceptionJustification}</Text>
            </>
          ) : null}

          <Text style={styles.sectionTitle}>Amostras</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "26%" }]}>Objeto</Text>
              <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Fonte</Text>
              <Text style={[styles.tableHeaderCell, { width: "16%" }]}>Órgão/Fornec.</Text>
              <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Data</Text>
              <Text style={[styles.tableHeaderCell, { width: "6%" }]}>UF</Text>
              <Text style={[styles.tableHeaderCell, { width: "9%" }]}>Regime</Text>
              <Text style={[styles.tableHeaderCell, { width: "13%" }]}>Valor</Text>
              <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Status</Text>
            </View>
            {item.samples.map((s, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "26%" }]}>
                  {s.objetoResumo.length > 60 ? s.objetoResumo.slice(0, 60) + "…" : s.objetoResumo}
                </Text>
                <Text style={[styles.tableCell, { width: "10%" }]}>
                  {SOURCE_LABEL[s.source] ?? s.source}
                </Text>
                <Text style={[styles.tableCell, { width: "16%" }]}>
                  {s.supplierName ?? s.orgao ?? "—"}
                </Text>
                <Text style={[styles.tableCell, { width: "10%" }]}>
                  {formatDatePdf(s.dataAssinatura)}
                </Text>
                <Text style={[styles.tableCell, { width: "6%" }]}>{s.uf ?? "—"}</Text>
                <Text style={[styles.tableCell, { width: "9%" }]}>
                  {regimeShort(s.regimeInferred)}
                </Text>
                <Text style={[styles.tableCellBold, { width: "13%" }]}>
                  {formatCurrencyPdf(s.valorGlobal)}
                </Text>
                <Text style={[styles.tableCell, { width: "10%" }]}>
                  {s.excluded ? "Excluída" : "Válida"}
                </Text>
              </View>
            ))}
          </View>

          {item.justification ? (
            <>
              <Text style={styles.sectionTitle}>Justificativa de Economicidade</Text>
              <Text style={justificationStyle}>{item.justification}</Text>
            </>
          ) : null}

          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>
              Documento gerado pelo Sistema de Gestão de Contratos — JFAP/NUTEC · Fonte:
              compras.gov.br
            </Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
              fixed
            />
          </View>
        </Page>
      ))}
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
