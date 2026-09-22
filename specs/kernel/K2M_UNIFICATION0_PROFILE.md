# K2m-unification0 implementation profile

K2m is an implementation-coverage milestone of ProofScript Language Reference v0.1. It does not define a new language dialect.

## Added coverage

- Elaborator-only scoped metavariables for omitted `implicit` and `strictImplicit` **type** parameters.
- Occurs-checked first-order structural unification against the inferred type of the next explicit source argument.
- Multiple consecutive hidden type parameters may be solved when all occur in the next explicit argument type, e.g. `Pair A B` unified with `Pair Nat Bool`.
- K2l direct inference `{A : Type} (x : A)` remains a special case of this more general solver.
- Every solved hidden argument is inserted as an ordinary explicit Core `App` and revalidated by the kernel.

## Trust boundary

Metavariables exist only in `@proofscript/elaborator/src/metavars.ts`. The serialized v8 Core format contains no metavariable constructor and the kernel has no metavariable rule. All metas must be solved before a declaration can be emitted.

## Deliberate limits

K2m does **not** implement full Lean elaboration/unification. In particular it does not yet implement:

- instance/typeclass synthesis;
- higher-order or flex-rigid unification;
- metavariables under Pi/lambda/let patterns;
- coercions;
- named arguments;
- optional/default binder synthesis;
- delayed constraints or backtracking search.

Unsupported shapes report `unsupported`; they are not assigned substitute semantics.

## Artifact compatibility

The wire format remains `proofscript-core` format version 8 because metavariables are frontend-only. v8 artifacts produced by K2k and K2l remain accepted and are normalized to the current K2m in-memory artifact identity after decoding.
