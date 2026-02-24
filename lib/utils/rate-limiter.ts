/**
 * Simple token-bucket rate limiter for the Discogs API.
 * Discogs allows 60 requests/minute for authenticated users.
 */
export class RateLimiter {
  private remaining: number;
  private inFlight = 0;
  private queue: (() => void)[] = [];
  private draining = false;
  private drainTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(initialTokens: number = 60) {
    this.remaining = initialTokens;
  }

  /**
   * Update remaining count from response header.
   * Accounts for other in-flight requests the server hasn't processed yet.
   */
  updateFromHeader(remaining: number) {
    const otherInFlight = Math.max(0, this.inFlight - 1);
    this.remaining = Math.max(0, remaining - otherInFlight);
  }

  /** Wait until a request slot is available. */
  async acquire(): Promise<void> {
    if (this.remaining >= 1) {
      this.remaining--;
      this.inFlight++;
      return;
    }

    // Queue the request and wait
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.inFlight++;
        resolve();
      });
      this.startDraining();
    });
  }

  /** Mark a request as completed (no longer in-flight). */
  release() {
    this.inFlight = Math.max(0, this.inFlight - 1);
  }

  /** Cancel all pending requests and stop the drain timer. */
  destroy() {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    this.queue = [];
    this.draining = false;
    this.inFlight = 0;
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

      let count: number;
      if (this.remaining > 0) {
        // We have tokens: release up to remaining
        count = Math.min(this.remaining, this.queue.length);
      } else if (this.inFlight === 0) {
        // No tokens and nothing in flight: probe with 1 request to get a fresh header
        count = 1;
      } else {
        // No tokens but requests in flight: wait for responses to update remaining
        count = 0;
      }

      for (let i = 0; i < count; i++) {
        const next = this.queue.shift();
        if (next) next();
      }
      this.remaining = Math.max(this.remaining - count, 0);
      this.drainNext();
    }, 1000);
  }
}
