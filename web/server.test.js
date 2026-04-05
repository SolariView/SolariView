/**
 * web/server.test.js — integration tests for web/server.js
 *
 * Spins up the HTTP server as a child process on dedicated test ports so that
 * no live RPC calls are made: all tested routes either reject before reaching
 * the reader layer (missing params, bad method, long URL) or serve static HTML.
 *
 * A second isolated server process is used for rate-limiter tests so its
 * in-memory bucket starts empty and counts are deterministic.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SERVER_ENTRY = path.join(ROOT, "web", "server.js");

// ─── helpers ──────────────────────────────────────────────────────────────────

function startServer(port, extraEnv = {}) {
  return spawn(process.execPath, [SERVER_ENTRY], {
    env: { ...process.env, PORT: String(port), ...extraEnv },
    cwd: ROOT,
    stdio: "pipe",
  });
}

function httpRequest(method, urlPath, port) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, method, path: urlPath },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * TCP-level port probe — does not consume any rate-limit budget on the server.
 */
async function waitForPort(port, retries = 40, delayMs = 100) {
  for (let i = 0; i < retries; i++) {
    await new Promise((r) => setTimeout(r, delayMs));
    const open = await new Promise((r) => {
      const socket = net.createConnection(port, "127.0.0.1");
      socket.once("connect", () => { socket.destroy(); r(true); });
      socket.once("error", () => r(false));
    });
    if (open) return;
  }
  throw new Error(`Server on port ${port} did not start within ${retries * delayMs}ms`);
}

// ─── main server (port 13131) ─────────────────────────────────────────────────

describe("web server — protocol guards and route validation", () => {
  const PORT = 13131;
  let server;

  before(async () => {
    // Raise the rate limit so normal test traffic never triggers 429.
    server = startServer(PORT, { SOLARIVIEW_RATE_LIMIT: "1000" });
    server.stderr.on("data", () => {}); // suppress stderr
    await waitForPort(PORT);
  });

  after(() => {
    server.kill();
  });

  // ── HTTP method guard ───────────────────────────────────────────────────────

  it("returns 405 for POST requests", async () => {
    const { status, body } = await httpRequest("POST", "/api/balance", PORT);
    assert.equal(status, 405);
    assert.equal(JSON.parse(body).error, "Method not allowed");
  });

  it("returns 405 for PUT requests", async () => {
    const { status } = await httpRequest("PUT", "/", PORT);
    assert.equal(status, 405);
  });

  // ── URL length guard ────────────────────────────────────────────────────────

  it("returns 414 for a URL longer than 512 characters", async () => {
    const { status } = await httpRequest(
      "GET",
      "/api/balance?" + "x".repeat(505),
      PORT
    );
    assert.equal(status, 414);
  });

  // ── 404 ─────────────────────────────────────────────────────────────────────

  it("returns 404 for unknown routes", async () => {
    const { status } = await httpRequest("GET", "/api/unknown", PORT);
    assert.equal(status, 404);
  });

  it("returns 404 for deep unknown paths", async () => {
    const { status } = await httpRequest("GET", "/api/balance/extra", PORT);
    assert.equal(status, 404);
  });

  // ── /api/balance parameter validation ───────────────────────────────────────

  it("returns 400 when address is missing from /api/balance", async () => {
    const { status, body } = await httpRequest("GET", "/api/balance", PORT);
    assert.equal(status, 400);
    assert.ok(JSON.parse(body).error.includes("address"));
  });

  // ── /api/token parameter validation ─────────────────────────────────────────

  it("returns 400 when address is missing from /api/token", async () => {
    const { status, body } = await httpRequest(
      "GET",
      "/api/token?token=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      PORT
    );
    assert.equal(status, 400);
    assert.ok(JSON.parse(body).error.includes("address"));
  });

  it("returns 400 when token is missing from /api/token", async () => {
    const { status, body } = await httpRequest(
      "GET",
      "/api/token?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      PORT
    );
    assert.equal(status, 400);
    assert.ok(JSON.parse(body).error.includes("token"));
  });

  // ── /api/nft parameter validation ───────────────────────────────────────────

  it("returns 400 when address is missing from /api/nft", async () => {
    const { status, body } = await httpRequest(
      "GET",
      "/api/nft?contract=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      PORT
    );
    assert.equal(status, 400);
    assert.ok(JSON.parse(body).error.includes("address"));
  });

  it("returns 400 when contract is missing from /api/nft", async () => {
    const { status, body } = await httpRequest(
      "GET",
      "/api/nft?address=0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      PORT
    );
    assert.equal(status, 400);
    assert.ok(JSON.parse(body).error.includes("contract"));
  });

  // ── /api/activity parameter validation ──────────────────────────────────────

  it("returns 400 when address is missing from /api/activity", async () => {
    const { status, body } = await httpRequest("GET", "/api/activity", PORT);
    assert.equal(status, 400);
    assert.ok(JSON.parse(body).error.includes("address"));
  });

  // ── UI routes ────────────────────────────────────────────────────────────────

  it("serves HTML at GET /", async () => {
    const { status } = await httpRequest("GET", "/", PORT);
    assert.equal(status, 200);
  });

  it("serves HTML at GET /index.html", async () => {
    const { status } = await httpRequest("GET", "/index.html", PORT);
    assert.equal(status, 200);
  });
});

// ─── rate limiter — isolated server (port 13132) ─────────────────────────────
//
// A separate server process is used so the in-memory rate bucket starts
// completely empty. waitForPort uses TCP probing (no HTTP request) so the
// bucket remains at zero when the first test fires.

describe("web server — rate limiter", () => {
  const RL_PORT = 13132;
  let rlServer;

  before(async () => {
    rlServer = startServer(RL_PORT);
    rlServer.stderr.on("data", () => {}); // suppress stderr
    await waitForPort(RL_PORT);
  });

  after(() => {
    rlServer.kill();
  });

  it("allows the first 10 requests within one second window", async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        httpRequest("GET", "/api/balance", RL_PORT)
      )
    );
    assert.ok(
      responses.every((r) => r.status !== 429),
      `Expected no 429s among: ${responses.map((r) => r.status).join(", ")}`
    );
  });

  it("returns 429 on the 11th request within the same window", async () => {
    // The previous test filled the rate bucket to exactly 10.
    // One more request (still within the 1 s window) must be rejected.
    const { status } = await httpRequest("GET", "/api/balance", RL_PORT);
    assert.equal(status, 429);
  });
});
