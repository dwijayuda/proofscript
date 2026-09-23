# Product-v1 Closeout

Status: **CLOSED**

Source commit closed by the acceptance run:

`0abea67df1bef85a567cb08ce52ef9ab8382b543`

Closure date: **2026-09-23**

Branch: `product/v1-completion`

## Closure command

```powershell
npm run assurance:product-v1:endtest -- `
  --toolchains 4.33.1,4.34.0,4.35.0-rc2 `
  --out .proofscript-product-v1-endtest/summary.json
```

The closure run was strict: no `--diagnose-all` and no `--skip-lean`.

## Final acceptance result

The `proofscript.product-v1-endtest/v1` summary reported:

- total Product-v1 gates: **25**
- passed: **25**
- failed: **0**
- skipped: **0**
- non-Lean Product-v1 gates passed: **true**
- verification passed: **true**
- diagnostic mode: **false**
- `allProductV1GatesPassed`: **true**

## Proof-required verification result

The nested Product-v1 verification end-test reported:

- total verification stages: **8**
- passed: **8**
- failed: **0**
- skipped: **0**
- loop proofs discharged: **true**
- stateful proofs discharged: **true**
- all state models adequate: **true**
- `allVerificationProofsDischarged`: **true**

### Loop matrix

Case:

- `examples/software/09-count-to-loop-vc.ps`

Toolchains:

- Lean 4.33.1
- Lean 4.34.0
- Lean 4.35.0-rc2

Result:

- **3/3 proved**
- zero failed
- provenance consistent
- generated Lean hash consistent across lanes

Current loop claim boundary remains explicit:

- `sourceRuntimeCorrespondenceChecked = false`

### Stateful matrix

Cases:

- debit
- transfer
- frame
- logical
- invoice

Toolchains:

- Lean 4.33.1
- Lean 4.34.0
- Lean 4.35.0-rc2

Result:

- **15/15 proved**
- zero failed
- all state models adequate
- provenance consistent
- zero residual proof goals in the proof-required matrix

The matrix therefore covers 5 canonical cases × 3 Lean lanes.

## Product-v1 capabilities closed by this gate

The closed bounded product includes:

- canonical parser / names / Lean-compatible elaboration / checked dependent Core;
- PSKernel checking for the supported Product-v1 profile;
- executable TypeScript/JavaScript backend path;
- Nat, Int, Bool, String, Unit plus bounded Option/Except/List/Array/structure/inductive runtime representations;
- pure contracts and proof obligations;
- bounded stateful verification with model adequacy checks;
- bounded frame conditions;
- bounded loop invariant / decreases VCs;
- trusted-external JS/npm FFI with explicit boundary metadata;
- source packages and bounded stdlib profile;
- runtime/certificate provenance and artifact binding;
- runtime differential corpus;
- formatter;
- compiler-backed language service / worker / LSP / VS Code path;
- representative applications;
- packed fresh-release installation gate.

## Explicit nonclaims after closure

Product-v1 closure does **not** claim:

- full Lean 4 equivalence;
- full Lean kernel equivalence;
- full Lean tactic parity;
- full TypeScript syntax compatibility;
- full Lean stdlib or Mathlib compatibility;
- arbitrary macros or Lean metaprogramming;
- arbitrary stateful branching / exceptions / unrestricted mutation;
- general IO/effect semantics;
- source-to-Lean program equivalence for the recorded stateful cases;
- exceptional-path coverage for the recorded stateful cases;
- formal Core→TypeScript refinement;
- formal TypeScript→JavaScript refinement;
- end-to-end formally verified JavaScript merely from structural certificates;
- runtime correspondence proof for the loop case.

These are separate future assurance/product milestones.

## Freeze rule

The bounded Product-v1 acceptance set is now frozen by this closeout.

Future feature work should land on a new branch/milestone and must not silently
rewrite the meaning of the closed 25-gate acceptance result.

The next planned product-development line may extend proof ergonomics
(`show`, tactic-`have`, bounded `rw`, `subst`, `constructor`, `cases`,
`induction`, bounded `simp`) while preserving the rule that tactics construct
ordinary proof terms which are still checked by PSKernel.
