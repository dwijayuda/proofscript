# P5.78 Arena Tutorial Harness0 Progress Report

Status: WIP candidate until final source archive/fresh-extract gates pass.

## Purpose

P5.78 changes the Arena work from smoke-only to measurable tutorial tracking. It does not add a new trusted kernel rule and does not claim full Lean 4 equivalence.

## Added

- `config/arena-tutorial-manifest.json` records the currently observed Arena tutorial page as 136 tests: 92 expected accept and 44 expected reject.
- `tools/arena-tutorial-runner.ts` runs any locally available Arena tutorial NDJSON fixtures through `packages/arena-checker/dist/main.js` and reports accepted-good, rejected-bad, declined-unsupported, wrong accepts, wrong rejects, checker crashes, and not-run counts.
- `tools/arena-tutorial-harness-tests.ts` uses tiny hand-written NDJSON fixtures to verify the harness: one accepted good, one rejected bad, one declined unsupported, and one not-run missing fixture.
- Root scripts:
  - `test:arena:tutorial-harness`
  - `test:arena:tutorial`
  - `verify:arena` = smoke + tutorial harness + tutorial manifest runner

## Current Arena tutorial status

The actual downloaded/generated Arena tutorial NDJSON corpus is not present in this release environment. Therefore P5.78 reports the full manifest as not run by default and does not invent pass counts.

Observed current tutorial manifest:

```text
Total: 136
Good/expected accept: 92
Bad/expected reject: 44
```

Default local run without NDJSON corpus:

```text
accepted good: 0
rejected bad: 0
declined unsupported: 0
wrong accepts: 0
wrong rejects: 0
checker crashes: 0
not run: 136
```

Harness fixture test:

```text
accepted good: 1
rejected bad: 1
declined unsupported: 1
not run: 1
wrong accepts: 0
wrong rejects: 0
checker crashes: 0
```

## Known blockers

Projection/structure tests around tutorial 085-096 remain likely major blockers once real NDJSON is available. P5.78 intentionally measures them rather than hiding them.

## Trust boundary

K3-TB trusted-boundary only: YES
Fully formal K3: NO
Full Lean 4 equivalence: NO
ProofScript same theory as full Lean 4: NO
Formal Lean 4 equivalence proven obligations: 0
