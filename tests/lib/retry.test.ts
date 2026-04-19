import { describe, it, expect, vi } from "vitest";
import { withRetry } from "@/lib/retry";

const noSleep = () => Promise.resolve();

describe("withRetry", () => {
  it("retorna sucesso na primeira tentativa", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { sleep: noSleep });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retria em erro 5xx e sucede na segunda", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503, message: "Service Unavailable" })
      .mockResolvedValue("ok");
    const result = await withRetry(fn, { sleep: noSleep });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("não retria em erro 4xx", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 400, message: "Bad Request" });
    await expect(withRetry(fn, { sleep: noSleep })).rejects.toMatchObject({
      status: 400,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("desiste após maxAttempts", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 500 });
    await expect(withRetry(fn, { sleep: noSleep, maxAttempts: 3 })).rejects.toMatchObject({
      status: 500,
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retria em erro sem status (ex: network/abort)", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("abort")).mockResolvedValue("ok");
    const result = await withRetry(fn, { sleep: noSleep });
    expect(result).toBe("ok");
  });

  it("respeita shouldRetry customizado", async () => {
    const fn = vi.fn().mockRejectedValue({ status: 500 });
    await expect(withRetry(fn, { sleep: noSleep, shouldRetry: () => false })).rejects.toMatchObject(
      { status: 500 },
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("backoff é exponencial (tempos corretos)", async () => {
    const sleepSpy = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue({ status: 503 });
    await expect(
      withRetry(fn, {
        sleep: sleepSpy,
        maxAttempts: 4,
        baseDelayMs: 100,
      }),
    ).rejects.toBeTruthy();
    // Espera 3 sleeps entre 4 tentativas
    expect(sleepSpy).toHaveBeenCalledTimes(3);
    const delays = sleepSpy.mock.calls.map((c) => c[0] as number);
    // Aproximadamente 100, 200, 400 (com jitter de ±20%)
    expect(delays[0]).toBeGreaterThan(70);
    expect(delays[0]).toBeLessThan(130);
    expect(delays[1]).toBeGreaterThan(140);
    expect(delays[1]).toBeLessThan(260);
    expect(delays[2]).toBeGreaterThan(280);
    expect(delays[2]).toBeLessThan(520);
  });
});
