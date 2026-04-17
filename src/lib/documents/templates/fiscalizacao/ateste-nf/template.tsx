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

export interface AtesteNfData {
  contract: {
    number: string;
    processNumber: string;
    object: string;
    supplier: string;
    supplierCnpj: string;
  };
  payment: {
    referenceMonth: Date;
    invoiceValue: number | null;
    attestDate: Date;
    attestNotes: string | null;
  };
  fiscal: {
    holderName: string;
  };
  generatedAt: Date;
}

export function AtesteNfPdf({ data }: { data: AtesteNfData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Termo de Ateste de Nota Fiscal</Text>
            <Text style={styles.headerSubtitle}>
              Gerado em {formatDateTimePdf()}
            </Text>
          </View>
          <View>
            <Text style={styles.headerOrg}>JFAP/NUTEC</Text>
            <Text style={styles.headerOrgSub}>
              Sistema de Gestão de Contratos
            </Text>
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
        </View>

        <Text style={styles.sectionTitle}>Referência</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Mês de Referência</Text>
            <Text style={styles.infoValue}>
              {formatMonthYearPdf(data.payment.referenceMonth)}
            </Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Valor da Nota Fiscal</Text>
            <Text style={styles.infoValue}>
              {data.payment.invoiceValue !== null
                ? formatCurrencyPdf(data.payment.invoiceValue)
                : "—"}
            </Text>
          </View>
          <View style={styles.infoItemThird}>
            <Text style={styles.infoLabel}>Data do Ateste</Text>
            <Text style={styles.infoValue}>
              {formatDatePdf(data.payment.attestDate)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Declaração</Text>
        <Text style={declarationStyle}>
          {"Atesto, para fins de liquidação e pagamento, que os serviços/bens objeto do contrato " +
            `nº ${data.contract.number} foram prestados/entregues pela empresa ` +
            `${data.contract.supplier} (CNPJ ${formatCnpjPdf(data.contract.supplierCnpj)}), ` +
            `referentes ao mês de ${formatMonthYearPdf(data.payment.referenceMonth)}, ` +
            "em conformidade com as especificações técnicas e condições pactuadas, " +
            "nos termos do art. 117 da Lei nº 14.133/2021 e do art. 67 da Lei nº 8.666/1993 " +
            "(quando aplicável), não havendo, até a presente data, motivo impeditivo para o " +
            "prosseguimento do processo de pagamento."}
        </Text>

        {data.payment.attestNotes ? (
          <>
            <Text style={styles.sectionTitle}>Observações do Fiscal</Text>
            <Text style={declarationStyle}>{data.payment.attestNotes}</Text>
          </>
        ) : null}

        <View style={signatureBlock}>
          <View style={signatureLine} />
          <Text style={signatureLabel}>{data.fiscal.holderName}</Text>
          <Text style={signatureRole}>Fiscal do Contrato</Text>
          <Text style={signatureDate}>
            Macapá/AP, {formatDatePdf(data.payment.attestDate)}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Documento gerado eletronicamente pelo Sistema de Gestão de Contratos — JFAP/NUTEC
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

const declarationStyle = {
  fontSize: 10,
  lineHeight: 1.5,
  textAlign: "justify" as const,
  marginVertical: 8,
};

const signatureBlock = {
  marginTop: 60,
  alignItems: "center" as const,
};

const signatureLine = {
  width: 260,
  borderTopWidth: 0.8,
  borderTopColor: "#1a1a1a",
  marginBottom: 4,
};

const signatureLabel = {
  fontSize: 10,
  fontFamily: "Helvetica-Bold",
};

const signatureRole = {
  fontSize: 9,
  color: "#555",
  marginTop: 2,
};

const signatureDate = {
  fontSize: 9,
  color: "#555",
  marginTop: 12,
};
