import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import {
  styles,
  formatCurrencyPdf,
  formatDatePdf,
  formatDateTimePdf,
  formatCnpjPdf,
} from "@/lib/pdf/styles";

export interface TermoAditivoData {
  contract: {
    number: string;
    processNumber: string;
    object: string;
    supplier: string;
    supplierCnpj: string;
    signatureDate: Date;
    originalEndDate: Date;
    originalGlobalValue: number;
    fiscalHolder: string;
    contractManager: string | null;
    legalRegime: "LEI_14133_2021" | "LEI_8666_1993";
  };
  additive: {
    number: string;
    type: "TERM" | "VALUE" | "MIXED" | "READJUSTMENT" | "APOSTILAMENTO";
    signatureDate: Date;
    newEndDate: Date | null;
    newGlobalValue: number | null;
    newMonthlyValue: number | null;
    justification: string;
  };
  consideracoesManual?: string;
}

const ADITIVO_TIPO_LABEL: Record<TermoAditivoData["additive"]["type"], string> = {
  TERM: "Prorrogação de Vigência",
  VALUE: "Acréscimo/Supressão de Valor",
  MIXED: "Prorrogação com Alteração de Valor",
  READJUSTMENT: "Reajuste/Repactuação",
  APOSTILAMENTO: "Apostilamento",
};

export function TermoAditivoPdf({ data }: { data: TermoAditivoData }) {
  const aditivoLabel = ADITIVO_TIPO_LABEL[data.additive.type];
  const isTerm = data.additive.type === "TERM" || data.additive.type === "MIXED";
  const isValor = data.additive.type === "VALUE" || data.additive.type === "MIXED";
  const isReajuste = data.additive.type === "READJUSTMENT";
  const isLegacyRegime = data.contract.legalRegime === "LEI_8666_1993";
  const baseLegalLabel = isLegacyRegime ? "Lei nº 8.666/1993" : "Lei nº 14.133/2021";
  const fundamentacaoTexto = isLegacyRegime
    ? "O presente aditamento encontra respaldo no art. 57 da Lei nº 8.666/1993 (prorrogação de vigência) e no art. 65 do mesmo diploma (alteração de valor e condições), e no Manual de Gestão e Fiscalização de Contratos do Conselho Nacional de Justiça."
    : "O presente aditamento encontra respaldo no art. 107 da Lei nº 14.133/2021 (prorrogação), nos arts. 124 e 125 do mesmo diploma (alteração de valor e reajuste), e no Manual de Gestão e Fiscalização de Contratos do Conselho Nacional de Justiça.";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>
              {data.additive.number} Termo Aditivo — {aditivoLabel}
            </Text>
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
          TERMO ADITIVO Nº {data.additive.number} AO CONTRATO Nº {data.contract.number}, celebrado
          entre a{"\n"}
          <Text style={bold}>JUSTIÇA FEDERAL DO AMAPÁ — SEÇÃO JUDICIÁRIA DO AMAPÁ</Text>, pessoa
          jurídica de direito público, doravante denominada CONTRATANTE, e{"\n"}
          <Text style={bold}>{data.contract.supplier}</Text>, inscrita no CNPJ sob o nº{" "}
          <Text style={bold}>{formatCnpjPdf(data.contract.supplierCnpj)}</Text>, doravante
          denominada CONTRATADA, têm entre si justo e contratado o presente Termo Aditivo, nos
          termos da {baseLegalLabel}, mediante as cláusulas seguintes.
        </Text>

        <Text style={styles.sectionTitle}>Cláusula Primeira — Do Objeto</Text>
        <Text style={paragraphStyle}>
          Tem o presente instrumento a finalidade de promover o aditamento ao Contrato nº{" "}
          {data.contract.number} (processo nº {data.contract.processNumber}), cujo objeto é a{" "}
          <Text style={bold}>{data.contract.object}</Text>, na modalidade de{" "}
          <Text style={bold}>{aditivoLabel.toLowerCase()}</Text>.
        </Text>

        {isTerm && data.additive.newEndDate ? (
          <>
            <Text style={styles.sectionTitle}>Cláusula Segunda — Da Prorrogação de Vigência</Text>
            <Text style={paragraphStyle}>
              Fica prorrogada a vigência do contrato originalmente com término em{" "}
              <Text style={bold}>{formatDatePdf(data.contract.originalEndDate)}</Text>, passando a
              vigorar até <Text style={bold}>{formatDatePdf(data.additive.newEndDate)}</Text>,
              mantidas as demais condições pactuadas.
            </Text>
          </>
        ) : null}

        {isValor && data.additive.newGlobalValue !== null ? (
          <>
            <Text style={styles.sectionTitle}>
              Cláusula {isTerm ? "Terceira" : "Segunda"} — Do Valor
            </Text>
            <Text style={paragraphStyle}>
              O valor global do contrato, originalmente de{" "}
              <Text style={bold}>{formatCurrencyPdf(data.contract.originalGlobalValue)}</Text>,
              passa a ser de{" "}
              <Text style={bold}>{formatCurrencyPdf(data.additive.newGlobalValue)}</Text>
              {data.additive.newMonthlyValue !== null ? (
                <>
                  , correspondendo a parcelas mensais estimadas de{" "}
                  <Text style={bold}>{formatCurrencyPdf(data.additive.newMonthlyValue)}</Text>
                </>
              ) : null}
              .
            </Text>
          </>
        ) : null}

        {isReajuste && data.additive.newMonthlyValue !== null ? (
          <>
            <Text style={styles.sectionTitle}>Cláusula Segunda — Do Reajuste</Text>
            <Text style={paragraphStyle}>
              O valor mensal do contrato é reajustado para{" "}
              <Text style={bold}>{formatCurrencyPdf(data.additive.newMonthlyValue)}</Text>, nos
              termos da cláusula contratual pertinente e do índice legal aplicável.
            </Text>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Cláusula — Da Fundamentação Legal</Text>
        <Text style={paragraphStyle}>{fundamentacaoTexto}</Text>

        <Text style={styles.sectionTitle}>Cláusula — Da Justificativa</Text>
        <Text style={paragraphStyle}>{data.additive.justification}</Text>

        {data.consideracoesManual ? (
          <>
            <Text style={styles.sectionTitle}>Considerações Adicionais</Text>
            <Text style={paragraphStyle}>{data.consideracoesManual}</Text>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Cláusula — Da Ratificação</Text>
        <Text style={paragraphStyle}>
          Permanecem inalteradas e em pleno vigor todas as demais cláusulas e condições do contrato
          original não modificadas pelo presente instrumento.
        </Text>

        <Text style={paragraphStyle}>
          E, por estarem assim justos e contratados, assinam as partes o presente Termo Aditivo em
          duas vias de igual teor.
        </Text>

        <Text style={paragraphStyle}>Macapá/AP, {formatDatePdf(data.additive.signatureDate)}.</Text>

        <View style={signaturesRow}>
          <View style={signatureCol}>
            <View style={signatureLine} />
            <Text style={signatureLabel}>CONTRATANTE</Text>
            <Text style={signatureRole}>Justiça Federal do Amapá</Text>
          </View>
          <View style={signatureCol}>
            <View style={signatureLine} />
            <Text style={signatureLabel}>CONTRATADA</Text>
            <Text style={signatureRole}>{data.contract.supplier}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <Text style={fiscalRow}>
            Fiscal: {data.contract.fiscalHolder}
            {data.contract.contractManager ? ` · Gestor: ${data.contract.contractManager}` : ""}
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Minuta gerada eletronicamente — JFAP/NUTEC · sujeita a parecer jurídico
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

const signaturesRow = {
  flexDirection: "row" as const,
  justifyContent: "space-between" as const,
  marginTop: 60,
};

const signatureCol = {
  width: "45%" as const,
  alignItems: "center" as const,
};

const signatureLine = {
  width: "100%" as const,
  borderTopWidth: 0.8,
  borderTopColor: "#1a1a1a",
  marginBottom: 4,
};

const signatureLabel = { fontSize: 10, fontFamily: "Helvetica-Bold" };
const signatureRole = { fontSize: 9, color: "#555", marginTop: 2 };
const fiscalRow = { fontSize: 9, color: "#444" };
