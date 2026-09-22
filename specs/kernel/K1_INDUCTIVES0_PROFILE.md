# K1-inductives0 implementation profile

Status: implemented subset of **The ProofScript Language Reference v0.1**. Semantic target remains Lean 4.33.1. This profile name describes implementation coverage; it is not a language version or dialect.

## Implemented kernel slice

- Lean-style universe level AST: `zero`, `succ`, `max`, `imax`, declaration parameters.
- Explicit universe instantiation on constants and declaration universe-arity checking.
- `Sort`, bound variables, constants, application, lambda, dependent Pi.
- Impredicative-`Prop` Pi formation for the implemented universe procedure.
- beta reduction, the implemented function-eta slice, and definitional proof irrelevance for the supported fragment.
- theorem and axiom admission with transitive assumption tracking.
- restricted inductive admission:
  - non-mutual;
  - zero parameters;
  - zero indices;
  - at least one constructor in the current source frontend;
  - constructor fields are closed with respect to earlier constructor fields;
  - recursive fields may be exactly the inductive being defined;
  - other self occurrences are rejected;
  - data-inductive field universes are checked conservatively against the inductive universe.
- for non-`Prop` restricted inductives, generation and kernel checking of `I.rec` plus constructor computation rules.
- inert core artifact format v2; v1 `K0-bootstrap` artifacts remain decodable and are upgraded in memory before replay.

## Deliberately not claimed

This profile does **not** claim general Lean inductive compatibility. In particular it does not yet implement parameters, indices, dependent constructor fields, mutual/nested inductives, general positivity, exact Prop-elimination exceptions, general recursor metadata, `Eq`, standard `Nat`/`Bool` bootstrap, quotients, or full Lean definitional equality.

Any source form outside this implemented profile must be classified as unsupported or rejected for a genuine semantic/kernel violation; it must never receive substitute semantics.
