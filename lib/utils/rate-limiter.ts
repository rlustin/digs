/**
 * Simple token-bucket rate limiter for the Discogs API.
 * Discogs allows 60 requests/minute for authenticated users.
 */
export class RateLimiter {
  private remaining: number;
  private queue: (() => void)[] = [];
  private draining = false;

  constructor(initialTokens: number = 60) {
    this.remaining = initialTokens;
  }

  /** Update remaining count from response header. */
  updateFromHeader(remaining: number) {
    this.remaining = remaining;
  }

  /** Wait until a request slot is available. */
  async acquire(): Promise<void> {
    if (this.remaining > 1) {
      this.remaining--;
      return;
    }

    // Queue the request and wait
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
      this.startDraining();
    });
  }

  private startDraining() {
    if (this.draining) return;
    this.draining = true;
    this.drainNext();
  }

  private drainNext() {
    setTimeout(() => {
      if (this.queue.length === 0) {
        this.draining = false;
        return;
      }

      // Release one request per second when rate limited
      const next = this.queue.shift();
      if (next) {
        this.remaining = 2;
        next();
      }
      this.drainNext();
    }, 1000);
  }
}
