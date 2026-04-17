import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

// Templates puros (apenas .render(data), sem loadData que depende de DB)
import { AtesteNfPdf } from "@/lib/documents/templates/fiscalizacao/ateste-nf/template";
import { NotificacaoPdf } from "@/lib/documents/templates/fiscalizacao/notificacao/template";
import { RegistroOcorrenciaPdf } from "@/lib/documents/templates/fiscalizacao/registro-ocorrencia/template";
import { RelatorioFiscalPdf } from "@/lib/documents/templates/fiscalizacao/relatorio-fiscal/template";
import { PesquisaPrecosPdf } from "@/lib/documents/templates/prorrogacao/pesquisa-precos/template";
import { JustificativaEconomicidadePdf } from "@/lib/documents/templates/prorrogacao/justificativa-economicidade/template";
import { TermoAditivoPdf } from "@/lib/documents/templates/prorrogacao/termo-aditivo/template";
import { SolicitacaoParecerPdf } from "@/lib/documents/templates/prorrogacao/solicitacao-parecer/template";

// Fixtures compartilhadas
const contractFixture = {
  number: "NCE 001/2026",
  processNumber: "0000.1234/2026-00",
  object: "Prestação de serviços de vigilância armada",
  supplier: "SEGURANÇA PATRIMONIAL LTDA",
  supplierCnpj: "12345678000190",
};

function assertPdfBuffer(buffer: Buffer) {
  expect(buffer.length).toBeGreaterThan(500);
  // PDF magic bytes "%PDF"
  expect(buffer[0]).toBe(0x25);
  expect(buffer[1]).toBe(0x50);
  expect(buffer[2]).toBe(0x44);
  expect(buffer[3]).toBe(0x46);
}

async function renderPdf(element: React.ReactElement): Promise<Buffer> {
  return renderToBuffer(element as Parameters<typeof renderToBuffer>[0]);
}

describe("Render de templates — Fiscalização", () => {
  it("AtesteNfPdf renderiza sem erro", async () => {
    const buf = await renderPdf(
      React.createElement(AtesteNfPdf, {
        data: {
          contract: {
            number: contractFixture.number,
            processNumber: contractFixture.processNumber,
            object: contractFixture.object,
            supplier: contractFixture.supplier,
            supplierCnpj: contractFixture.supplierCnpj,
          },
          payment: {
            referenceMonth: new Date("2026-02-01"),
            invoiceValue: 100000,
            attestDate: new Date("2026-03-05"),
            attestNotes: "Serviço prestado conforme contratado.",
          },
          fiscal: { holderName: "João da Silva" },
          generatedAt: new Date("2026-03-05"),
        },
      })
    );
    assertPdfBuffer(buf);
  });

  it("NotificacaoPdf renderiza as 3 variações", async () => {
    for (const tipo of ["ATRASO", "DESCUMPRIMENTO", "ORIENTACAO"] as const) {
      const buf = await renderPdf(
        React.createElement(NotificacaoPdf, {
          data: {
            tipo,
            contract: {
              ...contractFixture,
              fiscalHolder: "João da Silva",
              legalRegime: "LEI_14133_2021",
            },
            fato: "Atraso de 5 dias na entrega do relatório mensal.",
            fundamentacao: "Cláusula 5ª do contrato.",
            prazoDias: 5,
            prazoBase: "úteis",
          },
        })
      );
      assertPdfBuffer(buf);
    }
  });

  it("RegistroOcorrenciaPdf renderiza com evidências", async () => {
    const buf = await renderPdf(
      React.createElement(RegistroOcorrenciaPdf, {
        data: {
          contract: { ...contractFixture, fiscalHolder: "João da Silva" },
          ocorrencia: {
            occurredAt: new Date("2026-03-01"),
            type: "ATRASO",
            severity: "GRAVE",
            description: "Atraso superior a 10 dias no relatório mensal.",
            evidences: [
              { descricao: "E-mail do contratado", referencia: "2026-03-01" },
              { descricao: "Foto do local" },
            ],
          },
          providencias: "Notificar formalmente.",
          reportedBy: "João da Silva",
        },
      })
    );
    assertPdfBuffer(buf);
  });

  it("RelatorioFiscalPdf renderiza com listas cheias e vazias", async () => {
    const buf = await renderPdf(
      React.createElement(RelatorioFiscalPdf, {
        data: {
          contract: {
            ...contractFixture,
            globalValue: 1200000,
            startDate: new Date("2025-06-01"),
            endDate: new Date("2026-05-31"),
            fiscalHolder: "João da Silva",
          },
          periodo: {
            inicio: new Date("2026-02-01"),
            fim: new Date("2026-02-28"),
          },
          financeiro: {
            totalPagoAcumulado: 200000,
            totalEmpenhadoAcumulado: 1200000,
            saldoContratual: 1000000,
            totalPagoPeriodo: 100000,
            totalEmpenhadoPeriodo: 0,
          },
          pagamentos: [
            {
              referenceMonth: new Date("2026-02-01"),
              invoiceValue: 100000,
              attestDate: new Date("2026-03-05"),
              settlementDate: new Date("2026-03-10"),
              paidAt: new Date("2026-03-15"),
              paidValue: 100000,
              status: "Pago",
            },
          ],
          empenhos: [],
          aditivos: [],
          ocorrencias: [
            {
              occurredAt: new Date("2026-02-15"),
              type: "QUALIDADE",
              severity: "MEDIA",
              description: "Qualidade abaixo do esperado em 2 dias.",
            },
          ],
          conclusao: "Execução regular do contrato no período.",
        },
      })
    );
    assertPdfBuffer(buf);
  });
});

describe("Render de templates — Prorrogação", () => {
  it("PesquisaPrecosPdf renderiza com amostras", async () => {
    const buf = await renderPdf(
      React.createElement(PesquisaPrecosPdf, {
        data: {
          contract: {
            ...contractFixture,
            globalValue: 1200000,
            monthlyValue: 100000,
            startDate: new Date("2025-06-01"),
            endDate: new Date("2026-05-31"),
          },
          catalogo: { tipo: "SERVICE", codigo: "26789" },
          periodo: {
            inicio: "2024-01-01",
            fim: "2024-12-31",
            fonte: "compras.gov.br",
          },
          samples: [
            {
              orgao: "TRF1",
              cnpjFornecedor: "12345678000101",
              objetoResumo: "Vigilância armada",
              valorGlobal: 98000,
              dataAssinatura: new Date("2024-06-01"),
              modalidade: "Pregão",
              uf: "DF",
              excluded: false,
              exclusionReason: null,
            },
            {
              orgao: "TRF2",
              cnpjFornecedor: "12345678000102",
              objetoResumo: "Vigilância armada",
              valorGlobal: 102000,
              dataAssinatura: new Date("2024-07-01"),
              modalidade: "Pregão",
              uf: "RJ",
              excluded: false,
              exclusionReason: null,
            },
            {
              orgao: "Outra",
              cnpjFornecedor: null,
              objetoResumo: "Serviço distinto",
              valorGlobal: 300000,
              dataAssinatura: null,
              modalidade: null,
              uf: null,
              excluded: true,
              exclusionReason: "Escopo não comparável",
            },
          ],
          statistics: {
            count: 2,
            mean: 100000,
            median: 100000,
            min: 98000,
            max: 102000,
            stdDev: 2000,
            coefVariation: 0.02,
          },
          justification:
            "A pesquisa demonstra preço praticado compatível com a média de mercado.",
        },
      })
    );
    assertPdfBuffer(buf);
  });

  it("JustificativaEconomicidadePdf renderiza em ambos regimes", async () => {
    const base = {
      contract: {
        ...contractFixture,
        globalValue: 1200000,
        monthlyValue: 100000,
        startDate: new Date("2025-06-01"),
        endDate: new Date("2026-05-31"),
        fiscalHolder: "João da Silva",
      },
      pesquisa: {
        catalogoTipo: "SERVICE" as const,
        catalogoCodigo: "26789",
        periodoInicio: "2024-01-01",
        periodoFim: "2024-12-31",
        amostrasValidas: 3,
        stats: {
          mean: 95000,
          median: 95000,
          min: 90000,
          max: 100000,
          stdDev: 4000,
          coefVariation: 0.042,
        },
      },
      comparacao: {
        valorContratoReferencia: 100000,
        valorMedio: 95000,
        diferencaAbs: 5000,
        diferencaPct: 5.26,
        conclusao: "dentro_media" as const,
      },
      fundamentacaoTexto:
        "Conforme análise, o valor praticado está dentro da média de mercado.",
    };

    for (const regime of ["LEI_14133_2021", "LEI_8666_1993"] as const) {
      const buf = await renderPdf(
        React.createElement(JustificativaEconomicidadePdf, {
          data: {
            ...base,
            contract: { ...base.contract, legalRegime: regime },
          },
        })
      );
      assertPdfBuffer(buf);
    }
  });

  it("TermoAditivoPdf renderiza todos os tipos em ambos regimes", async () => {
    const tipos = ["TERM", "VALUE", "MIXED", "READJUSTMENT", "APOSTILAMENTO"] as const;
    for (const regime of ["LEI_14133_2021", "LEI_8666_1993"] as const) {
      for (const tipo of tipos) {
        const buf = await renderPdf(
          React.createElement(TermoAditivoPdf, {
            data: {
              contract: {
                ...contractFixture,
                signatureDate: new Date("2025-06-01"),
                originalEndDate: new Date("2026-05-31"),
                originalGlobalValue: 1200000,
                fiscalHolder: "João da Silva",
                contractManager: "Maria Souza",
                legalRegime: regime,
              },
              additive: {
                number: "1º TA",
                type: tipo,
                signatureDate: new Date("2026-05-15"),
                newEndDate:
                  tipo === "TERM" || tipo === "MIXED"
                    ? new Date("2027-05-31")
                    : null,
                newGlobalValue:
                  tipo === "VALUE" || tipo === "MIXED" || tipo === "APOSTILAMENTO"
                    ? 1500000
                    : null,
                newMonthlyValue:
                  tipo === "READJUSTMENT" || tipo === "MIXED" ? 125000 : null,
                justification: "Continuidade do serviço com reajuste.",
              },
              consideracoesManual: "Sem considerações adicionais.",
            },
          })
        );
        assertPdfBuffer(buf);
      }
    }
  });

  it("SolicitacaoParecerPdf renderiza com e sem anexos", async () => {
    for (const anexos of [
      [],
      [
        {
          title: "Pesquisa de Preços",
          version: 1,
          generatedAt: new Date("2026-03-01"),
          pdfChecksum: "a".repeat(64),
        },
      ],
    ]) {
      const buf = await renderPdf(
        React.createElement(SolicitacaoParecerPdf, {
          data: {
            contract: {
              ...contractFixture,
              endDate: new Date("2026-05-31"),
              fiscalHolder: "João da Silva",
            },
            destinatario: "Assessoria Jurídica",
            resumoFato: "Prorrogação do contrato nº X.",
            fundamentacao: "Base legal conforme regime.",
            quesitosManual: undefined,
            anexos,
          },
        })
      );
      assertPdfBuffer(buf);
    }
  });
});
