# ProofScript Working Language Progress

**Milestone:** P4.37 — PSC-1 Boolean `match` under v0.2.x reference governance  
**Date:** 2026-09-11  
**Trust label:** trusted-boundary standalone small subset; not fully formally equivalent to Lean 4 yet

## Goal Status

| Goal | Status | Practical Progress |
|---|---:|---:|
| Standalone PSC-1 without Lean4 | Live | ~86% |
| PSC-1 as small complete programming language | In progress | ~55% |
| PSC-1 as small theorem prover | In progress | ~52% |
| Full ProofScript compiler | In progress | ~48% |
| Full Lean-like ProofScript without Lean4 | Long-term | ~9% |
| Formal Lean 4 equivalence | Not proven | 0 proven obligations |

Percentages are practical engineering estimates, not formal metrics.

## Currently Working PSC-1 Surface

```ts
-- Standard ProofScript comments, not JavaScript // comments.

const two: Nat := { 2 }

function inc(x: Nat): Nat := {
  Nat.succ(x)
}

function add2(x: Nat): Nat := {
  Nat.add(x, 2)
}

function choose(b: Bool): Nat := {
  bif (b) { 1 } else { 2 }
}

function not(b: Bool): Bool := {
  bif (b) { false } else { true }
}

function chooseMatch(b: Bool): Nat := {
  match (b) {
    | true => 1
    | false => 2
  }
}

def four: Nat := {
  add2(2)
}

def six: Nat := {
  let x: Nat := add2(2);
  add2(x)
}

def inferredLet: Nat := {
  let x := 2;
  add2(x)
}

def haveValue: Nat := {
  have x: Nat := 2;
  add2(x)
}

def chooseTrue: Nat := {
  choose(true)
}

def chooseFalse: Nat := {
  choose(false)
}

def chooseMatchTrue: Nat := {
  chooseMatch(true)
}

def chooseMatchFalse: Nat := {
  chooseMatch(false)
}

inductive Tiny: Type where {
  | mk
}

structure Point: Type where {
  x: Nat;
  y: Nat;
}

theorem two_eq_two: 2 = 2 := by { rfl }

example: add2(2) = 4 := by { rfl }

theorem choose_true_eq_one: choose(true) = 1 := by { rfl }

theorem choose_false_eq_two: choose(false) = 2 := by { rfl }

theorem choose_match_true_eq_one: chooseMatch(true) = 1 := by { rfl }

theorem choose_match_false_eq_two: chooseMatch(false) = 2 := by { rfl }

theorem six_eq_six: six = 6 := by { rfl }

theorem inferred_let_eq_four: inferredLet = 4 := by { rfl }

theorem have_value_eq_four: haveValue = 4 := by { rfl }

theorem exact_two_eq_two: 2 = 2 := by { exact two_eq_two }

axiom P: Prop;
axiom Q: Prop;

theorem intro_id_prop: P -> P := by { intro h; exact h }

theorem intro_id_prop_assumption: P -> P := by { intro h; assumption }

theorem direct_assumption(h: P): P := by { assumption }

theorem apply_implication(h: P -> Q, hp: P): Q := by { apply h; assumption }

theorem apply_implication_exact(h: P -> Q, hp: P): Q := by { apply h; exact hp }

theorem direct_apply(h: P): P := by { apply h }
```

## Working Pipeline

```text
.ps source
  -> v0.2.x reference-governed parser smoke
  -> PSC-1 elaborator
  -> checked Core artifact
  -> pskernel-derived TypeScript kernel
  -> theorem/example checking
  -> standalone JavaScript emission for executable definitions
  -> Node.js execution without Lean4
```

## New in P4.37

- Added reference-governed simple `match` over `Bool`.
- Accepted canonical branch patterns `true` and `false`, plus the existing dot-constructor path.
- Lowered Bool match through the checked Bool recursor rather than introducing JavaScript switch semantics.
- Added `rfl` theorem smoke over match reductions.
- Added JS execution smoke for `chooseMatch(true)` and `chooseMatch(false)`.
- Added negative smokes for non-exhaustive Bool match and forbidden branch-level semicolon.

## Current Supported Feature Families

| Family | Status |
|---|---|
| Lean-compatible comments `--` and nested `/- -/` | Working |
| JavaScript `//` comments | Rejected |
| `def` with explicit result type | Working |
| `const` binderless alias to `def` | Working |
| `function` typed-binder alias to `def` | Working |
| `Nat`, `Bool`, `Unit`, `Eq` bootstrap prelude | Working |
| `Prop` goals through checked theorem/example declarations | Working |
| Nat literals | Working |
| Bool literals `true` / `false` | Working |
| Local `let` inside `{ ... }` def body | Working |
| Local `have` prefix inside `{ ... }` def body | Working as nondependent checked Core let |
| Boolean `bif (b) { then } else { else }` | Working for expected result types |
| Simple `match (b) { | true => ... | false => ... }` over Bool | Working through checked Bool recursor |
| Nat constructor normalization | Working |
| `Nat.zero`, `Nat.succ`, `Nat.add` | Working |
| Curried function calls | Working |
| Direct references to previous checked definitions/theorems | Working |
| Simple `inductive ... where { | ctor }` | Working |
| Simple `structure ... where { field: T; }` | Working |
| Theorem/example `by { rfl }` | Working |
| Theorem/example `by { exact term }` | Working |
| Theorem/example `by { intro h; exact ... }` | Working for explicit function/forall goals |
| Theorem/example `by { assumption }` | Working for local hypotheses with definitionally equal goal type |
| Theorem/example `by { apply h; assumption }` | Working for one explicit generated premise |
| Theorem/example `by { apply h; exact hp }` | Working for one explicit generated premise |
| Bounded `show` | Working when displayed goal is definitionally equal to the current goal |
| Proof-local `have` | Working with typed/inferred intermediate facts lowered to checked Core have/let |
| Bounded `rw` / reverse `rw ← h` | Working on the target through checked `Eq.rec` transport |
| Bounded `subst x` | Working from a direct local equality as target rewriting; locals are not deleted |
| Bounded `constructor` | Working for one-constructor non-indexed goals; one continuation is repeated across explicit field goals |
| Bounded `cases` | Working for nonrecursive non-indexed inductives through checked recursors |
| Bounded `induction` | Working for non-indexed inductives through checked recursors with generated IH binders |
| Bounded `simp` | Working as simp-lite: rfl, assumption, or one local equality rewrite followed by either |
| Canonical self-delimited `by { ... }` theorem/example without final command `;` | Working and enforced in PSC-1 standard mode |
| Executable JS emission for definitions | Working |
| Skipping non-executable theorem/example/axiom/inductive declarations in JS | Working |

## Important Fail-Closed Boundaries

- No full Lean compatibility claim.
- No formal Lean equivalence claim.
- No full tactic framework.
- No full dynamic parser/macro implementation yet.
- No source-level typeclass search as full Lean behavior yet.
- No ordinary proposition/`Decidable` `if` yet; use Boolean `bif` in PSC-1.
- No local function binder sugar or `let rec` in def-body blocks yet.
- No general recursion execution in JS yet.
- No broad pattern-match-to-JS backend yet beyond simple checked Bool match lowering.
- No `String`, `UInt*`, `Float`, or full IO runtime semantics yet.
- `intro` currently introduces explicit binders only.
- `assumption` currently searches ordinary local hypotheses only; no broader tactic search or typeclass/instance reasoning.
- `apply` currently supports exact proof terms or one explicit generated premise only; no metavariable-driven full Lean apply.
- `rw` rewrites the target only; arbitrary hypothesis/location rewriting is deferred.
- `subst` is target substitution and intentionally keeps the original locals in scope.
- `constructor` requires exactly one constructor and explicit generated field goals.
- `cases` currently rejects recursive inductives rather than silently granting induction hypotheses.
- `induction` repeats one continuation over generated branches; named branch scripts and general dependent/indexed induction are deferred.
- `simp` is bounded simp-lite, not Lean's simplifier.
- `bif` currently requires an expected result type and direct Bool condition.

## Recommended Next Milestones

1. Execute the consolidated native-tactic parser/elaborator regression suite on the supported Windows environment.
2. Add named branch syntax/proof-state ergonomics only after the bounded generated-goal core is green.
3. Extend `rw` locations and simplifier theorem sets without weakening the current Eq.rec/kernel-check boundary.
4. Consider indexed/dependent cases and induction as a separate profile expansion.
5. Keep full Lean tactics/metaprogramming outside PSC-1.

## Current Best Next Step

The native tactic surface is implemented as a bounded source/elaboration layer. The next theorem-prover step is execution hardening and then branch ergonomics, not adding trusted tactic semantics.

The programming-language track remains independent: broader libraries/effects/runtime features should continue without changing the proof-kernel trust boundary.


## P5.52 Except.flatten

Added `Except.flatten(E, A, value): Except(E, A)` for the same-error nested shape `Except(E, Except(E, A))`. This increases PSC-1 feature support to 54 tracked / 54 supported / 53 executable while keeping formal Lean 4 equivalence proven obligations at 0.

## P5.55 Option.fold

PSC-1 now includes explicit checked `Option.fold` calls for finite Option values. This is a checked-bootstrap feature over existing `Option.rec`, executable after Core checking, and does not change the kernel.

## P5.56 Except.swap

PSC-1 now includes explicit checked `Except.swap(E, A, value)` calls for finite Except values. This is a checked-bootstrap feature over existing `Except.rec`, executable after Core checking, and does not change the kernel. The same milestone extracts class/instance elaboration into `packages/elaborator/src/classElaborator.ts`.


## P5.58 Except.bimap

PSC-1 now includes explicit checked `Except.bimap` calls for finite Except values. This is a checked-bootstrap feature over existing `Except.rec`, executable after Core checking, and does not change the kernel.


## P5.59 Option.any

PSC-1 now supports explicit `Option.any(A, p, value)` as a checked-bootstrap helper. It returns `Bool.false` for none and applies the predicate to some payloads. Current trust remains K3-TB only, with 0 formal Lean 4 equivalence proven obligations.

## P5.60 Reference v0.6.1 Declaration Forms

PSC-1 now uses the v0.6.1 compiler-ready language reference as the primary reference. Expression-bodied `const`, `function`, and `def` declarations and braced `if (c) { t } else { e }` are accepted and checked through existing Core. The old v0.2.1 files are retained only under `docs/reference/legacy/`.
