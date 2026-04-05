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

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
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

// ─── mock RPC helpers ─────────────────────────────────────────────────────────
//
// A minimal JSON-RPC server is started on a random OS-assigned port for each
// describe block. This approach requires no module mocking and works on every
// supported Node.js version (18+).

/** Encode a BigInt/number as a 32-byte ABI uint256 hex string. */
function encodeUint256(n) {
  return "0x" + BigInt(n).toString(16).padStart(64, "0");
}

/** Encode a UTF-8 string as ABI bytes (offset + length + padded data). */
function encodeString(str) {
  const bytes = Buffer.from(str, "utf8");
  const byteLen = bytes.length;
  const paddedBytes = Math.ceil(byteLen / 32) * 32;
  const offset = "0000000000000000000000000000000000000000000000000000000000000020";
  const length = byteLen.toString(16).padStart(64, "0");
  const data = bytes.toString("hex").padEnd(paddedBytes * 2, "0");
  return "0x" + offset + length + data;
}

// Well-known 4-byte selectors for ERC-20 / ERC-721 read functions.
const SELECTOR_handlers = {
  "0x70a08231": () => encodeUint256(500000),       // balanceOf(address) → 500000
  "0x313ce567": () => encodeUint256(6),            // decimals() → 6
  "0x95d89b41": () => encodeString("USDC"),        // symbol() → "USDC"
  "0x06fdde03": () => encodeString("USD Coin"),    // name() → "USD Coin"
};

/**
 * Start a minimal JSON-RPC HTTP mock server on a random port.
 * Returns { url, close }.
 *
 * @param {object} overrides  - map from eth_ method name to result factory
 */
function startMockRpc(overrides = {}) {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        let parsed;
        try { parsed = JSON.parse(body); } catch { parsed = {}; }
        const { id = 1, method = "", params = [] } = parsed;

        let result = null;
        try {
          if (overrides[method]) {
            result = overrides[method](params);
          } else {
            switch (method) {
              case "eth_getBalance":          result = "0xde0b6b3a7640000"; break; // 1 ETH
              case "eth_getTransactionCount": result = "0x2a"; break;               // 42
              case "eth_blockNumber":         result = "0x131eb00"; break;          // ~20 M
              case "eth_chainId":             result = "0x1"; break;
              case "eth_call": {
                const selector = (params[0]?.data ?? "").slice(0, 10);
                const handler = SELECTOR_handlers[selector];
                if (handler) result = handler(params);
                break;
              }
            }
          }
        } catch {
          // Send a JSON-RPC error so the client doesn't hang on timeout.
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ jsonrpc: "2.0", id, error: { code: -32000, message: "mock handler error" } }));
          return;
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
      });
    });

    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () => srv.close(),
      });
    });
  });
}

const VALID_ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // vitalik.eth

// ─── getNativeBalance — happy path ────────────────────────────────────────────

describe("getNativeBalance — happy path", () => {
  let rpc;

  before(async () => { rpc = await startMockRpc(); });
  after(() => rpc.close());

  it("returns the correct shape and values", async () => {
    const { getNativeBalance } = await import("./reader.js");
    const chain = { id: 1, name: "Ethereum", symbol: "ETH", rpc: rpc.url, nativeDecimals: 18, explorer: "https://etherscan.io" };

    const result = await getNativeBalance(VALID_ADDRESS, chain, { timeoutMs: 5000 });

    assert.equal(result.chain, "Ethereum");
    assert.equal(result.chainId, 1);
    assert.equal(result.symbol, "ETH");
    assert.equal(result.raw, "1000000000000000000");  // 1 ETH in wei
    assert.equal(typeof result.formatted, "string");
    assert.ok(result.explorer.includes(VALID_ADDRESS));
  });
});

// ─── getTokenBalance — happy path ─────────────────────────────────────────────

describe("getTokenBalance — happy path", () => {
  let rpc;

  before(async () => { rpc = await startMockRpc(); });
  after(() => rpc.close());

  it("returns the correct shape and values", async () => {
    const { getTokenBalance } = await import("./reader.js");
    const chain = { id: 1, name: "Ethereum", symbol: "ETH", rpc: rpc.url, nativeDecimals: 18, explorer: "https://etherscan.io" };
    const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC

    const result = await getTokenBalance(VALID_ADDRESS, TOKEN, chain, { timeoutMs: 5000 });

    assert.equal(result.chain, "Ethereum");
    assert.equal(result.chainId, 1);
    assert.equal(result.symbol, "USDC");
    assert.equal(result.token, "USD Coin");
    assert.equal(result.tokenAddress, TOKEN);
    assert.equal(typeof result.raw, "string");
    assert.equal(typeof result.formatted, "string");
    assert.equal(typeof result.decimals, "number");
  });
});

// ─── getNFTBalance — happy path ───────────────────────────────────────────────

describe("getNFTBalance — happy path", () => {
  let rpc;

  before(async () => {
    // Override name/symbol to return NFT-specific values.
    rpc = await startMockRpc({
      eth_call: (params) => {
        const selector = (params[0]?.data ?? "").slice(0, 10);
        const handlers = {
          "0x70a08231": () => encodeUint256(3),              // balanceOf → 3
          "0x06fdde03": () => encodeString("CryptoPunks"),  // name
          "0x95d89b41": () => encodeString("PUNK"),         // symbol
        };
        return handlers[selector]?.() ?? null;
      },
    });
  });
  after(() => rpc.close());

  it("returns the correct shape and values", async () => {
    const { getNFTBalance } = await import("./reader.js");
    const chain = { id: 1, name: "Ethereum", symbol: "ETH", rpc: rpc.url, nativeDecimals: 18, explorer: "https://etherscan.io" };
    const CONTRACT = "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB"; // CryptoPunks

    const result = await getNFTBalance(VALID_ADDRESS, CONTRACT, chain, { timeoutMs: 5000 });

    assert.equal(result.chain, "Ethereum");
    assert.equal(result.chainId, 1);
    assert.equal(result.collection, "CryptoPunks");
    assert.equal(result.symbol, "PUNK");
    assert.equal(result.contractAddress, CONTRACT);
    assert.equal(result.count, "3");
  });
});

// ─── getTxCount — happy path ──────────────────────────────────────────────────

describe("getTxCount — happy path", () => {
  let rpc;

  before(async () => { rpc = await startMockRpc(); });
  after(() => rpc.close());

  it("returns the correct shape and values", async () => {
    const { getTxCount } = await import("./reader.js");
    const chain = { id: 1, name: "Ethereum", symbol: "ETH", rpc: rpc.url, nativeDecimals: 18, explorer: "https://etherscan.io" };

    const result = await getTxCount(VALID_ADDRESS, chain, { timeoutMs: 5000 });

    assert.equal(result.chain, "Ethereum");
    assert.equal(result.chainId, 1);
    assert.equal(typeof result.txCount, "number");
    assert.equal(result.txCount, 42); // 0x2a
  });
});

// ─── getMultiChainNativeBalances — happy path ─────────────────────────────────

describe("getMultiChainNativeBalances — happy path", () => {
  let rpc;

  before(async () => { rpc = await startMockRpc(); });
  after(() => rpc.close());

  it("collects results across multiple chains", async () => {
    const { getMultiChainNativeBalances } = await import("./reader.js");
    const chains = [
      { id: 1,    name: "Ethereum", symbol: "ETH",   rpc: rpc.url, nativeDecimals: 18, explorer: "https://etherscan.io" },
      { id: 8453, name: "Base",     symbol: "ETH",   rpc: rpc.url, nativeDecimals: 18, explorer: "https://basescan.org" },
    ];

    const { results, errors } = await getMultiChainNativeBalances(VALID_ADDRESS, chains, { timeoutMs: 5000 });

    assert.equal(errors.length, 0);
    assert.equal(results.length, 2);
    const names = results.map((r) => r.chain);
    assert.ok(names.includes("Ethereum"));
    assert.ok(names.includes("Base"));
  });
});

// ─── getBlockNumber — happy path ──────────────────────────────────────────────

describe("getBlockNumber — happy path", () => {
  let rpc;

  before(async () => { rpc = await startMockRpc(); });
  after(() => rpc.close());

  it("returns the correct shape and values", async () => {
    const { getBlockNumber } = await import("./reader.js");
    const chain = { id: 1, name: "Ethereum", symbol: "ETH", rpc: rpc.url, nativeDecimals: 18, explorer: "https://etherscan.io" };

    const result = await getBlockNumber(chain, { timeoutMs: 5000 });

    assert.equal(result.chain, "Ethereum");
    assert.equal(result.chainId, 1);
    assert.equal(typeof result.block, "string");
    assert.ok(BigInt(result.block) > 0n);
  });
});
