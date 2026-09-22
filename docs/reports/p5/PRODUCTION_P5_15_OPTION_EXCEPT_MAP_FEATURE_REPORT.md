# Production P5.15 Option.map / Except.map Feature Report

## Scope

P5.15 adds explicit `Option.map(A, B, f, value)` and `Except.map(E, A, B, f, value)` to the PSC-1 controlled-feature path.

The feature is intentionally small:

- explicit type arguments only;
- mapper functions must already check as `A -> B`;
- reduction fires only for checked constructor-shaped `Option` / `Except` values;
- JavaScript/TypeScript helpers execute only emitted Core that has already passed the K3-TB checker.

## Architecture path

```text
.ps source
  -> parser/application syntax
  -> elaborator ordinary checked Core application
  -> checked bootstrap declarations for Option.map / Except.map
  -> K3-TB bounded kernel reduction over checked constructors
  -> JS/TS backend helper emission
  -> runtime tagged-record execution
```

## Supported behavior

```ts
function inc(x: Nat): Nat := { x + 1 }
function isZero(x: Nat): Bool := { x == 0 }

def mappedSome: Option(Nat) := { Option.map(Nat, Nat, inc, Option.some(Nat, 2)) }
def mappedNone: Option(Nat) := { Option.map(Nat, Nat, inc, Option.none(Nat)) }
def mappedBool: Option(Bool) := { Option.map(Nat, Bool, isZero, Option.some(Nat, 0)) }

def mappedOk: Except(String, Nat) := { Except.map(String, Nat, Nat, inc, Except.ok(String, Nat, 4)) }
def mappedError: Except(String, Nat) := { Except.map(String, Nat, Nat, inc, Except.error(String, Nat, "bad")) }
def mappedOkBool: Except(String, Bool) := { Except.map(String, Nat, Bool, isZero, Except.ok(String, Nat, 0)) }
```

## Non-goals

P5.15 does not implement full Functor/Monad/typeclass support, `Option.bind`, `Except.bind`, do-notation, inferred map syntax, full Lean library semantics, or a formal Lean 4 equivalence proof.

## Trust status

Still K3-TB trusted-boundary, not fully formal K3, and not proven equivalent to Lean 4. Formal Lean 4 equivalence remains 0 proven obligations.
