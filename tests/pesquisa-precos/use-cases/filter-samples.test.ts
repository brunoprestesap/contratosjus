import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    priceResearch: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    priceSample: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/ai/generate", () => ({
  filterSamples: vi.fn(),
  suggestCatmatHierarchy: vi.fn(),
  suggestCatserHierarchy: vi.fn(),
  writeJustificativa: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { filterSamples } from "@/lib/ai/generate";
import { logAudit } from "@/lib/audit";
import { filterSamplesWithAIUseCase } from "@/lib/pesquisa-precos/use-cases/samples";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";

interface SampleRow {
  id: string;
  objetoResumo: string;
  valorGlobal: Prisma.Decimal;
  valorMensal: Prisma.Decimal | null;
  dataAssinatura: Date | null;
}

function sample(id: string, objeto = "obj"): SampleRow {
  return {
    id,
    objetoResumo: objeto,
    valorGlobal: new Prisma.Decimal(100),
    valorMensal: null,
    dataAssinatura: null,
  };
}

function researchWith(samples: SampleRow[]) {
  return {
    id: "r-1",
    contractId: "c-1",
    status: "PNCP_QUERIED",
    contract: {
      object: "Serviço de vigilância",
      globalValue: new Prisma.Decimal(50000),
    },
    samples,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return (fn as (tx: unknown) => unknown)(prismaMock);
    return undefined;
  });
});

describe("filterSamplesWithAIUseCase", () => {
  it("lança ResearchDomainError quando pesquisa não existe", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(null);

    await expect(filterSamplesWithAIUseCase("r-x")).rejects.toBeInstanceOf(ResearchDomainError);
  });

  it("lança ResearchDomainError quando pesquisa não tem amostras", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith([]));

    await expect(filterSamplesWithAIUseCase("r-1")).rejects.toThrow(/Sem amostras a filtrar/);
  });

  it("happy path: IA exclui uma, use-case atualiza mantidas e excluídas", async () => {
    const samples = [sample("s1"), sample("s2"), sample("s3")];
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith(samples));
    vi.mocked(filterSamples).mockResolvedValue({
      kept: ["s1", "s3"],
      excluded: [{ id: "s2", reason: "objeto distinto" }],
      logs: [
        {
          purpose: "FILTER_SAMPLES",
          model: "sabia-3.1",
          systemPromptHash: "hash",
          userPrompt: "",
          response: "",
          inputTokens: 10,
          outputTokens: 5,
        },
      ],
      errors: [],
    });

    const result = await filterSamplesWithAIUseCase("r-1");

    expect(result).toEqual({ kept: 2, excluded: 1, contractId: "c-1" });

    // 1 updateMany para mantidas + 1 updateMany para excluídas
    expect(prismaMock.priceSample.updateMany).toHaveBeenCalledTimes(2);
    expect(prismaMock.priceSample.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s1", "s3"] } },
      data: { excluded: false, exclusionReason: null, excludedByAI: null },
    });
    expect(prismaMock.priceSample.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s2"] } },
      data: { excluded: true, exclusionReason: "objeto distinto", excludedByAI: true },
    });
  });

  it("agrupa excluídas pelo mesmo motivo em um único updateMany", async () => {
    const samples = [sample("s1"), sample("s2"), sample("s3"), sample("s4")];
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith(samples));
    vi.mocked(filterSamples).mockResolvedValue({
      kept: ["s1"],
      excluded: [
        { id: "s2", reason: "fora do período" },
        { id: "s3", reason: "fora do período" },
        { id: "s4", reason: "objeto distinto" },
      ],
      logs: [
        {
          purpose: "FILTER_SAMPLES",
          model: "m",
          systemPromptHash: "h",
          userPrompt: "",
          response: "",
          inputTokens: 0,
          outputTokens: 0,
        },
      ],
      errors: [],
    });

    await filterSamplesWithAIUseCase("r-1");

    // 1 mantida + 2 grupos de motivo = 3 chamadas
    expect(prismaMock.priceSample.updateMany).toHaveBeenCalledTimes(3);
    expect(prismaMock.priceSample.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s2", "s3"] } },
      data: { excluded: true, exclusionReason: "fora do período", excludedByAI: true },
    });
    expect(prismaMock.priceSample.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s4"] } },
      data: { excluded: true, exclusionReason: "objeto distinto", excludedByAI: true },
    });
  });

  it("IA mantém todas: apenas updateMany das mantidas, nenhuma excluída", async () => {
    const samples = [sample("s1"), sample("s2")];
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith(samples));
    vi.mocked(filterSamples).mockResolvedValue({
      kept: ["s1", "s2"],
      excluded: [],
      logs: [
        {
          purpose: "FILTER_SAMPLES",
          model: "m",
          systemPromptHash: "h",
          userPrompt: "",
          response: "",
          inputTokens: 0,
          outputTokens: 0,
        },
      ],
      errors: [],
    });

    const result = await filterSamplesWithAIUseCase("r-1");

    expect(result.excluded).toBe(0);
    expect(prismaMock.priceSample.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.priceSample.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ excluded: false }),
      }),
    );
  });

  it("atualiza status para AI_FILTERED após o filtro", async () => {
    const samples = [sample("s1")];
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith(samples));
    vi.mocked(filterSamples).mockResolvedValue({
      kept: ["s1"],
      excluded: [],
      logs: [
        {
          purpose: "FILTER_SAMPLES",
          model: "m",
          systemPromptHash: "h",
          userPrompt: "",
          response: "",
          inputTokens: 0,
          outputTokens: 0,
        },
      ],
      errors: [],
    });

    await filterSamplesWithAIUseCase("r-1");

    expect(prismaMock.priceResearch.update).toHaveBeenCalledWith({
      where: { id: "r-1" },
      data: { status: "AI_FILTERED" },
    });
  });

  it("chama logAIGeneration (audit AICall) com o log retornado pela IA", async () => {
    const samples = [sample("s1")];
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith(samples));
    vi.mocked(filterSamples).mockResolvedValue({
      kept: ["s1"],
      excluded: [],
      logs: [
        {
          purpose: "FILTER_SAMPLES",
          model: "sabia-3.1",
          systemPromptHash: "xyz",
          userPrompt: "...",
          response: "...",
          inputTokens: 100,
          outputTokens: 50,
        },
      ],
      errors: [],
    });

    await filterSamplesWithAIUseCase("r-1");

    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "AICall",
        entityId: "r-1",
        action: "CREATE",
        newValue: expect.objectContaining({
          aiPurpose: "FILTER_SAMPLES",
          aiModel: "sabia-3.1",
          inputTokens: 100,
          outputTokens: 50,
        }),
      }),
    );
  });

  it("converte contrato.globalValue de Decimal para number antes de passar à IA", async () => {
    const samples = [sample("s1")];
    prismaMock.priceResearch.findUnique.mockResolvedValue({
      ...researchWith(samples),
      contract: {
        object: "x",
        globalValue: new Prisma.Decimal("123456.78"),
      },
    });
    vi.mocked(filterSamples).mockResolvedValue({
      kept: ["s1"],
      excluded: [],
      logs: [
        {
          purpose: "FILTER_SAMPLES",
          model: "m",
          systemPromptHash: "h",
          userPrompt: "",
          response: "",
          inputTokens: 0,
          outputTokens: 0,
        },
      ],
      errors: [],
    });

    await filterSamplesWithAIUseCase("r-1");

    expect(filterSamples).toHaveBeenCalledWith(
      expect.objectContaining({ contratoValorGlobal: 123456.78 }),
    );
  });

  it("executa mutações dentro de $transaction", async () => {
    const samples = [sample("s1")];
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith(samples));
    vi.mocked(filterSamples).mockResolvedValue({
      kept: ["s1"],
      excluded: [],
      logs: [
        {
          purpose: "FILTER_SAMPLES",
          model: "m",
          systemPromptHash: "h",
          userPrompt: "",
          response: "",
          inputTokens: 0,
          outputTokens: 0,
        },
      ],
      errors: [],
    });

    await filterSamplesWithAIUseCase("r-1");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
