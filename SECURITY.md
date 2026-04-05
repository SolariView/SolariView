# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | ✅ |
| 0.1.x   | ❌ |

## Reporting a Vulnerability

Please **do not** open a public issue for security vulnerabilities.

Email: **solariview@pm.me**

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- The version of SolariView affected

You will receive a response within 72 hours. If the issue is confirmed, a patched release will be published and you will be credited in the changelog unless you prefer to remain anonymous.

## Security Model

SolariView is a **read-only, local-first tool**. No private keys are ever accepted or stored.

### What is validated

- **Wallet and contract addresses** — rejected before any RPC call if not a valid EVM address.
- **`--timeout`** — must be a positive integer; non-numeric or zero values exit immediately.
- **`--rpc` URL scheme** — must be `http://` or `https://`; all other schemes (e.g. `file://`, `ftp://`) are rejected.
- **Web server inputs** — accepts only `GET` requests, rejects URLs longer than 512 characters, and validates required query parameters before reaching any reader logic.

### Known scope limitation — `--rpc` host validation

`--rpc` validates the URL scheme but does **not** block private or link-local hostnames (e.g. `http://169.254.169.254/`). The web server does not expose `--rpc` as an HTTP parameter, so there is no SSRF risk in the server path. The risk is limited to CLI invocations where `--rpc` is sourced from untrusted input. A future release will add host-range validation inside `validateRpcUrl`.

### Web server

The web server (`solariview-web`) binds exclusively to `127.0.0.1` and is not intended for exposure to external networks. Do not place it behind a public reverse proxy without adding authentication.
