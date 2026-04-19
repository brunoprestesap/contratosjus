import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AIResponseError,
  extractJson,
  extractResultado,
  tryExtractJson,
} from "@/lib/pesquisa-precos/response-parser";

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("extractResultado", () => {
  it("devolve array vazio para null/undefined", () => {
    expect(extractResultado(null)).toEqual([]);
    expect(extractResultado(undefined)).toEqual([]);
  });

  it("devolve array cru quando recebe array direto", () => {
    expect(extractResultado([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("prefere _embedded.resultado", () => {
    const body = {
      _embedded: { resultado: [{ id: 1 }], itens: [{ id: 99 }] },
      resultado: [{ id: 42 }],
    };
    expect(extractResultado(body)).toEqual([{ id: 1 }]);
  });

  it("cai para resultado quando não há _embedded.resultado", () => {
    expect(extractResultado({ resultado: [{ id: 7 }] })).toEqual([{ id: 7 }]);
  });

  it("cai para _embedded.itens quando os demais estão vazios", () => {
    expect(extractResultado({ _embedded: { itens: [{ id: 13 }] } })).toEqual([{ id: 13 }]);
  });

  it("devolve array vazio para body sem campos conhecidos", () => {
    expect(extractResultado({})).toEqual([]);
    expect(extractResultado({ _embedded: {} })).toEqual([]);
  });
});

describe("extractJson", () => {
  it("parseia JSON puro", () => {
    expect(extractJson<{ a: number }>('{"a": 1}', "TEST")).toEqual({ a: 1 });
  });

  it("parseia JSON envolvido em code fences", () => {
    const text = '```json\n{"ok": true}\n```';
    expect(extractJson<{ ok: boolean }>(text, "TEST")).toEqual({ ok: true });
  });

  it("parseia JSON precedido de prosa", () => {
    const text = 'Resposta final: {"total": 3, "itens": [1,2,3]}';
    expect(extractJson<{ total: number }>(text, "TEST")).toEqual({
      total: 3,
      itens: [1, 2, 3],
    });
  });

  it("lança AIResponseError quando não há chaves", () => {
    expect(() => extractJson("texto sem json", "TEST")).toThrow(AIResponseError);
  });

  it("lança AIResponseError quando JSON é malformado", () => {
    expect(() => extractJson('{"a": }', "TEST")).toThrow(AIResponseError);
  });

  it("AIResponseError carrega purpose e raw response", () => {
    try {
      extractJson("sem objeto", "FILTER_SAMPLES");
      expect.fail("deveria ter lançado");
    } catch (e) {
      expect(e).toBeInstanceOf(AIResponseError);
      expect((e as AIResponseError).purpose).toBe("FILTER_SAMPLES");
      expect((e as AIResponseError).rawResponse).toBe("sem objeto");
    }
  });
});

describe("tryExtractJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("retorna valor parseado em sucesso", () => {
    expect(tryExtractJson<{ a: number }>('{"a": 1}', "TEST")).toEqual({ a: 1 });
  });

  it("retorna null em falha (sem lançar)", () => {
    expect(tryExtractJson("sem json", "TEST")).toBeNull();
  });

  it("retorna null para JSON malformado", () => {
    expect(tryExtractJson("{incompleto", "TEST")).toBeNull();
  });
});
