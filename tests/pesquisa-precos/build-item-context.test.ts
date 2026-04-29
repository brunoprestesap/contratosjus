import { describe, it, expect } from "vitest";
import { buildItemContext } from "@/lib/ai/generate";

describe("buildItemContext", () => {
  it("monta texto com descrição apenas quando não há especificação", () => {
    const out = buildItemContext({ description: "Notebook Dell Latitude" });
    expect(out).toBe("Descrição: Notebook Dell Latitude");
  });

  it("inclui especificação quando diferente da descrição", () => {
    const out = buildItemContext({
      description: "Notebook",
      detailedSpecification: "Processador Intel i7, 16GB RAM, 512GB SSD",
    });
    expect(out).toContain("Descrição: Notebook");
    expect(out).toContain("Especificação: Processador Intel i7, 16GB RAM, 512GB SSD");
  });

  it("omite especificação redundante (igual à descrição)", () => {
    const out = buildItemContext({
      description: "Notebook Dell",
      detailedSpecification: "Notebook Dell",
    });
    expect(out).not.toContain("Especificação:");
  });

  it("inclui tipo e unidade quando fornecidos", () => {
    const out = buildItemContext({
      description: "Vigilância armada",
      itemType: "SERVICE",
      unitOfMeasure: "POSTO",
    });
    expect(out).toContain("Tipo: SERVICE");
    expect(out).toContain("Unidade: POSTO");
  });

  it("ignora especificação vazia / whitespace", () => {
    const out = buildItemContext({
      description: "item",
      detailedSpecification: "   ",
    });
    expect(out).not.toContain("Especificação:");
  });
});
