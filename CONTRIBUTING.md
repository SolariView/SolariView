# Contributing to SolariView

## Reporting bugs

Open an issue at [github.com/SolariView/SolariView/issues](https://github.com/SolariView/SolariView/issues).

Use the **Bug report** template — it prompts for Node.js version, OS, the exact command you ran, and the full error output.

**Security vulnerabilities:** do not open a public issue. Email **solari.dawn@pm.me** instead. See [SECURITY.md](SECURITY.md) for the full policy.

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
5. Add a `CHANGELOG.md` entry under the `[Unreleased]` section describing what changed.
6. Open the PR against `main`. The PR description should explain *why* the change is needed, not just what it does.
7. CI must be green before the PR can be merged.

## Code style

- ES modules throughout (`import`/`export`), no CommonJS.
- No new runtime dependencies without discussion in an issue first.
- `isAddress()` validation before any RPC call — do not remove existing guards.
- Keep the zero-telemetry guarantee: no outbound calls except to the configured RPC endpoints.

## Publishing a release (maintainers)

Releases are automated via `.github/workflows/release.yml`. The workflow triggers on any `v*` tag, runs the full test suite, publishes to npm, and creates a GitHub Release.

```bash
# 1. Ensure main is clean and all changes are committed
git status

# 2. Bump the version and create a commit + tag in one step
npm version patch   # for bug fixes (0.2.x)
npm version minor   # for new features (0.x.0)
npm version major   # for breaking changes (x.0.0)

# 3. Push the commit AND the tag — this triggers the release workflow
git push --follow-tags
```

The GitHub Actions release workflow will then:
1. Run `npm test` on Node 20
2. Publish the new version to npm (requires `NPM_TOKEN` secret in repo settings)
3. Create a GitHub Release with auto-generated notes from commits

Monitor the run at: `https://github.com/SolariView/SolariView/actions`

## AI-assisted development

This repository includes a VS Code Copilot prompt for running a full project audit:

**`.github/prompts/audit.prompt.md`** — Reads all source files, runs security, functionality, compliance, best practice, legal, and bug reviews, and writes a structured report to `actions/ACTIONS.md`.

To invoke it: open Copilot Chat in VS Code, type `/`, and select **SolariView Full Audit**.

The `actions/` folder is gitignored and contains internal planning documents. It is not part of the published package.

## Questions

Open a [GitHub Discussion](https://github.com/SolariView/SolariView/discussions) or an issue tagged `question`.
