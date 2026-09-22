# PSKernel v1.0.0-pskernel.1 Advancement Audit0

Status: **AUDIT CHECKPOINT — full Arena rerun blocked by missing corpus**.

## Baseline

- Previous checkpoint: `proofscript-v1-pskernel-rename0`
- New checkpoint: `proofscript-v1-pskernel-advancement-audit0`
- Public package version: `1.0.0-pskernel.1`
- Active kernel source: `packages/kernel/src/PSKernel/`
- Active profile: `KERNEL-level-instantiation-conformance1`
- Core artifact format: `71`
- Certificate format: `2`
- Lean semantic baseline: `4.33.1` / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`

## Current kernel analysis

The active kernel source is PSKernel. The serialized artifact format remains Core v71 for compatibility; public package naming is now `1.0.0-pskernel.1`. The local kernel status reports `41/41` implemented rows, `0` partial, `0` unsupported.

The practical/default trusted-boundary profile is `KERNEL-level-instantiation-conformance1`. `KERNEL-resource-bounds0` remains accepted as the resource-security checkpoint. The codebase still explicitly does **not** claim full Lean 4 equivalence, same theory as full Lean 4, fully formal K3, or any completed formal Lean-equivalence obligations.

## Arena check

Executed:

- `npm run test:arena:smoke` — PASS
- `npm run test:arena:tutorial-harness` — PASS
- `npm run test:arena:tutorial` — runner exits successfully but reports all tutorial fixtures not run when no fixtures dir is provided
- `npm run test:arena:static-nonperf` — runner exits successfully but reports all static fixtures not run when no fixtures dir is provided
- `npm run verify:arena` — **BLOCKED**, now fails early at `arena:corpus-preflight` with `arena_corpus_missing`

Corpus preflight status:

```json
{
  "schemaVersion": 1,
  "status": "arena_corpus_missing",
  "fixturesDir": "/mnt/data/arena-corpus-20260915",
  "requiredFixtures": [
    "bad/extra-rec.ndjson",
    "bad/orphan-rec.ndjson",
    "bad/bogus1.ndjson",
    "good/corner-cases/proof-param-ok.ndjson",
    "good/tutorial/001_basicDef.ndjson",
    "bad/tutorial/002_badDef.ndjson",
    "good/tutorial/036_empty.ndjson",
    "good/tutorial/074_existsRec.ndjson",
    "good/tutorial/086_PSigma.snd.ndjson"
  ],
  "missingRequired": [
    "bad/extra-rec.ndjson",
    "bad/orphan-rec.ndjson",
    "bad/bogus1.ndjson",
    "good/corner-cases/proof-param-ok.ndjson",
    "good/tutorial/001_basicDef.ndjson",
    "bad/tutorial/002_badDef.ndjson",
    "good/tutorial/036_empty.ndjson",
    "good/tutorial/074_existsRec.ndjson",
    "good/tutorial/086_PSigma.snd.ndjson"
  ],
  "ndjsonCount": 0,
  "minimumExpectedNdjson": 166,
  "hasEnoughNdjson": false,
  "expectedLayout": "Lean Kernel Arena corpus root containing good/... and bad/... NDJSON fixtures",
  "remedy": "Materialize or extract the Lean Kernel Arena corpus to this directory, or set PROOFSCRIPT_ARENA_CORPUS_DIR/ARENA_FIXTURES_DIR.",
  "fullLean4Equivalence": false,
  "fullyFormalK3": false,
  "formalLean4EquivalenceProvenObligations": 0
}
```

This checkpoint improves honesty: full Arena verification is no longer allowed to fail later with misleading assertion errors or be counted from `notRun` harness exits. A real full Arena rerun still requires the Lean Kernel Arena NDJSON corpus at `/mnt/data/arena-corpus-20260915` or via `PROOFSCRIPT_ARENA_CORPUS_DIR`.

## Changes

- Added `tools/arena-corpus-preflight.ts`.
- Added `tools/arena-corpus-preflight-tests.ts`.
- Prepended `npm run arena:corpus-preflight` to `verify:arena`.
- Added `test:arena:corpus-preflight`.
- Added `test:pskernel:advancement-audit`.
- Updated public version metadata to `1.0.0-pskernel.1`.
- Added this audit report and release gate metadata.

## Verification

- `npm install --offline --no-audit --no-fund` — PASS
- `npm run build -- --pretty false` — PASS
- `npm run test:pskernel:v1-rename` — PASS
- `npm run test:pskernel:advancement-audit` — PASS
- `npm run test:arena:corpus-preflight` — PASS
- `npm run arena:corpus-preflight:soft` — PASS
- `npm run test:psc:kernel-status` — PASS
- `npm run test:kernel:smoke` — PASS
- `npm run test:standalone-small` — PASS
- `npm run test:psc:conformance-bounded` — PASS
- `npm run test:psc:crud-template` — PASS
- `npm run test:psc:runtime-import-crud` — PASS
- `npm run test:arena:smoke` — PASS
- `npm run test:arena:tutorial-harness` — PASS
- `npm run verify:arena` — BLOCKED_CORPUS_MISSING

## Claim boundary

- Trusted kernel semantic change: NO
- Kernel codec change: NO
- New trusted computation rule: NO
- Fresh full Arena pass: NO, blocked by missing corpus
- Full Lean 4 equivalence: NO
- Same theory as full Lean 4: NO
- Fully formal K3: NO

## Next action

Materialize/extract the actual Lean Kernel Arena corpus and rerun `npm run verify:arena`. If it passes, freeze the next checkpoint as a full Arena-verified checkpoint. Until then, this is an audit/guard checkpoint, not a fresh Arena-passing release.
