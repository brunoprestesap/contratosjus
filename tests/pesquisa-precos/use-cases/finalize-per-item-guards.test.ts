import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@/generated/prisma/client";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    priceResearch: { findUnique: vi.fn(), update: vi.fn() },
    generatedDocument: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/documents/engine/render", () => ({ renderDocument: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { finalizeResearchUseCase } from "@/lib/pesquisa-precos/use-cases/finalize";

function itemBase(overrides: Record<string, unknown> = {}) {
  return {
    contractItem: { itemNumber: "001" },
    itemType: "SERVICE" as const,
    catmatCode: null,
    catserCode: "1234",
    justificationText: "Justificativa adequada de economicidade do item.",
    exceptionJustification: null,
    referenceMethod: "MEDIAN" as const,
    referenceValue: new Prisma.Decimal("200.00"),
    median: new Prisma.Decimal("200.00"),
    samples: [
      { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("180") },
      { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("200") },
      { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("220") },
    ],
    _count: { samples: 3 },
    ...overrides,
  };
}

function researchPerItem(items: ReturnType<typeof itemBase>[]) {
  return {
    id: "r-1",
    contractId: "c-1",
    mode: "PER_ITEM" as const,
    justificationText: "n/a",
    samples: items.flatMap((i, idx) =>
      i.samples.map((_, j) => ({ id: `s-${idx}-${j}`, researchItemId: `i-${idx}` })),
    ),
    researchItems: items,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: unknown) =>
    typeof fn === "function" ? (fn as (tx: unknown) => unknown)(prismaMock) : undefined,
  );
});

describe("finalize PER_ITEM — guards Manual CNJ", () => {
  it("bloqueia item sem código de catálogo", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchPerItem([itemBase({ catserCode: null })]),
    );
    await expect(finalizeResearchUseCase("r-1", "u-1")).rejects.toThrow(/código do catálogo/);
  });

  it("bloqueia item sem método de referência definido", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchPerItem([itemBase({ referenceMethod: "NONE", referenceValue: null })]),
    );
    await expect(finalizeResearchUseCase("r-1", "u-1")).rejects.toThrow(
      /método e o valor de referência/,
    );
  });

  it("bloqueia < 3 amostras sem justificativa de excepcionalidade", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchPerItem([
        itemBase({
          _count: { samples: 2 },
          samples: [
            { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("180") },
            { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("200") },
          ],
        }),
      ]),
    );
    await expect(finalizeResearchUseCase("r-1", "u-1")).rejects.toThrow(
      /justificativa de excepcionalidade/,
    );
  });

  it("permite < 3 amostras quando excepcionalidade preenchida", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchPerItem([
        itemBase({
          _count: { samples: 2 },
          samples: [
            { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("180") },
            { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("200") },
          ],
          median: new Prisma.Decimal("190.00"),
          referenceValue: new Prisma.Decimal("190.00"),
          exceptionJustification:
            "Mercado singular: somente dois fornecedores no país comprovados via site institucional.",
        }),
      ]),
    );
    prismaMock.generatedDocument.findFirst.mockResolvedValue(null);
    const renderModule = await import("@/lib/documents/engine/render");
    vi.mocked(renderModule.renderDocument).mockResolvedValue({
      inputData: {},
      pdfPath: "/tmp/a.pdf",
      pdfChecksum: "sha",
    });

    await expect(finalizeResearchUseCase("r-1", "u-1")).resolves.toMatchObject({
      researchId: "r-1",
      contractId: "c-1",
    });
  });

  it("bloqueia quando referenceValue > mediana e fonte é 100% Painel", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchPerItem([
        itemBase({
          referenceValue: new Prisma.Decimal("250.00"),
          median: new Prisma.Decimal("200.00"),
        }),
      ]),
    );
    await expect(finalizeResearchUseCase("r-1", "u-1")).rejects.toThrow(
      /não pode superar a mediana/,
    );
  });

  it("permite referenceValue > mediana quando há amostra de outra fonte", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchPerItem([
        itemBase({
          referenceValue: new Prisma.Decimal("250.00"),
          median: new Prisma.Decimal("200.00"),
          samples: [
            { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("180") },
            { source: "PAINEL_PRECOS", valorGlobal: new Prisma.Decimal("200") },
            { source: "COTACAO_DIRETA", valorGlobal: new Prisma.Decimal("260") },
          ],
        }),
      ]),
    );
    prismaMock.generatedDocument.findFirst.mockResolvedValue(null);
    const renderModule = await import("@/lib/documents/engine/render");
    vi.mocked(renderModule.renderDocument).mockResolvedValue({
      inputData: {},
      pdfPath: "/tmp/a.pdf",
      pdfChecksum: "sha",
    });

    await expect(finalizeResearchUseCase("r-1", "u-1")).resolves.toMatchObject({
      researchId: "r-1",
    });
  });
});
