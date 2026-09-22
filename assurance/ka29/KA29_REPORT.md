# KA-29 Quotient Aggregate Environment Bridge Report

Checkpoint: `proofscript-v1-ka29-quot-env-aggregate-bridge0`  
Public version: `1.0.0-pskernel.32`  
Baseline: `proofscript-v1-ka28-quot-env-defeq-preservation-bridge0`

KA-29 adds one machine-checked aggregate Lean theorem over real Lean4Lean quotient/environment surfaces. It packages the KA-26 through KA-28 quotient facts into one bridge theorem while keeping PSKernel runtime semantics unchanged.

## New Lean theorem obligation

- `PSKernelKA29.translated_quot_env_aggregate_bridge`

## Direct imports

- `Lean4Lean.Theory.Typing.Env`
- `Lean4Lean.Theory.Typing.QuotLemmas`
- `PSKernelKA28QuotEnvDefEqPreservationBridge`

## Claim boundary

- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no
- Executable PSKernel refinement proof: no
- Quotient semantic soundness: no
- Trusted PSKernel semantic change: no
- Kernel codec change: no
- Core format: 71

Formal Lean4Lean bridge obligations: 51.

## Verification summary

Passed:

```text
npm install --offline --no-audit --no-fund
npm run build -- --pretty false
npm run test:pskernel:ka29
npm run assurance:ka29
npm run lean:ka29:check
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:psc:kernel-status
npm run test:psc:conformance-bounded
npm run arena:corpus-preflight
npm run test:arena:static-nonperf
npm run test:arena:tutorial
```

Not counted: `npm run verify:arena` and `npm run test:arena:tutorial-harness` timed out in this turn.

Fresh extract validation passed: install, build, `test:pskernel:ka29`, and `lean:ka29:check`.
