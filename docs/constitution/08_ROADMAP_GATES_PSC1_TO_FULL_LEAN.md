# 08 — Roadmap Gates: PSC-1 to Full Lean-like ProofScript

## 1. Purpose

This document defines the forward path from a small standalone subset to full ProofScript.

## 2. Current strategic order

Build in this order:

```text
Core kernel -> small parser -> small elaborator -> checked JS output -> stdlib -> proofs -> richer frontend -> Lean-like features
```

Do not start with full macros/tactics/typeclasses.

## 3. Gate A — PSC-0 Core Kernel

Goal: standalone core checker.

Required:

- core declarations;
- primitive prelude;
- replay;
- certificates;
- semantic hashes;
- proof-obligation catalog;
- package/tarball smoke.

Exit criteria:

```text
pskernel check-core PASS
pskernel certify PASS
pskernel verify-cert PASS
pskernel audit PASS
preflight PASS
```

## 4. Gate B — PSC-1 Source Minimum

Goal: `.ps` source works without Lean4 for a tiny subset.

Required:

```text
def
Nat literals
Nat/Bool/Unit/Eq prelude
function calls
simple checked JS output
```

Exit criteria:

```text
pslive build-js example.ps PASS
node generated.js PASS
pslive run example.ps PASS
```

## 5. Gate C — PSC-1 General Programming Core

Add:

```text
Bool if
let
lambda
Option
Result
List
simple match
simple structures
field projection
```

Exit criteria:

- useful pure programs compile and run;
- kernel checks all emitted core;
- unsupported cases reject.

## 6. Gate D — PSC-1 Theorem Core

Add:

```text
theorem
Prop
Eq
rfl
exact
intro
apply
have
small rw
```

Exit criteria:

- theorem-by-rfl works;
- identity/equality proofs work;
- proof terms kernel-check;
- invalid proofs reject.

## 7. Gate E — PSC-1 Inductives and Recursion

Add:

```text
simple inductive source syntax
simple structures
pattern matching compiled to recursors
structural recursion over Nat/List/Option
small induction tactic or proof-term equivalent
```

Exit criteria:

- List map/length examples work;
- Nat recursion examples work;
- induction proof smoke works;
- generated recursors replay.

## 8. Gate F — PSC-1 Packages and Stdlib

Add:

```text
module/import
npm package distribution
Std.Nat
Std.Bool
Std.Option
Std.List
Std.Result
Std.String
runtime package
```

Exit criteria:

- package import works;
- package certificate verifies;
- JS backend emits runnable output from imported packages.

## 9. Gate G — PSC-2 Practical Language

Add:

```text
explicit dictionary interfaces
limited typeclass sugar
coercion-lite
simp-lite
rw improved
cases/induction improved
arrays
strings
IO boundary
```

Exit criteria:

- small real applications possible;
- basic verified libraries possible;
- stable package story.

## 10. Gate H — Full ProofScript Frontend

Add:

```text
dynamic parser
syntax declarations
notation
macros
syntax quotations
macro hygiene
environment extensions
InfoTree-like metadata
```

Exit criteria:

- command-by-command parser state works;
- syntax extensions affect later parsing;
- macro expansion preserves source observability.

## 11. Gate I — Lean-like Elaboration

Add:

```text
implicit arguments
metavariables
unification
expected-type propagation
coercions
typeclass search
termination elaboration
advanced pattern matching
```

Exit criteria:

- broad Lean-like examples elaborate;
- kernel independently checks output;
- differential evidence against Lean oracle where available.

## 12. Gate J — Advanced Kernel Coverage

Add:

```text
indexed inductives
mutual inductives
nested inductives
advanced recursors
full quotient behavior
universe constraint solving
kernel hardening corpus
```

Exit criteria:

- conformance corpus passes;
- proof obligations are formalized;
- unsupported list shrinks honestly.

## 13. Gate K — Formal Equivalence Campaign

Goal: prove selected equivalence claims.

Required:

```text
formal model of TS kernel data
Lean-side semantic relation
function-by-function proof obligations
artifact replay theorem
soundness theorem for supported subset
backend correctness theorem for executable subset
```

Exit criteria:

- proof obligations marked `proven` with linked artifacts;
- release may claim proven subset equivalence only for proven scope.

## 14. Roadmap discipline

Never skip a gate by changing the definition of done.

A later gate may start early only if it does not weaken earlier gates.
