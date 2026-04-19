import { describe, it, expect, vi, beforeEach } from "vitest";

const { prismaMock } = vi.hoisted(() => {
  const mock = {
    priceResearch: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    generatedDocument: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/documents/engine/render", () => ({
  renderDocument: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({ logAudit: vi.fn() }));

import { renderDocument } from "@/lib/documents/engine/render";
import { logAudit } from "@/lib/audit";
import {
  finalizeResearchUseCase,
  MIN_SAMPLES_TO_FINALIZE,
} from "@/lib/pesquisa-precos/use-cases/finalize";
import { ResearchDomainError } from "@/lib/pesquisa-precos/errors";

function researchWith(overrides: Record<string, unknown> = {}) {
  return {
    id: "r-1",
    contractId: "c-1",
    justificationText: "Justificativa suficientemente longa.",
    samples: Array.from({ length: MIN_SAMPLES_TO_FINALIZE }, (_, i) => ({ id: `s${i}` })),
    ...overrides,
  };
}

const renderedDoc = {
  inputData: { foo: "bar" },
  pdfPath: "/tmp/doc.pdf",
  pdfChecksum: "abc123",
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn: unknown) => {
    if (typeof fn === "function") return (fn as (tx: unknown) => unknown)(prismaMock);
    return undefined;
  });
  vi.mocked(renderDocument).mockResolvedValue(renderedDoc);
});

describe("finalizeResearchUseCase", () => {
  it("lança ResearchDomainError quando pesquisa não existe", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(null);

    await expect(finalizeResearchUseCase("r-x", "u-1")).rejects.toBeInstanceOf(ResearchDomainError);
  });

  it("lança ResearchDomainError com menos que MIN_SAMPLES_TO_FINALIZE amostras válidas", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchWith({ samples: [{ id: "s0" }, { id: "s1" }] }),
    );

    await expect(finalizeResearchUseCase("r-1", "u-1")).rejects.toThrow(
      new RegExp(`ao menos ${MIN_SAMPLES_TO_FINALIZE} amostras`),
    );
  });

  it("lança ResearchDomainError quando justificativa está vazia", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchWith({ justificationText: null }),
    );

    await expect(finalizeResearchUseCase("r-1", "u-1")).rejects.toThrow(/Preencha a justificativa/);
  });

  it("lança ResearchDomainError quando justificativa tem menos de 10 chars", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(
      researchWith({ justificationText: "curto" }),
    );

    await expect(finalizeResearchUseCase("r-1", "u-1")).rejects.toThrow(/Preencha a justificativa/);
  });

  it("primeira versão: não chama findFirst→update, cria doc com version=1", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith());
    prismaMock.generatedDocument.findFirst.mockResolvedValue(null);

    await finalizeResearchUseCase("r-1", "u-1");

    expect(prismaMock.generatedDocument.update).not.toHaveBeenCalled();
    expect(prismaMock.generatedDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 1,
          contractId: "c-1",
          priceResearchId: "r-1",
          templateId: "prorrogacao.pesquisa-precos",
          category: "PROROGACAO",
          status: "GENERATED",
          createdById: "u-1",
          pdfPath: "/tmp/doc.pdf",
          pdfChecksum: "abc123",
          supersededById: null,
        }),
      }),
    );
  });

  it("segunda versão: supersede anterior GENERATED e cria version=2", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith());
    prismaMock.generatedDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      version: 1,
      status: "GENERATED",
    });

    await finalizeResearchUseCase("r-1", "u-1");

    expect(prismaMock.generatedDocument.update).toHaveBeenCalledWith({
      where: { id: "doc-1" },
      data: { status: "SUPERSEDED" },
    });
    expect(prismaMock.generatedDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          version: 2,
          supersededById: "doc-1",
        }),
      }),
    );
  });

  it("anterior já SUPERSEDED: não re-chama update mas ainda incrementa version", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith());
    prismaMock.generatedDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      version: 2,
      status: "SUPERSEDED",
    });

    await finalizeResearchUseCase("r-1", "u-1");

    expect(prismaMock.generatedDocument.update).not.toHaveBeenCalled();
    expect(prismaMock.generatedDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 3, supersededById: null }),
      }),
    );
  });

  it("atualiza pesquisa para status=FINALIZED com finalizedAt", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith());
    prismaMock.generatedDocument.findFirst.mockResolvedValue(null);

    await finalizeResearchUseCase("r-1", "u-1");

    expect(prismaMock.priceResearch.update).toHaveBeenCalledWith({
      where: { id: "r-1" },
      data: { status: "FINALIZED", finalizedAt: expect.any(Date) },
    });
  });

  it("registra audit log após a transação", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith());
    prismaMock.generatedDocument.findFirst.mockResolvedValue(null);

    await finalizeResearchUseCase("r-1", "u-1");

    expect(logAudit).toHaveBeenCalledWith({
      entity: "PriceResearch",
      entityId: "r-1",
      action: "UPDATE",
      newValue: { status: "FINALIZED", generatedChecksum: "abc123" },
    });
  });

  it("chama renderDocument com templateId + version correto", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith());
    prismaMock.generatedDocument.findFirst.mockResolvedValue({
      id: "doc-1",
      version: 5,
      status: "GENERATED",
    });

    await finalizeResearchUseCase("r-1", "u-1");

    expect(renderDocument).toHaveBeenCalledWith({
      templateId: "prorrogacao.pesquisa-precos",
      contractId: "c-1",
      version: 6,
      priceResearchId: "r-1",
    });
  });

  it("retorna { researchId, contractId }", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith());
    prismaMock.generatedDocument.findFirst.mockResolvedValue(null);

    const result = await finalizeResearchUseCase("r-1", "u-1");

    expect(result).toEqual({ researchId: "r-1", contractId: "c-1" });
  });

  it("mutações acontecem em $transaction", async () => {
    prismaMock.priceResearch.findUnique.mockResolvedValue(researchWith());
    prismaMock.generatedDocument.findFirst.mockResolvedValue(null);

    await finalizeResearchUseCase("r-1", "u-1");

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });
});
