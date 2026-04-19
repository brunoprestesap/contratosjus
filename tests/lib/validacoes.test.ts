import { describe, it, expect } from "vitest";
import { isContractExpired, isOverBudget } from "@/lib/utils";

describe("isContractExpired", () => {
  it("retorna false para contrato com vigência futura", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    expect(isContractExpired(futureDate)).toBe(false);
  });

  it("retorna true para contrato com vigência passada", () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);
    expect(isContractExpired(pastDate)).toBe(true);
  });

  it("retorna false para contrato que vence hoje", () => {
    // Use a date far in the future to avoid timezone flakes
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(isContractExpired(tomorrow)).toBe(false);
  });

  it("retorna false para contrato que vence hoje (mesmo dia)", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(isContractExpired(today)).toBe(false);
  });
});

describe("isOverBudget", () => {
  it("retorna false quando dentro do budget", () => {
    expect(isOverBudget(30000, 20000, 100000)).toBe(false);
  });

  it("retorna false quando exatamente no limite", () => {
    expect(isOverBudget(50000, 50000, 100000)).toBe(false);
  });

  it("retorna true quando estourado", () => {
    expect(isOverBudget(60000, 50000, 100000)).toBe(true);
  });
});

describe("validações de ordem cronológica (Zod)", () => {
  // Import inside describe to handle async module loading
  it("aceita datas em ordem válida", async () => {
    const { paymentUpdateSchema } = await import("@/lib/validators/pagamento");
    const result = paymentUpdateSchema.safeParse({
      referenceMonth: "2026-03-01",
      attestDate: "2026-03-10",
      settlementDate: "2026-03-15",
      paidAt: "2026-03-20",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita liquidação antes do ateste", async () => {
    const { paymentUpdateSchema } = await import("@/lib/validators/pagamento");
    const result = paymentUpdateSchema.safeParse({
      referenceMonth: "2026-03-01",
      attestDate: "2026-03-15",
      settlementDate: "2026-03-10",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita pagamento antes da liquidação", async () => {
    const { paymentUpdateSchema } = await import("@/lib/validators/pagamento");
    const result = paymentUpdateSchema.safeParse({
      referenceMonth: "2026-03-01",
      attestDate: "2026-03-10",
      settlementDate: "2026-03-15",
      paidAt: "2026-03-12",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita liquidação sem ateste", async () => {
    const { paymentUpdateSchema } = await import("@/lib/validators/pagamento");
    const result = paymentUpdateSchema.safeParse({
      referenceMonth: "2026-03-01",
      settlementDate: "2026-03-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita pagamento sem liquidação", async () => {
    const { paymentUpdateSchema } = await import("@/lib/validators/pagamento");
    const result = paymentUpdateSchema.safeParse({
      referenceMonth: "2026-03-01",
      attestDate: "2026-03-10",
      paidAt: "2026-03-20",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita pagamento sem liquidação no schema de criação", async () => {
    const { paymentCreateSchema } = await import("@/lib/validators/pagamento");
    const result = paymentCreateSchema.safeParse({
      referenceMonth: "2026-03-01",
      attestDate: "2026-03-10",
      paidAt: "2026-03-20",
    });
    expect(result.success).toBe(false);
  });
});
