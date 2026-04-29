import { describe, it, expect } from "vitest";
import { rowToSampleCreate } from "@/lib/pesquisa-precos/sample-transformer";
import type { PrecoPraticadoServico } from "@/types/compras-dadosabertos";

function row(overrides: Partial<PrecoPraticadoServico> = {}): PrecoPraticadoServico {
  return {
    idCompra: "12345",
    idItemCompra: 1,
    codigoItemCatalogo: 12345,
    descricaoItem: "serviço",
    numeroItemCompra: 1,
    nomeOrgao: "TRF",
    estado: "AP",
    quantidade: 1,
    precoUnitario: 1000,
    dataCompra: "2024-06-01",
    modalidade: "Pregão Eletrônico",
    ...overrides,
  } as PrecoPraticadoServico;
}

describe("rowToSampleCreate — legalRegimeInferred", () => {
  it("infere 14.133 para pregão pós-corte", () => {
    const out = rowToSampleCreate(
      row({ dataCompra: "2024-06-01", modalidade: "Pregão Eletrônico" }),
      "r1",
    );
    expect(out.legalRegimeInferred).toBe("LEI_14133_2021");
  });

  it("infere 8.666 para pregão pré-corte", () => {
    const out = rowToSampleCreate(
      row({ dataCompra: "2022-06-01", modalidade: "Pregão Eletrônico" }),
      "r1",
    );
    expect(out.legalRegimeInferred).toBe("LEI_8666_1993");
  });

  it("infere 8.666 para tomada de preços independente da data", () => {
    const out = rowToSampleCreate(
      row({ dataCompra: "2024-06-01", modalidade: "Tomada de Preços" }),
      "r1",
    );
    expect(out.legalRegimeInferred).toBe("LEI_8666_1993");
  });

  it("grava researchItemId quando fornecido", () => {
    const out = rowToSampleCreate(row(), "r1", "ri-1");
    expect(out.researchItemId).toBe("ri-1");
  });

  it("usa null para researchItemId por padrão (pesquisa legado)", () => {
    const out = rowToSampleCreate(row(), "r1");
    expect(out.researchItemId).toBeNull();
  });

  it("retorna null em modalidade ausente", () => {
    const out = rowToSampleCreate(row({ modalidade: null }), "r1");
    expect(out.legalRegimeInferred).toBeNull();
  });
});
