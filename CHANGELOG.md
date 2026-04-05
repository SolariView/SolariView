# Changelog

All notable changes to SolariView will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- `web/server.test.js` — 15 integration tests covering HTTP method guard, URL length guard, 404, route parameter validation (all 5 routes), UI routes, and rate limiter behaviour
- `src/reader.test.js` — 5 new happy-path describe blocks using a mock JSON-RPC server: `getNativeBalance`, `getTokenBalance`, `getNFTBalance`, `getTxCount`, `getMultiChainNativeBalances`
- `src/cli.test.js` — 18 tests for CLI argument validation: `--version`, `--help`, `--timeout` rejection on all 5 commands, and missing required options
- `src/chains.test.js` — 4 new env-override tests confirming `SOLARIVIEW_RPC_<CHAIN_ID>` is respected at module load time (subprocesses with controlled env)
- README: `getTxCount` usage example added to Library API section

### Added
- `.github/prompts/audit.prompt.md` — reusable VS Code Copilot prompt that runs a full security, functionality, compliance, best practice, legal, and bug audit and writes findings to `actions/ACTIONS.md`

---

## [0.2.0] — 2026-04-05

### Added
- `src/utils.js` — extracted `withRetry` and `RETRYABLE` into a dedicated module; now importable and directly testable
- `--timeout <ms>` flag on all CLI commands — overrides the hardcoded 12-second RPC timeout
- `--rpc <url>` flag on all CLI commands — per-invocation RPC override without touching env vars
- GitHub Actions CI workflow (`.github/workflows/ci.yml`) — runs `npm test` on Node 18, 20, and 22 on every push and pull request

### Changed
- All reader functions accept an `opts = {}` parameter (`{ timeoutMs }`) and forward it to the viem transport
- `withRetry` tests in `reader.test.js` now import the real function from `utils.js` — the inline stub copies are removed
- `withRetry` is now part of the public library API (`import { withRetry } from "solariview"`)
- Added two additional `withRetry` test cases: 429 retry and exhaustion after max attempts

---

## [0.1.0] — 2026-04-05

### Added
- CLI with five commands: `balance`, `token`, `nft`, `activity`, `status`
- Multi-chain native balance reads (Ethereum, Arbitrum, Optimism, Base, Polygon, BNB Chain)
- ERC-20 and ERC-721 balance reads via viem
- `--json` flag on all CLI commands for pipe-friendly output
- Local web UI (`solariview-web`) served on `127.0.0.1:3131` — no external exposure
- REST API mirroring all CLI commands (`/api/balance`, `/api/token`, `/api/nft`, `/api/activity`, `/api/status`)
- Public library API (`import { getNativeBalance, … } from "solariview"`)
- RPC retry with exponential backoff — up to 3 attempts on transient errors
- Custom RPC override via `SOLARIVIEW_RPC_<CHAIN_ID>` environment variables
- In-memory rate limiter on the web server (10 req/s per IP, configurable via `SOLARIVIEW_RATE_LIMIT`)
- Security headers on web server: `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`
- Input validation via viem `isAddress()` before any RPC call
- Test suite for `resolveChains()` and reader address validation using `node:test`

### Security
- Web server binds exclusively to `127.0.0.1` — no external network exposure
- All `innerHTML` writes in the web UI go through an XSS-escaping helper
- No secrets, API keys, or private key handling anywhere in the codebase
