import { RateLimiter } from "../rate-limiter";

/** Flush pending microtasks (promise callbacks). */
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe("RateLimiter", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("allows requests when tokens are available", async () => {
    const limiter = new RateLimiter(5);
    await expect(limiter.acquire()).resolves.toBeUndefined();
  });

  it("decrements remaining tokens on acquire", async () => {
    const limiter = new RateLimiter(3);
    await limiter.acquire(); // remaining = 2
    await limiter.acquire(); // remaining = 1

    // Third acquire should queue since remaining <= 1
    let resolved = false;
    limiter.acquire().then(() => {
      resolved = true;
    });

    await flushMicrotasks();
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(1100);
    await flushMicrotasks();

    expect(resolved).toBe(true);
  });

  it("updateFromHeader restores tokens", async () => {
    const limiter = new RateLimiter(2);
    await limiter.acquire(); // remaining = 1

    limiter.updateFromHeader(10);

    // Should resolve immediately now
    await expect(limiter.acquire()).resolves.toBeUndefined();
  });

  it("queues multiple requests and drains them sequentially", async () => {
    const limiter = new RateLimiter(1);

    const results: number[] = [];
    limiter.acquire().then(() => results.push(1));
    limiter.acquire().then(() => results.push(2));

    await flushMicrotasks();

    // First queued request resolves after 1s
    jest.advanceTimersByTime(1100);
    await flushMicrotasks();
    expect(results).toContain(1);

    // Second queued request resolves after another 1s
    jest.advanceTimersByTime(1100);
    await flushMicrotasks();
    expect(results).toContain(2);
  });

  it("allows immediate acquire after queue drains", async () => {
    const limiter = new RateLimiter(2);
    await limiter.acquire(); // remaining = 1

    // This queues because remaining <= 1
    let queued = false;
    const queuedPromise = limiter.acquire().then(() => { queued = true; });

    await flushMicrotasks();
    expect(queued).toBe(false);

    // Drain the queue
    jest.advanceTimersByTime(1100);
    await flushMicrotasks();
    await queuedPromise;
    expect(queued).toBe(true);

    // After drain, next acquire should resolve immediately (remaining was set to 1)
    await expect(limiter.acquire()).resolves.toBeUndefined();
  });
});
