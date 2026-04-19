import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { toNumber, toNumberOrNull } from "@/lib/decimal";

describe("toNumber", () => {
  it("converte Decimal inteiro", () => {
    expect(toNumber(new Prisma.Decimal(42))).toBe(42);
  });

  it("converte Decimal fracionado preservando casas decimais", () => {
    expect(toNumber(new Prisma.Decimal("123.45"))).toBe(123.45);
  });

  it("converte Decimal zero", () => {
    expect(toNumber(new Prisma.Decimal(0))).toBe(0);
  });

  it("converte Decimal negativo", () => {
    expect(toNumber(new Prisma.Decimal("-10.5"))).toBe(-10.5);
  });
});

describe("toNumberOrNull", () => {
  it("retorna null para null", () => {
    expect(toNumberOrNull(null)).toBeNull();
  });

  it("retorna null para undefined", () => {
    expect(toNumberOrNull(undefined)).toBeNull();
  });

  it("converte Decimal não-nulo", () => {
    expect(toNumberOrNull(new Prisma.Decimal("99.99"))).toBe(99.99);
  });

  it("converte Decimal zero (não confunde com null)", () => {
    expect(toNumberOrNull(new Prisma.Decimal(0))).toBe(0);
  });
});
