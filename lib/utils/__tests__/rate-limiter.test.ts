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
    limiter.release();
    await limiter.acquire(); // remaining = 1
    limiter.release();
    await limiter.acquire(); // remaining = 0
    limiter.release();

    // Fourth acquire should queue since remaining < 1
    let resolved = false;
    limiter.acquire().then(() => {
      resolved = true;
    });

    await flushMicrotasks();
    expect(resolved).toBe(false);

    // inFlight=0, remaining=0 → probe releases 1
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
    limiter.acquire().then(() => { results.push(1); limiter.release(); }); // remaining = 0, resolves immediately
    limiter.acquire().then(() => results.push(2)); // queued

    await flushMicrotasks();
    expect(results).toContain(1);

    // inFlight=0 after release, remaining=0 → probe releases 1
    jest.advanceTimersByTime(1100);
    await flushMicrotasks();
    expect(results).toContain(2);
  });

  it("allows immediate acquire after queue drains when tokens are restored", async () => {
    const limiter = new RateLimiter(2);
    await limiter.acquire(); // remaining = 1
    await limiter.acquire(); // remaining = 0

    // This queues because remaining < 1
    let queued = false;
    const queuedPromise = limiter.acquire().then(() => { queued = true; });

    await flushMicrotasks();
    expect(queued).toBe(false);

    // Simulate a header update restoring tokens before drain
    limiter.updateFromHeader(5);

    // Drain the queue
    jest.advanceTimersByTime(1100);
    await flushMicrotasks();
    await queuedPromise;
    expect(queued).toBe(true);

    // After drain, next acquire should resolve immediately (header restored tokens)
    await expect(limiter.acquire()).resolves.toBeUndefined();
  });

  it("releases multiple queued items when updateFromHeader sets higher count", async () => {
    const limiter = new RateLimiter(1);
    await limiter.acquire(); // remaining = 0

    const results: number[] = [];
    limiter.acquire().then(() => results.push(1)); // queued
    limiter.acquire().then(() => results.push(2)); // queued
    limiter.acquire().then(() => results.push(3)); // queued

    await flushMicrotasks();
    expect(results).toEqual([]);

    // Header says 10 remaining — all 3 queued should release in one tick
    limiter.updateFromHeader(10);

    jest.advanceTimersByTime(1100);
    await flushMicrotasks();

    expect(results).toEqual([1, 2, 3]);
  });

  it("cancels pending requests on destroy", async () => {
    const limiter = new RateLimiter(1);
    await limiter.acquire(); // remaining = 0

    let resolved = false;
    limiter.acquire().then(() => {
      resolved = true;
    });

    await flushMicrotasks();
    expect(resolved).toBe(false);

    limiter.destroy();

    // Advance past drain interval — should not resolve
    jest.advanceTimersByTime(5000);
    await flushMicrotasks();
    expect(resolved).toBe(false);
  });
});
