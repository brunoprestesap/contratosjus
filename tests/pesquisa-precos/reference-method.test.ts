import { describe, it, expect } from "vitest";
import {
  chooseReferenceMethod,
  computeReferenceValue,
  computeStats,
  isReferenceExceedingMedian,
} from "@/lib/statistics";

describe("chooseReferenceMethod", () => {
  it("NONE para amostra vazia", () => {
    expect(chooseReferenceMethod(computeStats([]))).toBe("NONE");
  });

  it("MEDIAN para amostra pequena (< 10) mesmo homogênea", () => {
    // 5 valores quase iguais — CV ~0, mas N<10 prevalece
    const stats = computeStats([100, 101, 102, 99, 100]);
    expect(stats.count).toBe(5);
    expect(chooseReferenceMethod(stats)).toBe("MEDIAN");
  });

  it("MEDIAN para dados heterogêneos (CV > 25%)", () => {
    const values = [100, 100, 100, 100, 100, 100, 100, 100, 100, 200, 300];
    const stats = computeStats(values);
    expect(stats.coefVariation).toBeGreaterThan(0.25);
    expect(chooseReferenceMethod(stats)).toBe("MEDIAN");
  });

  it("MEAN para N>=10 e dados homogêneos", () => {
    const values = [100, 101, 99, 100, 102, 98, 100, 101, 99, 100, 100];
    const stats = computeStats(values);
    expect(stats.count).toBe(11);
    expect(stats.coefVariation).toBeLessThan(0.1);
    expect(chooseReferenceMethod(stats)).toBe("MEAN");
  });
});

describe("computeReferenceValue", () => {
  const stats = computeStats([100, 200, 300, 400, 500]);
  // mean=300, median=300, min=100

  it("retorna null para amostra vazia", () => {
    expect(computeReferenceValue(computeStats([]), "MEAN")).toBeNull();
  });

  it("NONE retorna null", () => {
    expect(computeReferenceValue(stats, "NONE")).toBeNull();
  });

  it("MEAN retorna a média", () => {
    expect(computeReferenceValue(stats, "MEAN")).toBe(300);
  });

  it("MEDIAN retorna a mediana", () => {
    expect(computeReferenceValue(stats, "MEDIAN")).toBe(300);
  });

  it("MIN retorna o menor valor", () => {
    expect(computeReferenceValue(stats, "MIN")).toBe(100);
  });

  it("CUSTOM retorna o valor fornecido", () => {
    expect(computeReferenceValue(stats, "CUSTOM", null, 250)).toBe(250);
  });

  it("CUSTOM sem valor retorna null", () => {
    expect(computeReferenceValue(stats, "CUSTOM")).toBeNull();
  });

  it("aplica ajuste percentual positivo", () => {
    expect(computeReferenceValue(stats, "MEDIAN", 10)).toBe(330); // 300 * 1.10
  });

  it("aplica ajuste percentual negativo", () => {
    expect(computeReferenceValue(stats, "MEAN", -5)).toBe(285); // 300 * 0.95
  });
});

describe("isReferenceExceedingMedian", () => {
  it("true quando ref > mediana", () => {
    const stats = computeStats([100, 200, 300]);
    expect(isReferenceExceedingMedian(stats, 250)).toBe(true);
  });

  it("false quando ref <= mediana", () => {
    const stats = computeStats([100, 200, 300]);
    expect(isReferenceExceedingMedian(stats, 200)).toBe(false);
    expect(isReferenceExceedingMedian(stats, 150)).toBe(false);
  });

  it("false quando mediana=0 (sem amostras)", () => {
    const stats = computeStats([]);
    expect(isReferenceExceedingMedian(stats, 100)).toBe(false);
  });
});
