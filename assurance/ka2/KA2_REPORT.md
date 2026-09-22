# PSKernel KA-2 — Translation Relation Scaffold

Checkpoint: `proofscript-v1-ka2-translation-relation0`  
Public version: `1.0.0-pskernel.4`  
Baseline: `proofscript-v1-ka1-lean4331-inventory0`

## Scope

KA-2 adds an executable assurance translation scaffold from PSCore v71 shapes to a Lean 4.33.1 reference-model shape. It does not change trusted kernel semantics and it does not prove equivalence.

## Added artifacts

- `assurance/ka2/translation-relation.json`
- `assurance/ka2/translation-obligations-delta.json`
- `assurance/ka2/translation-soundness-skeleton.lean`
- `tools/pskernel-ka2-translation.ts`
- `tools/pskernel-ka2-translation-tests.ts`

## Meaning

KA-1 named the proof obligations. KA-2 starts making the translation relation executable:

- universe levels translate for `zero`, `succ`, `max`, `imax`, and `param`;
- unresolved universe metavariables are blocked before trusted Core;
- Core term shapes translate to reference expression shapes;
- free variables/metavariables remain blocked from trusted Core;
- metadata is erased as semantically inert;
- declarations map to Lean-like declaration categories.

## Still not claimed

- Full Lean 4 equivalence: NO
- Same theory as full Lean 4: NO
- Fully formal K3: NO
- Formal Lean 4 equivalence proven obligations: 0

## Next recommended advancement

`KA-3`: bind the translation scaffold to an actual Lean/Lean4Lean formal model and prove the first non-inductive declaration-checking soundness slice.
