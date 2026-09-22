# Production P6.15 K3-TB Kernel Integration Report

Status: **INTEGRATED_WITH_LOCAL_PRODUCTION_GATES_PASSING**

Kernel boundary: **trusted-boundary K3-TB**

This integration is not fully formal K3.

This checkpoint replaces the previous practical/default trusted kernel path with the uploaded v71 K3-TB source from `proofscript-kernel-v71-k3tb-publish-preflight1.zip`.

## What changed

- Replaced `packages/kernel/src` with v71 `KERNEL-level-instantiation-conformance1` sources.
- Replaced `packages/kernel-codec/src` with v71 codec support for Core formats through v71.
- Set the unified production bridge default Core profile to `KERNEL-level-instantiation-conformance1`.
- Set the unified production bridge default Core format to v71.
- Added v71 / K3-TB verification tools, assurance evidence, manifests, and reviewer documents.
- Preserved P6.14 bounded String work where it remains above the trust boundary and does not weaken v71.
- Preserved historical v68 resource-bounds compatibility as a rollback/legacy artifact profile, not as the default practical kernel.

## Required wording

Use these labels:

- `KERNEL-level-instantiation-conformance1`
- Core v71
- trusted-boundary K3-TB
- practical/default kernel

Do **not** claim:

- fully formal K3
- complete Lean kernel equivalence
- verified TypeScript/Node runtime semantics
- arbitrary Lean acceptance completeness

v72 is reserved for fully formal K3 work.

## Verification performed in this sandbox

Commands run:

```bash
npm install --ignore-scripts
npm run clean
npm run build
npm run test:v71:local-merged
npm run test:production-p6:string
npm run verify:production:no-build
npm run verify:k3tb:publish
```

Observed passing checks:

```text
PASS KERNEL-v71-local-merged-regression: O-DECL preservation + TS classifier implementation bridge
✓ Production P6 bounded String ... + isNat + replay + TS + tamper rejection passed
✓ production verification passed (28 gates)
```

Observed blocked publish gate:

```text
AssertionError [ERR_ASSERTION]: PROOFSCRIPT_LEAN_BIN must point to Lean 4.33.1
```

The requested publish command was run, but this sandbox does not contain a Lean executable and cannot download one because DNS/network access is unavailable. This is an environment/tooling blocker, not a relaxation of the v71 K3-TB publish boundary. The publish verifier remains strict and still requires an explicit Lean 4.33.1 binary.

Reviewer command for a Lean-equipped machine:

```bash
PROOFSCRIPT_LEAN_BIN=/path/to/lean npm run verify:k3tb:publish
```

Expected successful boundary label from the uploaded v71 gate:

```text
K3TB_PUBLISH_PREFLIGHT_VERIFY_BOUNDARY=PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3
```

## Progress accounting

- Current P6 bounded String slice: ~92%.
- Practical/default trusted-boundary K3-TB kernel integration: ~95% locally integrated; publish gate pending exact Lean 4.33.1 execution.
- Overall production-grade ProofScript MVP: ~56%.

The overall percentage moved up because the default kernel is now v71 K3-TB, but it does not jump to 99% because the whole product still includes frontend coverage, runtime correspondence, package/module artifacts, broader language coverage, LSP/DX, and fully formal K3 work reserved for v72.
