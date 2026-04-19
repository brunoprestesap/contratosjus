import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, formatDatePdf, formatDateTimePdf, formatCnpjPdf } from "@/lib/pdf/styles";

export interface SolicitacaoParecerData {
  contract: {
    number: string;
    processNumber: string;
    object: string;
    supplier: string;
    supplierCnpj: string;
    endDate: Date;
    fiscalHolder: string;
  };
  destinatario: string;
  resumoFato: string;
  fundamentacao: string;
  quesitosManual?: string;
  anexos: Array<{
    title: string;
    version: number;
    generatedAt: Date | null;
    pdfChecksum: string | null;
  }>;
}

export function SolicitacaoParecerPdf({ data }: { data: SolicitacaoParecerData }) {
  const quesitosDefault = [
    "Há óbice jurídico à prorrogação contratual nos termos propostos?",
    "A minuta de termo aditivo observa as exigências formais da Lei 14.133/2021?",
    "A pesquisa de preços apresentada é suficiente para comprovar a economicidade?",
    "Recomenda-se ajustes, complementações ou providências adicionais?",
  ];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Solicitação de Parecer Jurídico</Text>
            <Text style={styles.headerSubtitle}>Gerado em {formatDateTimePdf()}</Text>
          </View>
          <View>
            <Text style={styles.headerOrg}>JFAP/NUTEC</Text>
            <Text style={styles.headerOrgSub}>Sistema de Gestão de Contratos</Text>
          </View>
        </View>

        <Text style={paragraphStyle}>
          À{"\n"}
          <Text style={bold}>{data.destinatario}</Text>
          {"\n"}
          <Text style={styles.infoLabel}>ASSUNTO:</Text> Prorrogação do Contrato nº{" "}
          {data.contract.number} — solicitação de parecer jurídico.
        </Text>

        <Text style={styles.sectionTitle}>Identificação do Contrato</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Número do contrato</Text>
            <Text style={styles.infoValue}>{data.contract.number}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Processo administrativo</Text>
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
          <View style={styles.infoItemFull}>
            <Text style={styles.infoLabel}>Fim de vigência atual</Text>
            <Text style={styles.infoValue}>{formatDatePdf(data.contract.endDate)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Resumo Fático</Text>
        <Text style={paragraphStyle}>{data.resumoFato}</Text>

        <Text style={styles.sectionTitle}>Fundamentação Preliminar</Text>
        <Text style={paragraphStyle}>{data.fundamentacao}</Text>

        <Text style={styles.sectionTitle}>Quesitos ao Parecerista</Text>
        {data.quesitosManual ? (
          <Text style={paragraphStyle}>{data.quesitosManual}</Text>
        ) : (
          <View>
            {quesitosDefault.map((q, i) => (
              <Text key={i} style={quesitoStyle}>
                {i + 1}. {q}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Anexos Referenciados</Text>
        {data.anexos.length === 0 ? (
          <Text style={paragraphStyle}>
            Nenhum documento vinculado encontrado no sistema. Recomenda-se anexar manualmente a
            pesquisa de preços, justificativa de economicidade e minuta do aditivo antes do envio.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "50%" }]}>Documento</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Versão</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Gerado em</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Checksum</Text>
            </View>
            {data.anexos.map((a, i) => (
              <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Text style={[styles.tableCell, { width: "50%" }]}>{a.title}</Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>v{a.version}</Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatDatePdf(a.generatedAt)}
                </Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>
                  {a.pdfChecksum?.slice(0, 10) ?? "—"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={signatureBlock}>
          <View style={signatureLine} />
          <Text style={signatureLabel}>{data.contract.fiscalHolder}</Text>
          <Text style={signatureRole}>Fiscal do Contrato</Text>
          <Text style={signatureDate}>Macapá/AP, {formatDatePdf(new Date())}</Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Documento gerado eletronicamente — JFAP/NUTEC</Text>
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

const quesitoStyle = {
  fontSize: 10,
  lineHeight: 1.5,
  marginVertical: 3,
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
