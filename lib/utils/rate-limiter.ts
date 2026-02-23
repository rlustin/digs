/**
 * Simple token-bucket rate limiter for the Discogs API.
 * Discogs allows 60 requests/minute for authenticated users.
 */
export class RateLimiter {
  private remaining: number;
  private queue: (() => void)[] = [];
  private draining = false;
  private drainTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(initialTokens: number = 60) {
    this.remaining = initialTokens;
  }

  /** Update remaining count from response header. */
  updateFromHeader(remaining: number) {
    this.remaining = remaining;
  }

  /** Wait until a request slot is available. */
  async acquire(): Promise<void> {
    if (this.remaining >= 1) {
      this.remaining--;
      return;
    }

    // Queue the request and wait
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.startDraining();
    });
  }

  /** Cancel all pending requests and stop the drain timer. */
  destroy() {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    this.queue = [];
    this.draining = false;
  }

  private startDraining() {
    if (this.draining) return;
    this.draining = true;
    this.drainNext();
  }

  private drainNext() {
    this.drainTimer = setTimeout(() => {
      if (this.queue.length === 0) {
        this.draining = false;
        return;
      }

      // Release up to `remaining` queued requests (at least 1 for forward progress)
      const count = Math.min(Math.max(this.remaining, 1), this.queue.length);
      for (let i = 0; i < count; i++) {
        const next = this.queue.shift();
        if (next) next();
      }
      this.remaining = Math.max(this.remaining - count, 0);
      this.drainNext();
    }, 1000);
  }
}
