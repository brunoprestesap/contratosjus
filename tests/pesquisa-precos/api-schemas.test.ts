import { describe, it, expect } from "vitest";
import { precoPraticadoRowSchema } from "@/lib/pesquisa-precos/api-schemas";

describe("precoPraticadoRowSchema", () => {
  it("aceita row mínima (só codigoItemCatalogo)", () => {
    const res = precoPraticadoRowSchema.safeParse({ codigoItemCatalogo: 123 });
    expect(res.success).toBe(true);
  });

  it("aceita row com todos os campos", () => {
    const res = precoPraticadoRowSchema.safeParse({
      idCompra: "C-1",
      idItemCompra: "I-1",
      codigoItemCatalogo: 123,
      descricaoItem: "x",
      descricaoDetalhadaItem: "y",
      numeroItemCompra: 5,
      nomeUasg: "UASG X",
      codigoUasg: "200999",
      quantidade: 10,
      precoUnitario: 100,
      niFornecedor: "12.345.678/0001-90",
      nomeOrgao: "TRF",
      estado: "AP",
      modalidade: "Pregão",
      dataCompra: "2025-06-15",
      objetoCompra: "obj",
    });
    expect(res.success).toBe(true);
  });

  it("aceita modalidade numérica (union string | number)", () => {
    const res = precoPraticadoRowSchema.safeParse({
      codigoItemCatalogo: 1,
      modalidade: 6,
    });
    expect(res.success).toBe(true);
  });

  it("aceita modalidade null", () => {
    const res = precoPraticadoRowSchema.safeParse({
      codigoItemCatalogo: 1,
      modalidade: null,
    });
    expect(res.success).toBe(true);
  });

  it("rejeita row sem codigoItemCatalogo", () => {
    const res = precoPraticadoRowSchema.safeParse({ idCompra: "C-1" });
    expect(res.success).toBe(false);
  });

  it("rejeita codigoItemCatalogo como string (drift da API)", () => {
    const res = precoPraticadoRowSchema.safeParse({ codigoItemCatalogo: "123" });
    expect(res.success).toBe(false);
  });

  it("rejeita precoUnitario como string (drift)", () => {
    const res = precoPraticadoRowSchema.safeParse({
      codigoItemCatalogo: 1,
      precoUnitario: "100.50",
    });
    expect(res.success).toBe(false);
  });

  it("preserva campos extras desconhecidos (loose)", () => {
    const res = precoPraticadoRowSchema.safeParse({
      codigoItemCatalogo: 1,
      campoNovoDaApi: "valor",
      outroCampo: 42,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toMatchObject({
        codigoItemCatalogo: 1,
        campoNovoDaApi: "valor",
        outroCampo: 42,
      });
    }
  });

  it("aceita campos opcionais ausentes", () => {
    const res = precoPraticadoRowSchema.safeParse({
      codigoItemCatalogo: 1,
      // sem descricaoItem, quantidade, etc.
    });
    expect(res.success).toBe(true);
  });
});
