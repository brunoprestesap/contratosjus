import { describe, it, expect } from "vitest";
import { LegalRegime } from "@/generated/prisma/client";
import {
  inferLegalRegime,
  isSampleCompatible,
  normalizeModalidade,
} from "@/lib/pesquisa-precos/legal-regime";

describe("normalizeModalidade", () => {
  it("retorna null para entrada vazia/undefined", () => {
    expect(normalizeModalidade(null)).toBeNull();
    expect(normalizeModalidade(undefined)).toBeNull();
    expect(normalizeModalidade("  ")).toBeNull();
  });

  it("converte número em string", () => {
    expect(normalizeModalidade(5)).toBe("5");
  });

  it("remove acentos e baixa caixa", () => {
    expect(normalizeModalidade("Pregão Eletrônico")).toBe("pregao eletronico");
    expect(normalizeModalidade("Tomada de Preços")).toBe("tomada de precos");
  });
});

describe("inferLegalRegime — modalidades exclusivas", () => {
  it("diálogo competitivo → 14.133", () => {
    expect(inferLegalRegime("Diálogo Competitivo", null)).toBe(LegalRegime.LEI_14133_2021);
  });

  it("tomada de preços → 8.666", () => {
    expect(inferLegalRegime("Tomada de Preços", new Date("2024-01-01"))).toBe(
      LegalRegime.LEI_8666_1993,
    );
  });

  it("convite → 8.666", () => {
    expect(inferLegalRegime("convite", new Date("2024-01-01"))).toBe(LegalRegime.LEI_8666_1993);
  });

  it("código SIASGnet 1 (convite) → 8.666 mesmo com data recente", () => {
    expect(inferLegalRegime(1, new Date("2024-05-01"))).toBe(LegalRegime.LEI_8666_1993);
  });
});

describe("inferLegalRegime — modalidades ambíguas + data", () => {
  it("pregão + data pós-corte → 14.133", () => {
    expect(inferLegalRegime("Pregão Eletrônico", new Date("2024-06-01"))).toBe(
      LegalRegime.LEI_14133_2021,
    );
  });

  it("pregão + data pré-corte → 8.666", () => {
    expect(inferLegalRegime("Pregão Eletrônico", new Date("2022-06-01"))).toBe(
      LegalRegime.LEI_8666_1993,
    );
  });

  it("concorrência + exata data-corte (2023-04-01) → 14.133", () => {
    expect(inferLegalRegime("Concorrência", new Date("2023-04-01"))).toBe(
      LegalRegime.LEI_14133_2021,
    );
  });

  it("ambígua sem data → null (na dúvida, não decide)", () => {
    expect(inferLegalRegime("Pregão Eletrônico", null)).toBeNull();
  });
});

describe("inferLegalRegime — dados insuficientes", () => {
  it("modalidade null → null", () => {
    expect(inferLegalRegime(null, new Date("2024-06-01"))).toBeNull();
  });

  it("data inválida → null", () => {
    expect(inferLegalRegime("Pregão", new Date("invalid"))).toBeNull();
  });
});

describe("isSampleCompatible — fail-open", () => {
  it("amostra sem regime inferido sempre passa", () => {
    expect(isSampleCompatible({ legalRegimeInferred: null }, LegalRegime.LEI_14133_2021)).toBe(
      true,
    );
    expect(isSampleCompatible({ legalRegimeInferred: null }, LegalRegime.LEI_8666_1993)).toBe(true);
  });

  it("regimes iguais são compatíveis", () => {
    expect(
      isSampleCompatible(
        { legalRegimeInferred: LegalRegime.LEI_14133_2021 },
        LegalRegime.LEI_14133_2021,
      ),
    ).toBe(true);
  });

  it("regimes diferentes são incompatíveis", () => {
    expect(
      isSampleCompatible(
        { legalRegimeInferred: LegalRegime.LEI_8666_1993 },
        LegalRegime.LEI_14133_2021,
      ),
    ).toBe(false);
  });
});
