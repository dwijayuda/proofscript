# KA-17 Env Lookup Bridge Report

Checkpoint: `proofscript-v1-ka17-env-lookup-bridge0`  
Public version: `1.0.0-pskernel.20`  
Baseline: `proofscript-v1-ka16-env-extension-bridge0`

KA-17 adds a narrow direct Lean4Lean reference bridge for environment lookup and definitional-equation membership. It imports real Lean4Lean environment typing theory and checks three conditional lemmas against the imported `Lean4Lean.VEnv.constants` map and `Lean4Lean.VEnv.defeqs` relation:

- `PSKernelKA17.translated_axiom_env_lookup`
- `PSKernelKA17.translated_definition_env_lookup`
- `PSKernelKA17.translated_definition_env_defeq_member`

These lemmas build on KA-13's `VDecl.WF` bridge, KA-15's `VEnv.WF` bridge, and KA-16's `VEnv.LE` extension bridge. They prove that translated non-inductive axiom/definition additions become discoverable in the Lean4Lean reference environment when Lean4Lean's own `addConst`/`addDefEq` premises hold.

## Claim boundary

- Trusted PSKernel semantic change: **no**
- Kernel codec change: **no**
- New trusted computation rule: **no**
- Core artifact format: **71**
- Full Lean 4 equivalence: **no**
- Same theory as full Lean 4: **no**
- Fully formal K3: **no**
- Executable PSKernel refinement proof: **no**
- Formal Lean4Lean bridge obligations proven: **9**

The nine counted obligations are KA-13's two conditional `VDecl.WF` lemmas, KA-15's two conditional `VEnv.WF` lemmas, KA-16's two conditional `VEnv.LE` lemmas, and KA-17's three conditional `VEnv.constants`/`VEnv.defeqs` lookup-membership lemmas.

## Verification summary

Passed:

- `npm install --offline --no-audit --no-fund`
- `npm run build -- --pretty false`
- `npm run test:pskernel:ka1` through `test:pskernel:ka17`
- `npm run assurance:ka1` through `assurance:ka17`
- `npm run lean:ka16:check`
- `npm run lean:ka17:check`
- `npm run test:kernel:smoke`
- `npm run test:standalone-small`
- `npm run test:psc:kernel-status`
- `npm run test:psc:conformance-bounded`
- `npm run arena:corpus-preflight`
- `npm run test:arena:static-nonperf`
- `npm run test:arena:tutorial`
- `npm run verify:arena`

Aggregate all-KA loops timed out while entering expensive KA-12 gates, so the aggregate-loop timeout itself is **not** counted as a pass. KA-12 through KA-17 were rerun individually and passed.

## Arena evidence retained

- Corpus path: `/mnt/data/arena-corpus-20260915`
- NDJSON fixtures: **190**
- Static non-performance: **26/26 decisive**, **4 good accepted**, **22 bad rejected**, **0 wrong**, **0 not-run**
- Tutorial: **140/140 decisive**, **93 good accepted**, **47 bad rejected**, **0 wrong**, **0 not-run**
