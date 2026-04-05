---
description: "Run a full project audit — security, functionality, compliance, best practice, legal, and bug review — then write the findings to actions/ACTIONS.md"
name: "SolariView Full Audit"
agent: "agent"
---

Run a full audit of this project and write the results to [actions/ACTIONS.md](../../actions/ACTIONS.md).

## What to read

Read every source file before writing findings:

- [package.json](../../package.json)
- [src/cli.js](../../src/cli.js)
- [src/reader.js](../../src/reader.js)
- [src/utils.js](../../src/utils.js)
- [src/chains.js](../../src/chains.js)
- [src/abi.js](../../src/abi.js)
- [src/index.js](../../src/index.js)
- [src/chains.test.js](../../src/chains.test.js)
- [src/utils.test.js](../../src/utils.test.js)
- [src/reader.test.js](../../src/reader.test.js)
- [web/server.js](../../web/server.js)
- [web/index.html](../../web/index.html)
- [README.md](../../README.md)
- [CHANGELOG.md](../../CHANGELOG.md)
- [CONTRIBUTING.md](../../CONTRIBUTING.md)
- [LICENSE](../../LICENSE)
- [.gitignore](../../.gitignore)
- [.npmignore](../../.npmignore)
- [.github/workflows/ci.yml](../workflows/ci.yml)

Also run `git status` to understand the current commit state.

## Audit areas

### 1. Security Review
- Check all OWASP Top 10 categories against the codebase
- Check for injection vectors (user inputs, address params, URL params)
- Check for secret or credential exposure
- Check CSP and security headers in web/server.js
- Check rate limiter implementation
- Check XSS handling in web/index.html
- Check .gitignore and .npmignore for secret exclusions
- Check for SSRF via --rpc or any configurable URL input
- Note any minor observations even if not exploitable

### 2. Bug Review
- Check all parseInt/parseFloat calls for NaN handling
- Check all dead code (defined but never called functions, exported but unused symbols)
- Check for any missing input validation at API and CLI boundaries
- Check Promise.allSettled error shape consistency
- Check for any off-by-one or type coercion issues

### 3. Functionality Review
- Verify all CLI commands are implemented and consistent
- Verify all --flags work as documented in README
- Verify web API endpoints match CLI capabilities
- Verify library API exports in index.js match reader.js exports
- Verify withRetry is applied to every RPC call
- Verify .catch() fallbacks for optional fields are placed after withRetry (not before)
- Verify graceful degradation on partial chain failures

### 4. Test Coverage Review
- List all test files and test counts
- Identify which modules have no tests
- Identify which branches or edge cases are untested
- Rate the coverage as adequate / needs improvement / critical gap

### 5. Compliance Review
- GDPR/CCPA: does the tool collect, store, or transmit user data?
- npm package: verify files[] contains only intended files, no secrets
- Financial data: is a disclaimer present or needed?
- Public RPC endpoints: any ToS concerns?

### 6. Best Practice Review
- Check package.json for engines, license, files[], bin entries
- Check all bin scripts have #!/usr/bin/env node
- Check ESM consistency (no require() except where intentional)
- Check for over-engineering or unnecessary complexity
- Check dependency count and whether all are needed
- Check that devDependencies are correctly separated

### 7. Legal Review
- Verify license (MIT) is present and correct
- Verify all dependency licenses are compatible (no GPL or copyleft)
- Note if copyright holder is a legal entity or informal name
- Note any IP or trademark considerations

## Output format

Write a single, complete replacement for [actions/ACTIONS.md](../../actions/ACTIONS.md) using this structure:

```
# SolariView — Full Audit Report
**Reviewed: <date> · <version>**

## Status Summary
Table: Area | Rating | Notes

## Security Review
OWASP table + observations

## Bug Report
BUG-XX entries with: description, file, line, fix recommendation

## Functionality Review
Table of checks

## Test Coverage
Table of files and counts + coverage gaps

## Compliance Review
Table of checks + findings

## Best Practice Review
Table of checks + findings

## Legal Review
Table of checks + findings

## Recommended Actions Before Next Release
Priority table: High / Medium / Low | Item | File

## Recommended Actions for Future Releases

## Already Resolved (historical)
Struck-through completed items from previous audits
```

Be specific — include file names and line references for every finding. Do not pad with praise. Every section should present findings honestly including items that are fine. Mark items ✅ when clean, ⚠ for minor, ❌ for blocking.
