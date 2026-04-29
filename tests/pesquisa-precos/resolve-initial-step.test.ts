import { describe, it, expect } from "vitest";
import { resolveInitialStep } from "@/components/pesquisa-precos/steps/resolve-initial-step";
import type { WireResearchDetail } from "@/lib/pesquisa-precos/mappers";

function research(overrides: Partial<WireResearchDetail> = {}): WireResearchDetail {
  return {
    id: "r-1",
    contractId: "c-1",
    status: "DRAFT",
    mode: "CONTRACT_LEGACY",
    legalRegimeSnapshot: null,
    legalRegimeFilterOn: true,
    itemType: "SERVICE",
    catmatCode: null,
    catserCode: null,
    queryFilters: null,
    mean: null,
    median: null,
    minValue: null,
    maxValue: null,
    stdDev: null,
    coefVariation: null,
    justificationText: null,
    finalizedAt: null,
    additiveId: null,
    contract: {
      contractNumber: "01/2025",
      object: "x",
      globalValue: 1000,
      estimatedMonthlyValue: null,
      legalRegime: "LEI_14133_2021",
    },
    samples: [],
    researchItems: [],
    generatedDocumentId: null,
    ...overrides,
  };
}

describe("resolveInitialStep", () => {
  it("DRAFT sem código abre aba 'codigo'", () => {
    expect(resolveInitialStep(research())).toBe("codigo");
  });

  it("Com código mas sem amostras abre 'consulta'", () => {
    expect(resolveInitialStep(research({ catserCode: "12345" }))).toBe("consulta");
  });

  it("PNCP_QUERIED abre 'amostras'", () => {
    expect(
      resolveInitialStep(
        research({
          catserCode: "1",
          status: "PNCP_QUERIED",
          samples: [{ id: "s1" } as WireResearchDetail["samples"][number]],
        }),
      ),
    ).toBe("amostras");
  });

  it("AI_FILTERED sem justificativa abre 'justificativa'", () => {
    expect(
      resolveInitialStep(
        research({
          catserCode: "1",
          status: "AI_FILTERED",
          samples: [{ id: "s1" } as WireResearchDetail["samples"][number]],
        }),
      ),
    ).toBe("justificativa");
  });

  it("AI_FILTERED com justificativa cai no default 'amostras'", () => {
    expect(
      resolveInitialStep(
        research({
          catserCode: "1",
          status: "AI_FILTERED",
          samples: [{ id: "s1" } as WireResearchDetail["samples"][number]],
          justificationText: "texto válido",
        }),
      ),
    ).toBe("amostras");
  });

  it("FINALIZED sempre abre 'finalizar' (mesmo sem código)", () => {
    expect(resolveInitialStep(research({ status: "FINALIZED" }))).toBe("finalizar");
  });

  it("MATERIAL respeita catmatCode (não catserCode)", () => {
    // catserCode preenchido mas itemType MATERIAL → trata como sem código
    expect(resolveInitialStep(research({ itemType: "MATERIAL", catserCode: "999" }))).toBe(
      "codigo",
    );

    expect(resolveInitialStep(research({ itemType: "MATERIAL", catmatCode: "999" }))).toBe(
      "consulta",
    );
  });
});
