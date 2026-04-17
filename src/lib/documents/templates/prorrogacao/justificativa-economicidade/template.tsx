import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatCurrencyPdf,
  formatDatePdf,
  formatDateTimePdf,
  formatCnpjPdf,
} from "@/lib/pdf/styles";

export interface JustificativaEconomicidadeData {
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
    fiscalHolder: string;
    legalRegime: "LEI_14133_2021" | "LEI_8666_1993";
  };
  pesquisa: {
    catalogoTipo: "MATERIAL" | "SERVICE";
    catalogoCodigo: string | null;
    periodoInicio: string | null;
    periodoFim: string | null;
    amostrasValidas: number;
    stats: {
      mean: number;
      median: number;
      min: number;
      max: number;
      stdDev: number;
      coefVariation: number;
    };
  };
  comparacao: {
    valorContratoReferencia: number;
    valorMedio: number;
    diferencaAbs: number;
    diferencaPct: number;
    conclusao: "economico" | "acima_mercado" | "dentro_media";
  };
  fundamentacaoTexto: string;
}

function taglineConclusao(c: JustificativaEconomicidadeData["comparacao"]["conclusao"]) {
  if (c === "economico") return "Vantajoso à Administração (abaixo da média de mercado).";
  if (c === "acima_mercado") return "Acima da média de mercado — exige justificativa adicional.";
  return "Dentro da média de mercado — compatível com preços praticados.";
}

export function JustificativaEconomicidadePdf({
  data,
}: {
  data: JustificativaEconomicidadeData;
}) {
  const isLegacyRegime = data.contract.legalRegime === "LEI_8666_1993";
  const baseLegalLabel = isLegacyRegime
    ? "Lei nº 8.666/1993, art. 57"
    : "Lei nº 14.133/2021, art. 107";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Justificativa de Economicidade</Text>
            <Text style={styles.headerSubtitle}>
              {baseLegalLabel} · Manual CNJ · Gerado em {formatDateTimePdf()}
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
            <Text style={styles.infoLabel}>Vigência atual</Text>
            <Text style={styles.infoValue}>
              {formatDatePdf(data.contract.startDate)} a {formatDatePdf(data.contract.endDate)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumo da Pesquisa de Preços</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Tipo</Text>
            <Text style={styles.infoValue}>
              {data.pesquisa.catalogoTipo === "MATERIAL" ? "Material (CATMAT)" : "Serviço (CATSER)"}
            </Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Código</Text>
            <Text style={styles.infoValue}>{data.pesquisa.catalogoCodigo ?? "—"}</Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Amostras válidas</Text>
            <Text style={styles.infoValue}>{data.pesquisa.amostrasValidas}</Text>
          </View>
          <View style={styles.infoItemFull}>
            <Text style={styles.infoLabel}>Período consultado</Text>
            <Text style={styles.infoValue}>
              {data.pesquisa.periodoInicio ?? "—"} a {data.pesquisa.periodoFim ?? "—"}
            </Text>
          </View>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>Estatísticas descritivas</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Média de mercado</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPdf(data.pesquisa.stats.mean)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mediana</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPdf(data.pesquisa.stats.median)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mínimo / Máximo</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(data.pesquisa.stats.min)} / {formatCurrencyPdf(data.pesquisa.stats.max)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Desvio-padrão</Text>
            <Text style={styles.summaryValue}>{formatCurrencyPdf(data.pesquisa.stats.stdDev)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Coef. de variação</Text>
            <Text style={styles.summaryTotalValue}>
              {(data.pesquisa.stats.coefVariation * 100).toFixed(2)}%
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Comparação: Valor Contratado × Mercado</Text>
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Valor-referência do contrato</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(data.comparacao.valorContratoReferencia)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Média de mercado</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(data.comparacao.valorMedio)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Diferença absoluta</Text>
            <Text style={styles.summaryValue}>
              {formatCurrencyPdf(data.comparacao.diferencaAbs)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>Diferença relativa</Text>
            <Text style={styles.summaryTotalValue}>
              {data.comparacao.diferencaPct > 0 ? "+" : ""}
              {data.comparacao.diferencaPct.toFixed(2)}% — {taglineConclusao(data.comparacao.conclusao)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Fundamentação e Conclusão</Text>
        <Text style={textoStyle}>{data.fundamentacaoTexto}</Text>

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
            Documento gerado eletronicamente — JFAP/NUTEC · Fonte: compras.gov.br
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

const textoStyle = {
  fontSize: 10,
  lineHeight: 1.5,
  textAlign: "justify" as const,
  marginTop: 6,
  marginBottom: 12,
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
