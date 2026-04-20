import { describe, it, expect } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { distributeProportional } from "@/lib/decimal";

const d = (v: string | number) => new Prisma.Decimal(v);

describe("distributeProportional", () => {
  it("retorna array vazio quando não há pesos", () => {
    expect(distributeProportional(d(100), [])).toEqual([]);
  });

  it("distribui proporcionalmente aos pesos", () => {
    const parts = distributeProportional(d("1000.00"), [d(10), d(20), d(70)]);
    expect(parts.map((p) => p.toString())).toEqual(["100", "200", "700"]);
  });

  it("garante que a soma das partes é exatamente igual ao total (sem drift)", () => {
    const total = d("100.00");
    const parts = distributeProportional(total, [d(1), d(1), d(1)]);
    const sum = parts.reduce((s, p) => s.add(p), d(0));
    expect(sum.toString()).toBe(total.toString());
  });

  it("absorve diferença de arredondamento no último item", () => {
    // 100 / 3 = 33.333... → arredonda para 33.33, 33.33, 33.34 (diff absorvida)
    const parts = distributeProportional(d("100.00"), [d(1), d(1), d(1)]);
    expect(parts[0].toString()).toBe("33.33");
    expect(parts[1].toString()).toBe("33.33");
    expect(parts[2].toString()).toBe("33.34");
  });

  it("distribui em partes iguais quando pesos somam zero", () => {
    const parts = distributeProportional(d("300.00"), [d(0), d(0), d(0)]);
    const sum = parts.reduce((s, p) => s.add(p), d(0));
    expect(sum.toString()).toBe("300");
    expect(parts[0].toString()).toBe("100");
  });

  it("lida com pesos decimais", () => {
    const parts = distributeProportional(d("500.00"), [d("33.33"), d("66.67")]);
    const sum = parts.reduce((s, p) => s.add(p), d(0));
    expect(sum.toString()).toBe("500");
  });

  it("preserva 2 casas decimais no resultado", () => {
    const parts = distributeProportional(d("100.00"), [d("1.7"), d("2.3")]);
    for (const part of parts) {
      expect(part.decimalPlaces()).toBeLessThanOrEqual(2);
    }
  });

  it("funciona com um único peso", () => {
    const parts = distributeProportional(d("500.00"), [d(42)]);
    expect(parts.length).toBe(1);
    expect(parts[0].toString()).toBe("500");
  });

  it("distribui valores grandes sem perda de precisão", () => {
    const total = d("9999999.99");
    const weights = [d(1), d(2), d(3), d(4)];
    const parts = distributeProportional(total, weights);
    const sum = parts.reduce((s, p) => s.add(p), d(0));
    expect(sum.toString()).toBe(total.toString());
  });
});
