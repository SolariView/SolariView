/**
 * Chain definitions — public RPC endpoints only.
 * Users may override via .env (SOLARIVIEW_RPC_<CHAIN_ID>).
 */

export const CHAINS = {
  ethereum: {
    id: 1,
    name: "Ethereum",
    symbol: "ETH",
    rpc: process.env.SOLARIVIEW_RPC_1 || "https://eth.llamarpc.com",
    nativeDecimals: 18,
    explorer: "https://etherscan.io",
  },
  arbitrum: {
    id: 42161,
    name: "Arbitrum One",
    symbol: "ETH",
    rpc: process.env.SOLARIVIEW_RPC_42161 || "https://arb1.arbitrum.io/rpc",
    nativeDecimals: 18,
    explorer: "https://arbiscan.io",
  },
  optimism: {
    id: 10,
    name: "Optimism",
    symbol: "ETH",
    rpc: process.env.SOLARIVIEW_RPC_10 || "https://mainnet.optimism.io",
    nativeDecimals: 18,
    explorer: "https://optimistic.etherscan.io",
  },
  base: {
    id: 8453,
    name: "Base",
    symbol: "ETH",
    rpc: process.env.SOLARIVIEW_RPC_8453 || "https://mainnet.base.org",
    nativeDecimals: 18,
    explorer: "https://basescan.org",
  },
  polygon: {
    id: 137,
    name: "Polygon",
    symbol: "POL",
    rpc: process.env.SOLARIVIEW_RPC_137 || "https://polygon-bor-rpc.publicnode.com",
    nativeDecimals: 18,
    explorer: "https://polygonscan.com",
  },
  bsc: {
    id: 56,
    name: "BNB Chain",
    symbol: "BNB",
    rpc: process.env.SOLARIVIEW_RPC_56 || "https://bsc-dataseed.binance.org",
    nativeDecimals: 18,
    explorer: "https://bscscan.com",
  },
};

export const CHAIN_ALIASES = {
  eth: "ethereum",
  arb: "arbitrum",
  op: "optimism",
  matic: "polygon",
  bnb: "bsc",
};

/**
 * Returns an array of chain config objects from a comma-separated list
 * of names (or "all" to return every chain).
 */
export function resolveChains(input) {
  if (!input || input === "all") return Object.values(CHAINS);

  return input
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .map((name) => {
      const key = CHAIN_ALIASES[name] ?? name;
      const chain = CHAINS[key];
      if (!chain) throw new Error(`Unknown chain: "${name}". Valid chains: ${Object.keys(CHAINS).join(", ")}`);
      return chain;
    });
}
