# SolariView

> **On-chain clarity, local-first security.**

SolariView aggregates your multi-chain digital footprint — portfolios, NFT holdings, and on-chain activity — directly from public RPC nodes into your terminal or browser. No third-party APIs. No telemetry. No data leaks.

[![CI](https://github.com/SolariView/SolariView/actions/workflows/ci.yml/badge.svg)](https://github.com/SolariView/SolariView/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/solariview.svg)](LICENSE)
[![node](https://img.shields.io/node/v/solariview.svg)](package.json)

> **Note:** The `solariview` npm package is currently a name placeholder. Install from source until the full release is published.

## Features

- **Zero-Telemetry** — No tracking, no remote logging, no analytics.
- **Multi-Chain** — Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain out of the box.
- **JSON-first CLI** — Pipe `--json` output directly into `jq`, scripts, or other tools.
- **Web UI** — Optional local web interface on `127.0.0.1` for non-CLI users.
- **Library API** — Import individual read functions into your own Node.js project.
- **Custom RPCs** — Override per-session with `--rpc <url>` or permanently via `SOLARIVIEW_RPC_<CHAIN_ID>`.
- **Configurable timeout** — Adjust the RPC deadline per command with `--timeout <ms>`.

## Requirements

- Node.js ≥ 18

## Installation

### Global (CLI)

```bash
npm install -g solariview
```

### Local (library / project)

```bash
npm install solariview
```

### From source

```bash
git clone https://github.com/SolariView/SolariView.git
cd SolariView
npm install
```

---

## CLI Usage

### `balance` — native token balances across chains

```bash
solariview balance --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

```
Native balances for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

┌───────────────┬────────┬──────────────┬──────────────────────────────────────────────────────────────────┐
│ Chain         │ Symbol │      Balance │ Explorer                                                         │
├───────────────┼────────┼──────────────┼──────────────────────────────────────────────────────────────────┤
│ Ethereum      │ ETH    │    1.823041  │ https://etherscan.io/address/0xd8dA6BF…                          │
│ Arbitrum One  │ ETH    │    0.041200  │ https://arbiscan.io/address/0xd8dA6BF…                           │
│ Base          │ ETH    │    0.005000  │ https://basescan.org/address/0xd8dA6BF…                          │
│ Optimism      │ ETH    │    0.000000  │ https://optimistic.etherscan.io/address/0xd8dA6BF…               │
│ Polygon       │ POL    │  120.000000  │ https://polygonscan.com/address/0xd8dA6BF…                       │
│ BNB Chain     │ BNB    │    0.000000  │ https://bscscan.com/address/0xd8dA6BF…                           │
└───────────────┴────────┴──────────────┴──────────────────────────────────────────────────────────────────┘
```

Query a subset of chains:

```bash
solariview balance --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --chain base,arbitrum
```

JSON output (pipe-friendly):

```bash
solariview balance --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 --json | jq '.balances[].formatted'
```

```json
"1.823041"
"0.0412"
"0.005"
```

---

### `token` — ERC-20 token balance

```bash
# USDC on Ethereum
solariview token \
  --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 \
  --token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --chain ethereum
```

```
Token balance on Ethereum

  Token:    USD Coin (USDC)
  Contract: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
  Balance:  5420.000000 USDC
```

---

### `nft` — ERC-721 collection balance

```bash
# Bored Ape Yacht Club
solariview nft \
  --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 \
  --contract 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D \
  --chain ethereum
```

```
NFT holdings on Ethereum

  Collection: BoredApeYachtClub (BAYC)
  Contract:   0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
  Owned:      2 token(s)
```

---

### `activity` — transaction count per chain

```bash
solariview activity --address 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

```
Transaction counts for 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

┌───────────────┬──────────┐
│ Chain         │ Tx Count │
├───────────────┼──────────┤
│ Ethereum      │      487 │
│ Arbitrum One  │       23 │
│ Base          │        8 │
│ Optimism      │        2 │
│ Polygon       │       14 │
│ BNB Chain     │        0 │
└───────────────┴──────────┘
```

---

### `status` — RPC connectivity check

```bash
solariview status
```

```
RPC Status

┌───────────────┬──────────┬──────────────┐
│ Chain         │ Chain ID │ Latest Block │
├───────────────┼──────────┼──────────────┤
│ Ethereum      │        1 │   19,845,221 │
│ Arbitrum One  │    42161 │  215,003,442 │
│ Base          │     8453 │   13,201,009 │
│ Optimism      │       10 │  119,420,800 │
│ Polygon       │      137 │   56,221,001 │
│ BNB Chain     │       56 │   38,114,500 │
└───────────────┴──────────┴──────────────┘
```

---

## Web UI

Launch a local web interface (no external traffic, binds to `127.0.0.1` only):

```bash
solariview-web
# or from source:
node web/server.js
```

Then open `http://127.0.0.1:3131` in your browser. The same queries available in the CLI are accessible via a clean dashboard — useful for non-CLI users or quick visual lookups.

The web server also exposes a JSON REST API:

| Endpoint | Query params |
|---|---|
| `GET /api/balance` | `address`, `chain` |
| `GET /api/token` | `address`, `token`, `chain` |
| `GET /api/nft` | `address`, `contract`, `chain` |
| `GET /api/activity` | `address`, `chain` |
| `GET /api/status` | `chain` |

---

## Library API

```js
import {
  getMultiChainNativeBalances,
  getTokenBalance,
  getNFTBalance,
  getTxCount,
  getBlockNumber,
  withRetry,
  resolveChains,
} from "solariview";

// Native balances across multiple chains
const chains = resolveChains("ethereum,base");
const { results, errors } = await getMultiChainNativeBalances(
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  chains
);
console.log(results);

// Transaction count — proxy for on-chain activity level
const [ethereum] = resolveChains("ethereum");
const { chain, chainId, txCount } = await getTxCount(
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  ethereum
);
console.log(`${chain} (${chainId}): ${txCount} transactions`);
```

---

## Custom RPC Endpoints

Per-invocation (takes precedence over env vars):

```bash
solariview balance --address 0x... --chain ethereum --rpc https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
```

Persistent override via environment variable:

```bash
SOLARIVIEW_RPC_1=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY \
SOLARIVIEW_RPC_8453=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY \
solariview balance --address 0x...
```

The env variable pattern is `SOLARIVIEW_RPC_<CHAIN_ID>`.

---

## Timeout

The default RPC timeout is 12 seconds. Override it per command:

```bash
# Useful over slow VPNs or when querying non-standard nodes
solariview balance --address 0x... --timeout 30000
```

---

## Supported Chains

| Name | Chain ID | Alias |
|---|---|---|
| Ethereum | 1 | `eth`, `ethereum` |
| Arbitrum One | 42161 | `arb`, `arbitrum` |
| Optimism | 10 | `op`, `optimism` |
| Base | 8453 | `base` |
| Polygon | 137 | `matic`, `polygon` |
| BNB Chain | 56 | `bnb`, `bsc` |

---

## Roadmap

SolariView is the foundation of a broader privacy-first portfolio intelligence platform.

### v0.3 — Depth
- ENS / Unstoppable Domains resolution — query by name, not just address
- ERC-20 portfolio aggregation — total value across all tokens and chains
- Token price integration via on-chain oracles (no third-party price APIs)
- Historical transaction summary per chain

### v0.4 — Hardware & Security
- Ledger and Trezor read support — query directly from connected hardware wallet
- Watch-only address book — label and monitor multiple wallets locally
- Encrypted local config store — persist RPC overrides and labels without plaintext secrets

### v0.5 — Platform
- Self-hosted web dashboard — full portfolio view, exportable as static HTML
- CSV / JSON export for tax reporting
- REST API authentication layer for team/shared deployments
- Docker image for server deployments

### v1.0 — Sovereign Infrastructure
- Plugin architecture — extend with custom chain adapters and data sources
- Multi-signature wallet support
- Automated alerting — threshold triggers without cloud dependency
- Enterprise deployment guide

> The architecture decisions made in v0.2 — zero external API dependencies, library-first design, RPC abstraction — are deliberate foundations for this roadmap, not accidental constraints.

---

## Philosophy

Watching your assets shouldn't mean being watched. SolariView reads directly from public RPC endpoints — no account required, no API keys by default, no usage logs sent anywhere.

SolariView displays on-chain data for informational purposes only. Nothing in this software constitutes financial advice.

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
