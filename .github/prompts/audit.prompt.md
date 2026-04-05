---
description: "Perform an adversarial full-project audit and generate a high-precision ACTIONS.md report."
name: "SolariView Professional Audit v2"
agent: "agent"
---

# MISSION
Run a rigorous, adversarial audit of this project. Your goal is to identify vulnerabilities, logic flaws, and compliance gaps. Write the results as a complete replacement for [actions/ACTIONS.md](../../actions/ACTIONS.md).

# CONTEXT ACQUISITION
Read and cross-reference every file below. Do not summarize; analyze the actual logic:
[List of files remains the same...]

*Note: If your environment allows, execute `git status` and `npm list` to verify state and dependency trees.*

# AUDIT CRITERIA

### 1. Security & Edge Cases (High Priority)
- **Injection:** Scrutinize `src/reader.js` and `web/server.js` for unvalidated inputs.
- **RPC/SSRF:** Check if `--rpc` flags allow connections to internal metadata services.
- **Async Logic:** Verify `withRetry` placement. **Rule:** `withRetry` must wrap the call; `.catch()` must follow, not precede, the retry wrapper.
- **Secrets:** Scan for hardcoded strings in `src/abi.js` or `src/chains.js`.

### 2. Reliability & Maintenance
- **Type Safety:** Identify where `parseInt/parseFloat` lack `isNaN` checks.
- **Dead Code:** Find exported functions/variables in `utils.js` or `chains.js` never imported elsewhere.
- **Tests:** Map tests to source files. Identify "Dark Zones" (0% coverage).

### 3. Compliance & Legal
- **License:** Verify MIT. Check dependencies for "License Contamination" (GPL/Copyleft).
- **Distribution:** Ensure `package.json` `files[]` whitelist prevents `tests/` or `.env` files from being published to npm.

# OUTPUT REQUIREMENTS
Write a single, complete replacement for `ACTIONS.md`. 
- **No Fluff:** Do not praise the code. 
- **Precision:** Every ⚠ or ❌ must include a File Path and Line Number.
- **Status Icons:** ✅ (Pass), ⚠ (Minor/Refactor), ❌ (Critical/Blocker).
