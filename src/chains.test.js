import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveChains, CHAINS } from "../src/chains.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

describe("resolveChains()", () => {
  it('returns all chains when input is "all"', () => {
    const result = resolveChains("all");
    assert.equal(result.length, Object.keys(CHAINS).length);
  });

  it("returns all chains when input is undefined", () => {
    const result = resolveChains(undefined);
    assert.equal(result.length, Object.keys(CHAINS).length);
  });

  it("resolves a single chain by full name", () => {
    const result = resolveChains("ethereum");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 1);
    assert.equal(result[0].name, "Ethereum");
  });

  it("resolves a chain alias", () => {
    const result = resolveChains("arb");
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 42161);
  });

  it("resolves multiple comma-separated chains", () => {
    const result = resolveChains("ethereum,base,optimism");
    assert.equal(result.length, 3);
    const names = result.map((c) => c.name);
    assert.ok(names.includes("Ethereum"));
    assert.ok(names.includes("Base"));
    assert.ok(names.includes("Optimism"));
  });

  it("handles whitespace around chain names", () => {
    const result = resolveChains("ethereum , base");
    assert.equal(result.length, 2);
  });

  it("throws a descriptive error for an unknown chain name", () => {
    assert.throws(
      () => resolveChains("solana"),
      (err) => {
        assert.ok(err.message.includes("Unknown chain"));
        assert.ok(err.message.includes('"solana"'));
        return true;
      }
    );
  });

  it("each returned chain has the required fields", () => {
    const chains = resolveChains("all");
    for (const chain of chains) {
      assert.ok(typeof chain.id === "number", `${chain.name}: id must be number`);
      assert.ok(typeof chain.name === "string", `${chain.name}: name must be string`);
      assert.ok(typeof chain.symbol === "string", `${chain.name}: symbol must be string`);
      assert.ok(typeof chain.rpc === "string" && chain.rpc.startsWith("http"), `${chain.name}: rpc must be URL`);
      assert.ok(typeof chain.explorer === "string", `${chain.name}: explorer must be string`);
      assert.equal(chain.nativeDecimals, 18, `${chain.name}: nativeDecimals must be 18`);
    }
  });

  it("Polygon uses POL as symbol", () => {
    const [polygon] = resolveChains("polygon");
    assert.equal(polygon.symbol, "POL");
  });
});

// ─── SOLARIVIEW_RPC_<CHAIN_ID> env override ───────────────────────────────────
//
// CHAINS is evaluated at module load time, so the override must be in the
// environment before the module is imported. Each test spawns a fresh
// subprocess with a controlled env using --input-type=module stdin evaluation.

function runWithEnv(code, env) {
  return spawnSync(process.execPath, ["--input-type=module"], {
    input: code,
    env: { ...process.env, ...env },
    cwd: ROOT,
    encoding: "utf8",
    timeout: 10_000,
  });
}

describe("SOLARIVIEW_RPC_<CHAIN_ID> env override", () => {
  it("uses SOLARIVIEW_RPC_1 for the ethereum chain when set", () => {
    const { status, stdout, stderr } = runWithEnv(
      `import { CHAINS } from "./src/chains.js";
       process.stdout.write(CHAINS.ethereum.rpc);`,
      { SOLARIVIEW_RPC_1: "https://custom-eth.example.com" }
    );
    assert.equal(status, 0, stderr);
    assert.equal(stdout, "https://custom-eth.example.com");
  });

  it("falls back to the public default when SOLARIVIEW_RPC_1 is unset", () => {
    const env = { ...process.env };
    delete env.SOLARIVIEW_RPC_1;
    const { status, stdout, stderr } = spawnSync(
      process.execPath,
      ["--input-type=module"],
      {
        input: `import { CHAINS } from "./src/chains.js";
                process.stdout.write(CHAINS.ethereum.rpc);`,
        env,
        cwd: ROOT,
        encoding: "utf8",
        timeout: 10_000,
      }
    );
    assert.equal(status, 0, stderr);
    assert.equal(stdout, "https://eth.llamarpc.com");
  });

  it("uses SOLARIVIEW_RPC_137 for the polygon chain when set", () => {
    const { status, stdout, stderr } = runWithEnv(
      `import { CHAINS } from "./src/chains.js";
       process.stdout.write(CHAINS.polygon.rpc);`,
      { SOLARIVIEW_RPC_137: "https://custom-polygon.example.com" }
    );
    assert.equal(status, 0, stderr);
    assert.equal(stdout, "https://custom-polygon.example.com");
  });

  it("overrides are independent — setting one chain does not affect another", () => {
    const { status, stdout, stderr } = runWithEnv(
      `import { CHAINS } from "./src/chains.js";
       const eth = CHAINS.ethereum.rpc;
       const arb = CHAINS.arbitrum.rpc;
       process.stdout.write(JSON.stringify({ eth, arb }));`,
      { SOLARIVIEW_RPC_1: "https://custom-eth.example.com" }
    );
    assert.equal(status, 0, stderr);
    const { eth, arb } = JSON.parse(stdout);
    assert.equal(eth, "https://custom-eth.example.com");
    assert.equal(arb, "https://arb1.arbitrum.io/rpc"); // default unchanged
  });
});
