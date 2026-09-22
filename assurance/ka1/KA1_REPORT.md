# PSKernel KA-1 — Lean 4.33.1 Inventory and Equivalence Skeleton

Checkpoint: `proofscript-v1-ka1-lean4331-inventory0`  
Public version: `1.0.0-pskernel.3`  
Baseline: `proofscript-v1-pskernel-real-arena0`

## Scope

KA-1 adds the first explicit assurance layer for making PSKernel equivalent to Lean 4 theory over the supported Core fragment.

No trusted kernel semantics were changed.

## Current status

- Active kernel: `PSKernel`
- Default profile: `KERNEL-level-instantiation-conformance1`
- Core artifact format: `71`
- Certificate format: `2`
- Resource-security profile: `KERNEL-resource-bounds0` accepted
- Latest real Arena baseline: `proofscript-v1-pskernel-real-arena0`
- Full Lean 4 equivalence: NO
- Same theory as full Lean 4: NO
- Fully formal K3: NO
- Formal Lean 4 equivalence proven obligations: 0

## Added artifacts

- `assurance/ka1/lean-4.33.1-kernel-inventory.json`
- `assurance/ka1/pscore-v71-spec.json`
- `assurance/ka1/proof-obligations.json`
- `assurance/ka1/gap-matrix.json`
- `assurance/ka1/translation-soundness-skeleton.lean`
- `tools/pskernel-ka1-assurance.ts`
- `tools/pskernel-ka1-assurance-tests.ts`

## Meaning

KA-1 is not an equivalence proof. It turns the vague goal “equivalent to Lean 4 theory” into a concrete work program:

1. inventory the Lean 4.33.1 kernel concepts PSKernel must match;
2. classify PSCore v71 artifact fields by trust role;
3. record proof obligations;
4. list remaining gaps;
5. add theorem target names for declaration-checking soundness, definitional-equality soundness, replay soundness, and supported-Core completeness.

## Next recommended advancement

`KA-2`: implement the formal translation relation for levels, expressions, declarations, and environments, then prove the first soundness theorem for the non-inductive core fragment.
