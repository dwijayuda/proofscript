# Production P5.16 Option.bind / Except.bind Feature Report

## Scope

P5.16 adds explicit `Option.bind(A, B, value, f)` and `Except.bind(E, A, B, value, f)` to the PSC-1 controlled-feature path.

The feature is intentionally small:

- explicit type arguments only;
- binder functions must already check as `A -> Option(B)` or `A -> Except(E, B)`;
- reduction fires only for checked constructor-shaped `Option` / `Except` values;
- JavaScript/TypeScript helpers execute only emitted Core that has already passed the K3-TB checker;
- this does not add do-notation, inferred Monad/typeclass syntax, or full Lean library semantics.

## Architecture path

```text
.ps source
  -> parser/application syntax
  -> elaborator ordinary checked Core application
  -> checked bootstrap declarations for Option.bind / Except.bind
  -> K3-TB bounded kernel reduction over checked constructors
  -> JS/TS backend helper emission
  -> runtime tagged-record execution
```

## Supported behavior

```ts
function someSucc(x: Nat): Option(Nat) := { Option.some(Nat, x + 1) }
function okSucc(x: Nat): Except(String, Nat) := { Except.ok(String, Nat, x + 1) }

def boundSome: Option(Nat) := { Option.bind(Nat, Nat, Option.some(Nat, 2), someSucc) }
def boundNone: Option(Nat) := { Option.bind(Nat, Nat, Option.none(Nat), someSucc) }

def boundOk: Except(String, Nat) := { Except.bind(String, Nat, Nat, Except.ok(String, Nat, 4), okSucc) }
def boundError: Except(String, Nat) := { Except.bind(String, Nat, Nat, Except.error(String, Nat, "bad"), okSucc) }
```

## Verification evidence

- Focused feature test: `tools/pslive-option-except-bind-tests.ts`.
- Foundation/bootstrap regression: `tools/k1d-foundation-tests.ts`.
- Controlled-release gate: `tools/verify-p5-controlled-release.ts`.
- Governance evidence: `config/feature-promotion-gate.json`, `config/verification-matrix.json`, and `config/production-traceability-bundle.json`.

## Non-goals

P5.16 does not implement full Monad/typeclass support, do-notation, inferred bind syntax, full Lean library semantics, or a formal Lean 4 equivalence proof.

## Trust status

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence remains 0 proven obligations.
