# KA-11 Offline Lean4Lean Dependency Gate Report

Checkpoint: `proofscript-v1-ka11-offline-lean4lean-deps0`  
Public version: `1.0.0-pskernel.13`

## Result

KA-11 successfully builds and imports the real uploaded Lean4Lean source using the exact uploaded offline `batteries v4.33.0-rc2` archive.

- Lean4Lean archive: `lean4lean-master(8).zip`
- Lean4Lean SHA-256: `295a1f4b23f39be73a27a7617c3fe1c6787892ff799607213b913419819f7383`
- Batteries archive: `batteries-4.33.0-rc2.zip`
- Batteries SHA-256: `fce734c8d1b18a617cdcbd8ee864e6db26fdc4015102888487241c5900e3c2d6`
- Lean4Lean toolchain: `leanprover/lean4:v4.33.0-rc2`
- Batteries toolchain: `leanprover/lean4:v4.33.0-rc2`
- Build status: `0`
- Import-check status: `0`

## What KA-11 closes

KA-10's remaining blocker was the unavailable exact `batteries v4.33.0-rc2` dependency. KA-11 closes that by extracting the exact archive, patching Lean4Lean's Lake dependency to a local path inside an isolated build tree, running `lake build Lean4Lean`, and then checking a real `import Lean4Lean` file through `lake env lean`.

## Boundary

- Trusted PSKernel semantic change: `false`
- Kernel codec change: `false`
- New trusted computation rule: `false`
- Core artifact format: `71`
- Actual Lean4Lean source present: `true`
- Exact Batteries dependency present: `true`
- Strict actual import passed: `true`
- Full Lean 4 equivalence: `false`
- Same theory as full Lean 4: `false`
- Formal Lean 4 equivalence proven obligations: `0`

## Next milestone

KA-12 should replace `Lean4LeanCompat`-only skeletons with a direct imported Lean4Lean module binding and begin the first real soundness lemma against Lean4Lean's imported declarations.

## Verification evidence

Passed in this checkpoint:

- `npm install --offline --no-audit --no-fund`
- `npm run build -- --pretty false`
- `npm run test:pskernel:ka1` through `test:pskernel:ka11`
- `npm run assurance:ka11`
- `npm run lean:ka11:import`
- `npm run test:arena:static-nonperf` with real corpus: 26/26 decisive, 4/4 good accepted, 22/22 bad rejected
- `npm run test:arena:tutorial` with real corpus: 140/140 decisive, 93/93 good accepted, 47/47 bad rejected
- remaining post-tutorial Arena checks: recursor-rule-arity, transparent-result-sort, mutual-imax-prop
- `npm run test:kernel:smoke`
- `npm run test:standalone-small`
- `npm run test:psc:kernel-status`
- `npm run test:psc:conformance-bounded`

Note: a single monolithic `npm run verify:arena` run was interrupted by the execution timeout while inside the tutorial runner; the tutorial runner and the remaining commands were rerun individually and passed.
