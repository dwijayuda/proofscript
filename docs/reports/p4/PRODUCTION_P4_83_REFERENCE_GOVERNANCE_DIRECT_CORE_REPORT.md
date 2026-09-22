# PRODUCTION P4.83 Reference Governance Direct-Core Report

## Summary

P4.83 fixes the release-governance timeout/hang risk in `npm run test:reference-governance:json` by routing `tools/reference-language-governance-smoke.ts` through the reusable `tools/pslive-core.ts` API instead of spawning a fresh `node tools/pslive.ts ...` process for each governance case.

This is cleanup/release-tooling hardening only. It does not change ProofScript syntax, Core semantics, kernel rules, JS/TS emission semantics, or the K3-TB trust boundary.

## Root cause

The reference-language governance smoke had broad coverage but executed every accepted/rejected scenario by spawning the CLI repeatedly. On this container that made the command look like a hang or hit outer timeouts even when the underlying checks could eventually produce an accepted JSON result.

## Change

`tools/reference-language-governance-smoke.ts` now has a direct in-process command shim for the pslive commands used by the smoke:

- `check` -> `checkCommand`
- `build-js` -> `buildJsCommand`
- `build-ts` -> `buildTsCommand`
- `run` -> `runSmallSource`

A subprocess fallback remains available for non-pslive commands, but the reference smoke no longer pays repeated process startup cost for its own PSC-1 cases.

## Regression coverage

Added `tools/reference-governance-direct-core-tests.ts` and package script:

```bash
npm run test:reference-governance:direct-core
```

The regression asserts that the smoke uses `pslive-core`, terminates within a bounded timeout, returns accepted JSON, and keeps broad coverage.

## Trust boundary

No new trusted proof rule was added. This work only changes how governance smoke invokes already-existing checked commands.

The release remains **K3-TB trusted-boundary**, not fully formal K3, and not proven equivalent to Lean 4.
