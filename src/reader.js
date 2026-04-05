import { createPublicClient, http, formatUnits, isAddress } from "viem";
import { ERC20_ABI, ERC721_ABI } from "./abi.js";
import { withRetry } from "./utils.js";

const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * Build a viem public client for a given chain config.
 * @param {object} chainConfig
 * @param {{ timeoutMs?: number }} [opts]
 */
function buildClient(chainConfig, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  return createPublicClient({
    chain: {
      id: chainConfig.id,
      name: chainConfig.name,
      nativeCurrency: { name: chainConfig.name, symbol: chainConfig.symbol, decimals: chainConfig.nativeDecimals },
      rpcUrls: { default: { http: [chainConfig.rpc] } },
    },
    transport: http(chainConfig.rpc, { timeout: timeoutMs }),
  });
}

/**
 * Fetch native token balance for an address on a single chain.
 */
export async function getNativeBalance(address, chainConfig, opts = {}) {
  if (!isAddress(address)) throw new Error(`Invalid address: ${address}`);

  const client = buildClient(chainConfig, opts);
  const raw = await withRetry(() => client.getBalance({ address }));
  const formatted = formatUnits(raw, chainConfig.nativeDecimals);

  return {
    chain: chainConfig.name,
    chainId: chainConfig.id,
    symbol: chainConfig.symbol,
    raw: raw.toString(),
    formatted,
    explorer: `${chainConfig.explorer}/address/${address}`,
  };
}

/**
 * Fetch ERC-20 token balance for an address.
 */
export async function getTokenBalance(address, tokenAddress, chainConfig, opts = {}) {
  if (!isAddress(address)) throw new Error(`Invalid address: ${address}`);
  if (!isAddress(tokenAddress)) throw new Error(`Invalid token address: ${tokenAddress}`);

  const client = buildClient(chainConfig, opts);

  const [balance, decimals, symbol, name] = await Promise.all([
    withRetry(() => client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: "balanceOf", args: [address] })),
    withRetry(() => client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: "decimals" })),
    withRetry(() => client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: "symbol" })).catch(() => "UNKNOWN"),
    withRetry(() => client.readContract({ address: tokenAddress, abi: ERC20_ABI, functionName: "name" })).catch(() => "Unknown Token"),
  ]);

  return {
    chain: chainConfig.name,
    chainId: chainConfig.id,
    token: name,
    symbol,
    tokenAddress,
    raw: balance.toString(),
    formatted: formatUnits(balance, decimals),
    decimals,
  };
}

/**
 * Fetch ERC-721 NFT balance for an address.
 */
export async function getNFTBalance(address, contractAddress, chainConfig, opts = {}) {
  if (!isAddress(address)) throw new Error(`Invalid address: ${address}`);
  if (!isAddress(contractAddress)) throw new Error(`Invalid contract address: ${contractAddress}`);

  const client = buildClient(chainConfig, opts);

  const [balance, name, symbol] = await Promise.all([
    withRetry(() => client.readContract({ address: contractAddress, abi: ERC721_ABI, functionName: "balanceOf", args: [address] })),
    withRetry(() => client.readContract({ address: contractAddress, abi: ERC721_ABI, functionName: "name" })).catch(() => "Unknown"),
    withRetry(() => client.readContract({ address: contractAddress, abi: ERC721_ABI, functionName: "symbol" })).catch(() => "???"),
  ]);

  return {
    chain: chainConfig.name,
    chainId: chainConfig.id,
    collection: name,
    symbol,
    contractAddress,
    count: balance.toString(),
  };
}

/**
 * Fetch native balances across multiple chains concurrently.
 * Returns an array of results (successful) and errors (failed) separately.
 */
export async function getMultiChainNativeBalances(address, chainConfigs, opts = {}) {
  const settled = await Promise.allSettled(
    chainConfigs.map((chain) => getNativeBalance(address, chain, opts))
  );

  const results = [];
  const errors = [];

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      results.push(outcome.value);
    } else {
      errors.push({ message: outcome.reason?.message ?? String(outcome.reason) });
    }
  }

  return { results, errors };
}

/**
 * Fetch the latest block number on a chain — useful as a connectivity check.
 */
export async function getBlockNumber(chainConfig, opts = {}) {
  const client = buildClient(chainConfig, opts);
  const block = await withRetry(() => client.getBlockNumber());
  return { chain: chainConfig.name, chainId: chainConfig.id, block: block.toString() };
}

/**
 * Fetch transaction count (nonce) for an address — a proxy for activity level.
 */
export async function getTxCount(address, chainConfig, opts = {}) {
  if (!isAddress(address)) throw new Error(`Invalid address: ${address}`);
  const client = buildClient(chainConfig, opts);
  const count = await withRetry(() => client.getTransactionCount({ address }));
  return { chain: chainConfig.name, chainId: chainConfig.id, txCount: count };
}
