export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillIntervalMs: number;
  private lastRefill: number;

  constructor(maxTokens: number, refillIntervalMs: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillIntervalMs = refillIntervalMs;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillIntervalMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }

  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return;
    }
    // Wait until next token is available
    const waitMs = this.refillIntervalMs - (Date.now() - this.lastRefill);
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, waitMs)));
    this.refill();
    this.tokens--;
  }
}
