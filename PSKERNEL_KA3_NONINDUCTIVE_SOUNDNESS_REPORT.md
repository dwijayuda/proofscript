# PSKernel KA-3 Non-Inductive Soundness Report

Checkpoint: `proofscript-v1-ka3-noninductive-soundness0`  
Public version: `1.0.0-pskernel.5`  
Baseline: `proofscript-v1-ka2-translation-relation0`

## What KA-3 adds

KA-3 adds the first non-inductive soundness scaffold above the trusted kernel boundary. It binds the KA-2 PSCore v71 → Lean-reference translation shape to a self-contained Lean-shaped model for ordinary non-inductive declarations.

Supported in this first slice:

- `axiom`
- `definition`
- `theorem`
- `example`
- `opaque`

Explicitly outside this KA-3 slice:

- `quot`
- `inductive`
- `mutualInductive`

## New files

- `assurance/ka3/reference-model.json`
- `assurance/ka3/noninductive-soundness.json`
- `assurance/ka3/noninductive-soundness-skeleton.lean`
- `assurance/ka3/KA3_REPORT.md`
- `assurance/ka3/KA3_RELEASE_GATE.json`
- `tools/pskernel-ka3-soundness.ts`
- `tools/pskernel-ka3-soundness-tests.ts`
- `docs/superpowers/plans/2026-09-18-pskernel-ka3-noninductive-soundness.md`

## Gate result

- Supported non-inductive kinds: `5`
- Excluded declaration kinds: `3`
- Sample declarations: `8`
- Supported translated: `5`
- Blocked/excluded: `3`
- Wrongly translated: `0`
- KA-3 closed obligations: `5`
- Still-open obligations: `9`

## Verification

- `npm install --offline --no-audit --no-fund`: PASS
- `npm run build -- --pretty false`: PASS
- `npm run test:pskernel:ka1`: PASS
- `npm run test:pskernel:ka2`: PASS
- `npm run test:pskernel:ka3`: PASS
- `npm run assurance:ka1`: PASS
- `npm run assurance:ka2`: PASS
- `npm run assurance:ka3`: PASS
- `npm run verify:arena`: PASS
- `npm run test:kernel:smoke`: PASS
- `npm run test:standalone-small`: PASS
- `npm run test:psc:kernel-status`: PASS
- `npm run test:psc:conformance-bounded`: PASS

## Claim boundary

- Trusted kernel semantic change: **NO**
- Kernel codec change: **NO**
- New trusted computation rule: **NO**
- Core format changed: **NO**, still `71`
- Lean checked here: **NO** — no `lean` executable is available in this environment
- Full Lean 4 equivalence: **NO**
- Same theory as full Lean 4: **NO**
- Fully formal K3: **NO**
- Formal Lean 4 equivalence proven obligations: `0`

## Next best milestone

KA-4 should make this skeleton machine-checkable by either:

1. adding a real Lean 4.33.1 toolchain gate for `assurance/ka3/noninductive-soundness-skeleton.lean`, or
2. replacing the self-contained reference model with imports from a pinned Lean4Lean snapshot and proving the first environment-extension/check-declaration lemma there.
