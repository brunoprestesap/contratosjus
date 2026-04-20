import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import {
  breakdownItemSchema,
  sumBreakdown,
  assertBreakdownMatches,
  assertBreakdownUnique,
  BREAKDOWN_TOLERANCE,
} from "@/lib/validators/breakdown";
import { commitmentWithBreakdownSchema } from "@/lib/validators/empenho";
import { paymentWithBreakdownSchema } from "@/lib/validators/pagamento";

describe("breakdownItemSchema", () => {
  it("aceita item válido", () => {
    expect(breakdownItemSchema.safeParse({ contractItemId: "abc", value: 100 }).success).toBe(true);
  });

  it("rejeita contractItemId vazio", () => {
    expect(breakdownItemSchema.safeParse({ contractItemId: "", value: 100 }).success).toBe(false);
  });

  it("rejeita valor negativo", () => {
    expect(breakdownItemSchema.safeParse({ contractItemId: "abc", value: -10 }).success).toBe(
      false,
    );
  });

  it("aceita valor zero (item sem valor nesta etapa)", () => {
    expect(breakdownItemSchema.safeParse({ contractItemId: "abc", value: 0 }).success).toBe(true);
  });
});

describe("sumBreakdown", () => {
  it("soma valores", () => {
    expect(
      sumBreakdown([
        { contractItemId: "a", value: 100 },
        { contractItemId: "b", value: 200 },
        { contractItemId: "c", value: 300 },
      ]),
    ).toBe(600);
  });

  it("retorna 0 para array vazio", () => {
    expect(sumBreakdown([])).toBe(0);
  });
});

const buildCtx = () => {
  const issues: z.core.$ZodIssue[] = [];
  return {
    ctx: {
      addIssue: (i: z.core.$ZodRawIssue) => {
        issues.push(i as z.core.$ZodIssue);
      },
    } as unknown as z.core.$RefinementCtx,
    issues,
  };
};

describe("assertBreakdownMatches", () => {
  it("aceita soma igual ao total", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownMatches(
      [
        { contractItemId: "a", value: 100 },
        { contractItemId: "b", value: 200 },
      ],
      300,
      ctx,
    );
    expect(issues).toHaveLength(0);
  });

  it("rejeita soma diferente do total", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownMatches(
      [
        { contractItemId: "a", value: 100 },
        { contractItemId: "b", value: 250 },
      ],
      300,
      ctx,
    );
    expect(issues).toHaveLength(1);
  });

  it("aceita diferença dentro da tolerância (1 centavo)", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownMatches(
      [
        { contractItemId: "a", value: 33.33 },
        { contractItemId: "b", value: 33.33 },
        { contractItemId: "c", value: 33.33 },
      ],
      100,
      ctx,
    );
    expect(issues).toHaveLength(0);
  });

  it("rejeita diferença acima da tolerância", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownMatches([{ contractItemId: "a", value: 99.5 }], 100, ctx);
    expect(issues).toHaveLength(1);
  });

  it("rejeita breakdown com itens não-zero quando total é null", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownMatches([{ contractItemId: "a", value: 100 }], null, ctx);
    expect(issues).toHaveLength(1);
  });

  it("aceita breakdown vazio quando total é null", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownMatches([], null, ctx);
    expect(issues).toHaveLength(0);
  });

  it("aceita breakdown com tudo zero quando total é null", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownMatches([{ contractItemId: "a", value: 0 }], null, ctx);
    expect(issues).toHaveLength(0);
  });
});

describe("assertBreakdownUnique", () => {
  it("aceita ids distintos", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownUnique(
      [
        { contractItemId: "a", value: 100 },
        { contractItemId: "b", value: 200 },
      ],
      ctx,
    );
    expect(issues).toHaveLength(0);
  });

  it("rejeita ids duplicados", () => {
    const { ctx, issues } = buildCtx();
    assertBreakdownUnique(
      [
        { contractItemId: "a", value: 100 },
        { contractItemId: "a", value: 50 },
      ],
      ctx,
    );
    expect(issues).toHaveLength(1);
  });
});

describe("BREAKDOWN_TOLERANCE", () => {
  it("é 1 centavo", () => {
    expect(BREAKDOWN_TOLERANCE).toBe(0.01);
  });
});

describe("commitmentWithBreakdownSchema", () => {
  const base = {
    commitmentNumber: "2026NE000001",
    commitmentDate: "2026-04-15",
    value: 1000,
    type: "INITIAL" as const,
  };

  it("aceita empenho sem breakdown", () => {
    expect(commitmentWithBreakdownSchema.safeParse(base).success).toBe(true);
  });

  it("aceita empenho com breakdown somando igual ao valor", () => {
    const result = commitmentWithBreakdownSchema.safeParse({
      ...base,
      items: [
        { contractItemId: "a", value: 400 },
        { contractItemId: "b", value: 600 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejeita breakdown com soma diferente do valor", () => {
    const result = commitmentWithBreakdownSchema.safeParse({
      ...base,
      items: [{ contractItemId: "a", value: 999 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita breakdown com item duplicado", () => {
    const result = commitmentWithBreakdownSchema.safeParse({
      ...base,
      items: [
        { contractItemId: "a", value: 500 },
        { contractItemId: "a", value: 500 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("paymentWithBreakdownSchema", () => {
  const base = {
    referenceMonth: "2026-04-01",
    attestDate: "2026-04-10",
    invoiceValue: 1000,
  };

  it("aceita pagamento com apenas invoiceItems", () => {
    const result = paymentWithBreakdownSchema.safeParse({
      ...base,
      invoiceItems: [
        { contractItemId: "a", value: 400 },
        { contractItemId: "b", value: 600 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejeita soma de invoiceItems ≠ invoiceValue", () => {
    const result = paymentWithBreakdownSchema.safeParse({
      ...base,
      invoiceItems: [{ contractItemId: "a", value: 999 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejeita soma de paymentItems ≠ paidValue", () => {
    const result = paymentWithBreakdownSchema.safeParse({
      referenceMonth: "2026-04-01",
      attestDate: "2026-04-10",
      settlementDate: "2026-04-15",
      settledValue: 1000,
      paidAt: "2026-04-20",
      paidValue: 1000,
      paymentItems: [{ contractItemId: "a", value: 500 }],
    });
    expect(result.success).toBe(false);
  });

  it("aceita breakdowns coerentes para as 3 fases", () => {
    const result = paymentWithBreakdownSchema.safeParse({
      referenceMonth: "2026-04-01",
      attestDate: "2026-04-10",
      invoiceValue: 1000,
      settlementDate: "2026-04-15",
      settledValue: 1000,
      paidAt: "2026-04-20",
      paidValue: 1000,
      invoiceItems: [
        { contractItemId: "a", value: 400 },
        { contractItemId: "b", value: 600 },
      ],
      settlementItems: [
        { contractItemId: "a", value: 400 },
        { contractItemId: "b", value: 600 },
      ],
      paymentItems: [
        { contractItemId: "a", value: 400 },
        { contractItemId: "b", value: 600 },
      ],
    });
    expect(result.success).toBe(true);
  });
});
