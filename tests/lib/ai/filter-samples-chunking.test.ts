import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/client", () => ({
  callMaritaca: vi.fn(),
  modelFilter: () => "sabiazinho-3",
  modelWriter: () => "sabia-3.1",
}));

import { callMaritaca } from "@/lib/ai/client";
import { FILTER_SAMPLES_CHUNK_SIZE, filterSamples, type SampleForFilter } from "@/lib/ai/generate";

function makeSamples(n: number): SampleForFilter[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s-${i}`,
    objetoResumo: `objeto ${i}`,
    valorGlobal: 100 + i,
    valorMensal: null,
    dataAssinatura: null,
  }));
}

function mockAllKept(chunkSize = FILTER_SAMPLES_CHUNK_SIZE) {
  vi.mocked(callMaritaca).mockImplementation(async () => ({
    text: JSON.stringify({
      mantidas: Array.from({ length: chunkSize }, (_, i) => i),
      excluidas: [],
    }),
    model: "sabiazinho-3",
    usage: { inputTokens: 10, outputTokens: 5 },
    raw: null,
  }));
}

describe("filterSamples chunking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uma única chamada quando samples <= chunk size", async () => {
    mockAllKept();
    const samples = makeSamples(3);
    const out = await filterSamples({
      contratoObjeto: "obj",
      contratoValorGlobal: 1000,
      samples,
    });
    expect(callMaritaca).toHaveBeenCalledTimes(1);
    expect(out.logs).toHaveLength(1);
    expect(out.kept.length).toBe(3);
  });

  it("particiona em múltiplos chunks quando samples > chunk size", async () => {
    // Regressão: 278 amostras estouravam 32k tokens do sabiazinho-3 em
    // uma única chamada, causando MaritacaError 400 → "Erro ao processar
    // a solicitação". Chunking garante que cada chamada cabe no contexto.
    mockAllKept();
    const n = FILTER_SAMPLES_CHUNK_SIZE * 2 + 10; // 130 com chunk=60
    const samples = makeSamples(n);
    const out = await filterSamples({
      contratoObjeto: "obj",
      contratoValorGlobal: 1000,
      samples,
    });
    const expectedChunks = Math.ceil(n / FILTER_SAMPLES_CHUNK_SIZE);
    expect(callMaritaca).toHaveBeenCalledTimes(expectedChunks);
    expect(out.logs).toHaveLength(expectedChunks);
  });

  it("mescla mantidas/excluídas de um chunk preservando ids", async () => {
    vi.mocked(callMaritaca).mockResolvedValueOnce({
      text: JSON.stringify({
        mantidas: [0, 2],
        excluidas: [{ indice: 1, motivo: "objeto distinto" }],
      }),
      model: "sabiazinho-3",
      usage: { inputTokens: 10, outputTokens: 5 },
      raw: null,
    });

    const out = await filterSamples({
      contratoObjeto: "obj",
      contratoValorGlobal: 1000,
      samples: makeSamples(3),
    });
    expect(out.kept).toEqual(["s-0", "s-2"]);
    expect(out.excluded).toEqual([{ id: "s-1", reason: "objeto distinto" }]);
    expect(out.errors).toEqual([]);
  });

  it("preserva logs parciais quando um chunk falha (compliance de auditoria)", async () => {
    // Regressão: chunks rodam em paralelo com Promise.allSettled para
    // não descartar auditoria dos chunks bem-sucedidos quando outro falha.
    const n = FILTER_SAMPLES_CHUNK_SIZE * 2; // força 2 chunks
    const err = new Error("Maritaca 500 simulado");

    vi.mocked(callMaritaca)
      .mockResolvedValueOnce({
        text: JSON.stringify({
          mantidas: Array.from({ length: FILTER_SAMPLES_CHUNK_SIZE }, (_, i) => i),
          excluidas: [],
        }),
        model: "sabiazinho-3",
        usage: { inputTokens: 100, outputTokens: 20 },
        raw: null,
      })
      .mockRejectedValueOnce(err);

    const out = await filterSamples({
      contratoObjeto: "obj",
      contratoValorGlobal: 1000,
      samples: makeSamples(n),
    });

    expect(out.logs).toHaveLength(1);
    expect(out.logs[0].inputTokens).toBe(100);
    expect(out.errors).toEqual([err]);
  });
});
