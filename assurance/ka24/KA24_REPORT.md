# KA-24 NonDef Environment No-Overwrite Bridge Report

## Checkpoint

- Checkpoint: `proofscript-v1-ka24-nondef-env-no-overwrite-bridge0`
- Public version: `1.0.0-pskernel.27`
- Baseline: `proofscript-v1-ka23-nondef-env-lookup-bridge0`
- Core artifact format: `71`
- Certificate format: `2`

## What changed

KA-24 adds a direct imported Lean4Lean bridge for non-definition declarations
that actually add constants to the environment: translated `theorem` and
`opaque` declarations. It proves successful `addConst` requires freshness and
preserves unrelated existing constant lookups.

Translated `example` remains non-adding, so KA-24 records it as non-adding
rather than proving fake insertion facts.

## Machine-checked Lean obligations

- `PSKernelKA24.translated_theorem_fresh_before_add`
- `PSKernelKA24.translated_opaque_fresh_before_add`
- `PSKernelKA24.translated_theorem_preserves_other_lookup`
- `PSKernelKA24.translated_opaque_preserves_other_lookup`

Total conditional Lean4Lean bridge obligations through KA-24: `32`.

## Boundary

- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no
- Executable PSKernel refinement proof: no
- Trusted PSKernel semantic change: no
- Kernel codec change: no
- New trusted computation rule: no

## Verification

Passed release evidence:

- `npm install --offline --no-audit --no-fund`
- `npm run build -- --pretty false`
- `npm run test:pskernel:ka20` through `npm run test:pskernel:ka24`
- `npm run assurance:ka22`, `assurance:ka23`, `assurance:ka24`
- `npm run lean:ka22:check`, `lean:ka23:check`, `lean:ka24:check`
- `npm run test:kernel:smoke`
- `npm run test:standalone-small`
- `npm run test:psc:kernel-status`
- `npm run test:psc:conformance-bounded`
- `npm run arena:corpus-preflight`
- `npm run test:arena:static-nonperf`
- `npm run test:arena:tutorial`
- `npm run verify:arena`

Arena retained evidence: 190 NDJSON fixtures; static non-performance 26/26 decisive (4 accepted-good, 22 rejected-bad); tutorial 140/140 decisive (93 accepted-good, 47 rejected-bad); zero wrong results and zero not-run in those two corpus gates.

Implementation note: KA-22 and KA-23 inherited version assertions were widened to accept the KA-24 public package version. This is a release-gate compatibility fix only; PSKernel trusted semantics, Core format, and codec behavior are unchanged.

Final artifact checks:

- Fresh extract install/build/test:pskernel:ka24/lean:ka24:check: passed
- Final ZIP integrity: passed
- Release ZIP residue: 0 node_modules, 0 .tgz, 0 embedded .zip, 0 .tsbuildinfo
