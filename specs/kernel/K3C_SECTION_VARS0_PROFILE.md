# K3c-section-vars0 implementation profile

Status: release candidate pending full production gate.

K3c-section-vars0 extends frozen K3c-sections-open0 with named section variables and theorem `include`/`omit`. It adds **no kernel term, declaration kind, typing rule, conversion rule, section state, or automatic-generalization rule**. The frontend computes explicit declaration telescopes before the trust boundary; logical Core remains artifact v12.

## Implemented source slice

- named `variable` declarations using existing explicit, implicit, and strict-implicit BinderInfo;
- section-variable scope nested with ordinary sections/namespaces;
- automatic inclusion for supported value declarations based on referenced variables;
- transitive dependency closure in original section declaration order;
- BinderInfo preservation in generated `Pi` and `Lam` telescopes;
- theorem statement-driven generalization;
- theorem-specific named `include` and `omit`;
- proof-only theorem use of an unavailable section variable is rejected;
- `omit` rejects a theorem if the variable is still required directly or transitively;
- ordinary definitions/examples generalize variables referenced in their types/bodies independently of theorem include/omit policy;
- explicit declaration binders shadow same-named section variables;
- lexical policy restoration after nested section/namespace exit.

A section variable is not a runtime variable. For example, a source definition that depends on `{A : Type}` and `(x : A)` becomes an ordinary explicit Core telescope equivalent to `{A : Type} -> A -> ...`. Strict replay checks only that explicit Core.

## Deliberately deferred / fail-closed

- section instance variables and local/scoped instance visibility;
- `omit` by instance type;
- interactions between include/omit and local instance synthesis;
- rebinding active section-variable declarations with unsupported shapes;
- section-variable capture for non-value declaration families not modeled by this slice;
- selective/hiding/renaming opens, `open ... in`, `open scoped`;
- private/internal/public visibility, export/re-export semantics, public/meta/import-all;
- persistent module-interface cache IO.

These features must return `unsupported` or a precise source rejection rather than being approximated.

## Compatibility and evidence

The current producer remains Core artifact v12 / certificate v2 with implementation profile `K3c-section-vars0`. Historical v12 `K3b-module-interfaces0`, `K3c-names0`, and `K3c-sections-open0` artifacts retain profile-bound cache/interface validation and replay.

The exact Lean 4.33.1 schema-2 corpus contains 24 cases. The added `section-vars` semantic-equivalence case checks telescope generalization, dependency closure, BinderInfo, and theorem include/omit semantics against an independently handwritten Lean reference. This is evidence for the implemented slice, not complete Lean section-variable conformance.
