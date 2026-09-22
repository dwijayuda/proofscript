# KA-19: Direct Lean4Lean Environment DefEq Preservation Bridge

Checkpoint: `proofscript-v1-ka19-env-defeq-preservation-bridge0`  
Public version: `1.0.0-pskernel.22`  
Baseline: `proofscript-v1-ka18-env-no-overwrite-bridge0`  
Core artifact format: `71`  
Certificate format: `2`

KA-19 adds the next narrow machine-checked Lean4Lean bridge after KA-18. It imports the real Lean4Lean environment typing theory through the inherited KA-18 chain and proves conditional facts about `Lean4Lean.VEnv.defeqs` preservation under translated axiom/definition environment updates.

## New checked obligations

- `PSKernelKA19.translated_axiom_preserves_existing_defeq`
- `PSKernelKA19.translated_definition_preserves_existing_defeq`
- `PSKernelKA19.translated_definition_preserves_existing_and_adds_new_defeq`

Formal Lean4Lean bridge obligations increase from `13` to `16`.

## Verification

Passed:

- `npm install --offline --no-audit --no-fund`
- `npm run build -- --pretty false`
- `npm run test:pskernel:ka1` through `npm run test:pskernel:ka19`
- `npm run assurance:ka1` through `npm run assurance:ka19`
- `npm run lean:ka16:check`
- `npm run lean:ka17:check`
- `npm run lean:ka18:check`
- `npm run lean:ka19:check`
- `npm run test:kernel:smoke`
- `npm run test:standalone-small`
- `npm run test:psc:kernel-status`
- `npm run test:psc:conformance-bounded`
- `npm run arena:corpus-preflight`
- `npm run test:arena:static-nonperf`
- `npm run test:arena:tutorial`
- `npm run verify:arena`

Aggregate KA loops timed out around expensive Lean4Lean gates and were not counted as passes. The timed-out tail commands were rerun individually and passed.

## Arena evidence retained

- Corpus path: `/mnt/data/arena-corpus-20260915`
- NDJSON fixtures: `190`
- Static non-performance: `26/26` decisive, `4` good accepted, `22` bad rejected, `0` wrong, `0` not-run
- Tutorial: `140/140` decisive, `93` good accepted, `47` bad rejected, `0` wrong, `0` not-run

## Boundary

No trusted PSKernel semantic change, no kernel codec change, and no Core format change are made. Core format remains `71` and certificate format remains `2`.

This is conditional Lean4Lean assurance only. It is not a proof of full Lean 4 equivalence, same-theory equivalence with Lean 4, fully formal K3, or executable PSKernel refinement.

## Fresh extract smoke

The final source ZIP was extracted into a clean directory with zero `node_modules`, zero `dist`, zero `*.tsbuildinfo`, zero tarballs, and zero nested ZIPs. Offline install, build, `test:pskernel:ka19`, and `lean:ka19:check` passed. The aggregate fresh-smoke shell command timed out during the expensive Lean gate, so the tail commands were rerun individually and only those normal exits are counted.
