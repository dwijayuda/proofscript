# 02 — Language Profile Governance

## 1. Purpose

ProofScript needs a small product profile first, while preserving the path to full Lean-like features later.

This document defines feature gates for PSC-1 and future profiles.

## 2. Profiles

### PSC-0: Core Artifact Profile

Input is serialized core declarations, not normal source.

Must support:

- kernel replay;
- primitive prelude;
- certificates;
- semantic hashes;
- proof-obligation reporting.

PSC-0 is for checker/audit infrastructure.

### PSC-1: Small Complete Standalone Profile

Input is `.ps` source.

PSC-1 must be small enough to implement quickly and complete enough for real programming and theorem proving.

### PSC-2: Practical Library Profile

Adds enough language and standard library support for useful packages.

### PSC-Full: Full ProofScript Profile

Targets broad Lean-like language coverage.

## 3. PSC-1 included features

### 3.1 Declarations

PSC-1 includes:

```text
def
theorem
axiom
inductive
structure
import
module
```

`function` and `const` may exist only as aliases that normalize to `def`.

### 3.2 Types

PSC-1 includes:

```text
Prop
Type
Unit
Bool
Nat
Int
String
Option(A)
Result(E, A)
List(A)
Array(A)
Prod(A, B)
Eq(A, a, b)
```

`Fin`, `Subtype`, and `Sigma` are PSC-1.5 candidates.

### 3.3 Terms

PSC-1 includes:

```text
variables
constants
application
lambda / fun
let
if
match
Nat literals
Bool literals
String literals after runtime semantics are defined
structure construction
field projection
```

### 3.4 Functions

PSC-1 supports:

- pure total functions;
- explicit arguments;
- curried functions;
- first-class functions;
- structural recursion;
- simple pattern matching.

PSC-1 does not support unchecked general recursion in trusted code.

### 3.5 Inductives

PSC-1 supports:

- simple non-indexed inductives;
- parameterized non-indexed inductives;
- strict positivity;
- generated recursors for supported shapes;
- generated match lowering for supported shapes.

PSC-1 special-cases canonical `Eq` because theorem proving needs equality.

### 3.6 Structures

PSC-1 supports:

- simple records;
- parameterized records;
- nondependent fields;
- field projection;
- single-constructor eta where safe.

### 3.7 Proofs

PSC-1 includes a tiny proof language:

```text
rfl
exact
assumption
intro
apply
show
have
rw, limited
subst, limited
constructor, limited
cases, limited
induction, limited
simp, limited
```

The bounded native tactic layer is elaboration only: every successful tactic must construct an ordinary Core proof term that PSKernel independently checks. It is not part of the trusted kernel.

Current bounded meanings:

- `rw` rewrites the target through checked `Eq.rec`; reverse rewrite is supported;
- `subst` rewrites the target from a direct local equality but does not physically delete locals;
- `constructor` handles one-constructor, non-indexed goals and repeats one continuation across generated explicit fields;
- `cases` handles nonrecursive, non-indexed inductives;
- `induction` uses checked recursor metadata for non-indexed inductives and exposes generated recursive IH binders to the repeated continuation;
- `simp` is simp-lite only: definitional reflexivity, assumption, or one local equality rewrite followed by either.

Full Lean tactic state, metavariable search, named branch scripts, rewriting in arbitrary hypotheses, and full Lean `simp` semantics remain outside PSC-1.

## 4. PSC-1 excluded features

PSC-1 excludes by default:

```text
full dynamic macros
custom syntax declarations
custom notation declarations
syntax quotations
full tactic framework
full typeclass search
coercion system
mutual inductives
nested inductives
general indexed inductives except Eq
advanced universe polymorphism
metaprogramming
unsafe reflection
Float semantics
UInt semantics
full IO ecosystem
full Lean package compatibility
```

Excluded features must reject with clear unsupported errors.

## 5. Feature lifecycle

Every feature must have a lifecycle status:

```text
proposed
specified
parser-ready
elaborator-ready
kernel-ready
backend-ready
smoke-tested
proof-obligation-created
conformance-candidate
stable
```

A feature may not be called stable unless all required layers agree.

## 6. Acceptance rule

A source feature is accepted only when:

1. grammar is specified;
2. parser produces syntax with source info;
3. elaborator lowers it to kernel-checkable core;
4. kernel accepts only valid declarations;
5. backend preserves supported executable semantics;
6. smoke tests exist;
7. proof obligations exist;
8. unsupported cases fail closed.

## 7. No second dialect rule

Do not add unrelated `lean { ... }`, `typescript { ... }`, or `javascript { ... }` regions to standard `.ps`.

Migration/oracle frontends may exist as separate tools, but standard ProofScript must remain one semantic language.

## 8. Compatibility rule

Patch revisions may fix syntax and clarify grammar, but must not silently change the meaning of an already accepted canonical program.

Breaking semantic changes require a new profile or compatibility revision.
