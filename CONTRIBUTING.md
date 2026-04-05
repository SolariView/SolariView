# Contributing to SolariView

## Reporting bugs

Open an issue at [github.com/SolariView/SolariView/issues](https://github.com/SolariView/SolariView/issues).

Include: Node.js version, OS, the exact command you ran, and the full error output.

## Running tests locally

```bash
npm ci
npm test
```

All tests must pass before submitting a PR. The CI pipeline runs the same suite on Node 18, 20, and 22.

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Branch naming: `fix/<short-description>` or `feat/<short-description>`.
3. Make your changes. Keep commits focused — one logical change per commit.
4. Add or update tests if your change affects observable behaviour.
5. Add a `CHANGELOG.md` entry under an `[Unreleased]` section describing what changed.
6. Open the PR against `main`. The PR description should explain *why* the change is needed, not just what it does.
7. CI must be green before the PR can be merged.

## Code style

- ES modules throughout (`import`/`export`), no CommonJS.
- No new runtime dependencies without discussion in an issue first.
- `isAddress()` validation before any RPC call — do not remove existing guards.
- Keep the zero-telemetry guarantee: no outbound calls except to the configured RPC endpoints.

## Questions

Open a GitHub Discussion or an issue tagged `question`.
