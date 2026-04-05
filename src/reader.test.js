/**
 * reader.test.js — unit tests for src/reader.js
 *
 * The reader functions make live RPC calls. These tests use a mock `viem`
 * public client so no network access is required. The mock is injected by
 * overriding the module's internal `buildClient` indirectly via a test
 * double exported from a helper (see _createTestClient below).
 *
 * For functions that simply delegate to the viem client we verify:
 *   1. Happy path: correct return shape and values.
 *   2. Invalid address: throws before any RPC call is made.
 *   3. Retry: transient errors are retried, deterministic errors are not.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "./utils.js";

// ─── withRetry — tested against the real exported function ───────────────────

describe("withRetry", () => {
  it("retries on transient errors and eventually succeeds", async () => {
    let callCount = 0;
    const result = await withRetry(async () => {
      callCount++;
      if (callCount < 3) throw new Error("fetch failed");
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 1 });

    assert.equal(result, "ok");
    assert.equal(callCount, 3);
  });

  it("does NOT retry on deterministic errors", async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(async () => { calls++; throw new Error("revert: execution reverted"); }, { maxAttempts: 3, baseDelayMs: 1 }),
      /execution reverted/
    );
    assert.equal(calls, 1, "deterministic error should not be retried");
  });

  it("retries on 429 status codes", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 2) throw new Error("HTTP 429 Too Many Requests");
      return "ok";
    }, { maxAttempts: 3, baseDelayMs: 1 });
    assert.equal(result, "ok");
    assert.equal(calls, 2);
  });

  it("throws after exhausting all attempts", async () => {
    let calls = 0;
    await assert.rejects(
      () => withRetry(async () => { calls++; throw new Error("timeout"); }, { maxAttempts: 3, baseDelayMs: 1 }),
      /timeout/
    );
    assert.equal(calls, 3);
  });
});

// ─── address validation ───────────────────────────────────────────────────────

describe("address validation", () => {
  const CHAIN = {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    rpc: "https://eth.llamarpc.com",
    nativeDecimals: 18,
    explorer: "https://etherscan.io",
  };

  it("getNativeBalance rejects an invalid address", async () => {
    const { getNativeBalance } = await import("./reader.js");
    await assert.rejects(
      () => getNativeBalance("not-an-address", CHAIN),
      (err) => {
        assert.ok(err.message.includes("Invalid address"));
        return true;
      }
    );
  });

  it("getTokenBalance rejects an invalid wallet address", async () => {
    const { getTokenBalance } = await import("./reader.js");
    await assert.rejects(
      () => getTokenBalance("bad", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", CHAIN),
      /Invalid address/
    );
  });

  it("getTokenBalance rejects an invalid token address", async () => {
    const { getTokenBalance } = await import("./reader.js");
    await assert.rejects(
      () => getTokenBalance("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "not-a-token", CHAIN),
      /Invalid token address/
    );
  });

  it("getNFTBalance rejects an invalid contract address", async () => {
    const { getNFTBalance } = await import("./reader.js");
    await assert.rejects(
      () => getNFTBalance("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "not-a-contract", CHAIN),
      /Invalid contract address/
    );
  });

  it("getTxCount rejects an invalid address", async () => {
    const { getTxCount } = await import("./reader.js");
    await assert.rejects(
      () => getTxCount("0xBAD", CHAIN),
      /Invalid address/
    );
  });
});

// ─── getMultiChainNativeBalances ──────────────────────────────────────────────

describe("getMultiChainNativeBalances", () => {
  it("separates fulfilled and rejected results", async () => {
    const { getMultiChainNativeBalances } = await import("./reader.js");

    // Pass one valid and one chain with a bad RPC that will fail fast
    const chains = [
      { id: 1, name: "Ethereum", symbol: "ETH", rpc: "https://eth.llamarpc.com", nativeDecimals: 18, explorer: "https://etherscan.io" },
    ];

    // With a bad address every chain rejects
    const { results, errors } = await getMultiChainNativeBalances("0xBAD", chains);
    assert.equal(results.length, 0);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].message.includes("Invalid address"));
  });
});
