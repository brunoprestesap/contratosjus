import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod/v4";
import {
  AIResponseError,
  extractJson,
  extractResultado,
  parseResultadoWithSchema,
  tryExtractJson,
} from "@/lib/pesquisa-precos/response-parser";
import { logger } from "@/lib/logger";

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

describe("parseResultadoWithSchema", () => {
  const schema = z.object({ id: z.number(), nome: z.string() });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna todas as rows quando todas são válidas", () => {
    const out = parseResultadoWithSchema(
      [
        { id: 1, nome: "a" },
        { id: 2, nome: "b" },
      ],
      schema,
      "TEST",
    );
    expect(out).toHaveLength(2);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it("descarta rows inválidas com log warn", () => {
    const out = parseResultadoWithSchema(
      [
        { id: 1, nome: "a" },
        { id: "x", nome: "b" }, // id deveria ser number
        { id: 3, nome: "c" },
      ],
      schema,
      "TEST",
    );
    expect(out).toHaveLength(2);
    expect(out.map((r) => r.id)).toEqual([1, 3]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: "api.schema.row_dropped", purpose: "TEST" }),
      expect.any(String),
    );
  });

  it("emite warn agregado quando drop rate > threshold default (10%)", () => {
    // 3 de 10 = 30% > 10%
    const rows = [
      ...Array.from({ length: 7 }, (_, i) => ({ id: i, nome: "ok" })),
      ...Array.from({ length: 3 }, () => ({ id: "bad" })),
    ];
    parseResultadoWithSchema(rows, schema, "TEST");

    const aggregateCall = (
      logger.warn as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.find(
      (call) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        (call[0] as { event?: string }).event === "api.schema.high_drop_rate",
    );
    expect(aggregateCall).toBeDefined();
  });

  it("não emite warn agregado quando drop rate dentro do threshold", () => {
    // 1 de 20 = 5% < 10%
    const rows = [...Array.from({ length: 19 }, (_, i) => ({ id: i, nome: "ok" })), { id: "bad" }];
    parseResultadoWithSchema(rows, schema, "TEST");

    const aggregateCall = (
      logger.warn as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.find(
      (call) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        (call[0] as { event?: string }).event === "api.schema.high_drop_rate",
    );
    expect(aggregateCall).toBeUndefined();
  });

  it("respeita warnThresholdPct customizado", () => {
    const rows = [...Array.from({ length: 19 }, (_, i) => ({ id: i, nome: "ok" })), { id: "bad" }];
    parseResultadoWithSchema(rows, schema, "TEST", { warnThresholdPct: 0.01 });

    const aggregateCall = (
      logger.warn as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls.find(
      (call) =>
        typeof call[0] === "object" &&
        call[0] !== null &&
        (call[0] as { event?: string }).event === "api.schema.high_drop_rate",
    );
    expect(aggregateCall).toBeDefined();
  });

  it("retorna array vazio para input vazio (sem warn)", () => {
    const out = parseResultadoWithSchema([], schema, "TEST");
    expect(out).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
