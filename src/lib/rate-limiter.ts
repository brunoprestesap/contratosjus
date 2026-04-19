/**
 * Rate limiter com backend pluggable (in-memory default, Redis opcional).
 *
 * Em deployment single-instance o backend in-memory é suficiente.
 * Para escalar horizontalmente, definir `REDIS_URL` e trocar o backend:
 * ver `RedisRateLimiterBackend` no final deste arquivo.
 */

export interface RateLimiterOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

export class RateLimitError extends Error {
  constructor(
    public readonly retryAfterMs: number,
    public readonly limit: number,
  ) {
    super(
      `Limite de ${limit} chamadas atingido. Tente novamente em ${Math.ceil(
        retryAfterMs / 1000,
      )}s.`,
    );
    this.name = "RateLimitError";
  }
}

export interface RateLimiterBackend {
  /** Registra uma chamada; joga `RateLimitError` se exceder. */
  consume(key: string, limit: number, windowMs: number): Promise<void>;
  /** Testa sem consumir. */
  canConsume(key: string, limit: number, windowMs: number): Promise<boolean>;
  reset(key?: string): Promise<void>;
}

/**
 * Backend in-memory com janela deslizante simples. Escopo = processo.
 */
export class InMemoryRateLimiterBackend implements RateLimiterBackend {
  private readonly buckets = new Map<string, number[]>();
  private readonly now: () => number;

  constructor(now?: () => number) {
    this.now = now ?? (() => Date.now());
  }

  async consume(key: string, limit: number, windowMs: number): Promise<void> {
    const t = this.now();
    const existing = this.buckets.get(key) ?? [];
    const alive = existing.filter((ts) => t - ts < windowMs);
    if (alive.length >= limit) {
      const oldest = alive[0];
      const retryAfterMs = windowMs - (t - oldest);
      this.buckets.set(key, alive);
      throw new RateLimitError(retryAfterMs, limit);
    }
    alive.push(t);
    this.buckets.set(key, alive);
  }

  async canConsume(key: string, limit: number, windowMs: number): Promise<boolean> {
    const t = this.now();
    const alive = (this.buckets.get(key) ?? []).filter((ts) => t - ts < windowMs);
    return alive.length < limit;
  }

  async reset(key?: string): Promise<void> {
    if (key === undefined) this.buckets.clear();
    else this.buckets.delete(key);
  }
}

/**
 * Rate limiter público. Sempre assíncrono — garante comportamento idêntico
 * entre backend in-memory (default) e Redis (documentado como stub).
 * Call sites devem usar `await`.
 */
export class RateLimiter {
  constructor(
    private readonly opts: RateLimiterOptions,
    private readonly backend: RateLimiterBackend = new InMemoryRateLimiterBackend(opts.now),
  ) {}

  consume(key: string): Promise<void> {
    return this.backend.consume(key, this.opts.limit, this.opts.windowMs);
  }
  canConsume(key: string): Promise<boolean> {
    return this.backend.canConsume(key, this.opts.limit, this.opts.windowMs);
  }
  reset(key?: string): Promise<void> {
    return this.backend.reset(key);
  }
}

/**
 * ⚙️ Redis backend — stub documentado.
 *
 * Para ativar em produção multi-instância:
 *
 *   npm i ioredis
 *
 * Implementação de referência (sliding window via sorted set):
 *
 *   import Redis from "ioredis";
 *   export class RedisRateLimiterBackend implements RateLimiterBackend {
 *     constructor(private readonly client: Redis) {}
 *     async consume(key: string, limit: number, windowMs: number) {
 *       const now = Date.now();
 *       const cutoff = now - windowMs;
 *       const k = `rl:${key}`;
 *       const pipeline = this.client.multi();
 *       pipeline.zremrangebyscore(k, "-inf", cutoff);
 *       pipeline.zcard(k);
 *       pipeline.zadd(k, now, `${now}:${Math.random()}`);
 *       pipeline.pexpire(k, windowMs);
 *       const [, count] = (await pipeline.exec()) as Array<[unknown, number]>;
 *       if (count[1] >= limit) {
 *         await this.client.zrem(k, `${now}:...`); // rollback
 *         throw new RateLimitError(windowMs, limit);
 *       }
 *     }
 *     // canConsume / reset análogos
 *   }
 *
 * Depois, instanciar o singleton `aiRateLimiter` passando esse backend:
 *
 *   const redis = new Redis(process.env.REDIS_URL);
 *   export const aiRateLimiter = new RateLimiter(
 *     { limit: 30, windowMs: 5 * 60_000 },
 *     new RedisRateLimiterBackend(redis),
 *   );
 */

// Singleton global para IA — 30 chamadas por usuário em janela de 5 minutos.
// Cobre wizards multi-passo (CATMAT hierárquico = 3-4 chamadas; filter + stats +
// justificativa = +3) sem estorvar o uso legítimo.
export const aiRateLimiter = new RateLimiter({
  limit: 30,
  windowMs: 5 * 60_000,
});
