# P5.94 Final Build Report — Arena Nested Helper Target Validation0

Status: **FROZEN**

Final archive: `proofscript-standalone-kernel-maturity-replacement-p5-94-arena-nested-helper-target-validation0.zip`  
SHA-256: `8994a1e4317b82b07a032004eda9a66255cab76e63ee0923cb0ebee40f9d873c`

## Baseline

Selected baseline: P5.93 `arena-nested-recursor-preflight0`.

## Feature

P5.94 adds nested helper recursor target validation for the audited Lean Kernel Arena nested-inductive frontier.

The previous checkpoint validated nested recursor topology and RHS/minor shape. P5.94 adds a stricter guard: each nested helper recursor rule must target a single already-validated container family and must cover that family consistently. A forged `Lean.Syntax.rec_2` helper rule that retargets a `List.nil` helper rule to `Array.mk` now rejects structurally.

Valid `Lean.Syntax` remains unsupported at `inductive.nested.helper-iota`, because nested helper recursor derivation and iota validation are not implemented. This is intentional: accepting helper recursors as axioms or trusting mixed helper targets would weaken the trusted boundary.

## Changed behavior

- Malformed nested helper target metadata: **reject**, exit 1.
- Valid but unsupported nested helper iota: **decline**, exit 2.
- Tutorial and static Arena agreement remain unchanged and fully decisive for the uploaded measured corpora.

## Changed files

- `packages/arena-checker/src/translate.ts`
- `tools/arena-nested-helper-target-validation-tests.ts`
- `package.json`
- release/status metadata and reports

## Verification

- Clean source ZIP / SHA / integrity: PASS.
- Source residue check: PASS; 0 node_modules/dist/tsbuildinfo/zip/mjs; 3 intentional vendored npm tarballs.
- Clean offline install/build: PASS.
- Focused nested helper target validation: PASS.
- Focused nested recursor preflight: PASS.
- Arena static: PASS, 26 total; 4/4 expected accept accepted; 22/22 expected reject rejected; 0 declined/wrong/crash/not-run.
- Arena tutorial strict: PASS, 140 total; 93/93 expected accept accepted; 47/47 expected reject rejected; 0 declined/wrong/crash/not-run.
- Kernel smoke: PASS.
- Standalone-small: PASS.
- Conformance: PASS.
- TypeScript migration audit: PASS.
- P5 baseline: PASS.
- Architecture/status: PASS.
- Exact Lean 4.33.1 differential: PASS, 25/25.
- K3-TB release and publish preflight: PASS, still not fully formal K3.
- npm workspace pack: PASS, 36/36.
- npm package SHA verification: PASS, 36/36.
- Fresh external consumer: PASS; good tutorial fixture exit 0; bad tutorial fixture exit 1; init-prelude exit 2 at nested helper iota; no Lean PATH dependency.

## Boundary

Kernel source changed: NO.  
Arena importer changed: YES.  
Kernel codec changed: NO.  
New trusted computation rule: NO.  
Full Lean 4 equivalence: NO.  
Fully formal K3: NO.  
ProofScript same theory as full Lean 4: NO.  
Formal Lean 4 equivalence proven obligations: 0.

Arena agreement is external evidence, not formal equivalence.
