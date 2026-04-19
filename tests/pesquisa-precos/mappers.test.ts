import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  toWireResearchDetail,
  toWireResearchListItem,
  toWireSample,
} from "@/lib/pesquisa-precos/mappers";

function sampleRow(overrides: Partial<Parameters<typeof toWireSample>[0]> = {}) {
  return {
    id: "sample-1",
    pncpNumeroControle: "CTRL-1",
    orgao: "TRF 1ª",
    cnpjFornecedor: "00.000.000/0001-00",
    objetoResumo: "vigilância",
    valorGlobal: new Prisma.Decimal("150.00"),
    dataAssinatura: new Date("2025-06-15"),
    uf: "AP",
    modalidade: "Pregão",
    excluded: false,
    exclusionReason: null,
    excludedByAI: null,
    ...overrides,
  };
}

describe("toWireSample", () => {
  it("mapeia campos 1:1 e converte valorGlobal Decimal→number", () => {
    const out = toWireSample(sampleRow());
    expect(out.valorGlobal).toBe(150);
    expect(out.id).toBe("sample-1");
    expect(out.excluded).toBe(false);
  });

  it("preserva null/campos nulos sem transformar", () => {
    const out = toWireSample(
      sampleRow({ orgao: null, dataAssinatura: null, exclusionReason: "fora de escopo" }),
    );
    expect(out.orgao).toBeNull();
    expect(out.dataAssinatura).toBeNull();
    expect(out.exclusionReason).toBe("fora de escopo");
  });
});

describe("toWireResearchDetail", () => {
  const baseRow = {
    id: "r-1",
    contractId: "c-1",
    status: "DRAFT" as const,
    itemType: "SERVICE" as const,
    catmatCode: null,
    catserCode: "12345",
    queryFilters: { estado: "AP" },
    mean: new Prisma.Decimal("1000.50"),
    median: new Prisma.Decimal("950.00"),
    minValue: new Prisma.Decimal("500.00"),
    maxValue: new Prisma.Decimal("1500.00"),
    stdDev: new Prisma.Decimal("250.00"),
    coefVariation: new Prisma.Decimal("0.25"),
    justificationText: "justificativa",
    finalizedAt: null,
    additiveId: null,
    contract: {
      contractNumber: "01/2025",
      object: "vigilância",
      globalValue: new Prisma.Decimal("100000.00"),
      estimatedMonthlyValue: new Prisma.Decimal("10000.00"),
    },
    samples: [sampleRow()],
    generatedDocument: { id: "doc-1" },
  };

  it("converte todos os campos Decimal em number", () => {
    const out = toWireResearchDetail(baseRow);
    expect(out.mean).toBe(1000.5);
    expect(out.median).toBe(950);
    expect(out.minValue).toBe(500);
    expect(out.maxValue).toBe(1500);
    expect(out.stdDev).toBe(250);
    expect(out.coefVariation).toBe(0.25);
    expect(out.contract.globalValue).toBe(100000);
    expect(out.contract.estimatedMonthlyValue).toBe(10000);
  });

  it("preserva nulls em métricas", () => {
    const out = toWireResearchDetail({
      ...baseRow,
      mean: null,
      median: null,
      minValue: null,
      maxValue: null,
      stdDev: null,
      coefVariation: null,
      contract: { ...baseRow.contract, estimatedMonthlyValue: null },
    });
    expect(out.mean).toBeNull();
    expect(out.median).toBeNull();
    expect(out.contract.estimatedMonthlyValue).toBeNull();
  });

  it("mapeia generatedDocumentId a partir do objeto related", () => {
    expect(toWireResearchDetail(baseRow).generatedDocumentId).toBe("doc-1");
    expect(toWireResearchDetail({ ...baseRow, generatedDocument: null }).generatedDocumentId).toBe(
      null,
    );
  });

  it("mapeia samples via toWireSample", () => {
    const out = toWireResearchDetail(baseRow);
    expect(out.samples).toHaveLength(1);
    expect(out.samples[0].valorGlobal).toBe(150);
  });

  it("preserva queryFilters como unknown (JSON cru)", () => {
    const out = toWireResearchDetail(baseRow);
    expect(out.queryFilters).toEqual({ estado: "AP" });
  });
});

describe("toWireResearchListItem", () => {
  it("converte mean em number e preserva demais campos", () => {
    const now = new Date("2025-01-01");
    const out = toWireResearchListItem({
      id: "r-1",
      status: "FINALIZED",
      itemType: "MATERIAL",
      catmatCode: "9999",
      catserCode: null,
      mean: new Prisma.Decimal("500.00"),
      finalizedAt: now,
      createdAt: now,
    });
    expect(out.mean).toBe(500);
    expect(out.status).toBe("FINALIZED");
    expect(out.itemType).toBe("MATERIAL");
    expect(out.finalizedAt).toBe(now);
  });

  it("preserva mean nulo", () => {
    const out = toWireResearchListItem({
      id: "r-1",
      status: "DRAFT",
      itemType: "SERVICE",
      catmatCode: null,
      catserCode: null,
      mean: null,
      finalizedAt: null,
      createdAt: new Date(),
    });
    expect(out.mean).toBeNull();
  });
});
