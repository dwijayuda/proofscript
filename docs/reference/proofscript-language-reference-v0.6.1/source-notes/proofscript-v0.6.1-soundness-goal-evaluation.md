# ProofScript Language Reference v0.6.1 — Soundness and Goal-Consistency Evaluation

Status: **Post-draft audit**

## Verdict

The v0.6.1 draft is consistent with ProofScript's stated goal:

> TypeScript-friendly syntax where it helps; Lean semantics wherever it matters.

The design is sound as an architecture because it defines verified meaning exclusively through canonical Lean lowering. It does not create another type theory, another equality relation, another theorem checker, or another effect semantics.

## Soundness assessment

The reference is logically safe at the specification level because:

1. `meaningPS(p) := meaningLean(lower(p))` is the only verified semantic definition.
2. `const` and `function` canonicalize to Lean `def` and do not introduce JavaScript declaration semantics.
3. D-CALL lowers to ordinary curried Lean application.
4. E-class constructs are source exceptions, not semantic exceptions.
5. TypeScript runtime behavior is separated from Lean proof validity.
6. The claim ladder prevents S1 design from being advertised as S2/S3 proof.

## Consistency with TypeScript-friendliness

The draft improves approachability through:

- `const` for parameterless declarations;
- `function` for parameterized declarations;
- `f(x, y)` calls;
- comma-separated explicit parameter groups;
- braced `if`, `match`, `structure`, `class`, `inductive`, and `where` bodies;
- semicolons only in registered declaration/structural contexts.

It deliberately rejects features that would be familiar but misleading, such as TypeScript `<T>` generics, JavaScript arrow lambdas, JS truthiness, `any`, `null`, prototypes, and unrestricted `return`.

## Consistency with Lean fidelity

The draft keeps Lean concepts visible:

- `Nat`, `Int`, `Bool`, `String`, `Unit`, `Type`, `Prop`;
- `def`, `theorem`, `structure`, `inductive`, `class`, `instance`;
- `where`, `match`, `with`, `fun`, `by`, `do`;
- `:=`, `=`, and `==` as distinct concepts;
- Lean binder categories `{}`, `{{}}`, `[]`, and `()`.

This is the right balance: ProofScript looks friendlier without pretending to be TypeScript.

## Remaining risks

The reference is still S1. It is not yet a machine-checked proof.

Main risks before S2:

1. The reference parser might fail to match the real Lean 4.33.1 category behavior.
2. E-class syntax could accidentally capture more than its registered context.
3. A production TypeScript parser might diverge from the reference frontend.
4. Source maps and diagnostics might point to generated Lean rather than `.ps` source.
5. TypeScript runtime emission might silently use JavaScript semantics for values that should follow Lean executable behavior.

## Recommendation

Use v0.6.1 as the new authoring baseline and begin implementation/proof work in this order:

1. D-CALL reference parser and lowering proof.
2. `const`/`function` alias parser and lowering proof.
3. Explicit parameter grouping proof.
4. E-IF-BRACE proof.
5. Structure/class and inductive braced-body proofs.
6. Match/where exception proofs.
7. Production frontend comparison.
8. TypeScript executable-profile runtime correspondence.

## Current rating

| Dimension | Rating |
|---|---:|
| Product-goal alignment | 9.4/10 |
| Lean semantic fidelity | 9.5/10 |
| TypeScript readability | 9.0/10 |
| Formal proof architecture | 9.0/10 |
| Current proof evidence | S1 only |
| Overall readiness as reference baseline | High |
