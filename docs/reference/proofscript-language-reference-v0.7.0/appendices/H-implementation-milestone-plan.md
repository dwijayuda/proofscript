# Appendix H — Implementation Milestone Plan

Status: **Recommended build plan v0.6.1**

This appendix turns the language reference into build milestones. The order is designed to produce useful software early while keeping the trust boundary small.

## H.1 Milestone M0 — manifest and corpus loader

Deliverables:

- read `conformance/feature-registry.json`;
- validate schema and unique feature IDs;
- load JSONL conformance cases;
- report claim ceiling as `S1-specified`.

Success criteria:

- malformed registry fails closed;
- unknown feature ID in a case fails closed;
- no parser implementation is required yet.

## H.2 Milestone M1 — D-CALL reference lowerer

Deliverables:

- parse the minimal adjacent-call AST in a reference model;
- lower `f(x)`, `f(x,y)`, `f()`, and `f((x,y))` to canonical Lean shape;
- preserve protected neighbor `f (x,y)` as deferred Lean.

Success criteria:

- all D-CALL positive/negative cases pass;
- source comments/whitespace break adjacency;
- lowering is left-associated.

## H.3 Milestone M2 — declaration aliases and explicit parameters

Deliverables:

- parse `const`, `function`, and canonical `def` declaration heads;
- lower both aliases to Lean `def`;
- reject `const` with declaration parameters;
- reject `function` without at least one explicit parameter group.

Success criteria:

- `const increment : Nat -> Nat := fun x => x + 1;` is accepted;
- `function answer : Nat := 42;` is rejected;
- canonical Lean output contains `def`, not alias keywords.

## H.4 Milestone M3 — E-IF-BRACE

Deliverables:

- parse only `if (condition) { thenExpr } else { elseExpr }`;
- require parentheses around the E-form condition;
- enforce one term per branch;
- lower to Lean `if condition then thenExpr else elseExpr`.

Success criteria:

- `if x { ... } else { ... }` is rejected for the E form;
- native `if c then t else e` remains deferred/accepted through Lean;
- nested calls inside branches are recursively parsed.

## H.5 Milestone M4 — braced declarations

Deliverables:

- E-STRUCT-BODY;
- E-CLASS-BODY;
- E-INDUCTIVE-BODY;
- E-WHERE-BODY.

Success criteria:

- outer braces are ProofScript delimiters;
- inner Lean binder braces remain binder syntax;
- field/constructor/local declaration order is preserved;
- unknown member forms fail closed or defer according to the declared category boundary.

## H.6 Milestone M5 — E-MATCH-BODY

Deliverables:

- parse `match discr with { | pat => rhs; }`;
- keep patterns native Lean;
- recursively parse ProofScript terms in right-hand sides;
- lower alternatives in order.

Success criteria:

- `.some x` works as native pattern syntax;
- `.some(x)` remains rejected in pattern position;
- `match f(x) with { ... }` exercises category lifting.

## H.7 Milestone M6 — stateful Lean integration

Deliverables:

- command-by-command frontend;
- state updates after each lowered Lean command;
- explicit handling for imported/scoped syntax collisions.

Success criteria:

- commands that add notation affect following commands only after elaboration;
- unregistered collision with a ProofScript-owned context fails closed in the verified profile.

## H.8 Milestone M7 — production refinement

Deliverables:

- TypeScript implementation emits canonical artifact/hash;
- Lean reference frontend emits canonical artifact/hash;
- CI compares them under `SyntaxEq` or declared canonicalization relation.

Success criteria:

- production parser success alone is never treated as proof;
- mismatch downgrades or rejects S3 claim.
