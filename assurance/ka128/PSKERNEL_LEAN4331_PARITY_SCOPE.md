# PSKernel Lean 4.33.1 Kernel Parity Scope

Checkpoint: `proofscript-v1-ka128-lean4331-kernel-parity-scope-matrix0`

This document starts the real equivalence track after KA-127. KA-127 closed the executable-equivalence dashboard, but KA-128 does **not** claim PSKernel equals Lean 4.33.1. The target is kernel-only parity, not elaborator/tactic/macro/compiler/runtime parity.

## In scope

- Lean 4.33.1 kernel objects and declaration checking
- expression/type/level/environment translation
- WHNF and definitional equality
- inductive declarations, constructors, recursors, projections
- quotients, proof irrelevance, transparency, environment extension, and rejection boundaries

## Out of scope for this parity track

- full parser/syntax compatibility
- full elaborator compatibility
- tactics, macros, typeclass search
- Lake, compiler/runtime, native codegen, IO runtime
- mathlib source compatibility as source code

## Matrix

| Feature | PSKernel status | Lean4 parity proof | Next proof work | Risk |
|---|---|---|---|---|
| Universe levels | implemented-slice-needs-parity-proof | unproven | Define TrLevel and prove level normalization/comparison soundness+completeness. | high |
| Expr representation | implemented-slice-needs-parity-proof | unproven | Formalize Expr translation relation and closedness lemmas. | high |
| Local contexts | partial-needs-audit | unproven | Build Lean/PS local-context paired corpus. | medium |
| Declaration checking | partial-needs-audit | unproven | Define declaration acceptance relation and rejection classes. | very-high |
| Axiom/theorem/definition/opaque declarations | partial-needs-audit | unproven | Audit PSKernel declaration metadata versus Lean declaration fields. | high |
| Mutual definitions | not-yet-proven | unproven | Separate kernel checking from elaborator termination evidence. | very-high |
| Inductives and recursors | implemented-slice-needs-parity-proof | unproven | Use KA45+ arena corpus to seed theorem obligations. | very-high |
| Constructors and projections | implemented-slice-needs-parity-proof | unproven | Connect structure runtime tests to kernel recursor/projection model. | high |
| WHNF | implemented-slice-needs-parity-proof | unproven | Formalize trace certificate relation for WHNF. | very-high |
| Definitional equality | implemented-slice-needs-parity-proof | unproven | Break into beta/delta/iota/proj/quot/proof-irrelevance lemmas. | very-high |
| Universe cumulativity | partial-needs-audit | unproven | Create invalid/valid cumulative universe corpus. | high |
| Quotients | not-yet-proven | unproven | Isolate quotient primitives and prove/compare reduction rules. | very-high |
| Proof irrelevance | not-yet-proven | unproven | Add Prop/proof irrelevance conformance corpus. | very-high |
| Transparency/reducibility | partial-needs-audit | unproven | Map Lean transparency modes to PSKernel options. | high |
| Environment extension/order | partial-needs-audit | unproven | Formalize TrEnv and addDecl preservation/completeness. | high |
| Trust/unsafe boundary | partial-needs-audit | unproven | Audit trust levels and metadata claims. | high |
| Kernel rejection/error boundary | partial-needs-audit | unproven | Build negative conformance corpus and classify errors. | very-high |
| Erased proof/runtime boundary | implemented-dashboard-only | unproven | Keep proof/runtime boundary explicit in release gates. | medium |
| Artifact translation relation | not-yet-proven | unproven | Start KA-130 translation skeleton after conformance corpus. | very-high |
