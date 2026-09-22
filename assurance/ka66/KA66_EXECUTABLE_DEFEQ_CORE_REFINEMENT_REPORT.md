# KA-66 Executable DefEq Core Refinement Report

Checkpoint: `proofscript-v1-ka66-executable-defeq-core-refinement0`

Public version: `1.0.0-pskernel.69`

Baseline: `proofscript-v1-ka65-executable-whnf-refinement0`

## What changed

KA-66 promotes four direct Lean4Lean DefEq proof surfaces into strict counted bridge obligations: top-level `isDefEqCore`, recursive `isDefEqCore'`, `quickIsDefEq`, and application-argument DefEq. No trusted PSKernel semantics, codec, Core format, or certificate format are changed. KA-66 also fixes the release test runner so child TypeScript tools inherit the parent Node strip-types flags; the full suite then exposes a pre-existing indexed-recursor iota regression reproduced unchanged on the untouched KA-65 baseline.

## Machine-checked bridge lemmas

- `translated_isDefEqCore_wf`
- `translated_isDefEqCore_prime_wf`
- `translated_quickIsDefEq_wf`
- `translated_isDefEqArgs_wf`

## No-spaghetti result

- Anti-spaghetti gate: **passed**
- KA-66 tool files: **2**
- New KA-66 oversized files: **0**
- Semantic package touched: **false**

## Boundary

- Full Lean4 equivalence: **no**
- Same theory as full Lean4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Full executable WHNF/DefEq refinement: **no**
- Trusted PSKernel semantic change: **no**
- Core format changed: **no**
- Certificate format changed: **no**
