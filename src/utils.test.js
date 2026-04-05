import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withRetry, RETRYABLE } from "./utils.js";

describe("RETRYABLE regex", () => {
  const transient = [
    "fetch failed",
    "connect ETIMEDOUT",
    "ECONNRESET",
    "timeout after 12000ms",
    "HTTP 429 Too Many Requests",
    "HTTP 503 Service Unavailable",
    "rate limit exceeded",
    "rate-limit hit",
  ];

  const deterministic = [
    "revert: execution reverted",
    "invalid address",
    "contract not deployed",
    "missing revert data",
    "insufficient funds",
  ];

  for (const msg of transient) {
    it(`matches transient: "${msg}"`, () => {
      assert.ok(RETRYABLE.test(msg));
    });
  }

  for (const msg of deterministic) {
    it(`does not match deterministic: "${msg}"`, () => {
      assert.ok(!RETRYABLE.test(msg));
    });
  }
});

describe("withRetry", () => {
  it("returns the result on first success", async () => {
    const result = await withRetry(async () => 42);
    assert.equal(result, 42);
  });

  it("retries on a transient error and succeeds", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error("fetch failed");
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 1 });

    assert.equal(result, "ok");
    assert.equal(calls, 3);
  });

  it("does not retry on a deterministic error", async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(async () => { calls++; throw new Error("execution reverted"); },
        { maxAttempts: 3, baseDelayMs: 1 }),
      /execution reverted/
    );
    assert.equal(calls, 1);
  });

  it("throws after exhausting all retry attempts", async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(async () => { calls++; throw new Error("timeout"); },
        { maxAttempts: 3, baseDelayMs: 1 }),
      /timeout/
    );
    assert.equal(calls, 3);
  });

  it("retries on HTTP 429", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 2) throw new Error("HTTP 429 Too Many Requests");
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 1 });

    assert.equal(result, "ok");
    assert.equal(calls, 2);
  });

  it("retries on HTTP 503", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 2) throw new Error("HTTP 503 Service Unavailable");
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 1 });

    assert.equal(result, "ok");
    assert.equal(calls, 2);
  });

  it("respects maxAttempts = 1 (no retries)", async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(async () => { calls++; throw new Error("fetch failed"); },
        { maxAttempts: 1, baseDelayMs: 1 }),
      /fetch failed/
    );
    assert.equal(calls, 1);
  });
});
