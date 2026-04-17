import { describe, it, expect } from "vitest";
import { extractKeywords, prefilterByKeywords } from "@/lib/text-match";

describe("extractKeywords", () => {
  it("extrai tokens alfanuméricos removendo stopwords", () => {
    const out = extractKeywords("Aquisição de papel A4 para impressão");
    expect(out).toContain("papel");
    expect(out).toContain("impressao");
    expect(out).toContain("a4");
    expect(out).not.toContain("de");
    expect(out).not.toContain("para");
  });

  it("normaliza acentos (ç, ã, á)", () => {
    const out = extractKeywords("Serviço de vigilância armada");
    expect(out).toContain("vigilancia");
    expect(out).toContain("armada");
  });

  it("ignora tokens com menos de 3 caracteres", () => {
    const out = extractKeywords("A B C IT");
    expect(out).not.toContain("a");
    expect(out).not.toContain("b");
    expect(out).not.toContain("c");
    expect(out).not.toContain("it");
  });

  it("deduplica", () => {
    const out = extractKeywords("papel papel papel");
    expect(out).toEqual(["papel"]);
  });
});

describe("prefilterByKeywords", () => {
  const candidates = [
    { codigo: 1, descricao: "PAPEL A4 BRANCO 75G" },
    { codigo: 2, descricao: "PAPEL CELOFANE COR BRANCA" },
    { codigo: 3, descricao: "CANETA ESFEROGRÁFICA AZUL" },
    { codigo: 4, descricao: "GRAMPEADOR ESCRITÓRIO PEQUENO" },
    { codigo: 5, descricao: "ENVELOPE TIPO A4" },
  ];

  it("mantém itens que contém pelo menos 1 keyword", () => {
    const out = prefilterByKeywords("papel A4 75g/m²", candidates);
    expect(out.map((c) => c.codigo)).toContain(1);
    expect(out.map((c) => c.codigo)).toContain(2); // contém PAPEL
    expect(out.map((c) => c.codigo)).toContain(5); // contém A4
    expect(out.map((c) => c.codigo)).not.toContain(3);
    expect(out.map((c) => c.codigo)).not.toContain(4);
  });

  it("ranqueia por quantidade de matches", () => {
    const out = prefilterByKeywords("papel A4 branco", candidates);
    expect(out[0].codigo).toBe(1); // PAPEL + A4 + BRANCO = 3 matches
  });

  it("é tolerante a acentuação", () => {
    const out = prefilterByKeywords("cafe expresso", [
      { codigo: 1, descricao: "CAFÉ EXPRESSO PREMIUM" },
    ]);
    expect(out).toHaveLength(1);
  });

  it("quando nada casa, devolve fallback (todos) limitado", () => {
    const out = prefilterByKeywords("xyz nada disso", candidates, { maxReturn: 3 });
    expect(out).toHaveLength(3);
  });

  it("respeita maxReturn", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      codigo: i,
      descricao: `PAPEL item ${i}`,
    }));
    const out = prefilterByKeywords("papel", many, { maxReturn: 50 });
    expect(out.length).toBe(50);
  });
});
