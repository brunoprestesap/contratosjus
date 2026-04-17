import { describe, it, expect } from "vitest";
import { RateLimiter, RateLimitError } from "@/lib/rate-limiter";

describe("RateLimiter", () => {
  function build() {
    let now = 1000;
    const rl = new RateLimiter({
      limit: 3,
      windowMs: 1000,
      now: () => now,
    });
    return { rl, advance: (ms: number) => (now += ms) };
  }

  it("permite até o limite e bloqueia depois", async () => {
    const { rl } = build();
    await rl.consume("user1");
    await rl.consume("user1");
    await rl.consume("user1");
    await expect(rl.consume("user1")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("keys isoladas", async () => {
    const { rl } = build();
    await rl.consume("a");
    await rl.consume("a");
    await rl.consume("a");
    // b não é afetada
    await rl.consume("b");
    await rl.consume("b");
  });

  it("hits fora da janela não contam", async () => {
    const { rl, advance } = build();
    await rl.consume("u");
    await rl.consume("u");
    advance(1100);
    await rl.consume("u");
    await rl.consume("u");
    await rl.consume("u");
    // Janela atual tem apenas 3 hits: OK
    await expect(rl.consume("u")).rejects.toBeInstanceOf(RateLimitError);
  });

  it("canConsume não consome", async () => {
    const { rl } = build();
    await rl.consume("x");
    await rl.consume("x");
    expect(await rl.canConsume("x")).toBe(true);
    await rl.consume("x");
    expect(await rl.canConsume("x")).toBe(false);
  });

  it("RateLimitError expõe retryAfterMs razoável", async () => {
    const { rl } = build();
    await rl.consume("u");
    await rl.consume("u");
    await rl.consume("u");
    try {
      await rl.consume("u");
      throw new Error("deveria ter jogado");
    } catch (e) {
      expect(e).toBeInstanceOf(RateLimitError);
      const err = e as RateLimitError;
      expect(err.retryAfterMs).toBeGreaterThan(0);
      expect(err.retryAfterMs).toBeLessThanOrEqual(1000);
      expect(err.limit).toBe(3);
    }
  });

  it("reset limpa buckets", async () => {
    const { rl } = build();
    await rl.consume("u");
    await rl.consume("u");
    await rl.consume("u");
    await rl.reset("u");
    await rl.consume("u");
  });
});
