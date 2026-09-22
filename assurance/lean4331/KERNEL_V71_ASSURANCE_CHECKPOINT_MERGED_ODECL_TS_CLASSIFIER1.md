# ProofScript Kernel v71 Assurance Checkpoint: merged O-DECL + TS classifier implementation bridge

Date: 2026-09-10
Semantic baseline: Lean 4.33.1 (`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`)
Core format: 71
Semantic change: no

## What changed

This checkpoint uses `proofscript-kernel-v71-ts-classifier-impl1` as the stronger
baseline and folds in the useful local O-DECL regression from
`proofscript-kernel-v71-odecl1`.

Added files:

- `tools/kernel-declaration-environment-preservation-tests.ts`
- `tools/kernel-v71-local-merged-regression-tests.ts`
- `assurance/lean4331/CHECKPOINT_DECLARATION_ENVIRONMENT_ODECL1.json`
- `assurance/lean4331/CHECKPOINT_MERGED_ODECL_TS_CLASSIFIER1.json`

Updated files:

- `package.json` adds `npm run test:v71:local-merged`
- `assurance/lean4331/FORMAL_STATUS.md` records the merged checkpoint boundary
- `assurance/lean4331/MANIFEST.json` records hashes for the new/changed artifacts

## Local evidence produced in this environment

The following checks passed without requiring a local Lean executable:

```text
npm install --offline --ignore-scripts
npm run build
node tools/check-boundaries.ts
npm run test:v71:local-merged
```

The merged local gate checks two components:

1. ordinary declaration-environment preservation: direct constant type lookup,
   transparent regular-definition delta lookup, v71 `max`/`imax` universe
   instantiation at declaration lookup sites, opaque stuckness, and example
   non-installation;
2. shipped TypeScript non-mutual classifier implementation bridge: six audited
   source functions, 46 source obligations, accepted/rejected runtime sentinels,
   option sentinels, and atomic rejection behavior.

The gate result was:

```text
V71_MERGED_LOCAL_COMPONENTS=2 FAILURES=0
PASS KERNEL-v71-local-merged-regression: O-DECL preservation + TS classifier implementation bridge
```

## Claim boundary

This checkpoint does claim that the two uploaded branches have been merged on the
stronger `ts-classifier-impl1` baseline and that the added local O-DECL regression
and existing TypeScript classifier implementation bridge both pass.

It does not claim full K3 equivalence, full TypeScript implementation semantics,
or a fresh exact Lean 4.33.1 rerun in this environment. Exact Lean-dependent
gates still require `PROOFSCRIPT_LEAN_BIN`.

## Next best milestone

After running the exact Lean v71 gate with the pinned Lean 4.33.1 executable, the
next proof-critical milestone should be a generic declaration-admission/environment
theorem: connect accepted non-mutual classifier packages to installed inductive,
constructor, and recursor entries under one O-DECL/O-IND preservation statement.
Only after that should mutual/nested classifier totality be expanded.
