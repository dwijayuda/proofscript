# P5.77 Arena Adapter0 Progress Report

Status: WIP until final fresh-extract verification completes.

## Goal

Add the smallest additive Lean Kernel Arena adapter skeleton for ProofScript's TypeScript kernel.

## Current capability

- Reads lean4export NDJSON line-by-line.
- Parses lean4export 3.1.0 metadata.
- Parses minimal names, universe levels, expressions, constants, axioms, definitions, theorems, and safe opaque declarations.
- Translates supported records into existing ProofScript Core declarations.
- Checks translated declarations through the existing K3-TB trusted-boundary kernel profile.
- Exit policy:
  - `0` accepted
  - `1` rejected/malformed/semantically invalid
  - `2` explicitly unsupported but well-formed

## Deliberate non-claims

- Arena tutorial suite is not yet green.
- Public Arena-ready checker is not yet claimed.
- Full Lean 4 equivalence is not proven.
- ProofScript same theory as full Lean 4 is not claimed.
- Fully formal K3 is not claimed.
- Formal Lean 4 equivalence proven obligations remain 0.

## Known major blocker

Projection/structure support is expected to be a major blocker for Lean Kernel Arena tutorial tests around 083–098. This adapter skeleton does not hide that; it declines unsupported exported records rather than pretending to support them.

## TDD evidence

RED on the selected baseline:

```text
Error: Cannot find module 'packages/arena-checker/src/main.ts'
```

GREEN after implementation:

```text
npm run test:arena:smoke
ARENA_CHECKER_SMOKE=PASS
```
