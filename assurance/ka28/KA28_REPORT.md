# KA-28 Quotient DefEq Preservation Bridge Report

Checkpoint: `proofscript-v1-ka28-quot-env-defeq-preservation-bridge0`

Public version: `1.0.0-pskernel.31`

Baseline: `proofscript-v1-ka27-quot-env-no-overwrite-bridge0`

KA-28 adds a narrow direct Lean4Lean bridge for quotient definitional-equation preservation. It imports real Lean4Lean environment and quotient theory, then proves that successful `VEnv.addQuot` preserves pre-existing `VEnv.defeqs` facts and also exposes the quotient defining equation.

## Machine-checked Lean bridge obligations

- `PSKernelKA28.translated_quot_preserves_existing_defeq`
- `PSKernelKA28.translated_quot_preserves_existing_and_adds_quot_defeq`

Total formal Lean4Lean bridge obligations: `50`.

## Boundary

- Trusted PSKernel semantic change: no
- Kernel codec change: no
- New trusted computation rule: no
- Core format changed: no, still 71
- Full Lean 4 equivalence: no
- Same theory as full Lean 4: no
- Fully formal K3: no
- Executable PSKernel refinement proof: no
- Quotient semantic soundness: no

## Verification

Passed:

- `npm install --offline --no-audit --no-fund`
- `npm run build -- --pretty false`
- `npm run test:pskernel:ka28`
- `npm run assurance:ka28`
- `npm run lean:ka28:check`
- `npm run test:kernel:smoke`
- `npm run test:standalone-small`
- `npm run test:psc:kernel-status`
- `npm run test:psc:conformance-bounded`
- `npm run arena:corpus-preflight`
- `npm run test:arena:static-nonperf`

Not counted:

- combined verification batch timed out at lean:ka28:check; lean:ka28:check and remaining tail were rerun individually
- npm run test:arena:tutorial timed out in this turn and is not counted for KA-28
- npm run verify:arena was not run/counted for KA-28 because tutorial did not complete in this turn

Fresh extract validation passed:

- `fresh extract npm install --offline --no-audit --no-fund`
- `fresh extract npm run build -- --pretty false`
- `fresh extract npm run test:pskernel:ka28`
- `fresh extract npm run lean:ka28:check`
