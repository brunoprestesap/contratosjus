import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv/to-csv";

describe("toCsv", () => {
  it("gera cabeçalho + linhas separadas por ponto e vírgula", () => {
    const out = toCsv(
      [
        { nome: "João", idade: 30 },
        { nome: "Maria", idade: 25 },
      ],
      [
        { header: "Nome", value: (r) => r.nome },
        { header: "Idade", value: (r) => r.idade },
      ],
    );
    expect(out).toContain("Nome;Idade");
    expect(out).toContain("João;30");
    expect(out).toContain("Maria;25");
  });

  it("começa com BOM UTF-8 para Excel BR", () => {
    const out = toCsv([], [{ header: "col", value: () => "" }]);
    expect(out.charCodeAt(0)).toBe(0xfeff);
  });

  it("usa CRLF como quebra de linha", () => {
    const out = toCsv([{ v: "a" }, { v: "b" }], [{ header: "col", value: (r) => r.v }]);
    expect(out).toContain("\r\n");
    expect(out.split("\r\n").length).toBeGreaterThanOrEqual(3); // BOM+header, row1, row2, trailing
  });

  it("aspa e escapa campo contendo delimitador", () => {
    const out = toCsv([{ v: "a;b" }], [{ header: "col", value: (r) => r.v }]);
    expect(out).toContain('"a;b"');
  });

  it("escapa aspas duplas dobrando-as", () => {
    const out = toCsv([{ v: 'diz "olá"' }], [{ header: "col", value: (r) => r.v }]);
    expect(out).toContain('"diz ""olá"""');
  });

  it("aspa campos com newline", () => {
    const out = toCsv([{ v: "linha1\nlinha2" }], [{ header: "col", value: (r) => r.v }]);
    expect(out).toMatch(/"linha1\nlinha2"/);
  });

  it("formata números no padrão pt-BR (vírgula decimal)", () => {
    const out = toCsv([{ v: 1234.5 }], [{ header: "col", value: (r) => r.v }]);
    expect(out).toContain("1234,5");
  });

  it("trata null e undefined como vazio", () => {
    const out = toCsv(
      [{ a: null, b: undefined, c: "x" }],
      [
        { header: "A", value: (r) => r.a },
        { header: "B", value: (r) => r.b },
        { header: "C", value: (r) => r.c },
      ],
    );
    expect(out).toContain(";;x");
  });
});
