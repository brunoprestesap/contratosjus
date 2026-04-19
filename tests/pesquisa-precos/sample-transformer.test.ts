import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import {
  buildSampleIdentifier,
  modalidadeToDb,
  rowToSampleCreate,
  rowsToValidSamples,
  type PrecoRow,
} from "@/lib/pesquisa-precos/sample-transformer";

describe("modalidadeToDb", () => {
  it("retorna null para null/undefined", () => {
    expect(modalidadeToDb(null)).toBeNull();
    expect(modalidadeToDb(undefined)).toBeNull();
  });

  it("converte código numérico em string", () => {
    expect(modalidadeToDb(6)).toBe("6");
  });

  it("mantém string intacta", () => {
    expect(modalidadeToDb("Pregão Eletrônico")).toBe("Pregão Eletrônico");
  });

  it("trata o caso especial modalidade=0", () => {
    expect(modalidadeToDb(0)).toBe("0");
  });
});

describe("buildSampleIdentifier", () => {
  it("prefere idItemCompra", () => {
    const row = { idItemCompra: "ITEM-1", idCompra: "COMPRA-1" } as PrecoRow;
    expect(buildSampleIdentifier(row)).toBe("ITEM-1");
  });

  it("cai para idCompra quando idItemCompra está ausente", () => {
    const row = { idCompra: "COMPRA-1", codigoUasg: "123" } as PrecoRow;
    expect(buildSampleIdentifier(row)).toBe("COMPRA-1");
  });

  it("sintetiza id a partir de UASG + número quando demais estão ausentes", () => {
    const row = { codigoUasg: "200999", numeroItemCompra: 5 } as PrecoRow;
    expect(buildSampleIdentifier(row)).toBe("200999-5");
  });

  it("usa placeholders quando UASG e número estão ausentes", () => {
    const row = {} as PrecoRow;
    expect(buildSampleIdentifier(row)).toBe("UASG-?");
  });
});

describe("rowToSampleCreate", () => {
  it("mapeia campos canônicos preservando precisão Decimal", () => {
    const row: PrecoRow = {
      idItemCompra: "ABC-1",
      idCompra: "COMPRA-42",
      codigoItemCatalogo: 459879,
      precoUnitario: 100,
      quantidade: 3,
      nomeOrgao: "TRF 1ª Região",
      niFornecedor: "12.345.678/0001-90",
      descricaoDetalhadaItem: "Serviço de vigilância",
      dataCompra: "2025-06-15",
      modalidade: "Pregão Eletrônico",
      estado: "AP",
    };
    const out = rowToSampleCreate(row, "research-1");

    expect(out.researchId).toBe("research-1");
    expect(out.pncpNumeroControle).toBe("ABC-1");
    expect(out.pncpContractId).toBe("COMPRA-42");
    expect(out.orgao).toBe("TRF 1ª Região");
    expect(out.cnpjFornecedor).toBe("12.345.678/0001-90");
    expect(out.objetoResumo).toBe("Serviço de vigilância");
    expect(Prisma.Decimal.isDecimal(out.valorGlobal)).toBe(true);
    expect((out.valorGlobal as Prisma.Decimal).equals(new Prisma.Decimal(300))).toBe(true);
    expect(out.valorMensal).toBeNull();
    expect(out.dataAssinatura).toBeInstanceOf(Date);
    expect(out.modalidade).toBe("Pregão Eletrônico");
    expect(out.uf).toBe("AP");
  });

  it("evita drift de ponto flutuante em quantidades fracionadas", () => {
    const row: PrecoRow = {
      idCompra: "X",
      codigoItemCatalogo: 1,
      precoUnitario: 1.1,
      quantidade: 3.3,
    };
    const out = rowToSampleCreate(row, "r");
    // 1.1 * 3.3 em float = 3.6300000000000003; Decimal preserva 3.63
    expect((out.valorGlobal as Prisma.Decimal).toString()).toBe("3.63");
  });

  it("assume quantidade=1 quando ausente", () => {
    const row: PrecoRow = { idCompra: "X", codigoItemCatalogo: 1, precoUnitario: 50 };
    const out = rowToSampleCreate(row, "r");
    expect((out.valorGlobal as Prisma.Decimal).equals(new Prisma.Decimal(50))).toBe(true);
  });

  it("assume precoUnitario=0 quando ausente (vai ser filtrado por rowsToValidSamples)", () => {
    const row: PrecoRow = { idCompra: "X", codigoItemCatalogo: 1, quantidade: 5 };
    const out = rowToSampleCreate(row, "r");
    expect((out.valorGlobal as Prisma.Decimal).equals(new Prisma.Decimal(0))).toBe(true);
  });

  it("converte modalidade numérica em string", () => {
    const row: PrecoRow = {
      idCompra: "X",
      codigoItemCatalogo: 1,
      precoUnitario: 10,
      modalidade: 6,
    };
    const out = rowToSampleCreate(row, "r");
    expect(out.modalidade).toBe("6");
  });

  it("cai para descricaoItem → objetoCompra quando descricaoDetalhadaItem ausente", () => {
    const semDescDetalhada = rowToSampleCreate(
      {
        idCompra: "X",
        codigoItemCatalogo: 1,
        precoUnitario: 10,
        descricaoItem: "desc item",
        objetoCompra: "objeto",
      },
      "r",
    );
    expect(semDescDetalhada.objetoResumo).toBe("desc item");

    const apenasObjeto = rowToSampleCreate(
      { idCompra: "X", codigoItemCatalogo: 1, precoUnitario: 10, objetoCompra: "fallback" },
      "r",
    );
    expect(apenasObjeto.objetoResumo).toBe("fallback");

    const nenhum = rowToSampleCreate(
      { idCompra: "X", codigoItemCatalogo: 1, precoUnitario: 10 },
      "r",
    );
    expect(nenhum.objetoResumo).toBe("");
  });

  it("produz rawPayload JSON serializável (sem undefined)", () => {
    const row: PrecoRow = {
      idCompra: "X",
      codigoItemCatalogo: 1,
      precoUnitario: 10,
      descricaoItem: "test",
      // `nomeOrgao` fica undefined propositalmente
    };
    const out = rowToSampleCreate(row, "r");
    const stringified = JSON.stringify(out.rawPayload);
    expect(stringified).not.toContain("undefined");
    expect(JSON.parse(stringified)).toEqual({
      idCompra: "X",
      codigoItemCatalogo: 1,
      precoUnitario: 10,
      descricaoItem: "test",
    });
  });

  it("deixa dataAssinatura null quando dataCompra ausente", () => {
    const row: PrecoRow = { idCompra: "X", codigoItemCatalogo: 1, precoUnitario: 10 };
    const out = rowToSampleCreate(row, "r");
    expect(out.dataAssinatura).toBeNull();
  });
});

describe("rowsToValidSamples", () => {
  it("filtra amostras com valorGlobal zero", () => {
    const rows: PrecoRow[] = [
      { idCompra: "A", codigoItemCatalogo: 1, precoUnitario: 10, quantidade: 1 },
      { idCompra: "B", codigoItemCatalogo: 1, precoUnitario: 0, quantidade: 5 },
      { idCompra: "C", codigoItemCatalogo: 1, precoUnitario: 20, quantidade: 0 },
      { idCompra: "D", codigoItemCatalogo: 1, precoUnitario: 50, quantidade: 2 },
    ];
    const out = rowsToValidSamples(rows, "r");
    expect(out).toHaveLength(2);
    expect(out.map((s) => s.pncpNumeroControle)).toEqual(["A", "D"]);
  });

  it("retorna array vazio para entrada vazia", () => {
    expect(rowsToValidSamples([], "r")).toEqual([]);
  });

  it("retorna array vazio quando todas as amostras são inválidas", () => {
    const rows: PrecoRow[] = [
      { idCompra: "A", codigoItemCatalogo: 1, precoUnitario: 0, quantidade: 10 },
    ];
    expect(rowsToValidSamples(rows, "r")).toEqual([]);
  });
});
