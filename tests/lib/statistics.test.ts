import { describe, it, expect } from "vitest";
import { computeStats } from "@/lib/statistics";

describe("computeStats", () => {
  it("retorna zeros para amostra vazia", () => {
    const s = computeStats([]);
    expect(s).toEqual({
      count: 0,
      mean: 0,
      median: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      coefVariation: 0,
    });
  });

  it("ignora null, undefined e NaN", () => {
    const s = computeStats([10, null, undefined, NaN, 20]);
    expect(s.count).toBe(2);
    expect(s.mean).toBe(15);
  });

  it("calcula mean/median/min/max corretamente (ímpar)", () => {
    const s = computeStats([1, 3, 5, 7, 9]);
    expect(s.count).toBe(5);
    expect(s.mean).toBe(5);
    expect(s.median).toBe(5);
    expect(s.min).toBe(1);
    expect(s.max).toBe(9);
  });

  it("mediana em amostra par é média dos dois centrais", () => {
    const s = computeStats([1, 2, 3, 4]);
    expect(s.median).toBe(2.5);
  });

  it("stdDev populacional correto", () => {
    const s = computeStats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(s.mean).toBe(5);
    expect(s.stdDev).toBe(2);
  });

  it("coefVariation = stdDev / mean", () => {
    const s = computeStats([10, 20, 30]);
    // mean = 20, var = ((100+0+100)/3) = 66.66, std ≈ 8.165
    expect(s.coefVariation).toBeCloseTo(s.stdDev / s.mean, 6);
  });

  it("coefVariation = 0 quando mean = 0", () => {
    const s = computeStats([-5, 0, 5]);
    expect(s.mean).toBe(0);
    expect(s.coefVariation).toBe(0);
  });

  it("amostra única", () => {
    const s = computeStats([42]);
    expect(s).toMatchObject({ count: 1, mean: 42, median: 42, min: 42, max: 42, stdDev: 0 });
  });
});
