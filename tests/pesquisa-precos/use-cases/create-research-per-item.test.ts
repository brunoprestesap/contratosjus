import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    contract: { findUnique: vi.fn() },
    contractItem: { findMany: vi.fn() },
    priceResearch: { create: vi.fn() },
    priceResearchItem: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { createResearchPerItemUseCase } from "@/lib/pesquisa-precos/use-cases/research-lifecycle";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return (fn as (tx: unknown) => unknown)(prismaMock);
    return undefined;
  });
});

describe("createResearchPerItemUseCase", () => {
  it("lança ResearchDomainError quando contrato não existe", async () => {
    prismaMock.contract.findUnique.mockResolvedValue(null);

    await expect(
      createResearchPerItemUseCase({ contractId: "c-x", contractItemIds: ["i-1"] }, "u-1"),
    ).rejects.toBeInstanceOf(ResearchDomainError);
  });

  it("lança erro se itens não pertencem ao contrato", async () => {
    prismaMock.contract.findUnique.mockResolvedValue({
      id: "c-1",
      legalRegime: "LEI_14133_2021",
    });
    prismaMock.contractItem.findMany.mockResolvedValue([]); // nenhum item encontrado

    await expect(
      createResearchPerItemUseCase({ contractId: "c-1", contractItemIds: ["i-1", "i-2"] }, "u-1"),
    ).rejects.toThrow(/não pertencem/);
  });

  it("cria pesquisa PER_ITEM com snapshot do regime + um PriceResearchItem por item", async () => {
    prismaMock.contract.findUnique.mockResolvedValue({
      id: "c-1",
      legalRegime: "LEI_14133_2021",
    });
    prismaMock.contractItem.findMany.mockResolvedValue([
      {
        id: "i-1",
        itemType: "MATERIAL",
        catalogCode: "12345",
        description: "notebook",
      },
      {
        id: "i-2",
        itemType: "SERVICE",
        catalogCode: null,
        description: "suporte técnico",
      },
    ]);
    prismaMock.priceResearch.create.mockResolvedValue({
      id: "r-1",
      contractId: "c-1",
      mode: "PER_ITEM",
      legalRegimeSnapshot: "LEI_14133_2021",
    });
    prismaMock.priceResearchItem.createMany.mockResolvedValue({ count: 2 });

    const result = await createResearchPerItemUseCase(
      { contractId: "c-1", contractItemIds: ["i-1", "i-2"] },
      "u-1",
    );

    expect(result).toEqual({ researchId: "r-1", contractId: "c-1" });
    expect(prismaMock.priceResearch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contractId: "c-1",
        createdById: "u-1",
        mode: "PER_ITEM",
        legalRegimeSnapshot: "LEI_14133_2021",
      }),
    });
    expect(prismaMock.priceResearchItem.createMany).toHaveBeenCalledTimes(1);
    const createArg = prismaMock.priceResearchItem.createMany.mock.calls[0][0];
    expect(createArg.data).toHaveLength(2);

    // Item com catalogCode: codeSource = ITEM + catmatCode preenchido
    expect(createArg.data[0]).toEqual(
      expect.objectContaining({
        researchId: "r-1",
        contractItemId: "i-1",
        itemType: "MATERIAL",
        catmatCode: "12345",
        catserCode: null,
        codeSource: "ITEM",
      }),
    );

    // Item sem catalogCode: codeSource = PENDING
    expect(createArg.data[1]).toEqual(
      expect.objectContaining({
        researchId: "r-1",
        contractItemId: "i-2",
        itemType: "SERVICE",
        catmatCode: null,
        catserCode: null,
        codeSource: "PENDING",
      }),
    );
  });

  it("mapeia WORK e IT_SOLUTION para SERVICE (CATSER)", async () => {
    prismaMock.contract.findUnique.mockResolvedValue({
      id: "c-1",
      legalRegime: "LEI_8666_1993",
    });
    prismaMock.contractItem.findMany.mockResolvedValue([
      { id: "i-1", itemType: "WORK", catalogCode: "999", description: "obra" },
      { id: "i-2", itemType: "IT_SOLUTION", catalogCode: null, description: "TI" },
    ]);
    prismaMock.priceResearch.create.mockResolvedValue({
      id: "r-1",
      contractId: "c-1",
      mode: "PER_ITEM",
      legalRegimeSnapshot: "LEI_8666_1993",
    });
    prismaMock.priceResearchItem.createMany.mockResolvedValue({ count: 2 });

    await createResearchPerItemUseCase(
      { contractId: "c-1", contractItemIds: ["i-1", "i-2"] },
      "u-1",
    );

    const data = prismaMock.priceResearchItem.createMany.mock.calls[0][0].data;
    expect(data[0].itemType).toBe("SERVICE");
    expect(data[0].catserCode).toBe("999");
    expect(data[1].itemType).toBe("SERVICE");
    expect(data[1].codeSource).toBe("PENDING");
  });
});
