import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    priceResearch: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    priceSample: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Corta cascata de imports (NextAuth, logger, etc.) que não importam
// para este use-case. Cada função mockada é dependency dos use-cases
// mas não é exercitada em queryPrecos.
vi.mock("@/lib/ai/generate", () => ({
  filterSamples: vi.fn(),
  suggestCatmatHierarchy: vi.fn(),
  suggestCatserHierarchy: vi.fn(),
  writeJustificativa: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

vi.mock("@/lib/compras-dadosabertos", async () => {
  const actual = await vi.importActual<typeof import("@/lib/compras-dadosabertos")>(
    "@/lib/compras-dadosabertos",
  );
  return {
    ...actual,
    getPrecoMaterial: vi.fn(),
    getPrecoServico: vi.fn(),
  };
});

import { getPrecoMaterial, getPrecoServico } from "@/lib/compras-dadosabertos";
import { queryPrecosUseCase } from "@/lib/pesquisa-precos/use-cases/samples";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";
import type { PrecoRow } from "@/lib/pesquisa-precos/sample-transformer";

function makeRow(i: number): PrecoRow {
  return {
    idCompra: `COMPRA-${i}`,
    idItemCompra: `ITEM-${i}`,
    codigoItemCatalogo: 123,
    precoUnitario: 100,
    quantidade: 1,
    nomeOrgao: "TRF",
    estado: "AP",
  };
}

function baseResearch(overrides: Record<string, unknown> = {}) {
  return {
    id: "r-1",
    contractId: "c-1",
    itemType: "MATERIAL",
    catmatCode: "12345",
    catserCode: null,
    status: "DRAFT",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // `$transaction` recebe um callback (tx) => Promise; passa o próprio mock
  // como tx já que os métodos chamados dentro da transação existem no mock.
  prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return (fn as (tx: unknown) => unknown)(prismaMock);
    return undefined;
  });
});

describe("queryPrecosUseCase", () => {
  it("lança ResearchDomainError quando pesquisa não existe", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(null);

    await expect(queryPrecosUseCase({ researchId: "r-inexistente" })).rejects.toBeInstanceOf(
      ResearchDomainError,
    );
  });

  it("lança ResearchDomainError quando MATERIAL sem catmatCode", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch({ catmatCode: null }));

    await expect(queryPrecosUseCase({ researchId: "r-1" })).rejects.toThrow(
      /Confirme o código do catálogo/,
    );
  });

  it("lança ResearchDomainError quando código não é numérico", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch({ catmatCode: "abc" }));

    await expect(queryPrecosUseCase({ researchId: "r-1" })).rejects.toThrow(
      /Código do catálogo inválido/,
    );
  });

  it("MATERIAL usa getPrecoMaterial (não getPrecoServico)", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch());
    vi.mocked(getPrecoMaterial).mockResolvedValue({
      _embedded: { resultado: [makeRow(1)] },
      totalPaginas: 1,
    });

    const result = await queryPrecosUseCase({ researchId: "r-1" });

    expect(getPrecoMaterial).toHaveBeenCalledTimes(1);
    expect(getPrecoServico).not.toHaveBeenCalled();
    expect(result.inserted).toBe(1);
    expect(result.contractId).toBe("c-1");
  });

  it("SERVICE usa getPrecoServico (não getPrecoMaterial)", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      baseResearch({ itemType: "SERVICE", catmatCode: null, catserCode: "98765" }),
    );
    vi.mocked(getPrecoServico).mockResolvedValue({
      _embedded: { resultado: [makeRow(1)] },
      totalPaginas: 1,
    });

    await queryPrecosUseCase({ researchId: "r-1" });

    expect(getPrecoServico).toHaveBeenCalledTimes(1);
    expect(getPrecoMaterial).not.toHaveBeenCalled();
  });

  it("passa codigoItemCatalogo parseado para o fetcher", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch({ catmatCode: "987654" }));
    vi.mocked(getPrecoMaterial).mockResolvedValue({
      _embedded: { resultado: [] },
      totalPaginas: 1,
    });

    await queryPrecosUseCase({ researchId: "r-1" });

    expect(getPrecoMaterial).toHaveBeenCalledWith(
      expect.objectContaining({ codigoItemCatalogo: 987654 }),
    );
  });

  it("substitui amostras anteriores antes de inserir novas", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch());
    vi.mocked(getPrecoMaterial).mockResolvedValue({
      _embedded: { resultado: [makeRow(1), makeRow(2)] },
      totalPaginas: 1,
    });
    prismaMock.priceSample.deleteMany.mockResolvedValue({ count: 5 });
    prismaMock.priceSample.createMany.mockResolvedValue({ count: 2 });

    await queryPrecosUseCase({ researchId: "r-1" });

    expect(prismaMock.priceSample.deleteMany).toHaveBeenCalledWith({
      where: { researchId: "r-1" },
    });
    expect(prismaMock.priceSample.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    const deleteOrder = prismaMock.priceSample.deleteMany.mock.invocationCallOrder[0];
    const createOrder = prismaMock.priceSample.createMany.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(createOrder);
  });

  it("atualiza status para PNCP_QUERIED com queryFilters e queriedAt", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch());
    vi.mocked(getPrecoMaterial).mockResolvedValue({
      _embedded: { resultado: [makeRow(1)] },
      totalPaginas: 1,
    });

    await queryPrecosUseCase({ researchId: "r-1", estado: "AP" });

    expect(prismaMock.priceResearch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r-1" },
        data: expect.objectContaining({
          status: "PNCP_QUERIED",
          queriedAt: expect.any(Date),
          queryFilters: expect.objectContaining({ estado: "AP" }),
        }),
      }),
    );
  });

  it("zero rows válidos: limpa amostras mas não atualiza status", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch());
    vi.mocked(getPrecoMaterial).mockResolvedValue({
      _embedded: { resultado: [] },
      totalPaginas: 1,
    });

    const result = await queryPrecosUseCase({ researchId: "r-1" });

    expect(result.inserted).toBe(0);
    expect(prismaMock.priceSample.deleteMany).toHaveBeenCalled();
    expect(prismaMock.priceSample.createMany).not.toHaveBeenCalled();
    expect(prismaMock.priceResearch.update).not.toHaveBeenCalled();
  });

  it("filtra amostras com precoUnitario=0 antes de inserir", async () => {
    const rows: PrecoRow[] = [
      { idCompra: "A", codigoItemCatalogo: 1, precoUnitario: 100, quantidade: 1 },
      { idCompra: "B", codigoItemCatalogo: 1, precoUnitario: 0, quantidade: 1 },
      { idCompra: "C", codigoItemCatalogo: 1, precoUnitario: 50, quantidade: 2 },
    ];
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch());
    vi.mocked(getPrecoMaterial).mockResolvedValue({
      _embedded: { resultado: rows },
      totalPaginas: 1,
    });
    prismaMock.priceSample.createMany.mockResolvedValue({ count: 2 });

    const result = await queryPrecosUseCase({ researchId: "r-1" });

    expect(result.inserted).toBe(2);
    const createArg = prismaMock.priceSample.createMany.mock.calls[0][0] as {
      data: Array<{ pncpNumeroControle: string }>;
    };
    expect(createArg.data.map((d) => d.pncpNumeroControle)).toEqual(["A", "C"]);
  });

  it("executa mutações dentro de $transaction", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(baseResearch());
    vi.mocked(getPrecoMaterial).mockResolvedValue({
      _embedded: { resultado: [makeRow(1)] },
      totalPaginas: 1,
    });

    await queryPrecosUseCase({ researchId: "r-1" });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
