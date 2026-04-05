import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveChains, CHAINS } from "../src/chains.js";

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
