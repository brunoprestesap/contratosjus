import { describe, it, expect } from "vitest";
import {
  paymentCreateSchema,
  paymentUpdateSchema,
  datesCoherenceRefinement,
} from "@/lib/validators/pagamento";
import { z } from "zod/v4";

const baseValid = {
  referenceMonth: "2026-04-01",
  attestDate: "2026-04-10",
};

describe("paymentCreateSchema — coerência de datas", () => {
  it("aceita ateste sem liquidação nem pagamento", () => {
    const result = paymentCreateSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("rejeita liquidação sem ateste", () => {
    const result = paymentCreateSchema.safeParse({
      referenceMonth: "2026-04-01",
      settlementDate: "2026-04-15",
    });
    expect(result.success).toBe(false);
    const messages = result.success
      ? []
      : result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("ateste"))).toBe(true);
  });

  it("rejeita liquidação anterior ao ateste", () => {
    const result = paymentCreateSchema.safeParse({
      ...baseValid,
      settlementDate: "2026-04-05",
    });
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues[0]?.message ?? "";
    expect(message).toContain("liquidação");
  });

  it("rejeita pagamento sem liquidação", () => {
    const result = paymentCreateSchema.safeParse({
      ...baseValid,
      paidAt: "2026-04-20",
    });
    expect(result.success).toBe(false);
    const messages = result.success
      ? []
      : result.error.issues.map((i) => i.message);
    expect(messages.some((m) => m.includes("liquidação"))).toBe(true);
  });

  it("rejeita pagamento anterior à liquidação", () => {
    const result = paymentCreateSchema.safeParse({
      ...baseValid,
      settlementDate: "2026-04-15",
      paidAt: "2026-04-12",
    });
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues[0]?.message ?? "";
    expect(message).toContain("pagamento");
  });

  it("aceita ateste, liquidação e pagamento no mesmo dia", () => {
    const result = paymentCreateSchema.safeParse({
      referenceMonth: "2026-04-01",
      attestDate: "2026-04-10",
      settlementDate: "2026-04-10",
      paidAt: "2026-04-10",
    });
    expect(result.success).toBe(true);
  });

  it("aceita sequência válida ateste → liquidação → pagamento", () => {
    const result = paymentCreateSchema.safeParse({
      referenceMonth: "2026-04-01",
      attestDate: "2026-04-10",
      settlementDate: "2026-04-15",
      paidAt: "2026-04-20",
    });
    expect(result.success).toBe(true);
  });
});

describe("paymentUpdateSchema — coerência de datas", () => {
  it("compartilha o mesmo refinement e aceita sequência válida", () => {
    const result = paymentUpdateSchema.safeParse({
      referenceMonth: "2026-04-01",
      attestDate: "2026-04-10",
      settlementDate: "2026-04-15",
      paidAt: "2026-04-20",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita datas fora de ordem", () => {
    const result = paymentUpdateSchema.safeParse({
      referenceMonth: "2026-04-01",
      attestDate: "2026-04-10",
      settlementDate: "2026-04-20",
      paidAt: "2026-04-15",
    });
    expect(result.success).toBe(false);
  });
});

describe("datesCoherenceRefinement — função reutilizável", () => {
  const runRefinement = (data: {
    attestDate?: Date;
    settlementDate?: Date;
    paidAt?: Date;
  }) => {
    const schema = z
      .object({
        attestDate: z.date().optional(),
        settlementDate: z.date().optional(),
        paidAt: z.date().optional(),
      })
      .superRefine(datesCoherenceRefinement);
    return schema.safeParse(data);
  };

  it("aceita objeto vazio (sem datas)", () => {
    expect(runRefinement({}).success).toBe(true);
  });

  it("detecta liquidação sem ateste isoladamente", () => {
    const result = runRefinement({
      settlementDate: new Date("2026-04-15"),
    });
    expect(result.success).toBe(false);
  });

  it("detecta pagamento sem liquidação isoladamente", () => {
    const result = runRefinement({
      attestDate: new Date("2026-04-10"),
      paidAt: new Date("2026-04-20"),
    });
    expect(result.success).toBe(false);
  });
});
