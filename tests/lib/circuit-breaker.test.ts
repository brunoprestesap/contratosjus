import { describe, it, expect } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "@/lib/circuit-breaker";

describe("CircuitBreaker", () => {
  function build(t0 = 1000) {
    let now = t0;
    const breaker = new CircuitBreaker({
      threshold: 3,
      windowMs: 60_000,
      openMs: 120_000,
      now: () => now,
    });
    const advance = (ms: number) => {
      now += ms;
    };
    return { breaker, advance };
  }

  it("não abre abaixo do threshold", () => {
    const { breaker } = build();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(() => breaker.assertClosed()).not.toThrow();
    expect(breaker.isOpen).toBe(false);
  });

  it("abre após threshold de falhas consecutivas na janela", () => {
    const { breaker } = build();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.isOpen).toBe(true);
    expect(() => breaker.assertClosed()).toThrow(CircuitOpenError);
  });

  it("recordSuccess reseta falhas antes de atingir threshold", () => {
    const { breaker } = build();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.isOpen).toBe(false);
  });

  it("fecha automaticamente após openMs", () => {
    const { breaker, advance } = build();
    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.isOpen).toBe(true);

    advance(120_000 - 1);
    expect(breaker.isOpen).toBe(true);

    advance(2);
    expect(breaker.isOpen).toBe(false);
    expect(() => breaker.assertClosed()).not.toThrow();
  });

  it("falhas fora da janela não contam para threshold", () => {
    const { breaker, advance } = build();
    breaker.recordFailure();
    breaker.recordFailure();
    advance(61_000);
    breaker.recordFailure();
    expect(breaker.isOpen).toBe(false);
  });
});
