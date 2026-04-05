#!/usr/bin/env node
/**
 * SolariView CLI
 * On-chain clarity, local-first security.
 */

import { createRequire } from "module";
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import Table from "cli-table3";
import { resolveChains } from "./chains.js";
import {
  getMultiChainNativeBalances,
  getTokenBalance,
  getNFTBalance,
  getBlockNumber,
  getTxCount,
} from "./reader.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json");

function validateRpcUrl(url) {
  try {
    const { protocol } = new URL(url);
    if (protocol !== "http:" && protocol !== "https:") throw new Error();
  } catch {
    console.error(chalk.red("--rpc must be an http:// or https:// URL"));
    process.exit(1);
  }
}

program
  .name("solariview")
  .description("On-chain clarity, local-first security.")
  .version(version);

// ─── balance ──────────────────────────────────────────────────────────────────
program
  .command("balance")
  .description("Fetch native token balances across chains")
  .requiredOption("-a, --address <address>", "Wallet address (0x...)")
  .option("-c, --chain <chains>", 'Chain(s) to query: "all", "ethereum", "base,arbitrum", etc.', "all")
  .option("--rpc <url>", "Override RPC URL for the queried chain(s)")
  .option("--timeout <ms>", "RPC request timeout in milliseconds", "12000")
  .option("-j, --json", "Output raw JSON")
  .action(async (opts) => {
    const spinner = opts.json ? null : ora(`Fetching balances…`).start();
    const timeoutMs = parseInt(opts.timeout, 10);
    if (isNaN(timeoutMs) || timeoutMs <= 0) {
      if (spinner) spinner.stop();
      console.error(chalk.red("--timeout must be a positive integer (milliseconds)"));
      process.exit(1);
    }
    const readerOpts = { timeoutMs };

    try {
      let chains = resolveChains(opts.chain);
      if (opts.rpc) { validateRpcUrl(opts.rpc); chains = chains.map((c) => ({ ...c, rpc: opts.rpc })); }
      const { results, errors } = await getMultiChainNativeBalances(opts.address, chains, readerOpts);

      if (spinner) spinner.stop();

      if (opts.json) {
        process.stdout.write(JSON.stringify({ address: opts.address, balances: results, errors }, null, 2) + "\n");
        return;
      }

      console.log(chalk.bold(`\nNative balances for ${chalk.cyan(opts.address)}\n`));

      const table = new Table({
        head: [
          chalk.gray("Chain"),
          chalk.gray("Symbol"),
          chalk.gray("Balance"),
          chalk.gray("Explorer"),
        ],
        colAligns: ["left", "center", "right", "left"],
      });

      for (const r of results) {
        const bal = parseFloat(r.formatted);
        const balStr = bal === 0 ? chalk.dim("0") : chalk.green(bal.toFixed(6));
        table.push([r.chain, r.symbol, balStr, chalk.dim(r.explorer)]);
      }

      console.log(table.toString());

      if (errors.length > 0) {
        console.log(chalk.yellow(`\n⚠  ${errors.length} chain(s) failed to respond:`));
        errors.forEach((e) => console.log(chalk.dim(`   ${e.message}`)));
      }
    } catch (err) {
      if (spinner) spinner.fail(err.message);
      else console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

// ─── token ────────────────────────────────────────────────────────────────────
program
  .command("token")
  .description("Fetch ERC-20 token balance for a contract")
  .requiredOption("-a, --address <address>", "Wallet address (0x...)")
  .requiredOption("-t, --token <tokenAddress>", "ERC-20 contract address (0x...)")
  .option("-c, --chain <chain>", "Chain to query", "ethereum")
  .option("--rpc <url>", "Override the chain RPC URL")
  .option("--timeout <ms>", "RPC request timeout in milliseconds", "12000")
  .option("-j, --json", "Output raw JSON")
  .action(async (opts) => {
    const spinner = opts.json ? null : ora("Fetching token balance…").start();
    const timeoutMs = parseInt(opts.timeout, 10);
    if (isNaN(timeoutMs) || timeoutMs <= 0) {
      if (spinner) spinner.stop();
      console.error(chalk.red("--timeout must be a positive integer (milliseconds)"));
      process.exit(1);
    }
    const readerOpts = { timeoutMs };

    try {
      const resolved = resolveChains(opts.chain);
      if (resolved.length > 1) {
        if (spinner) spinner.stop();
        console.error(chalk.red("The token command requires exactly one --chain"));
        process.exit(1);
      }
      let [chain] = resolved;
      if (opts.rpc) { validateRpcUrl(opts.rpc); chain = { ...chain, rpc: opts.rpc }; }
      const result = await getTokenBalance(opts.address, opts.token, chain, readerOpts);

      if (spinner) spinner.stop();

      if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        return;
      }

      console.log(chalk.bold(`\nToken balance on ${chalk.cyan(result.chain)}\n`));
      console.log(`  Token:    ${chalk.white(result.token)} (${chalk.cyan(result.symbol)})`);
      console.log(`  Contract: ${chalk.dim(result.tokenAddress)}`);
      console.log(`  Balance:  ${chalk.green(parseFloat(result.formatted).toFixed(6))} ${result.symbol}\n`);
    } catch (err) {
      if (spinner) spinner.fail(err.message);
      else console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

// ─── nft ──────────────────────────────────────────────────────────────────────
program
  .command("nft")
  .description("Fetch ERC-721 NFT balance for a collection")
  .requiredOption("-a, --address <address>", "Wallet address (0x...)")
  .requiredOption("-t, --contract <contractAddress>", "ERC-721 contract address (0x...)")
  .option("-c, --chain <chain>", "Chain to query", "ethereum")
  .option("--rpc <url>", "Override the chain RPC URL")
  .option("--timeout <ms>", "RPC request timeout in milliseconds", "12000")
  .option("-j, --json", "Output raw JSON")
  .action(async (opts) => {
    const spinner = opts.json ? null : ora("Fetching NFT balance…").start();
    const timeoutMs = parseInt(opts.timeout, 10);
    if (isNaN(timeoutMs) || timeoutMs <= 0) {
      if (spinner) spinner.stop();
      console.error(chalk.red("--timeout must be a positive integer (milliseconds)"));
      process.exit(1);
    }
    const readerOpts = { timeoutMs };

    try {
      const resolved = resolveChains(opts.chain);
      if (resolved.length > 1) {
        if (spinner) spinner.stop();
        console.error(chalk.red("The nft command requires exactly one --chain"));
        process.exit(1);
      }
      let [chain] = resolved;
      if (opts.rpc) { validateRpcUrl(opts.rpc); chain = { ...chain, rpc: opts.rpc }; }
      const result = await getNFTBalance(opts.address, opts.contract, chain, readerOpts);

      if (spinner) spinner.stop();

      if (opts.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + "\n");
        return;
      }

      console.log(chalk.bold(`\nNFT holdings on ${chalk.cyan(result.chain)}\n`));
      console.log(`  Collection: ${chalk.white(result.collection)} (${chalk.cyan(result.symbol)})`);
      console.log(`  Contract:   ${chalk.dim(result.contractAddress)}`);
      console.log(`  Owned:      ${chalk.green(result.count)} token(s)\n`);
    } catch (err) {
      if (spinner) spinner.fail(err.message);
      else console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

// ─── activity ─────────────────────────────────────────────────────────────────
program
  .command("activity")
  .description("Show transaction count per chain (proxy for on-chain activity)")
  .requiredOption("-a, --address <address>", "Wallet address (0x...)")
  .option("-c, --chain <chains>", "Chain(s) to query", "all")
  .option("--rpc <url>", "Override RPC URL for the queried chain(s)")
  .option("--timeout <ms>", "RPC request timeout in milliseconds", "12000")
  .option("-j, --json", "Output raw JSON")
  .action(async (opts) => {
    const spinner = opts.json ? null : ora("Fetching activity…").start();
    const timeoutMs = parseInt(opts.timeout, 10);
    if (isNaN(timeoutMs) || timeoutMs <= 0) {
      if (spinner) spinner.stop();
      console.error(chalk.red("--timeout must be a positive integer (milliseconds)"));
      process.exit(1);
    }
    const readerOpts = { timeoutMs };

    try {
      let chains = resolveChains(opts.chain);
      if (opts.rpc) { validateRpcUrl(opts.rpc); chains = chains.map((c) => ({ ...c, rpc: opts.rpc })); }
      const settled = await Promise.allSettled(chains.map((c) => getTxCount(opts.address, c, readerOpts)));

      const results = settled
        .filter((s) => s.status === "fulfilled")
        .map((s) => s.value);
      const errors = settled
        .filter((s) => s.status === "rejected")
        .map((s) => ({ message: s.reason?.message ?? String(s.reason) }));

      if (spinner) spinner.stop();

      if (opts.json) {
        process.stdout.write(JSON.stringify({ address: opts.address, activity: results, errors }, null, 2) + "\n");
        return;
      }

      console.log(chalk.bold(`\nTransaction counts for ${chalk.cyan(opts.address)}\n`));

      const table = new Table({
        head: [chalk.gray("Chain"), chalk.gray("Tx Count")],
        colAligns: ["left", "right"],
      });

      for (const r of results) {
        const countStr = r.txCount === 0 ? chalk.dim("0") : chalk.green(r.txCount);
        table.push([r.chain, countStr]);
      }

      console.log(table.toString());

      if (errors.length > 0) {
        console.log(chalk.yellow(`\n⚠  ${errors.length} chain(s) failed to respond:`));
        errors.forEach((e) => console.log(chalk.dim(`   ${e.message}`)));
      }
    } catch (err) {
      if (spinner) spinner.fail(err.message);
      else console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

// ─── status ───────────────────────────────────────────────────────────────────
program
  .command("status")
  .description("Check RPC connectivity — shows latest block number per chain")
  .option("-c, --chain <chains>", "Chain(s) to check", "all")
  .option("--rpc <url>", "Override RPC URL for the checked chain(s)")
  .option("--timeout <ms>", "RPC request timeout in milliseconds", "12000")
  .option("-j, --json", "Output raw JSON")
  .action(async (opts) => {
    const spinner = opts.json ? null : ora("Checking chain status…").start();
    const timeoutMs = parseInt(opts.timeout, 10);
    if (isNaN(timeoutMs) || timeoutMs <= 0) {
      if (spinner) spinner.stop();
      console.error(chalk.red("--timeout must be a positive integer (milliseconds)"));
      process.exit(1);
    }
    const readerOpts = { timeoutMs };

    try {
      let chains = resolveChains(opts.chain);
      if (opts.rpc) { validateRpcUrl(opts.rpc); chains = chains.map((c) => ({ ...c, rpc: opts.rpc })); }
      const settled = await Promise.allSettled(chains.map((c) => getBlockNumber(c, readerOpts)));

      const results = settled
        .filter((s) => s.status === "fulfilled")
        .map((s) => s.value);
      const errors = settled
        .filter((s) => s.status === "rejected")
        .map((s) => ({ message: s.reason?.message ?? String(s.reason) }));

      if (spinner) spinner.stop();

      if (opts.json) {
        process.stdout.write(JSON.stringify({ chains: results, errors }, null, 2) + "\n");
        return;
      }

      console.log(chalk.bold("\nRPC Status\n"));

      const table = new Table({
        head: [chalk.gray("Chain"), chalk.gray("Chain ID"), chalk.gray("Latest Block")],
        colAligns: ["left", "center", "right"],
      });

      for (const r of results) {
        table.push([r.chain, chalk.dim(r.chainId), chalk.green(r.block)]);
      }

      console.log(table.toString());

      if (errors.length > 0) {
        console.log(chalk.red(`\n✗  ${errors.length} chain(s) unreachable:`));
        errors.forEach((e) => console.log(chalk.dim(`   ${e.message}`)));
      }
    } catch (err) {
      if (spinner) spinner.fail(err.message);
      else console.error(chalk.red(err.message));
      process.exit(1);
    }
  });

program.parse();
