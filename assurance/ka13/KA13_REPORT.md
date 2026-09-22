# KA-13 VDecl.WF Bridge Report

Checkpoint: `proofscript-v1-ka13-vdecl-wf-bridge0`  
Public version: `1.0.0-pskernel.16`  
Baseline: `proofscript-v1-ka12-direct-lean4lean-reference0`

## Advancement

KA-13 moves one step beyond KA-12's shape translation. It imports the real Lean4Lean typing-environment theory:

```lean
import Lean4Lean.Theory.Typing.Env
```

and proves the first conditional bridge lemmas into the real imported relation:

```lean
Lean4Lean.VDecl.WF
```

The checked lemmas are:

- `PSKernelKA13.translated_axiom_vdecl_wf`
- `PSKernelKA13.translated_definition_vdecl_wf`

## What KA-13 proves

KA-13 proves that if KA-12 translation has produced a real Lean4Lean declaration value and Lean4Lean's own well-formedness/addition premises are supplied, then:

- a translated axiom satisfies `VDecl.WF env (VDecl.axiom c) env'`;
- a translated definition satisfies `VDecl.WF env (VDecl.def v) (env'.addDefEq v.toDefEq)`.

This is a conditional Lean theorem bridge against imported Lean4Lean theory structures. It is not merely a JSON/report scaffold.

## Boundary

No trusted PSKernel semantics changed. KA-13 is an assurance-layer milestone.

Still not claimed:

- full Lean 4 equivalence;
- same theory as full Lean 4;
- fully formal K3;
- executable PSKernel-to-Lean4Lean refinement proof;
- theorem/example/opaque/quot VDecl.WF bridge coverage;
- inductive/mutual/nested soundness.

Formal Lean4 equivalence proven obligations are counted as `2` only for the two conditional Lean4Lean `VDecl.WF` bridge lemmas above.

## Strict gate result

`npm run lean:ka13:check`: PASS

- Reference kind: `direct-imported-lean4lean-vdecl-wf-bridge`
- Lean4Lean source bound: `true`
- KA-12 dependency gate: `true`
- Direct KA-13 bridge checked: `true`
- Theory build status: `0`
- Bridge check status: `0`

## Remaining obligations

- Link executable PSKernel checking results to the Lean4Lean premises used by these lemmas.
- Add theorem/example/opaque/quot bridge cases where the Lean4Lean relation supports them.
- Prove definitional equality soundness against Lean4Lean.TypeChecker.
- Keep full Lean 4 equivalence unclaimed until the necessary machine-checked theorem obligations exist.
