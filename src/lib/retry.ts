/**
 * Retry com backoff exponencial.
 *
 * Usado nas chamadas externas (PNCP, compras.gov.br, Maritaca) para tolerar
 * falhas transitórias (503, 504, timeouts). NÃO retria erros do cliente
 * (4xx) — aquelas falhas indicam uso incorreto.
 */

export interface RetryOptions {
  maxAttempts?: number; // default 3
  baseDelayMs?: number; // default 500 — dobra a cada tentativa
  maxDelayMs?: number; // default 8000 — teto do backoff
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_SLEEP = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Por default, retria erros cujo `.status` é 0 (sem resposta / abort) ou >= 500,
 * e erros sem status (ex: AbortError/NetworkError). Não retria 4xx.
 */
function defaultShouldRetry(error: unknown): boolean {
  if (error === null || error === undefined) return false;
  if (typeof error !== "object") return true;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    return status === 0 || status >= 500;
  }
  return true;
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelay = opts.baseDelayMs ?? 500;
  const maxDelay = opts.maxDelayMs ?? 8000;
  const shouldRetry = opts.shouldRetry ?? defaultShouldRetry;
  const sleep = opts.sleep ?? DEFAULT_SLEEP;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !shouldRetry(err, attempt)) {
        throw err;
      }
      // Backoff exponencial com jitter (~±20%)
      const base = Math.min(maxDelay, baseDelay * 2 ** (attempt - 1));
      const jitter = base * 0.2 * (Math.random() - 0.5);
      await sleep(Math.max(0, Math.round(base + jitter)));
    }
  }
  throw lastError;
}
