# P5.78 Arena Tutorial Harness0 Production Report

Status: production candidate pending final fresh-extract gates.

## Purpose

P5.78 makes the Lean Kernel Arena tutorial suite a first-class measurement target for ProofScript's TypeScript/K3-TB checker. It remains an Arena adapter/harness checkpoint, not a full Lean 4 equivalence claim.

## Baseline and uploaded Arena data

- Baseline rollback: P5.77 `arena-adapter0`.
- Uploaded Arena result metadata: `results(1).json` timestamp `2026-09-15 15:36:44 UTC`, Arena revision `a538455e201c1be48a11963cb83058649a36dc0e`.
- Uploaded Arena corpus archive: `lean-arena-tests.tar.gz`.
- Extracted tutorial corpus: 140 tutorial NDJSON tests, 93 expected accept, 47 expected reject.
- Full uploaded corpus archive contents: 190 NDJSON files in `good/` and `bad/`; the release harness currently targets only `tutorial/*`.

## Additive implementation

- `config/arena-tutorial-manifest.json` now records the uploaded 140-test tutorial manifest from `results(1).json`.
- `tools/arena-tutorial-runner.mjs` now resolves actual Arena tarball paths such as `good/tutorial/001_basicDef.ndjson` and `bad/tutorial/002_badDef.ndjson`.
- `tools/arena-tutorial-harness-tests.mjs` covers nested Arena tutorial fixture layout.
- `packages/arena-checker/src/translate.ts` maps lean4export `def` records with `hints: "opaque"` to kernel-unfoldable definitions. The separate lean4export `opaque` record remains the non-delta opaque declaration kind.
- `tools/arena-checker-smoke.mjs` now includes a regression fixture showing that `def`/`hints="opaque"` still unfolds for beta/delta checking.

## TDD evidence

RED from real corpus before the path fix:

```text
Arena tutorial harness with uploaded corpus:
total: 136
notRun: 136
reason: runner searched good/001_basicDef.ndjson instead of good/tutorial/001_basicDef.ndjson
```

RED from real corpus before the `def` hints fix:

```text
acceptedGood: 26
wrongRejects: 2
wrongReject examples:
- tutorial/006_betaReduction
- tutorial/007_betaReduction2
root cause: lean4export def/hints="opaque" was translated as a non-unfolding opaque Core declaration
```

GREEN after both fixes:

```text
Arena tutorial corpus run:
total: 140
expectedAccept: 93
expectedReject: 47
acceptedGood: 28
rejectedBad: 8
declinedUnsupported: 104
wrongAccepts: 0
wrongRejects: 0
checkerCrashes: 0
notRun: 0
```

## Current tutorial status

ProofScript has no wrong accepts on the uploaded tutorial corpus. Most remaining cases are explicitly declined because the P5.77/P5.78 Arena adapter does not yet import lean4export inductive records into the existing ProofScript inductive kernel model.

```text
Full Arena tutorial: NO
Public Arena-ready: NO
Measured tutorial corpus: YES
Good tests accepted: 28 / 93
Bad tests rejected: 8 / 47
Declined unsupported: 104 / 140
Wrong accepts: 0
Wrong rejects: 0
Checker crashes: 0
Not run: 0
```

## Known blockers

- `inductive` lean4export importer: needed before tutorial 036 onward can exercise ProofScript's existing inductive kernel.
- Recursor importer/generator validation from export metadata.
- Projection/structure cluster remains a major expected blocker around tutorial 083-098.
- Quotient cluster 125-130 is currently declined until Arena quotient/import records are supported.
- Unsafe/partial attack tests 139-140 are declined/rejected only after the relevant records are imported; they must not be accepted accidentally.

## Verification completed in worktree

```text
npm install --offline --no-audit --no-fund: PASS
npm run build -- --pretty false: PASS
npm run test:arena:smoke: PASS
npm run test:arena:tutorial-harness: PASS
npm run verify:arena: PASS
node tools/arena-tutorial-runner.mjs --fixtures-dir /mnt/data/arena-corpus-20260915: PASS, no wrong results
npm run test:kernel:smoke: PASS
npm run test:p5:baseline: PASS
npm run test:architecture: PASS
npm run test:standalone-small: PASS
npm run test:conformance: PASS
```

Exact Lean 4.33.1 differential still needs final bounded rerun after packaging if this candidate is frozen.

## Trust boundary

K3-TB trusted-boundary only: YES
Fully formal K3: NO
Full Lean 4 equivalence: NO
ProofScript same theory as full Lean 4: NO
Formal Lean 4 equivalence proven obligations: 0
