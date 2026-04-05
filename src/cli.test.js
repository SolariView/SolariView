/**
 * cli.test.js — tests for src/cli.js
 *
 * Uses spawnSync to invoke the CLI as a subprocess. Tests focus on argument
 * parsing and exit-code behaviour that can be verified without live RPC calls:
 * invalid --timeout values and missing required options.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, "cli.js");
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

function cli(...args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: path.resolve(__dirname, ".."),
    encoding: "utf8",
    timeout: 10_000,
  });
}

// ─── --version / --help ───────────────────────────────────────────────────────

describe("CLI global flags", () => {
  it("--version prints the package version and exits 0", () => {
    const { status, stdout } = cli("--version");
    assert.equal(status, 0);
    assert.ok(stdout.includes(version));
  });

  it("--help prints usage and exits 0", () => {
    const { status, stdout } = cli("--help");
    assert.equal(status, 0);
    assert.ok(stdout.toLowerCase().includes("solariview"));
  });
});

// ─── --timeout validation ─────────────────────────────────────────────────────

const ADDR = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

describe("--timeout validation — balance command", () => {
  it("exits 1 when --timeout is non-numeric", () => {
    const { status, stderr } = cli("balance", "--address", ADDR, "--timeout", "abc");
    assert.equal(status, 1);
    assert.ok(stderr.includes("positive integer"));
  });

  it("exits 1 when --timeout is zero", () => {
    const { status, stderr } = cli("balance", "--address", ADDR, "--timeout", "0");
    assert.equal(status, 1);
    assert.ok(stderr.includes("positive integer"));
  });

  it("exits 1 when --timeout is negative", () => {
    const { status, stderr } = cli("balance", "--address", ADDR, "--timeout", "-500");
    assert.equal(status, 1);
    assert.ok(stderr.includes("positive integer"));
  });
});

describe("--timeout validation — token command", () => {
  it("exits 1 when --timeout is non-numeric", () => {
    const { status, stderr } = cli("token", "--address", ADDR, "--token", TOKEN, "--timeout", "xyz");
    assert.equal(status, 1);
    assert.ok(stderr.includes("positive integer"));
  });
});

describe("--timeout validation — nft command", () => {
  it("exits 1 when --timeout is non-numeric", () => {
    const { status, stderr } = cli("nft", "--address", ADDR, "--contract", TOKEN, "--timeout", "bad");
    assert.equal(status, 1);
    assert.ok(stderr.includes("positive integer"));
  });
});

describe("--timeout validation — activity command", () => {
  it("exits 1 when --timeout is non-numeric", () => {
    const { status, stderr } = cli("activity", "--address", ADDR, "--timeout", "nope");
    assert.equal(status, 1);
    assert.ok(stderr.includes("positive integer"));
  });
});

describe("--timeout validation — status command", () => {
  it("exits 1 when --timeout is non-numeric", () => {
    const { status, stderr } = cli("status", "--timeout", "???");
    assert.equal(status, 1);
    assert.ok(stderr.includes("positive integer"));
  });
});

// ─── missing required options ─────────────────────────────────────────────────

describe("missing required options", () => {
  it("balance exits non-zero when --address is omitted", () => {
    const { status } = cli("balance");
    assert.notEqual(status, 0);
  });

  it("token exits non-zero when --address is omitted", () => {
    const { status } = cli("token", "--token", TOKEN);
    assert.notEqual(status, 0);
  });

  it("token exits non-zero when --token is omitted", () => {
    const { status } = cli("token", "--address", ADDR);
    assert.notEqual(status, 0);
  });

  it("nft exits non-zero when --address is omitted", () => {
    const { status } = cli("nft", "--contract", TOKEN);
    assert.notEqual(status, 0);
  });

  it("nft exits non-zero when --contract is omitted", () => {
    const { status } = cli("nft", "--address", ADDR);
    assert.notEqual(status, 0);
  });

  it("activity exits non-zero when --address is omitted", () => {
    const { status } = cli("activity");
    assert.notEqual(status, 0);
  });
});
