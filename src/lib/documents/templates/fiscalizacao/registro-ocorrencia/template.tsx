import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, formatDatePdf, formatDateTimePdf, formatCnpjPdf } from "@/lib/pdf/styles";

export type OcorrenciaTipo = "ATRASO" | "DESCUMPRIMENTO" | "QUALIDADE" | "SEGURANCA" | "OUTRO";

export type OcorrenciaSeveridade = "LEVE" | "MEDIA" | "GRAVE";

export interface RegistroOcorrenciaData {
  contract: {
    number: string;
    processNumber: string;
    object: string;
    supplier: string;
    supplierCnpj: string;
    fiscalHolder: string;
  };
  ocorrencia: {
    occurredAt: Date;
    type: OcorrenciaTipo;
    severity: OcorrenciaSeveridade;
    description: string;
    evidences: Array<{ descricao: string; referencia?: string }>;
  };
  providencias: string;
  reportedBy: string;
}

const TIPO_LABEL: Record<OcorrenciaTipo, string> = {
  ATRASO: "Atraso na execução",
  DESCUMPRIMENTO: "Descumprimento contratual",
  QUALIDADE: "Problema de qualidade",
  SEGURANCA: "Questão de segurança",
  OUTRO: "Outro",
};

const SEVERIDADE_COR: Record<OcorrenciaSeveridade, string> = {
  LEVE: "#0f766e",
  MEDIA: "#ca8a04",
  GRAVE: "#b91c1c",
};

export function RegistroOcorrenciaPdf({ data }: { data: RegistroOcorrenciaData }) {
  const corSeveridade = SEVERIDADE_COR[data.ocorrencia.severity];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Registro de Ocorrência</Text>
            <Text style={styles.headerSubtitle}>
              Contrato nº {data.contract.number} · Gerado em {formatDateTimePdf()}
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
            <Text style={styles.infoValue}>{formatCnpjPdf(data.contract.supplierCnpj)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Classificação</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Data da ocorrência</Text>
            <Text style={styles.infoValue}>{formatDatePdf(data.ocorrencia.occurredAt)}</Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Tipo</Text>
            <Text style={styles.infoValue}>{TIPO_LABEL[data.ocorrencia.type]}</Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Severidade</Text>
            <Text
              style={{
                ...styles.infoValue,
                color: corSeveridade,
              }}
            >
              {data.ocorrencia.severity}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Descrição do Fato</Text>
        <Text style={paragraphStyle}>{data.ocorrencia.description}</Text>

        {data.ocorrencia.evidences.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Evidências</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: "60%" }]}>Descrição</Text>
                <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Referência</Text>
              </View>
              {data.ocorrencia.evidences.map((e, i) => (
                <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, { width: "60%" }]}>{e.descricao}</Text>
                  <Text style={[styles.tableCell, { width: "40%" }]}>{e.referencia ?? "—"}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Providências Sugeridas</Text>
        <Text style={paragraphStyle}>
          {data.providencias ||
            "Providências a serem definidas após análise conjunta com o gestor do contrato."}
        </Text>

        <View style={signatureBlock}>
          <View style={signatureLine} />
          <Text style={signatureLabel}>{data.reportedBy}</Text>
          <Text style={signatureRole}>
            Fiscal {data.reportedBy !== data.contract.fiscalHolder ? "(substituto)" : "do Contrato"}
          </Text>
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
