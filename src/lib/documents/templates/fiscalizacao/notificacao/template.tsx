import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatDatePdf,
  formatDateTimePdf,
  formatCnpjPdf,
} from "@/lib/pdf/styles";

export type NotificacaoTipo = "ATRASO" | "DESCUMPRIMENTO" | "ORIENTACAO";

export interface NotificacaoData {
  tipo: NotificacaoTipo;
  contract: {
    number: string;
    processNumber: string;
    object: string;
    supplier: string;
    supplierCnpj: string;
    fiscalHolder: string;
    legalRegime: "LEI_14133_2021" | "LEI_8666_1993";
  };
  fato: string;
  fundamentacao: string;
  prazoDias: number;
  prazoBase?: string; // "úteis" ou "corridos"
}

const TIPO_LABEL: Record<NotificacaoTipo, string> = {
  ATRASO: "Notificação por Atraso na Execução Contratual",
  DESCUMPRIMENTO: "Notificação por Descumprimento de Cláusula Contratual",
  ORIENTACAO: "Notificação de Orientação e Advertência",
};

const TIPO_INTRO: Record<NotificacaoTipo, string> = {
  ATRASO:
    "Vem, pela presente, NOTIFICAR V.Sa. acerca de ATRASO identificado no cumprimento de obrigação contratual, nos termos abaixo expostos, para que sejam adotadas as providências cabíveis.",
  DESCUMPRIMENTO:
    "Vem, pela presente, NOTIFICAR V.Sa. acerca de DESCUMPRIMENTO de cláusula contratual, nos termos abaixo expostos, alertando quanto à possibilidade de aplicação das sanções cabíveis.",
  ORIENTACAO:
    "Vem, pela presente, prestar ORIENTAÇÃO e registrar advertência quanto à execução contratual, nos termos abaixo expostos, para que sejam observadas as recomendações a seguir.",
};

export function NotificacaoPdf({ data }: { data: NotificacaoData }) {
  const baseLegal =
    data.contract.legalRegime === "LEI_14133_2021"
      ? "Lei nº 14.133/2021"
      : "Lei nº 8.666/1993";
  const unidadePrazo = data.prazoBase ?? "úteis";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{TIPO_LABEL[data.tipo]}</Text>
            <Text style={styles.headerSubtitle}>
              Contrato nº {data.contract.number} · Gerado em {formatDateTimePdf()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerOrg}>JFAP/NUTEC</Text>
            <Text style={styles.headerOrgSub}>Sistema de Gestão de Contratos</Text>
          </View>
        </View>

        <Text style={paragraphStyle}>
          Ao{"\n"}
          <Text style={bold}>{data.contract.supplier}</Text>
          {"\n"}CNPJ: <Text style={bold}>{formatCnpjPdf(data.contract.supplierCnpj)}</Text>
          {"\n"}A/C: Representante Legal da empresa
        </Text>

        <Text style={paragraphStyle}>
          <Text style={bold}>Referência:</Text> Contrato nº {data.contract.number} —
          Processo {data.contract.processNumber}
          {"\n"}
          <Text style={bold}>Objeto:</Text> {data.contract.object}
        </Text>

        <Text style={paragraphStyle}>Prezado(a) Senhor(a),</Text>
        <Text style={paragraphStyle}>{TIPO_INTRO[data.tipo]}</Text>

        <Text style={styles.sectionTitle}>Fato Apurado</Text>
        <Text style={paragraphStyle}>{data.fato}</Text>

        <Text style={styles.sectionTitle}>Fundamentação</Text>
        <Text style={paragraphStyle}>{data.fundamentacao}</Text>

        <Text style={styles.sectionTitle}>Prazo para Manifestação</Text>
        <Text style={paragraphStyle}>
          Fica concedido o prazo de <Text style={bold}>{data.prazoDias} dias {unidadePrazo}</Text>,
          contados do recebimento desta notificação, para que V.Sa. apresente
          manifestação formal, juntando a documentação que entender pertinente,
          nos termos da {baseLegal} e das cláusulas pactuadas.
        </Text>

        {data.tipo !== "ORIENTACAO" ? (
          <Text style={paragraphStyle}>
            Advertimos que a ausência de manifestação tempestiva ou o não saneamento
            do fato apurado poderão ensejar a aplicação das sanções administrativas
            previstas na {baseLegal} e no instrumento contratual, incluindo
            advertência, multa, suspensão temporária de participação em licitação
            e/ou declaração de inidoneidade, conforme o caso.
          </Text>
        ) : null}

        <Text style={paragraphStyle}>
          Permanecemos à disposição para esclarecimentos necessários.
        </Text>

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
const bold = { fontFamily: "Helvetica-Bold" };
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
