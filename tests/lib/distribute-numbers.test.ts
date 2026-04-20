import { describe, it, expect } from "vitest";
import { distributeProportionalNumbers } from "@/lib/distribute";

describe("distributeProportionalNumbers", () => {
  it("retorna array vazio sem pesos", () => {
    expect(distributeProportionalNumbers(100, [])).toEqual([]);
  });

  it("distribui proporcionalmente", () => {
    expect(distributeProportionalNumbers(1000, [1, 2, 7])).toEqual([100, 200, 700]);
  });

  it("garante soma exata ao total (integer math, sem drift)", () => {
    const parts = distributeProportionalNumbers(100, [1, 1, 1]);
    const sum = parts.reduce((s, p) => s + p, 0);
    // comparar em centavos para evitar drift de float ao somar
    expect(Math.round(sum * 100)).toBe(10000);
  });

  it("partes iguais quando pesos somam zero", () => {
    const parts = distributeProportionalNumbers(300, [0, 0, 0]);
    expect(Math.round(parts.reduce((s, p) => s + p, 0) * 100)).toBe(30000);
  });

  it("único peso recebe tudo", () => {
    expect(distributeProportionalNumbers(500, [42])).toEqual([500]);
  });

  it("valores grandes sem perda de precisão", () => {
    const parts = distributeProportionalNumbers(9999999.99, [1, 2, 3, 4]);
    expect(Math.round(parts.reduce((s, p) => s + p, 0) * 100)).toBe(999999999);
  });
});
