# Appendix B — Lean 4.34 reference coverage map

Normative baseline:

```text
Lean 4.34.0
293d5d0c0c3f3dded4688b3ccd6a33939ac5102b
```

Non-normative compatibility watch:

```text
Lean 4.35.0-rc2
11acb17ec6b07a8f9e9173e6845197929540936b
```

This is a study/coverage map, not a claim that ProofScript exposes every Lean feature.

| Lean area | ProofScript relevance |
|---|---|
| lexical syntax/parser categories | inherited syntax and D/E ownership |
| macros/syntax extensions | imported syntax, hygiene, collision policy |
| terms/binders/application | core terms and D-CALL |
| commands/declarations | defs, theorems, structures, classes, inductives |
| metavariables/elaboration | implicit args, holes, expected types |
| typeclass synthesis/coercions | standalone meta/elab compatibility |
| universes/dependent types | logical semantics |
| definitional equality/WHNF | kernel compatibility |
| inductives/recursors/quotients | declaration/reduction semantics |
| pattern matching | E-MATCH-BODY and recursor semantics |
| recursion/termination/positivity | accepted programs/declarations |
| tactics/proof terms | proof construction outside the kernel TCB |
| simplifier/rewriting | theorem-prover frontend capability |
| Grind/automation | future tactic capability, not current core syntax |
| MVCGen/verification conditions | future verification-extension track |
| do/effects/iterators | executable/software profile, including Lean 4.34 verification-only `erased` do bindings |
| coinductive/inductive suffixes | Lean 4.34 `monotonicity_by` inherited declaration syntax |
| built-in checked restatement commands | Lean 4.34 `recall` / `recall?` inherited commands |
| tactic parameter syntax | Lean 4.34 `lia [...]` / `grobner [...]` inherited tactic forms |
| compiler IR/native proof evaluation | executable compiler/meta-tactic concern; final Lean 4.34 removed in-kernel native reduction |
| environment/modules | portable module/npm distribution |
| proof validation/axioms | assurance/claim reporting |
| language/server | incremental language service and LSP |
| release/platform notes | future semantic rebase impact |

A Lean semantic-baseline rebase MUST review the relevant rows and regenerate compatibility evidence before becoming normative.
