/**
 * Circuit breaker simples baseado em tempo.
 * Abre após `threshold` falhas consecutivas em `windowMs`; fica aberto por `openMs`.
 * Escopo por instância (uma por cliente HTTP externo).
 */

export interface CircuitBreakerOptions {
  threshold: number;
  windowMs: number;
  openMs: number;
  now?: () => number;
}

export class CircuitOpenError extends Error {
  constructor(public readonly openUntil: number) {
    super("Circuit breaker aberto — tente novamente em instantes");
    this.name = "CircuitOpenError";
  }
}

export class CircuitBreaker {
  private failures: number[] = [];
  private openUntil = 0;
  private readonly now: () => number;

  constructor(private readonly opts: CircuitBreakerOptions) {
    this.now = opts.now ?? (() => Date.now());
  }

  assertClosed(): void {
    const t = this.now();
    if (t < this.openUntil) {
      throw new CircuitOpenError(this.openUntil);
    }
  }

  recordSuccess(): void {
    this.failures = [];
  }

  recordFailure(): void {
    const t = this.now();
    this.failures.push(t);
    this.failures = this.failures.filter((ts) => t - ts < this.opts.windowMs);
    if (this.failures.length >= this.opts.threshold) {
      this.openUntil = t + this.opts.openMs;
      this.failures = [];
    }
  }

  get isOpen(): boolean {
    return this.now() < this.openUntil;
  }
}
