# The ProofScript Language Reference

**Semantically faithful, TypeScript-oriented Lean 4**  
**Reference draft:** v0.1  
**Language compatibility target:** Lean 4.33.1 stable semantics  
**Reference-structure baseline:** current Lean Language Reference (https://lean-lang.org/doc/reference/latest/)  
**Date:** 6 September 2026

> **Normative identity.** ProofScript expresses Lean 4 language concepts, logical semantics, elaboration behavior, proof mechanisms, metaprogramming model, programming model, and trust boundaries through a TypeScript-oriented concrete syntax. The governing rule is: **change the shape, never the concept**.
>
> **Version rule.** ProofScript v0.1 is semantically pinned to Lean 4.33.1. The moving `/latest/` Lean Language Reference is used for navigation and forward tracking only; it MUST NOT silently redefine the ProofScript baseline. A conformance release MUST pin the exact Lean toolchain/source revision and classify post-baseline material as **TRACKING** until an explicit baseline upgrade.
>
> **Canonical-token rule.** When Lean has an explicit concept-introducing token or operator, ProofScript retains it canonically unless a purely structural delimiter/layout replacement is sufficient. TypeScript-oriented aliases are optional syntax, never new semantic categories.

This document is the **language reference**. Research history, architecture discussion, implementation staging, and comparative argumentation belong in separate design/audit documents. The core reference is intentionally organized like the official Lean reference so that a Lean and ProofScript user can navigate the same conceptual hierarchy.

## Contents

1. [Introduction](#1-introduction)  
2. [Elaboration and Compilation](#2-elaboration-and-compilation)  
3. [Interacting with ProofScript](#3-interacting-with-proofscript)  
4. [The Type System](#4-the-type-system)  
5. [Source Files and Modules](#5-source-files-and-modules)  
6. [Namespaces and Sections](#6-namespaces-and-sections)  
7. [Definitions](#7-definitions)  
8. [Axioms](#8-axioms)  
9. [Attributes](#9-attributes)  
10. [Type Classes](#10-type-classes)  
11. [Coercions](#11-coercions)  
12. [Run-Time Code](#12-run-time-code)  
13. [Terms](#13-terms)  
14. [Tactic Proofs](#14-tactic-proofs)  
15. [The Simplifier](#15-the-simplifier)  
16. [The `grind` Tactic](#16-the-grind-tactic)  
17. [The `mvcgen` Tactic](#17-the-mvcgen-tactic)  
18. [Functors, Monads and `do`-Notation](#18-functors-monads-and-do-notation)  
19. [Basic Propositions](#19-basic-propositions)  
20. [Basic Types](#20-basic-types)  
21. [IO](#21-io)  
22. [Iterators](#22-iterators)  
23. [Notations and Macros](#23-notations-and-macros)  
24. [Build Tools and Distribution](#24-build-tools-and-distribution)  

Additional reference material: [Validating a ProofScript Proof](#validating-a-proofscript-proof), [Error Explanations](#error-explanations), [Release Notes](#release-notes), [Supported Platforms](#supported-platforms), and [Index](#index).

ProofScript-specific material is isolated in appendices: [Verification Extensions](#appendix-a-proofscript-verification-extensions), [Conformance and Trust](#appendix-b-conformance-and-trust), [Lean-to-ProofScript Surface Map](#appendix-c-lean-to-proofscript-surface-map), and [Grammar](#appendix-d-grammar-and-parser-requirements).

---

# 1. Introduction

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Introduction/](https://lean-lang.org/doc/reference/latest/Introduction/)

ProofScript is both a dependently typed programming language and a theorem-proving language because its semantic target is Lean 4. Its purpose is not to reinterpret Lean using TypeScript semantics. Instead, it presents Lean concepts in a syntax that is friendlier to TypeScript-oriented programmers while preserving the distinctions that matter to elaboration, kernel checking, metaprogramming, and execution.

## 1.1 History

ProofScript began as a research specification for expressing Lean 4 faithfully through a TypeScript-oriented surface. The v0.1 reference revision separates the stable language reference from the earlier audit/research narrative and adopts the official Lean reference's conceptual organization.

## 1.2 Typographical Conventions

- `ts` fenced blocks show canonical ProofScript source.
- `lean` fenced blocks show corresponding Lean 4 source when useful.
- `text` fenced blocks are grammar fragments, schemas, pseudocode, or explicitly schematic source and are **not** acceptance-test claims.
- A `ts` or `lean` example without a **Schematic** label is intended as a positive conformance/acceptance-test candidate for its stated baseline; this document does not claim it was executed unless an executable-validation note says so.
- **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative terms.
- “Lean-native” means the construct has Lean semantics and is preserved directly or through structural surface sugar.
- “ProofScript extension” means syntax whose complete meaning elaborates to existing Lean-compatible terms/declarations and adds no kernel primitive.

## 1.3 How to Cite This Work

When citing this draft, identify it as *The ProofScript Language Reference*, draft v0.1, and include the semantic compatibility target Lean 4.33.1.

## 1.4 Versioning and Compatibility

ProofScript v0.1 targets Lean 4.33.1 stable semantics. The reference layout follows the current Lean manual for navigational parity. A future baseline upgrade requires an explicit compatibility revision; a moving `latest` documentation URL never silently changes ProofScript semantics.

### Baseline evidence policy

For a conformance claim, the normative baseline is the pinned Lean 4.33.1 toolchain/source revision recorded in the release manifest. Official `/latest/` pages are explanatory and tracking evidence; current `master` source is never silently substituted for the pinned parser/elaborator. When current upstream behavior differs from or postdates 4.33.1, this reference labels it **TRACKING** until an explicit ProofScript baseline revision.

This v0.1 revision was audited against official documentation and upstream source, but no local Lean 4.33.1 executable was available in the authoring environment. Therefore code examples are acceptance-test candidates unless separately marked as executed; a production conformance release MUST run them against the pinned baseline.

## 1.5 Language identity and profiles

ProofScript has one semantic language and may have multiple *surface aliases*. The language must not become a collection of dialects with different semantics.

### Canonical ProofScript

The canonical syntax is what the specification, diagnostics, formatter, and generated `.ps` output should prefer.

```ts
def answer: Nat := {
  42
}

def add(a: Nat, b: Nat): Nat := {
  a + b
}
```

### TypeScript-oriented aliases

These may be accepted as parser sugar:

```ts
const answer: Nat := {
  42
}

function add(a: Nat, b: Nat): Nat := {
  a + b
}
```

Normalization:

```text
const answer: Nat := { 42 }
    ↳ def answer: Nat := { 42 }
    ↳ ordinary definition body term `42`

function add(a: Nat, b: Nat): Nat := { a + b }
    ↳ def add(a: Nat, b: Nat): Nat := { a + b }
    ↳ ordinary definition body term `a + b`
```

The standard alias expansions must preserve recursion, reducibility, universe inference, safety, meta phase, visibility, compiler treatment, generated equations and kernel declaration kind at their expansion point. This does not erase source observability under the parsing/macro-expansion rules in Chapter 2.

### Lean source translation / oracle frontend

Direct Lean source is **not a second canonical ProofScript dialect**. The standard ProofScript parser owns one concrete syntax. A separate translator/oracle frontend may accept ordinary Lean source for migration, differential testing, and bootstrap validation, then translate it into canonical ProofScript or comparable elaborated data. This keeps the language surface coherent while preserving a strong path for Lean interoperability. Exact Lean macro-source compatibility is not claimed merely because the translator accepts ordinary Lean syntax.

---

## 1.6 Semantic punctuation invariants

| Concept | Lean 4 | Canonical ProofScript | Status |
|---|---|---|---|
| definition/provision/assignment | `:=` | `:=` | UNCHANGED |
| propositional equality | `=` | `=` | UNCHANGED |
| Boolean equality | `==` | `==` | UNCHANGED |
| propositional inequality | `≠` | `≠` | UNCHANGED |
| Boolean inequality | `!=` | `!=` | UNCHANGED |
| type ascription | `:` | `:` | UNCHANGED |
| Pi/function arrow | `→` | `→` (canonical), `->` alias | UNCHANGED + ASCII ALIAS |
| universal quantifier | `∀` | `∀` (canonical), `forall` alias | UNCHANGED + TEXTUAL ALIAS |
| existential quantifier | `∃` | `∃` (canonical), `exists` alias | UNCHANGED + TEXTUAL ALIAS |
| lambda introducer | `fun` | `fun` (canonical), arrow-only lambda alias | UNCHANGED + ERGONOMIC ALIAS |
| lambda/branch RHS | `=>` | `=>` | UNCHANGED |
| alternative/constructor marker | `\|` | `\|` | UNCHANGED |
| monadic bind | `←` | `←` (canonical), `<-` alias | UNCHANGED + ASCII ALIAS |
| explicit coercion | `↑x` | `↑x` | UNCHANGED |
| attribute | `@[...]` | `@[...]` | UNCHANGED |
| explicit application mode | `@f` | `@f` | UNCHANGED |

Permanent rule:

```text
:=  ≠  =  ≠  ==
≠   ≠  !=
→   ≠  =>
←   ≠  :=
```

### Example

Lean 4:

```lean
def n : Nat := 5

theorem n_eq_five : n = 5 := by
  rfl
```

ProofScript:

```ts
def n: Nat := {
  5
}

theorem nEqFive: n = 5 :=
  by {
    rfl
  };
```

---

## 1.7 Reading Lean examples as ProofScript examples

The upstream Lean manual is the semantic reference source for ProofScript. When an upstream example is structurally reshaped, the ProofScript version MUST preserve the same declaration kind, elaboration obligations, proof content, and runtime meaning.

For example, the Lean definition

```lean
def twice (n : Nat) : Nat := n + n
```

has the canonical ProofScript spelling

```ts
def twice(n: Nat): Nat := {
  n + n
}
```

and a theorem about the definition may be written:

```ts
theorem twice_two: twice(2) = 4 := by {
  rfl
}
```

The braces and call punctuation are surface structure. `Nat`, `def`, `theorem`, `:=`, `=`, `by`, and `rfl` retain their Lean meanings.

## 1.8 Reference scope

Like the Lean manual, this reference describes both theorem proving and programming. ProofScript does not split the language into a “proof language” and a “programming language”; both elaborate to the same Lean-compatible logical environment. Tactics generate proof terms that the kernel checks, while executable definitions may additionally be compiled by a backend.

The reference distinguishes four layers whenever they matter:

1. **source syntax**, including ProofScript structural sugar;
2. **elaboration behavior**, including implicit insertion, coercions, typeclass synthesis, pattern compilation, and recursion elaboration;
3. **kernel meaning**, consisting of checked core terms and declarations;
4. **execution behavior**, which depends on the compiler/runtime correspondence claim.

An implementation MAY expose additional editor, formatter, package-manager, or backend facilities, but those facilities do not change the meaning of the language unless this reference explicitly assigns them source semantics.

### Coverage-status rule

This reference distinguishes **language-target coverage** from **implementation coverage**. A chapter that specifies a Lean feature means ProofScript targets that feature's semantics; it does not prove that any current ProofScript implementation supports it. Likewise, this reference is not an exhaustive transcription of every library API entry in the upstream manual. Conformance claims MUST be published per feature family and test corpus; unsupported implementation subsets must be reported as unsupported rather than silently redefining ProofScript.


# 2. Elaboration and Compilation

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)

ProofScript preserves Lean's processing model: parsing creates extensible syntax; macro expansion rewrites syntax; elaboration resolves rich source constructs into explicit core expressions and declarations; the kernel checks the logical result; compilation produces executable artifacts for supported runtime targets.

## 2.1 Lean 4.33 elaboration/metaprogramming additions

The 4.33.1 compatibility target includes frontend constructs added in Lean 4.33.0. ProofScript MUST inventory and preserve them rather than hiding them under a generic “custom syntax” label. [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/)

- `postprocess_traces tracePostprocessor in cmd` is an experimental command wrapper that runs a command and then transforms its trace tree. It affects tooling/diagnostic observations, not kernel proof rules.
- `wait_for_expected_type% term` is a term elaborator that postpones elaboration while the expected type is an unassigned metavariable, then elaborates the argument against that expected type.

Canonical ProofScript keeps these Lean tokens/concepts unchanged unless a future structural-only reshaping is separately justified. Quotation, macro, and InfoTree observability rules from the parsing/macro-expansion rules in Chapter 2 continue to apply.

### Lean 4.33 transparency behavior

ProofScript's 4.33.1 elaboration-conformance target MUST include the transparency changes introduced in 4.33.0 rather than treating transparency as an undifferentiated implementation detail. The relevant ordering is `none < reducible < instances < implicit < default < all`; `@[implicit_reducible]` and `@[instance_reducible]` have distinct roles; `backward.isDefEq.respectTransparency.types` is enabled by default in the 4.33 line; and the `with_implicit` tactic is part of the corresponding user-visible tactic surface. [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/)

A ProofScript implementation MAY use different internal data structures, but its elaboration, typeclass, conversion, tactic, and diagnostic outcomes under the pinned observation contract MUST agree with the selected 4.33.1 baseline for these transparency modes and attributes.

### `Float` / `Float32` logical and runtime semantics

Lean 4.33 changed `Float` and `Float32` from opaque logical shells to wrappers around logical models (`Float.Model` and `Float32.Model`) while retaining efficient native compiled representations. ProofScript MUST preserve this logical/runtime split; a JavaScript backend MUST NOT identify `Float` with ECMAScript `Number` semantics. [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/) [Floating-Point Numbers](https://lean-lang.org/doc/reference/latest/Basic-Types/Floating-Point-Numbers/)

Conformance includes the observable 4.33 behavior that floating-point literal patterns are matched through the type's `DecidableEq`/bit-pattern semantics, so values such as positive and negative zero can be distinct patterns where Lean distinguishes them. Native backend representations are compiler/ABI choices and do not redefine the source logical model.

### Lean 4.33 kernel-hardening baseline

The independent ProofScript checker MUST treat Lean 4.33 kernel-hardening changes as concrete negative conformance tests, not merely as generic fuzzing advice. The 4.33 release notes include additional rejection/checking for malformed opaque values with free variables, problematic free variables/metavariables in declarations, nested-inductive phantom-parameter issues, and universe-parameter uniformity in recursive declarations, among other robustness changes. [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/)

A pinned 4.33.1 conformance corpus MUST therefore include malicious/malformed environment declarations covering the documented 4.33 fixes. ProofScript MUST never intentionally reproduce an upstream soundness bug merely for historical compatibility; the security-baseline rule in the versioning policy in Chapter 1 governs any such conflict.

---

## 2.2 Incremental parser requirement

This is normative, not optional. Lean parses and elaborates one command, updates the state—including syntax tables and open namespaces—and only then parses the next command. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)

ProofScript must therefore follow conceptually:

```text
state₀
  ↓ parse command₁ with grammar₀
Syntax₁
  ↓ macro / elaborate / kernel-check
state₁ + grammar₁
  ↓ parse command₂ with grammar₁
Syntax₂
  ↓ ...
```

A conventional whole-file fixed TypeScript parser is insufficient for full Lean-like extensibility.

---

## 2.3 Initialization

Lean initialization is module initialization in `IO`; `builtin_initialize` is compiler-internal. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)

**Schematic (not an acceptance-test example):**

```text
initialize {
  ...
}
```

and typed initialization:

**Schematic (not an acceptance-test example):**

```text
initialize cache: Cache ←
  do {
    ...
  };
```

must retain Lean's semantics.

Do not infer that the stored value itself has type `IO(Cache)` merely because its initialization action runs in `IO`.

---

## 2.4 Command-by-command processing

ProofScript follows Lean's real processing pipeline rather than a batch TypeScript compiler model. The parser reads one command using the currently active grammar. That command is macro-expanded and elaborated; its environment effects are committed; only then is the next command parsed.

This is observable because a command can introduce notation used by the immediately following command:

```ts
syntax "twice" term : term
macro_rules
  | `(twice $x) => `($x + $x)

def eight: Nat := {
  twice 4
}
```

A full implementation therefore cannot parse the entire file using a permanently fixed grammar before elaboration starts.

### Parsing results and source information

Parsed syntax SHOULD preserve enough source information to reconstruct token boundaries, whitespace/comments, and source positions. Synthetic syntax created by macros MUST remain distinguishable from syntax that directly originated in the source when source-aware tooling or macros observe that distinction.

Ambiguous syntax may be represented as a delayed choice for the elaborator when the parser cannot select a unique longest parse. Parse recovery MUST NOT cause malformed syntax to be silently accepted as a different valid program.

## 2.5 Macro expansion is interleaved with elaboration

For a given syntax node, the outermost macro is expanded before the corresponding elaborator handles the result. Nested macros can remain until their enclosing elaborator reaches them. This is why ProofScript aliases such as `function` and `const` MUST expand at their registered syntax layer instead of being rewritten by a whole-file textual preprocessor.

Conceptually:

```text
parse syntax node
   ↓
expand outer macro if registered
   ↓
invoke term/command/tactic elaborator
   ↓
recursively elaborate child syntax
```

A macro that expands to another macro is repeatedly expanded subject to the implementation's expansion limit. Exceeding that limit is an elaboration error, never kernel acceptance.

## 2.6 Command, term, and tactic elaboration

Command elaboration changes the global environment and may register declarations, instances, notation, environment-extension entries, diagnostics, and generated code. Term elaboration consumes syntax plus an optional expected type and produces a core expression. Tactic execution is a specialized form of term elaboration that constructs a proof term by transforming proof goals.

Expected types matter. For example:

```ts
def noneNat: Option(Nat) := {
  .none
}
```

The leading-dot constructor can be resolved because the expected type determines the intended `Option.none` constructor.

## 2.7 Kernel checking and the trusted boundary

The kernel checks the type-correctness of declarations before they enter the trusted logical environment. It does not perform general unification, tactic search, parser disambiguation, typeclass search, or source-level termination analysis. Those are frontend responsibilities whose results must ultimately be justified in the core language.

Pattern matching and ordinary terminating recursion are not primitive kernel syntax. They elaborate to generated matcher functions, recursors, well-founded recursion, or another Lean-supported justification mechanism. Thus a source definition such as

```ts
def length{A: Type}: List(A) → Nat
  | [] => 0
  | _ :: xs => length(xs) + 1
```

is accepted only after elaboration produces a kernel-checkable definition and the corresponding equation theorems.

## 2.8 Predefinitions, equation theorems, and compilation

Recursive source definitions may first elaborate to a *predefinition*: pattern matching has been compiled, while recursive occurrences still look recursive. The compiler may consume this programming-oriented form, while the kernel receives a logically justified transformation.

A conforming implementation SHOULD preserve Lean-style equation theorems for recursive or pattern-matching definitions where the pinned baseline produces them. These theorem families provide a stable reasoning interface even when the internal termination elaboration is more complex than structural recursion.

For a definition such as:

```ts
def headOrZero: List(Nat) → Nat
  | [] => 0
  | x :: _ => x
```

tooling SHOULD expose generated equation information equivalent in purpose to `headOrZero.eq_1`, `headOrZero.eq_2`, `eq_def`, and `eq_unfold` when the selected Lean baseline generates them.

## 2.9 Serialized environments and independent replay

A Lean-backed implementation may emit ordinary Lean `.olean`/`.ilean` artifacts; an independent ProofScript implementation may use different formats. Regardless of representation, a high-assurance artifact MUST separate:

- the serialized checked environment,
- source/editor index information,
- compiler IR/runtime output,
- the intended theorem or exported declaration identity.

An independent checker is valuable precisely because it rechecks serialized declarations without trusting the source elaborator. `psc verify` therefore MUST NOT be defined merely as “the compiler previously said success.”

## 2.10 Initialization examples

Untyped initialization executes an initialization action for its module effects:

```ts
initialize {
  IO.println("initializing module")
}
```

Typed initialization stores the *result* of an initialization computation:

```ts
initialize greeting: String ←
  do {
    return "hello";
  }
```

The declaration `greeting` has type `String`; the initializer action is executed in the initialization phase. `builtin_initialize` is reserved for the same compiler-internal role as in Lean and is not ordinary application code.


# 3. Interacting with ProofScript

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Interacting-with-Lean/](https://lean-lang.org/doc/reference/latest/Interacting-with-Lean/)

ProofScript keeps Lean's interactive inspection model. A conforming implementation SHOULD provide source-facing commands equivalent to Lean's standard interaction commands, even when tooling exposes them through `psc` subcommands or an editor integration.

## 3.1 Options and interactive commands

Keep Lean compiler/elaborator command categories:

```ts
set_option pp.universes true;

#check term;
#eval term;
#reduce term;
#print name;
#print axioms name;
#synth C(T);
```

They are not runtime function calls.

Lean's scoped option form `set_option name value in ...` applies only to the following command or term. ProofScript MUST preserve this form and its parser/elaborator context:

```ts
set_option pp.explicit true in
  #check term;
```

A term-level use is likewise a term-scoping construct, not mutation of a global JavaScript configuration object. [Interacting with Lean / scoped options](https://lean-lang.org/doc/reference/latest/Interacting-with-Lean/)

---

## 3.2 Evaluation commands in detail

`#eval` elaborates a term, compiles/interprets executable code as required, and displays the result using the evaluation machinery. It is intended for executable values, not propositions whose proofs are erased.

```ts
#eval 2 + 3;
#eval List.length([10, 20, 30]);
```

`#eval!` is the less restrictive evaluation command corresponding to Lean's forceful evaluation form. A ProofScript implementation SHOULD preserve the same safety boundary rather than treating `!` as ordinary TypeScript non-null syntax.

Lean's evaluation interface also exposes presentation and adaptation controls. ProofScript SHOULD preserve the corresponding behavior for the pinned baseline, including `eval.pp`, `eval.type`, and `eval.derive.repr`, and the `MonadEval`/`MonadEvalT` extension mechanism used to adapt supported monads to evaluation. `#eval!` is not merely an alias for `#eval`: it deliberately bypasses the ordinary refusal to execute code that transitively depends on `sorry`, and tools SHOULD make that trust difference visible.

Context queries include:

```ts
#where;
#version;
```

`#where` reports the current scope state (namespace, opened namespaces, section variables/universes, and scoped options). `#version` reports the selected Lean toolchain version. These commands are especially important in conformance fixtures because they make hidden environment/version assumptions inspectable.

Evaluation and proof are distinct. The fact that

```ts
#eval 40 + 2;
```

prints `42` is not itself a theorem `40 + 2 = 42`. A theorem is still checked as a proof:

```ts
example: 40 + 2 = 42 := by {
  decide
}
```

## 3.3 Reduction

`#reduce` normalizes a term through Lean's logical reduction machinery. This can reveal definitional computation that is different from optimized runtime execution.

```ts
def square(n: Nat): Nat := {
  n * n
}

#reduce square(5);
```

Optional local assignments accepted by the pinned Lean command grammar are preserved as local elaboration inputs, not global variable declarations.

## 3.4 Type queries and expected failures

`#check` reports the elaborated type of a term:

```ts
#check Nat.succ;
#check fun (x: Nat) => x + 1;
#check @Eq;
```

When the pinned baseline supports `#check_failure`, ProofScript SHOULD preserve it for negative conformance tests:

```ts
#check_failure 1 + "x";
```

The failure command succeeds only if the enclosed check fails in the expected way; it is test infrastructure, not a proof rule.

## 3.5 Instance synthesis queries

`#synth T` asks the elaborator to produce an instance of `T` using the current instance environment.

```ts
#synth Repr(Nat);
#synth Decidable(2 < 3);
#synth Inhabited(List(Nat));
```

A failed `#synth` is evidence about the current instance-search environment. It does not imply the proposition represented by the type is false.

## 3.6 Printing declarations and dependencies

The query family SHOULD include the same information categories as Lean:

```ts
#print Nat.add;
#print equations List.reverse;
#print axioms Classical.choice;
```

`#print axioms name` reports transitive logical assumptions of the named declaration. Strict verification tooling SHOULD expose the same information through `psc` even when no interactive command frontend is available.

## 3.7 Guarding output and diagnostics

Lean's interaction layer includes commands intended to test values, messages, and diagnostics. ProofScript SHOULD provide semantically equivalent testing facilities because the compiler, macro system, and tactic framework are user-extensible and their diagnostics are part of tooling behavior.

A simple value guard can be represented as:

```ts
#guard (2 + 2 == 4);
```

Diagnostic guards SHOULD test diagnostics without converting them into logical assumptions.

## 3.8 Options and scoped options

Options are named elaborator/compiler/tooling settings. A global command changes subsequent processing:

```ts
set_option pp.universes true;
```

A scoped form changes processing only for one command or term:

```ts
set_option pp.explicit true in
  #check List.map;
```

Options MAY affect pretty printing, tracing, resource limits, synthesis, compilation, or other frontend behavior. No option may silently mutate the kernel theory for a baseline that claims conformance to Lean 4.33.1.


# 4. The Type System

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/The-Type-System/](https://lean-lang.org/doc/reference/latest/The-Type-System/)

ProofScript targets Lean's actual type theory rather than a simplified calculus inferred from TypeScript. Types and terms are both expressions; dependent function types, universes, propositions, inductive types, quotients, proof irrelevance, and Lean's conversion rules remain semantically authoritative.

## 4.1 Universes and sorts

ProofScript retains Lean's universe hierarchy exactly. [Universes](https://lean-lang.org/doc/reference/latest/The-Type-System/Universes/)

| Lean 4 | ProofScript |
|---|---|
| `Prop` | `Prop` |
| `Sort u` | `Sort u` |
| `Type` | `Type` |
| `Type u` | `Type u` |
| `universe u v` | `universe u, v;` |
| `max u v` | `max u v` |
| `imax u v` | `imax u v` |
| `f.{u}` | `f.{u}` |

Do not canonicalize universe levels as TypeScript generics such as `Type<u>`. Universe application and term application are separate existing Lean concepts and should remain visibly separate.

---

## 4.2 Lean types, not TypeScript types

ProofScript has no independent TypeScript type system.

| Lean concept | ProofScript | Rejected semantic identity |
|---|---|---|
| `Nat` | `Nat` | `number` |
| `Int` | `Int` | `number` |
| `UInt8` / `UInt16` / `UInt32` / `UInt64` | same Lean names | `u8`/`u16`/`u32`/`u64`, TS `number`, or JS integer identity |
| `Int8` / `Int16` / `Int32` / `Int64` | same Lean names | `i8`/`i16`/`i32`/`i64`, TS `number`, or JS integer identity |
| `USize` / `ISize` | same Lean names | `usize`/`isize`, `size_t`-style source aliases, or TS `number` |
| `Float` | `Float` | JS Number identity |
| `Float32` | `Float32` | JS Number identity or Rust/C spelling as source identity |
| `Bool` | `Bool` | `boolean` |
| `String` | `String` | `string` |
| `Char` | `Char` | one-character JS string |
| `Unit` | `Unit` | `void` |
| `Empty` | `Empty` | `never` |
| `Option A` | `Option(A)` | `A \| null` |
| `List A` | `List(A)` | `A[]` |
| `Array A` | `Array(A)` | JS Array identity |
| `Prod A B` | `Prod(A, B)` | TS tuple identity |
| `Sum A B` | `Sum(A, B)` | union type |
| `Sigma` | `Sigma(...)` / `Σ` | tuple |
| `Subtype` | `Subtype(...)` / subtype syntax | object shape |
| `Fin n` | `Fin(n)` | bounded `number` alias |
| `IO A` | `IO(A)` | `Promise<A>` |
| `Task A` | `Task(A)` | `Promise<A>` |
| `Except E A` | `Except(E, A)` | JS exception identity |
| `Decidable P` | `Decidable(P)` | `boolean` |
| `Nonempty A` | `Nonempty(A)` | erased TS constraint |

**Primitive/foundational naming rule:** ProofScript MUST retain Lean 4 terminology for primitive and foundational types as canonical source names instead of introducing TypeScript, Rust, Go, C, or Java aliases as canonical identities. In particular, `Nat`, `Int`, the fixed-width integer families, `USize`/`ISize`, `Float`/`Float32`, `Bool`, `Char`, `String`, `Unit`, and related foundational types keep their Lean names. [Fixed-Precision Integers](https://lean-lang.org/doc/reference/latest/Basic-Types/Fixed-Precision-Integers/) [Floating-Point Numbers](https://lean-lang.org/doc/reference/latest/Basic-Types/Floating-Point-Numbers/)

A JS backend may choose efficient representations, but those are ABI/compiler decisions, not source-language type identities.

---

## 4.3 Binder classes

Lean's binder information is part of elaboration behavior and is preserved. [Function Types](https://lean-lang.org/doc/reference/latest/Terms/Function-Types/) [Function Application](https://lean-lang.org/doc/reference/latest/Terms/Function-Application/)

| Binder | Lean 4 | ProofScript |
|---|---|---|
| explicit | `(x : A)` | `(x: A)` |
| implicit | `{x : A}` | `{x: A}` |
| strict implicit | `⦃x : A⦄` | `⦃x: A⦄` |
| instance implicit | `[C A]` | `[C(A)]` |
| named instance implicit | `[inst : C A]` | `[inst: C(A)]` |
| optional | `(x : A := d)` | `(x: A := d)` |
| auto parameter | appropriate Lean form | same concept; `by { ... }` body allowed |

Do not make `<A>` the canonical implicit-binder syntax. TypeScript generic inference is not Lean implicit argument insertion, and Lean implicit arguments may be terms or proofs rather than only types.

---

## 4.4 Pi/function types and quantifiers

Canonical ProofScript retains Lean's semantic tokens:

```text
Lean →   ↔ ProofScript →      (canonical)
           ProofScript ->     (optional ASCII alias)
Lean ∀   ↔ ProofScript ∀      (canonical)
           ProofScript forall (optional textual alias)
Lean ∃   ↔ ProofScript ∃      (canonical)
           ProofScript exists (optional textual alias)
```

Examples:

Lean 4:

```lean
Nat → Nat
(x : A) → B x
∀ x : A, P x
∃ x : A, P x
```

Canonical ProofScript:

```ts
Nat → Nat
(x: A) → B(x)
∀ (x: A), P(x)
∃ (x: A), P(x)
```

Optional ergonomic aliases:

```ts
Nat -> Nat
(x: A) -> B(x)
forall (x: A), P(x)
exists (x: A), P(x)
```

The dependent function type remains a Pi type. The result may depend on the term `x`. `->`, `forall`, and `exists` are aliases only; canonical formatting retains Lean's `→`, `∀`, and `∃`.

---

## 4.5 Inductive types

General inductives remain `inductive`; they are not TypeScript unions. [Inductive Types](https://lean-lang.org/doc/reference/latest/The-Type-System/Inductive-Types/)

Lean:

```lean
inductive Option (α : Type u) where
  | none
  | some (value : α)
```

ProofScript:

```ts
inductive Option(A: Type u): Type u {
  | none;
  | some(value: A);
}
```

ProofScript keeps Lean's `|` constructor marker canonical. Standard ProofScript does not add a `case` constructor alias; `case` remains a separate Lean tactic construct.

### Parameters and indices

Lean distinguishes declaration parameters before the colon from indices in the resulting type family. Auto-promotion of syntactic indices to parameters may occur according to Lean's `inductive.autoPromoteIndices` behavior. [Inductive Types](https://lean-lang.org/doc/reference/latest/The-Type-System/Inductive-Types/)

Lean:

```lean
inductive Vector (α : Type u) : Nat → Type u where
  | nil : Vector α 0
  | cons : α → Vector α n → Vector α (n + 1)
```

ProofScript:

```ts
inductive Vector(A: Type u): Nat → Type u {
  | nil: Vector(A, 0);

  | cons{n: Nat}(
    head: A,
    tail: Vector(A, n),
  ): Vector(A, n + 1);
}
```

The parameter/index distinction is semantic and must be retained.

### Mutual and nested inductives

ProofScript must support Lean's mutual and nested inductive constraints and kernel positivity/universe checks. Nested inductives are accepted through Lean's logical translation/checking rules; the frontend must not treat them as ordinary recursive JS types. [Inductive Types](https://lean-lang.org/doc/reference/latest/The-Type-System/Inductive-Types/)

### `enum`

`enum` is **not part of the standard ProofScript grammar**. A project may define an `enum` macro that expands to an ordinary `inductive` with nullary constructors, but that is an extension, not a fundamental language construct. This keeps the standard ontology aligned with Lean and demonstrates that the macro system, rather than the core grammar, is the right place for such conveniences.

---

## 4.6 Quotients and propositions

ProofScript kernel semantics must preserve:

- primitive `Quot`, `Quot.mk`, `Quot.lift`, `Quot.ind`, `Quot.sound`,
- quotient definitional computation rule,
- proof irrelevance,
- impredicative `Prop`,
- restricted elimination from propositions (with Lean's exceptions),
- function/product eta rules and other kernel equality behavior needed for compatibility. [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) [Quotients](https://lean-lang.org/doc/reference/latest/The-Type-System/Quotients/)

These are not places to invent TypeScript syntax. They belong to the type system/kernel.

---

## 4.7 Function semantics in more detail

All core function types are dependent Pi types. A non-dependent arrow is the case where the codomain does not use the binder. The source forms

```ts
Nat → String
(x: Nat) → String
```

therefore denote definitionally equal function types even though only the second creates a source-level binder available to later syntax.

Dependent result types can vary with the argument:

```ts
def chooseType(b: Bool): Type := {
  if (b) {
    Nat
  } else {
    String
  }
}
```

A dependent function can then return a value whose type depends on the input. Pattern matching is often needed to refine the expected result type:

```ts
def chooseValue: (b: Bool) → chooseType(b)
  | true => 0
  | false => "zero"
```

### β-reduction, η-equivalence, and currying

Applying an abstraction substitutes the supplied argument for its binder during definitional reduction:

```ts
example: (fun (x: Nat) => x + 1)(4) = 5 := by {
  rfl
}
```

Core functions accept one argument. Multi-parameter functions elaborate through currying:

```ts
def add(a: Nat, b: Nat): Nat := {
  a + b
}

#check add(1);      -- remaining function
#check add(1, 2);   -- final Nat
```

Lean's limited function η-equivalence is preserved: a function and `fun x => f(x)` can be definitionally equal when types permit it. General mathematical function extensionality remains propositional reasoning via `funext`/`ext`, not kernel conversion.

### Totality and escape hatches

Safe logical definitions must be total. The normal recursive-definition elaborator must justify termination. `partial` definitions and `unsafe` definitions are separate facilities with weaker logical availability; they MUST NOT be presented as ordinary total `def` declarations merely because the generated machine code runs.

## 4.8 Proposition semantics

`Prop` classifies propositions. Proofs of a proposition are definitionally proof-irrelevant: any two proofs of the same proposition are interchangeable for definitional equality. Proofs are also runtime-irrelevant in normal compiled code.

```ts
theorem proofIrrel(P: Prop, h1: P, h2: P): h1 = h2 := by {
  rfl
}
```

This does **not** make arbitrary data proof-irrelevant. `Bool` has two computational constructors and values of `Bool` can influence execution.

Propositional extensionality allows logically equivalent propositions to be proved equal:

```ts
theorem andSwap(P Q: Prop): (P ∧ Q) = (Q ∧ P) := by {
  apply propext
  constructor
  · intro h
    exact And.intro(h.right, h.left)
  · intro h
    exact And.intro(h.right, h.left)
}
```

ProofScript keeps Lean's restrictions on eliminating proofs into data-bearing universes. Those restrictions are part of the type theory and cannot be relaxed to imitate TypeScript control flow.

## 4.9 Universe hierarchy and polymorphism

`Prop` is impredicative. Data universes are predicative and non-cumulative. `Type u` abbreviates `Sort (u + 1)`; universe-polymorphic declarations can be instantiated at many levels.

```ts
universe u, v;

def idType{A: Type u}(x: A): A := {
  x
}

#check idType.{u};
```

Universe expressions include `0`, successors, `max`, and `imax` as supported by Lean. Automatic universe metavariables introduced by elaboration are not TypeScript generic parameters.

### Universe lifting

`ULift` moves data between universe levels without changing its mathematical payload; `PLift` performs the corresponding lifting role for propositions where applicable.

```ts
def liftNat(n: Nat): ULift(Nat) := {
  ⟨n⟩
}
```

These are ordinary Lean types with constructors and projections, not compiler casts.

## 4.10 Inductive declarations, recursors, and generated APIs

An inductive declaration introduces a type former and constructors, then generates recursors and related declarations subject to the type theory's positivity and universe rules.

```ts
inductive Color {
  | red;
  | green;
  | blue;
}
```

A parameter is uniform across constructors, while an index may vary and can carry information used by dependent elimination:

```ts
inductive Vec(A: Type): Nat → Type {
  | nil: Vec(A, 0)
  | cons{n: Nat}(head: A, tail: Vec(A, n)): Vec(A, n + 1)
}
```

Pattern matching on `Vec` can refine the index. ProofScript MUST preserve that dependent refinement; translating `Vec(A, n)` to an ordinary TypeScript array would lose the semantics.

### Anonymous constructors and deriving

Where the expected type identifies a constructor unambiguously, anonymous constructor syntax remains available:

```ts
def pair: Nat × String := {
  ⟨1, "one"⟩
}
```

`deriving` invokes Lean's deriving mechanism and emits ordinary declarations/instances:

```ts
inductive Direction {
  | north;
  | south;
} deriving Repr, BEq
```

### Structures

Structures are inductive types with one constructor plus generated projections and update support.

```ts
structure Point {
  x: Int;
  y: Int;
}

def origin: Point := {
  { x := 0, y := 0 }
}
```

Structure extension preserves Lean's parent-field semantics rather than JavaScript prototype inheritance:

```ts
structure NamedPoint extends Point {
  name: String;
}
```

## 4.11 Quotients and setoids

A `Setoid A` packages an equivalence relation on `A`. `Quotient` forms values modulo that relation. Functions out of a quotient must prove that their result respects the equivalence relation.

Conceptually:

```ts
structure ModRel(n: Nat) where
  rel: Nat → Nat → Prop
```

The actual quotient API remains Lean's `Setoid`, `Quotient.mk`, `Quotient.lift`, `Quotient.liftOn`, and related functions. ProofScript does not substitute a hash map, canonical-representative convention, or JavaScript object identity for quotient semantics.

Quotient soundness and its computation rule are foundational to Lean's theory and help derive principles such as function extensionality. They therefore belong inside the logical compatibility boundary, not only in a library compatibility list.


# 5. Source Files and Modules

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/)

## 5.1 Lexical layer, identifiers, and comments

ProofScript source is UTF-8 and should retain Lean's identifier capabilities, including Unicode identifiers, qualified/hierarchical names, and `«... »` escaped identifiers. Lean's parser uses a dynamic token table; syntax declarations may cause a previously valid identifier token to become reserved in later commands. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)

Canonical comments remain Lean-compatible:

```lean
-- line comment

/- nested
   block
   comment -/

/-- documentation comment -/
```

**Do not add JavaScript comment tokens to the standard ProofScript grammar.** Lean already assigns `//` a syntactic role in Subtype notation (`{x : A // P x}`), so `//` cannot safely become a global line-comment opener. ProofScript keeps `--` line comments, nested `/- ... -/` block comments, and Lean documentation forms `/-- ... -/` and `/-! ... -/`. An editor-only preprocessing layer could support other comment spellings outside the language grammar, but such preprocessing is not ProofScript source syntax. [Source Files and Modules / Namespaces and Sections](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/) [Subtypes](https://lean-lang.org/doc/reference/latest/Basic-Types/Subtypes/)

Documentation comments remain syntax attached to declarations, not discarded whitespace. [Modifiers and Attributes](https://lean-lang.org/doc/reference/latest/Definitions/Modifiers/)

---

## 5.2 Modules and imports

Modern Lean modules are not ES modules. [Source Files and Modules / Namespaces and Sections](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/)

```ts
module;

import Foo;
public import Bar;
meta import Baz;
public meta import Qux;
import all Internal;
```

Meanings remain Lean's:

- ordinary import: imported public scope enters current private scope;
- `public import`: re-exported through public scope;
- `meta import`: available in meta phase;
- `all`: also imports private scope where permitted.

Visibility/body exposure affects what downstream modules may unfold, so it can affect definitional equality during elaboration. Preserve `@[expose]`. [Source Files and Modules / Namespaces and Sections](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/)

`export Foo (bar);` remains Lean name export, not an ECMAScript export object.

---

## 5.3 Encoding and lexical representation

ProofScript source files are Unicode text. Implementations SHOULD use UTF-8 for interchange and MUST preserve Lean-compatible identifier and token distinctions. Unicode mathematical symbols such as `→`, `∀`, `∃`, `≤`, and `≠` are first-class source tokens when retained canonically by this reference.

Whitespace separates tokens where required and otherwise has no JavaScript automatic-semicolon-insertion meaning. Layout can be replaced by explicit ProofScript braces only in categories whose grammar defines those braces.

Lean comments remain canonical:

```ts
-- line comment

/- block comment
   /- nested block comment -/
-/

/-- Documentation attached to the following declaration. -/
def documented: Nat := {
  1
}
```

`//` is not a universal ProofScript comment introducer because Lean notation already uses slash tokens and the language intentionally retains Lean lexical conventions.

## 5.4 Keywords and identifiers

Lean's parser has a dynamic token table. Syntax extensions can introduce keywords, including scoped keywords that become active when a namespace/scope is opened. Therefore whether a token can be parsed as an identifier may depend on the current parser state.

Escaped identifiers and hierarchical names retain Lean behavior. Names such as

```text
Nat.succ
List.map
MyProject.Parser.term
```

are names in Lean's namespace system, not JavaScript property-access chains.

## 5.5 Module headers and imports

A source file corresponds to a module. Import commands load declarations and environment extensions before later commands are elaborated.

```ts
module;

public import Std;
import MyProject.Data;
```

Import visibility modifiers such as `public`, `meta`, and `all` retain their Lean module-visibility meaning for the selected baseline. They are not ECMAScript import modifiers.

A prelude-free or prelude-specific module header, when supported by the pinned baseline, controls which foundational modules are loaded automatically. ProofScript MUST NOT silently inject a TypeScript/JavaScript standard library instead.

## 5.6 Commands and module state

After the header/import region, a module contains commands. Commands are processed incrementally and may:

- declare constants, types, theorems, instances, and syntax;
- open or close section scopes;
- change options;
- register attributes or environment-extension data;
- request evaluation or diagnostics.

The module's exported environment is the semantic product of those commands, not a JavaScript object representing the file.

## 5.7 Visibility and public APIs

Private names may be internally renamed to avoid collisions. Public declarations may not depend on inaccessible private implementation details in ways forbidden by the pinned Lean baseline. Compatibility options that relax or warn about private-in-public behavior must retain their specific Lean meaning.

For example:

```ts
private def secret: Nat := {
  7
}

public def answer: Nat := {
  42
}
```

A formatter or TypeScript backend MUST NOT replace Lean visibility with JavaScript closure/private-field semantics.


# 6. Namespaces and Sections

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Namespaces-and-Sections/](https://lean-lang.org/doc/reference/latest/Namespaces-and-Sections/)

ProofScript may replace Lean layout/end delimiters with braces where doing so is purely structural, but namespace and section state are the same state manipulated by Lean.

## 6.1 Namespaces

Lean:

**Schematic (not an acceptance-test example):**

```text
namespace Foo
...
end Foo
```

ProofScript:

**Schematic (not an acceptance-test example):**

```text
namespace Foo {
  ...
}
```

This is structural sugar only; name resolution remains Lean's.

---

## 6.2 Sections

ProofScript may brace-shape sections while preserving all Lean scope state:

**Schematic (not an acceptance-test example):**

```text
section Algebra {
  variable {A: Type};
  variable [BEq(A)];
  ...
}
```

Sections scope `variable`, `include`, `omit`, `open`, `set_option`, local syntax/attributes, etc. [Source Files and Modules / Namespaces and Sections](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/)

Current section headers may also include:

```text
@[expose]
public
noncomputable
meta
```

ProofScript must support `public section`, `meta section`, and combinations allowed by Lean's grammar. [Section headers](https://lean-lang.org/doc/reference/latest/Namespaces-and-Sections/)

---

## 6.3 `variable`, `include`, `omit`, `open`

Keep Lean concepts with punctuation shaping only:

```ts
variable {A: Type};
variable (x: A);
variable [BEq(A)];

include x;
omit x;

open Nat;
open scoped BigOperators;
```

`omit` also has instance-variable-by-type forms in modern Lean; compatibility requires preserving them. [Source Files and Modules / Namespaces and Sections](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/)

Lean also permits `open ... in` to scope an opening to the immediately following command or expression. ProofScript MUST preserve that lexical/elaboration scope rather than translating it into a permanent namespace mutation:

```ts
open Combinator.Calculus in
  theorem localUse: P := proof;
```

The same applies to `open scoped ... in` and other `openDecl` shapes accepted by the pinned grammar. [Identifiers / scoped `open ... in`](https://lean-lang.org/doc/reference/latest/Terms/Identifiers/)

---

## 6.4 Opening namespaces

`open` changes name resolution in the current section scope without moving declarations into a JavaScript lexical object.

```ts
open Nat;
open scoped BigOperators;
```

Selective opening, hiding, and renaming preserve Lean semantics:

```ts
open MyMath (add mul);
open MyMath hiding sub;
```

When the selected baseline supports rename specifications, they alter how names are resolved in that scope only.

## 6.5 Scoped declarations and notation

`open scoped S` activates declarations registered in scope `S`, commonly notation and instances. The scope system matters to the parser as well as elaboration because notation may become available only when its scope is open.

This is why a parser cannot decide the entire token grammar before command processing.

## 6.6 Exporting names

`export` makes selected names from a namespace available through the enclosing namespace according to Lean's export mechanism:

```ts
namespace Geometry {
  def area: Nat := {
    0
  }
}

export Geometry (area);
```

This is a name-resolution/export facility, not an ECMAScript module export statement.

## 6.7 Section variables and automatic inclusion

`variable` declares parameters available to following declarations in the section. Lean may automatically include variables that occur in a declaration's signature or body, subject to section-variable rules and options.

```ts
section {
  variable {A: Type};
  variable (x: A);

  def keep: A := {
    x
  }
}
```

`include` and `omit` explicitly control whether section variables are included when automatic behavior would otherwise be ambiguous:

```ts
section {
  variable (A: Type) (x: A);
  include A;
  omit x;
  -- following declarations observe the selected inclusion policy
}
```

These commands affect generated declaration telescopes. They are not runtime variable declarations.

## 6.8 Nested section scopes

`section`, `namespace`, and scoped `in` combinators create frontend scopes for options, open namespaces, variables, local instances, notation, and other environment state. Their closing brace does not construct a runtime block value.

```ts
namespace Example {
  section {
    set_option pp.universes true;
    variable {A: Type};
    -- declarations
  }
}
```


# 7. Definitions

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Definitions/](https://lean-lang.org/doc/reference/latest/Definitions/)

ProofScript keeps `def` as the canonical definition declaration. TypeScript-oriented `function` and `const` spellings are built-in command aliases only; they do not introduce separate kernel/environment declaration kinds.

## 7.1 Definitions: canonical `def`

### Canonical form

Lean:

```lean
def answer : Nat := 42

def add (a b : Nat) : Nat :=
  a + b
```

ProofScript:

```ts
def answer: Nat := {
  42
}

def add(a: Nat, b: Nat): Nat := {
  a + b
}
```

Concept: `def` adds a new defined constant to the environment. Parameters are elaborated into lambdas and the declaration type into Pi types. The brace-delimited body above is the mandatory v0.1 structural term wrapper; it does not add a new declaration or core-expression form. [Definitions](https://lean-lang.org/doc/reference/latest/Definitions/Definitions/)

### Mandatory definition-body blocks

For the standard `:=` form of `def`, the body is always a declaration-owned `defBodyBlock`:

```ts
def single(n: Nat): Nat := {
  n + 1
}

def multiStep(n: Nat): Nat := {
  let doubled := n * 2;
  let shifted := doubled + 1;
  shifted
}
```

The compact form `def single(n: Nat): Nat := n + 1;` is not standard ProofScript v0.1 syntax. A separate Lean-source translator may accept it as Lean input.

The last term is the value of the block. Conceptually:

```text
lowerDefBody({ n + 1 })
  = n + 1

lowerDefBody({ let doubled := n * 2; doubled + 1 })
  = let doubled := n * 2
    doubled + 1
```

The outer braces are owned by the definition declaration, not by the ordinary term grammar. Consequently a structure value is nested rather than ambiguous:

```ts
def origin: Point := {
  { x := 0, y := 0 }
}
```

The block is elaborated under the declaration's normal expected result type. It adds no implicit `Unit`, no discarded-expression sequencing, and no JavaScript-style function-return statement. Lean `termReturn` remains part of the ordinary term grammar; mutation, `break`, and `continue` remain `do`-notation concepts, while `doReturn` retains early-return semantics inside `do`. Empty blocks are invalid; write `()` when the intended value is `Unit`.

### `function` alias

```ts
function add(a: Nat, b: Nat): Nat := {
  a + b
}
```

normalizes at the alias expansion point to:

```ts
def add(a: Nat, b: Nat): Nat := {
  a + b
}
```

and the definition-body block then denotes the same ordinary term body `a + b`. `function` has **no** JS function declaration semantics: no `this`, prototype, constructor behavior, `new`, JS hoisting, JS return completion, or distinct function-object declaration kind.

### `const` alias

```ts
const answer: Nat := {
  42
}

const computed: Nat := {
  let x := 40;
  x + 2
}
```

normalize to binderless `def` declarations with the same mandatory brace-delimited bodies:

```ts
def answer: Nat := {
  42
}

def computed: Nat := {
  let x := 40;
  x + 2
}
```

`const` has **no** ECMAScript lexical-environment, TDZ, reference-mutability, or runtime binding semantics. ECMAScript `const` really is a lexical immutable binding; ProofScript `const` is intentionally only a friendly spelling for a Lean `def`. [Variable Declarations](https://www.typescriptlang.org/docs/handbook/variable-declarations) [Declarations / `let` and `const`](https://tc39.es/ecma262/2026/multipage/ecmascript-language-statements-and-declarations.html)

### Alias restrictions

Normative v0.1 rule:

- `function` is allowed only for a `def` written with declaration binders.
- `const` is allowed only for a top-level/module-level `def` without declaration binders.
- Local `const` is **not part of canonical ProofScript v0.1**; local immutable bindings remain Lean `let`.
- Aliases expand through their registered command-macro rules when reached by the interleaved expansion/elaboration process in the parsing/macro-expansion rules in Chapter 2.
- Diagnostics should describe the resulting Lean concept as a definition.
- Canonical formatter output is `def` with a mandatory outer `:= { ... }` body for every standard DefDecl-family `:=` declaration.
- There is no short-body or already-delimited-term exception; `do`, `by`, `match`, and structure terms appear as the final term inside the outer body block.

---

## 7.2 Other declaration kinds

These remain distinct because Lean gives them distinct semantics/environment treatment. [Definitions](https://lean-lang.org/doc/reference/latest/Definitions/Definitions/) [`src/Lean/Declaration.lean`](https://github.com/leanprover/lean4/blob/master/src/Lean/Declaration.lean)

| Lean 4 | ProofScript | Concept |
|---|---|---|
| `theorem` | `theorem` | proposition-valued theorem declaration; distinct environment kind |
| `opaque` | `opaque` | definition with no kernel delta reduction |
| `axiom` | `axiom` | postulated constant without value |
| `abbrev` | `abbrev` | reducible abbreviation |
| `example` | `example` | unnamed checked declaration/example |
| `inductive` | `inductive` | kernel inductive declaration |
| `structure` | `structure` | elaborated as restricted single-constructor inductive |
| `class` | `class` | structure/inductive registered as typeclass |
| `instance` | `instance` | definition-like declaration registered for synthesis |

### Theorem

```ts
theorem addZero(n: Nat): n + 0 = n :=
  by {
    simp
  };
```

### Abbreviation

```ts
abbrev Name := String;
```

### Opaque

```ts
opaque secret: T := value;
```

### Axiom

```ts
axiom excludedMiddle(P: Prop): P ∨ ¬P;
```

---

## 7.3 Declaration modifiers and phase/visibility

ProofScript preserves Lean modifiers and their ordering/meaning. [Modifiers and Attributes](https://lean-lang.org/doc/reference/latest/Definitions/Modifiers/) [Source Files and Modules / Namespaces and Sections](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/)

```text
@[attributes]
private | public
protected
noncomputable
meta
unsafe
partial | nonrec
```

`meta` is especially important in the modern module system: it controls compile-time phase availability and may be inherited from `meta section`. It must not be conflated with `unsafe`. [Source Files and Modules / Namespaces and Sections](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/)

`unsafe` is not Rust-like memory unsafety syntax. It places the declaration outside Lean's safe logical subset and permits access to unsafe declarations. [Modifiers and Attributes](https://lean-lang.org/doc/reference/latest/Definitions/Modifiers/)

---

## 7.4 Local bindings: preserve `let`

Canonical ProofScript uses Lean's own binding vocabulary. A local `let` shown with a trailing `;` is a **binding-prefix form whose continuation follows**; it is not a standalone JavaScript statement.

Complete DefDecl-family example:

```ts
def sample(n: Nat): Nat := {
  let x := n + 1;
  let y: Nat := x * 2;
  y
}
```

This lowers to the corresponding continuation-bearing Lean term. Outside `defBodyBlock`, the selected Lean-compatible term grammar supplies the continuation according to that category; ProofScript does not create a universal statement list.

### Local function binder sugar

The local-binding head may preserve Lean's local function binder sugar:

```ts
def sample(n: Nat): Nat := {
  let double(x: Nat): Nat := 2 * x;
  double(n)
}
```

The binder sugar must elaborate exactly as the corresponding Lean local definition; it is not a nested JavaScript function declaration.

### Pattern `let`

```ts
def first(pair: Nat × Nat): Nat := {
  let (x, y) := pair;
  x
}
```

retains Lean pattern-matching-let semantics.

### Anaphoric `let`

Lean supports `let := v`, binding the name `this`; ProofScript preserves the same advanced form. [Identifiers / `let` examples and term documentation](https://lean-lang.org/doc/reference/latest/Terms/Identifiers/)

```ts
def useThis(value: Nat): Nat := {
  let := value;
  this
}
```

### Local recursion

`let rec` retains Lean local recursion, equation compilation, and termination behavior. In a `defBodyBlock`, its outer binding prefix still ends in the required body separator `;`; any recursion-tail syntax belongs to the local-definition grammar before that separator.

### Modern unified `let` / `have` options

Lean 4.22 unified the `let` and `have` syntax families and added first-class options. Because ProofScript targets Lean 4.33.1, the frontend MUST preserve the options and combinations accepted by the pinned 4.33.1 grammar, including at least: [Lean 4.22 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.22.0/)

- `+nondep` (with `have` corresponding to a nondependent/opaque local binding);
- `+usedOnly`;
- `+zeta`;
- `+postponeValue`;
- equality evidence such as `(eq := h)`, including pattern-binding cases;
- `+generalize`, including combinations such as `+generalize (eq := h)`.

Legacy spellings that remain accepted by Lean 4.33.1 (for example historical forms corresponding to `let_tmp`, `letI`/`haveI`, or `let_delayed`) MUST retain the same compatibility/deprecation status rather than being silently redefined. Lean 4.22 deprecated `let_fun` in favor of `have`; ProofScript must not promote a deprecated spelling into a new canonical construct.

The body-specific `localLetPrefix`/`localHavePrefix` grammar in the `let`/`have` grammar of this chapter and Appendix D mirrors these accepted heads up to, but not including, their continuation.

---

## 7.5 `have` is not `const`

Lean's `have` is the nondependent/opaque local-binding concept unified with modern `let` syntax; its value is intentionally unavailable for ordinary unfolding in the continuation. [Identifiers / `let` examples and term documentation](https://lean-lang.org/doc/reference/latest/Terms/Identifiers/) [Lean 4.22 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.22.0/)

In a DefDecl-family body:

```ts
def useProof(P: Prop, hP: P): P := {
  have h: P := hP;
  h
}
```

Do not globally rewrite `have` to `const` or ordinary dependent `let`. The distinction matters to elaboration, local-declaration opacity, simplification, and performance.

---

## 7.6 Recursive definitions

Lean's kernel does not contain a standalone syntactic termination checker. The elaborator justifies terminating recursion by translating definitions into core terms using recursors/well-founded machinery; partial/unsafe forms have distinct treatment. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) [Recursive Definitions](https://lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/)

Canonical ProofScript:

```ts
def factorial(n: Nat): Nat := {
  match (n) {
    | 0 => 1
    | n + 1 => (n + 1) * factorial(n)
  }
}
```

### Termination clauses

```ts
termination_by measure
decreasing_by {
  omega
};
```

and:

```ts
termination_by structural xs;
termination_by?;
```

remain Lean concepts.

### Mutual recursion

**Schematic (not an acceptance-test example):**

```text
mutual {
  def even(...): ... := {
    ...
  }

  def odd(...): ... := {
    ...
  }
}
```

### `where`: structure-field value form versus local helper section

Lean uses `where` in two distinct declaration layers that ProofScript MUST keep separate. First, a canonical `def` may use a **structure-field initializer value form** instead of `:= term` or equation alternatives:

```ts
def origin: Point where {
  x := 0,
  y := 0
}
```

This corresponds to Lean's `def origin : Point where x := 0; y := 0` structure-construction form. ProofScript brace-shapes this value form and uses the same comma-separated field-provision discipline as a structure-instance value; the fields themselves remain Lean `structInstField` concepts using `:=`/equation provisions, not JavaScript properties. It supplies fields of the result structure; it is not a helper-definition block. Second, after a completed definition value form where Lean permits it, a **local `where` declaration section** may introduce nested helpers:

**Schematic (not an acceptance-test example):**

```text
def f(...): T := {
  body
}
where {
  helper(...): U := ...;
}
```

The simple `:=` and equation forms may have their documented termination suffix before this local helper section. The structure-field value form may also be followed by a local helper section where the pinned grammar permits it, but does not thereby inherit the simple/equation termination suffix. Applicable `deriving` material follows the completed value/local-`where` layer. Local helpers are **not arbitrary nested commands**: the pinned Lean parser represents them with the `letRecDecl` family (doc comment/attributes plus a `letDecl`-style helper and its own termination suffix), separated by semicolons; the helper layer expands through local recursive declarations. [Definitions](https://lean-lang.org/doc/reference/latest/Definitions/Definitions/) [Lean parser source: `letRecDecl` / `whereDecls`](https://github.com/leanprover/lean4/blob/master/src/Lean/Parser/Term.lean)

### `where ... finally`

Lean 4.22 added a `finally` tactic sequence after a potentially empty **local `where` declaration section**. Its goals are unresolved metavariables arising from the definition body and auxiliary `let rec`/local-`where` definitions. `finally` belongs to this local-helper layer; it is not a suffix attached directly to the structure-field `where` value form. ProofScript MUST preserve this phase and goal behavior for the Lean 4.33.1 target; it is not ordinary runtime cleanup and must not be confused with JavaScript `finally`. [Lean 4.22 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.22.0/)

Schematic canonical shape:

**Schematic (not an acceptance-test example):**

```text
def f(...): T := {
  body
}
where {
  helper(...): U := ...;
}
finally {
  tactics
};
```

The `finally` section may also contain Lean's named subsections of the form `| name => tacticSeq`. ProofScript MUST preserve those subsections and their tactic-goal routing; they are not match alternatives and not runtime exception handlers. The pinned parser source defines `whereFinally` as an optional main tactic sequence followed by zero or more named `whereFinallySubsection`s. [Lean parser source: `whereFinally` / `whereFinallySubsection`](https://github.com/leanprover/lean4/blob/master/src/Lean/Parser/Term.lean)

Schematic category shape:

```text
whereFinally ::= "finally" tacticSeq? whereFinallySubsection*
whereFinallySubsection ::= "|" ident "=>" tacticSeq
```

The exact admissible combinations and placement are governed by the pinned Lean 4.33.1 declaration grammar and are acceptance-tested independently from `try`/`catch`/runtime exception syntax. A conformance release MUST validate the tagged 4.33.1 parser behavior; the moving `master` source link above is explanatory evidence only.

### `partial`

**Schematic (not an acceptance-test example):**

```text
partial def loop(...): T := {
  ...
}
```

retains Lean's partial-definition behavior and is not merely a disabled warning.

### `partial_fixpoint`

**Schematic (not an acceptance-test example):**

```text
def f(...): T := {
  ...
}
partial_fixpoint;
```

remains distinct from `partial` because it supports fixed-point reasoning/equations under its own conditions. [Recursive Definitions](https://lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/)

### Predicate fixpoints and coinductive predicates

The pinned/explicitly tracked Lean feature inventory distinguishes least/greatest fixpoint mechanisms for `Prop`-valued recursion: [Recursive Definitions](https://lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/)

```text
inductive_fixpoint
coinductive_fixpoint
coinductive
```

ProofScript must expose these as distinct Lean-native features. Do not silently model them as ordinary recursive `def` or ordinary `inductive` syntax.

---

## 7.7 Headers, universe parameters, and automatic implicits

Declaration headers may contain explicit universe parameters, term parameters, implicit parameters, strict implicits, instance implicits, optional parameters, and automatic implicits.

```ts
universe u;

def identity.{u}{A: Type u}(x: A): A := {
  x
}
```

Automatic implicit parameters are an elaborator convenience, not a TypeScript generic feature. If `autoImplicit` is enabled and an undeclared identifier is eligible to become a parameter, it is added according to Lean's rules. Conformance tooling SHOULD test both enabled and disabled behavior:

```ts
set_option autoImplicit false;
```

The `relaxedAutoImplicit` behavior of the pinned baseline must likewise be preserved when supported.

## 7.8 Three principal `def` value forms

Lean's definition grammar distinguishes simple values, equation clauses, and structure-field `where` values. ProofScript preserves those categories even though simple values are brace-shaped.

Simple value:

```ts
def inc(n: Nat): Nat := {
  n + 1
}
```

Equation clauses:

```ts
def isZero: Nat → Bool
  | 0 => true
  | _ => false
```

Structure-field value form:

```ts
structure PairBox {
  left: Nat;
  right: Nat;
}

def boxed: PairBox where {
  left := 1,
  right := 2
}
```

The third form is not a local-helper `where` section. Parser and formatter implementations MUST keep those grammars distinct.

## 7.9 `abbrev`, `opaque`, `theorem`, and `example`

`abbrev` creates a definition intended to be reducible during elaboration:

```ts
abbrev UserId := Nat;
```

`opaque` creates a definition whose value is hidden from ordinary reduction after checking:

```ts
opaque hiddenNumber: Nat := 37;
```

Lean also permits an `opaque` declaration with a required type but no explicit right-hand side. ProofScript preserves that distinct form:

```ts
opaque defaultNat: Nat;
```

For the pinned Lean semantics, the elaborator must synthesize an inhabitant: it first attempts `Inhabited(T)` and, if that fails, `Nonempty(T)`. This is not an axiom declaration; failure to establish inhabitation rejects the declaration. The synthesized inhabitant is relevant to compilation even though the opaque constant is not delta-reduced by the kernel.

`theorem` introduces a proved proposition and is treated opaquely for ordinary reduction:

```ts
theorem add_zero(n: Nat): n + 0 = n := by {
  simp
}
```

`example` checks a declaration-like proof/value without installing a user-facing global name:

```ts
example(n: Nat): n = n := by {
  rfl
}
```

The declaration kinds are not aliases merely because some share header/value grammar.

## 7.10 Structural recursion

Structural recursion recurses on a structurally smaller subterm of an inductive argument. Lean may infer the decreasing parameter or it can be selected explicitly:

```ts
def sum: List(Nat) → Nat
  | [] => 0
  | x :: xs => x + sum(xs)
termination_by structural xs
```

The exact accepted syntax and whether an explicit `termination_by structural` is needed follow the pinned baseline. ProofScript must preserve generated equation behavior and recursor justification.

## 7.11 Well-founded recursion

When recursion is not structurally evident, a measure or well-founded relation can justify recursive calls:

```ts
def countdown(n: Nat): List(Nat) := {
  if (h: n = 0) {
    []
  } else {
    n :: countdown(n - 1)
  }
}
termination_by n
```

The frontend generates obligations showing that each recursive call decreases. `decreasing_by { ... }` supplies tactics for those obligations. The kernel checks the resulting well-founded construction, not the source-level measure annotation itself.

## 7.12 Partial and fixpoint recursion

`partial` definitions are executable escape hatches whose logical interpretation is intentionally weaker than ordinary terminating definitions. `partial_fixpoint`, `inductive_fixpoint`, and `coinductive_fixpoint` are distinct Lean mechanisms where present in the pinned baseline. ProofScript MUST preserve their declaration-tail/predicate-fixpoint semantics instead of reducing them all to “allow infinite recursion.”

A compatibility matrix SHOULD separately test:

- acceptance conditions,
- generated logical declarations,
- equation theorems,
- compiled behavior,
- use from safe proofs.


# 8. Axioms

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Axioms/](https://lean-lang.org/doc/reference/latest/Axioms/)

## 8.1 Axiom syntax and parameters

An axiom has a checked type but no checked value:

```ts
axiom excludedMiddle(P: Prop): P ∨ ¬P;
```

The declaration is accepted because the type itself is well-formed. No proof term is constructed. Consequently an axiom is a trusted assumption and does not reduce.

Axioms may be universe-polymorphic and dependent just like other constants:

```ts
universe u;
axiom chooseAny{A: Type u}: Nonempty(A) → A;
```

Strict verification profiles SHOULD reject or explicitly whitelist such assumptions by identity and type.

## 8.2 Consistency and assumption-relative proofs

Kernel soundness means that, relative to the selected kernel rules and admitted constants, invalid terms cannot be accepted. Declaring an inconsistent axiom can make every proposition provable without indicating a kernel bug.

```ts
axiom impossible: False;

theorem anything(P: Prop): P := by {
  exact False.elim(impossible)
}
```

Tooling therefore MUST distinguish “kernel-checked” from “axiom-free” or “accepted under an approved axiom manifest.”

## 8.3 Standard logical assumptions

Lean's standard environment uses a small number of powerful principles, including quotient soundness, propositional extensionality, and classical choice facilities. Their exact transitive appearance in `#print axioms` depends on the theorem. ProofScript does not reclassify these assumptions based on JavaScript runtime availability.

Example inspection:

```ts
#print axioms Classical.choice;
#print axioms propext;
```

## 8.4 Axioms and computation

Because axioms have no definition body, delta reduction cannot unfold them. A program that depends computationally on an axiom may be noncomputable or require a separate runtime implementation. ProofScript MUST keep this logical/runtime distinction explicit.


# 9. Attributes

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Attributes/](https://lean-lang.org/doc/reference/latest/Attributes/)

## 9.1 Attributes

Keep Lean's extensible attribute syntax. [Modifiers and Attributes](https://lean-lang.org/doc/reference/latest/Definitions/Modifiers/)

```ts
@[simp]
@[inline]
@[extern "symbol"]
@[implemented_by fastImpl]
@[expose]
```

And the command:

```ts
attribute [simp] theoremName;
attribute [-simp] theoremName;
```

Support local/scoped attribute instances according to Lean's attribute system. Do not replace them globally with TypeScript decorators.

---

## 9.2 Attribute arguments and timing

Attributes are handlers registered with the elaborator environment. An attribute may accept arguments and may affect elaboration, tactics, compilation, pretty printing, code generation, or other extension tables.

```ts
@[simp]
theorem addZero(n: Nat): n + 0 = n := by {
  simp
}

@[inline]
def tiny(n: Nat): Nat := {
  n + 1
}
```

The meaning comes from the registered Lean attribute handler. The bracket syntax does not imply TypeScript decorator evaluation or JavaScript reflection.

## 9.3 Adding and removing attributes

Attributes can be installed after a declaration:

```ts
attribute [simp] addZero;
attribute [-simp] addZero;
```

Removing an attribute changes the corresponding environment extension but does not delete or alter the underlying theorem.

## 9.4 Local and scoped attributes

A local attribute is active only in the current section scope. A scoped attribute is activated through its named scope. This behavior enables libraries to ship optional notation/automation without globally changing every importing module.

Conformance tests SHOULD verify that leaving a section or closing a scope restores the previous attribute environment.

## 9.5 Attributes that affect transparency and compilation

Attributes such as reducibility/transparency controls, `@[extern]`, `@[export]`, `@[implemented_by]`, `@[inline]`, and proof-automation registration attributes may affect different phases. ProofScript documentation MUST state which phase observes each standard attribute rather than treating attributes as an undifferentiated metadata map.


# 10. Type Classes

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Type-Classes/](https://lean-lang.org/doc/reference/latest/Type-Classes/)

## 10.1 Typeclasses

ProofScript retains Lean's `class`, which is based on inductive/structure declarations and registered for instance synthesis. [Class Declarations](https://lean-lang.org/doc/reference/latest/Type-Classes/Class-Declarations/)

```ts
class EqLike(A: Type) {
  eq(a: A, b: A): Bool;
}
```

This does **not** imply JavaScript prototypes, `this`, `new`, runtime subclass dispatch, or nominal class-object semantics.

### Extension

```ts
class Ord(A: Type) extends EqLike(A) {
  compare(a: A, b: A): Ordering;
}
```

### Output parameters

Retain Lean's `outParam` and `semiOutParam`; they are instance-search controls, not TS variance annotations.

### `class inductive`

Retain current Lean support for sum-type classes.

### `class abbrev`

Add the omitted current feature:

```ts
class abbrev AddMul(A: Type) := Add(A), Mul(A);
```

It is not a simple textual alias: Lean expands it to a class extending the listed classes and registers the constructor as an instance. [Class Declarations](https://lean-lang.org/doc/reference/latest/Type-Classes/Class-Declarations/)

---

## 10.2 Instances and synthesis

Lean instance declarations are definition-like declarations whose name may be omitted. [Instances and synthesis](https://lean-lang.org/doc/reference/latest/Type-Classes/Instance-Synthesis/)

```ts
instance: EqLike(Nat) := {
  eq(a: Nat, b: Nat) := a == b,
};
```

Parameterized:

**Schematic (not an acceptance-test example):**

```text
instance {A: Type} [EqLike(A)]: EqLike(List(A)) := {
  ...
};
```

Priority:

```ts
instance (priority := 100): C(T) := value;
```

ProofScript must preserve:

- local and global candidate instances,
- declared priorities,
- declaration-order tie breaking,
- `outParam` / `semiOutParam`,
- default instances (`@[default_instance ...]`),
- reducibility behavior during synthesis,
- cycle/diamond handling and tabling behavior to the degree required for compatibility. [Instances and synthesis](https://lean-lang.org/doc/reference/latest/Type-Classes/Instance-Synthesis/)

---

## 10.3 Classes are data declarations plus synthesis metadata

A class declaration introduces fields and a constructor just like a structure/inductive declaration, and additionally marks the resulting type for instance synthesis.

```ts
class Sized(A: Type) {
  size: A → Nat;
}
```

A function can request an instance implicitly:

```ts
def sizeOf{A: Type}[Sized(A)](x: A): Nat := {
  Sized.size(x)
}
```

The instance argument exists in the elaborated function telescope even when callers do not write it explicitly.

## 10.4 Instance declarations and priorities

```ts
instance: Sized(String) := {
  size := String.length
}
```

Instance names may be generated when omitted. Priorities influence search order:

```ts
instance (priority := 200): Inhabited(Nat) := {
  default := 0
}
```

ProofScript MUST preserve the priority and local/scoped registration semantics because they can change which term elaborates successfully.

## 10.5 Output parameters

`outParam` and `semiOutParam` guide synthesis by changing which typeclass parameters are treated as outputs during search. They do not change the kernel type of the class and are not variance markers.

A class may use an output parameter conceptually as:

```ts
class Elem(A: outParam(Type), C: Type) {
  first?: C → Option(A);
}
```

`outParam` wraps the parameter's type, just as in Lean. Instance search may therefore use the input `C` to determine `A`; `semiOutParam` uses the same wrapper shape but retains a pre-existing value while selecting candidates.

## 10.6 Default instances

`@[default_instance]` registers fallback candidates used in elaboration problems such as overloaded numerals and operations. Default instance priority is part of elaboration semantics and SHOULD be included in differential tests.

## 10.7 Deriving

`deriving` invokes registered deriving handlers after a data declaration. For example:

```ts
structure User {
  id: Nat;
  name: String;
} deriving Repr, BEq
```

The result is ordinary generated declarations and instance registrations. A backend cannot replace them with TypeScript interface metadata and still claim semantic equivalence.

## 10.8 Basic classes and overloaded notation

Many familiar operators are driven by classes, including equality tests, ordering, arithmetic, string conversion, and container notation. The surface operator token therefore does not determine semantics by itself; expected types and synthesized instances participate in elaboration.

For example, `==` produces a `Bool` through `BEq`, while `=` creates a proposition through `Eq`. They MUST remain distinct even if both happen to compile to similar host comparisons for particular primitive types.


# 11. Coercions

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Coercions/](https://lean-lang.org/doc/reference/latest/Coercions/)

## 11.1 Coercions

Lean coercions are elaborator-inserted terms, not unchecked casts. [Coercions](https://lean-lang.org/doc/reference/latest/Coercions/)

```ts
↑x
```

is preserved.

A precise compatibility description should mention:

- `CoeT` as the relation the elaborator ultimately searches for/inserts,
- chain construction through `CoeHead`, `Coe`, `CoeOut`, `CoeTail`,
- dependent coercions via `CoeDep`,
- coercions to sorts through `CoeSort`,
- coercions to function types through `CoeFun`.

`x as T` is rejected as the canonical representation because TypeScript `as` suggests a type assertion rather than insertion of a checked coercion function.

---

## 11.2 The coercion search boundary

Coercions are inserted by elaboration when an expression's inferred type does not match an expected type and an allowed coercion path exists. The inserted result is an ordinary function application in the elaborated term.

```ts
def asInt(n: Nat): Int := {
  ↑n
}
```

The explicit `↑` requests coercion at the source level. The elaborator may also insert coercions implicitly when the context requires them.

## 11.3 Coercion families

Lean's coercion framework distinguishes several roles:

- `Coe`/`CoeT` for ordinary type-to-type coercions;
- head/tail/out variants used to control composition and search;
- `CoeDep` for coercions whose target depends on the specific source value;
- `CoeSort` for treating a value as a sort/type;
- `CoeFun` for treating a value as a function.

A faithful ProofScript implementation must reproduce the accepted coercion paths and ambiguity behavior, even if its internal search algorithm is organized differently.

## 11.4 Coercions to sorts

A wrapper may expose an underlying type through `CoeSort`, permitting syntax such as a container-like descriptor to appear in a type position. This is elaboration-time insertion, not runtime dynamic typing.

## 11.5 Coercions to functions

`CoeFun` can make values callable by inserting a function projection or conversion before application. Therefore the syntax

```ts
f(x)
```

may elaborate by first coercing `f` to a function type. ProofScript call punctuation MUST preserve this possibility and cannot assume only syntactic function declarations are callable.

## 11.6 Coercions are not casts

A coercion must type-check and is visible in the elaborated term. It does not assert that an arbitrary value should be *treated as* another type. ProofScript therefore rejects TypeScript-style unchecked `as T` as an equivalent language feature.


# 12. Run-Time Code

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Run-Time-Code/](https://lean-lang.org/doc/reference/latest/Run-Time-Code/)

The logical meaning of ProofScript is not defined by JavaScript, Node.js, Bun, WASM, or any host runtime. Backends implement checked programs under an explicit execution-correspondence contract.

## 12.1 FFI and implementation replacement

Preserve Lean's current FFI concepts, which are C-ABI-oriented and documented as unstable. [Foreign Function Interface](https://lean-lang.org/doc/reference/latest/Run-Time-Code/Foreign-Function-Interface/)

**Schematic (not an acceptance-test example):**

```text
@[extern "symbol"]
opaque nativeFoo(...): ...;

@[export symbol]
def exported(...): ... := {
  ...
}
```

Preserve `@&` borrowing annotations where they apply and `@[implemented_by ...]` logical-vs-compiled implementation separation.

A future JS/Node/Bun/Deno FFI should be **additive**:

```text
Lean FFI concepts remain Lean FFI concepts
+
explicit JS backend interoperability layer
```

It must not silently redefine `extern`, `IO`, `Array`, `String`, or other Lean source concepts.

---

## 12.2 Logical values and runtime representation

The kernel reasons about logical constructors and eliminators, not a fixed machine-object layout. The runtime/compiler may choose optimized representations as long as program observations are preserved.

A value such as

```ts
.some(42)
```

is logically an application of an inductive constructor. A backend may represent some constructors without heap allocation, but this must not change pattern-matching or equality behavior.

## 12.3 Boxing

Polymorphic code may require values to use a uniform runtime representation. Compiler transformations may box unboxed machine values when they pass through polymorphic interfaces and unbox them again for primitive operations. These representation choices are not source casts and are not reflected as new source types.

## 12.4 Reference counting and uniqueness optimization

Lean's native runtime uses reference counting and can exploit uniquely referenced objects to perform destructive updates that are observationally equivalent to pure updates. ProofScript backends may use different memory managers, including tracing GC in JavaScript, but they MUST preserve the same pure source semantics.

For example, updating an array value must behave as returning an updated array value even if an optimized backend mutates storage in place when it proves uniqueness.

## 12.5 Multi-threading and tasks

Thread/task APIs expose concurrency through explicit runtime abstractions. Scheduling is not a kernel reduction rule. Proofs about concurrent programs require an explicit logical model; successful compilation does not make race-freedom or scheduling properties automatically proved.

## 12.6 FFI trust boundary

An FFI declaration can connect a logical declaration to foreign code:

```ts
@[extern "host_clock"]
opaque hostClock: Unit → IO(UInt64);
```

The kernel checks the type/declaration but cannot establish that the foreign symbol implements the declared behavior. Execution-correctness claims therefore include foreign code and ABI bindings in their trusted or verified boundary.

`@[implemented_by fastImpl]` likewise separates a logical implementation used for reasoning from a compiled implementation. It is a powerful trusted correspondence boundary and MUST be visible in certification metadata.


# 13. Terms

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Terms/](https://lean-lang.org/doc/reference/latest/Terms/)

Terms are the main source-language representation of programs, types, and proofs. ProofScript changes selected concrete delimiters and application punctuation while preserving elaborated Lean meaning.

## 13.1 Lambdas

Lean 4 introduces function abstractions with the `fun` keyword, and the official reference explicitly treats `fun` as the function-abstraction syntax. [The Type System](https://lean-lang.org/doc/reference/latest/The-Type-System/)

Lean 4:

```lean
fun (x : Nat) => x + 1
fun (x : A) (y : B) => f x y
fun {A : Type} (x : A) => x
```

Canonical ProofScript keeps the Lean concept introducer while using TypeScript-shaped binder punctuation/application:

```ts
fun (x: Nat) => x + 1
fun (x: A, y: B) => f(x, y)
fun {A: Type} (x: A) => x
```

Optional TypeScript-oriented lambda alias:

```ts
(x: Nat) => x + 1
(x: A, y: B) => f(x, y)
```

The alias normalizes to canonical `fun` syntax before semantic elaboration. Multiple surface parameters lower to nested Lean lambdas; they do not introduce JavaScript multi-argument function semantics. `=>` remains the Lean lambda/branch/syntax-rule right-hand-side token and stays distinct from canonical `→`. Lean's native `↦` alternative may also be accepted where Lean accepts it.

The reason `fun` is canonical rather than omitted is both conceptual and grammatical: it explicitly announces a lambda binder sequence and cleanly supports Lean's explicit, implicit, strict-implicit, and instance-implicit binder forms without making `{...}` or `[...]` look like unrelated JavaScript constructs.

---

## 13.2 Uniform application

Lean core application is unary; surface multiple arguments are curried applications. [Function Application](https://lean-lang.org/doc/reference/latest/Terms/Function-Application/)

```text
Lean:    f x y
ProofScript:  f(x, y)
Core:    App(App(f, x), y)  -- only when these are the complete elaborated arguments
```

This applies equally to values and types:

```ts
Option(Nat)
List(Nat)
Vector(A, n)
@Eq(A, x, y)
```

No separate TypeScript-generic application semantic layer is introduced.

### Named arguments

Lean:

```lean
f a (z := 8) (y := 3)
```

ProofScript:

```ts
f(a, z := 8, y := 3)
```

Named arguments retain `:=` and Lean's binder-name lookup/reordering semantics. [Function Application](https://lean-lang.org/doc/reference/latest/Terms/Function-Application/)

### Explicit mode and ellipsis

```ts
@f
f ..
```

must preserve Lean explicit-argument and application-ellipsis behavior. `..` is not JavaScript spread.

### Generalized field notation

```text
Lean:    xs.map f
ProofScript:  xs.map(f)
```

Resolution remains Lean generalized field notation, including namespace lookup based on the receiver's type. [Function Application](https://lean-lang.org/doc/reference/latest/Terms/Function-Application/)

---

## 13.3 Conditionals: add `bif`

Lean's ordinary `if` is proposition-based and uses a synthesized `Decidable` instance. A dependent `if h : p` supplies proof evidence to the branches. Lean also has `bif` for a directly Boolean condition. [Conditionals](https://lean-lang.org/doc/reference/latest/Terms/Conditionals/)

### Ordinary `if`

Lean:

```lean
if p then a else b
```

ProofScript:

```ts
if (p) {
  a
} else {
  b
}
```

This remains an **expression**.

### Dependent `if`

```ts
if h: p {
  yesBranch
} else {
  noBranch
}
```

`h` is proof evidence, not a TypeScript type annotation.

### Boolean-only `bif`

Lean:

```lean
bif b then x else y
```

ProofScript:

```ts
bif (b) {
  x
} else {
  y
}
```

`bif` must remain distinct from `if` because the underlying condition concept differs.

### `if let`

**Schematic (not an acceptance-test example):**

```text
if let .some(x) := value {
  ...
} else {
  ...
}
```

retains Lean pattern-match sugar and `:=`.

---

## 13.4 Structures

Lean structures are restricted inductive types, not erased interfaces. [Inductive Types](https://lean-lang.org/doc/reference/latest/The-Type-System/Inductive-Types/)

Lean:

```lean
structure Point where
  x : Int
  y : Int
```

ProofScript:

```ts
structure Point {
  x: Int;
  y: Int;
}
```

### Defaults

```ts
structure Config {
  retries: Nat := 3;
}
```

### Construction

```ts
{ x := 10, y := 20 }
```

### Punning

```ts
{ x, y }
```

### Update

```ts
{ p with x := 10 }
```

### Nested update

```ts
{ p with address.city := newCity }
```

Do not use JS object-property colon for canonical field provision and do not define JS spread as structure-update identity. Lean's update elaborator has different rules and may support nested updates. 

---

## 13.5 Pattern matching

Lean pattern matching is dependent elaboration, not a JavaScript `switch`. [Pattern Matching](https://lean-lang.org/doc/reference/latest/Terms/Pattern-Matching/)

**Canonical alternative rule:** each standard alternative begins with `|`; there is no built-in `case` alias and no branch-level trailing `;` or `,`. An alternative may contain multiple pattern sequences separated by `|` before its single `=>`. After the RHS term completes, the next top-level `|` begins the next alternative. [Pattern Matching](https://lean-lang.org/doc/reference/latest/Terms/Pattern-Matching/)

Lean:

```lean
match value with
| .none => fallback
| .some x => x
```

ProofScript:

```ts
match (value) {
  | .none =>
    fallback

  | .some(x) =>
    x
}
```

### Multiple discriminants

**Schematic (not an acceptance-test example):**

```text
match (x, y) {
  | .some(a), .some(b) => ...
  | _, _ => ...
}
```

### Multiple pattern sequences in one alternative

Lean permits one RHS to serve multiple pattern sequences. ProofScript preserves this with canonical `|` and still uses no branch terminator:

```ts
match (x, y) {
  | .none, _ | _, .none => 0
  | .some(a), .some(b) => a + b
}
```

Each pattern sequence must have the same arity as the discriminant list.

### Pattern-matching functions

```ts
def isZero: Nat → Bool := {
  fun
    | 0 => true
    | _ => false
}
```

This is Lean's standard pattern-matching function abstraction, not a `switch` or a TypeScript overload set.

### Named discriminants

Preserve Lean's equality-evidence concept:

**Schematic (not an acceptance-test example):**

```text
match (h: value) {
  ...
}
```

The binder `h` receives Lean's equality evidence; this is the canonical TypeScript-shaped discriminant-list spelling, not an alias.

### Explicit motive

**Schematic (not an acceptance-test example):**

```text
match (motive := M) (value) {
  ...
}
```

### Generalization

**Schematic (not an acceptance-test example):**

```text
match (generalizing := true) (value) {
  ...
}
```

### Inaccessible pattern

```ts
.(term)
```

### Named patterns

```ts
x @ pattern
x @ h: pattern
```

must retain current equality-binding capabilities where applicable.

### Function equations

ProofScript must support equation-compiler definitions, not only explicit `match` expressions.

---

## 13.6 Proof terms and theorem language

Proofs are terms; tactics are a way to construct those terms.

```ts
theorem refl{A: Type}(x: A): x = x :=
  Eq.refl(x);
```

or:

```ts
theorem refl{A: Type}(x: A): x = x :=
  by {
    rfl
  };
```

Both must elaborate to kernel-checkable proof terms.

---

## 13.7 `do` notation and effects

Lean `do` is a monadic embedded language, not `async`/`await`. [Functors, Monads, and `do` Syntax](https://lean-lang.org/doc/reference/latest/Functors___-Monads-and--do--Notation/Syntax/)

Lean:

```lean
def program : IO Unit := do
  let stdin ← IO.getStdin
  let line ← stdin.getLine
  IO.println line
```

ProofScript:

```ts
def program: IO(Unit) := {
  do {
    let stdin ← IO.getStdin;
    let line ← stdin.getLine;
    IO.println(line);
  }
}
```

Note the revised canonical local binder: `let`, not `const`.

### Pure local

```ts
let x := expression;
```

### Monadic bind

```ts
let x ← action;
```

### Mutable local

```ts
let mut total := 0;
total := total + 1;
```

### Early return

```ts
return value;
return;
```

`return` here is Lean `do` early return, not ordinary function-body return. Bare `return;` corresponds to Lean bare `doReturn` and is equivalent to `return ()` when no term begins on the same line. [Lean `do` syntax / Early Return](https://lean-lang.org/doc/reference/latest/Functors___-Monads-and--do--Notation/Syntax/)

### Term-level `return` outside explicit `do`

Lean also registers `termReturn` as an ordinary term parser. Outside an explicit `do` block, `return e` creates an implicit block and is equivalent to the corresponding `pure e`; this is **not early function return**. ProofScript preserves the distinction rather than banning the token outright. [Lean Parser.Do API / `termReturn`](https://lean-lang.org/doc/api/Lean/Parser/Do.html)

```ts
def lifted(x: Nat): Option(Nat) := {
  return x
}
```

At immediate `defBodyBlock` level, `return x;` remains invalid because the trailing `;` would be a body-level final terminator/statement shape. Inside explicit `do`, by contrast, `return x;` is a `doElem` and may early-return from the containing do block.

### `do match` dependency

With the Lean 4.32+ `do` elaborator, `do match` branches are nondependent by default. ProofScript MUST preserve the dependent option inside `do`; in the TypeScript-shaped match surface this is represented as a match option preceding the parenthesized discriminant list. **Crucially, a `do match` alternative has a `doSeq` RHS, not an ordinary term RHS**—the upstream parser explicitly constructs `doMatchAlts` using `matchAlts (rhsParser := doSeq)`. Lean 4.33's refined bare-`return` behavior in a dependent branch is part of the 4.33.1 conformance target. [Lean `do` parser source](https://github.com/leanprover/lean4/blob/master/src/Lean/Parser/Do.lean) [Lean 4.32 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.32.0/) [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/)

```ts
do {
  match (dependent := true) (x) {
    | 0 => return;
    | n + 1 => return n;
  }
}
```

The semicolons above belong to the `do`-return elements inside the branch bodies; they are not match-alternative terminators.

### Loops

**Schematic (not an acceptance-test example):**

```text
for (x in xs) {
  ...
}

while (p) {
  ...
}

repeat {
  ...
} until p;
```

`for` lowers through Lean `ForIn`/`ForIn'`, not the JavaScript iterator protocol. Proof-bearing iteration remains expressible.

### Effect forwarding (`do←`; optional ASCII `do<-`)

Lean 4.32 made the new `do` elaborator default and added canonical `do←` (with ASCII `do<-` as an alias) to forward surrounding control effects through continuation-taking wrappers. [new `do` elaborator and `do←`/`do<-`](https://lean-lang.org/doc/reference/latest/releases/v4.32.0/)

ProofScript must add:

```ts
do← body
```

with the same effect-forwarding semantics for return/break/continue/local-mut state where Lean supports it.

### Exceptions

`try`/`catch` syntax may be brace-shaped, but semantics remain Lean monadic exception machinery, not automatic JS `throw`/`catch` identity.

---

## 13.8 Literals and basic data syntax

Preserve Lean categories.

| Concept | ProofScript |
|---|---|
| numerals | `0`, `42`, `0xff`, etc. via Lean literal/typeclass elaboration |
| scientific literals | Lean `OfScientific` semantics |
| string | `"hello"` : Lean `String` |
| char | `'a'` : Lean `Char` |
| interpolation | `s!"hello {name}"` |
| List | `[1, 2, 3]` |
| Array | `#[1, 2, 3]` |
| product/tuple | `(a, b)` |
| anonymous constructor | `⟨a, b⟩` |
| Sigma | `Σ x: A, B(x)` or a faithful ASCII alias |
| Subtype | `{x: A // P(x)}` |

Do not consume backticks for JS template strings because Lean syntax quotation uses backtick-based quotation machinery.

---

## 13.9 Operator elaboration

Arithmetic/comparison/indexing syntax remains Lean/typeclass-driven. Relevant classes include `OfNat`, `OfScientific`, `Neg`, `HAdd`/`Add`, `Sub`, `Mul`, `Div`, `Pow`, `BEq`, `LT`, `LE`, `Membership`, `GetElem`, and others. [Basic Type Classes](https://lean-lang.org/doc/reference/latest/Type-Classes/Basic-Classes/)

Therefore:

```ts
x + y
```

means whatever Lean's notation and typeclass elaboration define for the inferred types; it does not inherit JS numeric conversion, string concatenation, or floating-point coercion rules.

---

## 13.10 Identifier resolution

An identifier may resolve through the current namespace, opened namespaces, exported names, local binders, section variables, and aliases generated by the frontend. Resolution produces a Lean name/local variable, not a JavaScript property lookup.

A leading dot uses expected-type information to resolve a constructor or declaration:

```ts
def noneString: Option(String) := {
  .none
}
```

The expected type identifies `Option.none`.

## 13.11 Function-type source forms

Non-dependent arrows and dependent binders are distinct source forms:

```ts
Nat → Nat
(x: Nat) → Fin(x + 1)
```

ProofScript preserves right associativity of arrows. Binder classes remain available inside function types:

```ts
{A: Type} → A → A
[C(A)] → A → String
```

## 13.12 Numeric literal elaboration

Numerals are overloaded source syntax. A literal such as `5` is elaborated using the expected type and numeric-literal classes rather than being intrinsically a JavaScript `number`.

```ts
def fiveNat: Nat := {
  5
}

def fiveInt: Int := {
  5
}
```

The two source literals look the same but elaborate at different types. Negative numeric syntax is likewise governed by Lean's negation/numeric elaboration rules.

## 13.13 Holes and synthetic opaque placeholders

`_` requests elaborator inference for a term whose value should be determined from context:

```ts
#check (fun (x: Nat) => x : _);
```

Named holes such as `?goal` create metavariable-style goals for interactive development. `?_` requests a synthetic opaque placeholder where supported by Lean's syntax. A release verification profile MUST distinguish unresolved placeholders, `sorry`, and successfully solved metavariables from proved terms.

## 13.14 Type ascription

Type ascription constrains elaboration:

```ts
def n: Nat := {
  (0: Nat)
}
```

An ascription participates in expected-type propagation; it is not a TypeScript type assertion and cannot make an ill-typed term valid.

## 13.15 Quotation and antiquotation

Syntax quotation constructs `Syntax`/typed syntax values instead of elaborating the quoted contents as ordinary program terms. Antiquotation splices syntax values into quotations.

Conceptually:

```ts
macro "inc!" t:term : term =>
  `($t + 1)
```

ProofScript quotations observe ProofScript source syntax. Therefore a quoted `function` alias can remain observably different from a quoted canonical `def` even if both later expand to the same declaration semantics.

## 13.16 Proof terms

A proof is an ordinary term whose type is a proposition:

```ts
def reflNat(n: Nat): n = n := {
  rfl
}
```

Tactic syntax is only one way to construct such terms:

```ts
theorem reflNatTac(n: Nat): n = n := by {
  rfl
}
```

Both ultimately produce kernel-checked proof terms. Tactics do not create a second logic.


# 14. Tactic Proofs

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Tactic-Proofs/](https://lean-lang.org/doc/reference/latest/Tactic-Proofs/)

ProofScript preserves the Lean tactic language and its proof-producing trust model. The primary surface difference is structural bracing where Lean normally relies on layout.

## 14.1 Tactic blocks

Canonical ProofScript may use braces to delimit tactic mode:

```ts
by {
  intro x
  induction x
  case zero =>
    rfl
  case succ n ih =>
    simp [ih]
}
```

**Important grammar rule:** inside `by { ... }`, Lean's tactic grammar remains authoritative. Do **not** reinterpret `;` as a generic TypeScript statement terminator, because `;` is itself a Lean tactic combinator and tactics are extensible.

Retain built-in proof structuring syntax including `have`, `show`, `suffices`, `calc`, `case`, `next`, holes, synthetic holes, and `sorry`, plus user-defined tactics.

---

## 14.2 Elaborators and custom tactics

Retain Lean's extension architecture:

```text
elab
elab_rules
term elaborators
command elaborators
tactic elaborators
custom syntax categories
environment extensions
```

A faithful implementation must allow new command syntax to mutate the environment/parser so later source sees it.

---

## 14.3 Core proof-state operations

A tactic operates on an ordered collection of goals. Each goal contains a local context and a target type. Common tactics transform that state in predictable ways.

Introduction:

```ts
theorem idProp(P: Prop): P → P := by {
  intro h
  exact h
}
```

Refinement:

```ts
theorem pairProof(P Q: Prop, hP: P, hQ: Q): P ∧ Q := by {
  constructor
  · exact hP
  · exact hQ
}
```

Application:

```ts
theorem useImp(P Q: Prop, h: P → Q, hp: P): Q := by {
  apply h
  exact hp
}
```

## 14.4 Case analysis and induction

`cases` eliminates an inductive value and creates one goal per relevant constructor. `induction` additionally provides induction hypotheses when using an inductive recursor.

```ts
theorem optionCases{A: Type}(x: Option(A)): x.isSome = true ∨ x = .none := by {
  cases x with
  | none =>
      exact Or.inr(rfl)
  | some a =>
      exact Or.inl(rfl)
}
```

The exact proof-state names are generated by elaboration; `case` and `next` structure the tactic script without changing the proof theory.

## 14.5 Rewriting

`rw` performs directed propositional rewriting using equality/iff theorems. Unlike `simp`, it follows the explicitly provided rewrite sequence rather than repeatedly normalizing with a simp set.

```ts
theorem replaceEquals(a b: Nat, h: a = b): a + 1 = b + 1 := by {
  rw [h]
}
```

`conv` focuses rewriting on a selected subexpression when ordinary `rw` would affect the wrong occurrence.

## 14.6 Exact, assumption, constructor, and contradiction patterns

ProofScript preserves standard tactic names such as `exact`, `assumption`, `constructor`, `left`, `right`, `rfl`, `contradiction`, `exfalso`, and their normal Lean semantics. They are part of the tactic language's user interface and should not be renamed for TypeScript style.

## 14.7 Tactic combinators

Sequencing and focus syntax belong to the tactic grammar. In particular `;` can mean “run the following tactic on all generated goals,” so it MUST NOT be reinterpreted as a generic statement terminator in `by { ... }`.

```ts
by {
  constructor <;> simp
}
```

Bullets or braces can focus subgoals according to the tactic grammar. ProofScript structural braces delimit the tactic block but do not change tactic combinator semantics.

## 14.8 Custom tactics

A custom tactic normally combines a syntax declaration with a tactic elaborator. The resulting tactic may inspect goals, synthesize terms, call other tactics, and create proof terms. Its final output remains subject to kernel checking.

This preserves Lean's important trust boundary: a buggy tactic may fail or prove the wrong *intended* statement if its frontend is wrong, but it cannot directly cause the kernel to accept an ill-typed proof term without exploiting another trusted component.


# 15. The Simplifier

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/The-Simplifier/](https://lean-lang.org/doc/reference/latest/The-Simplifier/)

The simplifier is Lean-native capability. ProofScript does not define a separate simplification semantics: `simp`, `simp_all`, simplifier attributes, simp sets, and simplifier configuration MUST elaborate and behave as the corresponding Lean facilities for the pinned baseline.

## 15.1 Simplification workflow

The simplifier traverses terms and repeatedly applies registered simplification rules, reductions, and simplification procedures. It is designed to produce stable normal forms rather than to apply one user-selected rewrite once.

Basic use:

```ts
theorem addZeros(n: Nat): (n + 0) + 0 = n := by {
  simp
}
```

With an explicit theorem/definition set:

```ts
theorem listLen{A: Type}(x: A, xs: List(A)):
    List.length(x :: xs) = List.length(xs) + 1 := by {
  simp
}
```

## 15.2 `simp`, `simpa`, `dsimp`, and variants

`simp` uses the default simp set plus any explicitly supplied rules. `simp only [...]` starts from a deliberately restricted rule set (apart from the minimal reflexive infrastructure used by Lean). `simpa` simplifies both the goal and a supplied proof/assumption and then closes the goal when the simplified forms match.

`dsimp` is definitional simplification: it emphasizes reductions that hold definitionally and does not behave as a general theorem-rewrite engine.

```ts
example(n: Nat): (let x := n; x) = n := by {
  rfl
}
```

`dsimp` can expose such definitional structure in goals and hypotheses.

## 15.3 Simp locations

By default `simp` targets the goal. Locations select hypotheses and/or the conclusion:

```ts
by {
  simp at h
}

by {
  simp at h ⊢
}

by {
  simp at *
}
```

Location syntax belongs to the tactic parser and is preserved even though the surrounding ProofScript tactic block uses braces.

## 15.4 Rewrite-rule classes

The simplifier uses three broad rule sources:

1. definitions selected for unfolding;
2. equational/propositional lemmas used as rewrite rules;
3. simplification procedures (simprocs) implemented by metaprograms for operations that are inefficient or awkward to encode as ordinary lemmas.

A proposition can be simplified by rewriting it to an equivalent proposition, enabled by propositional extensionality. If a goal simplifies to `True`, the simplifier can close it.

## 15.5 The `[simp]` attribute and simp sets

A theorem marked `@[simp]` enters an appropriate simplification set:

```ts
@[simp]
theorem doubleZero: 0 + 0 = 0 := by {
  rfl
}
```

Named simp sets allow libraries to provide domain-specific normalization without putting every rule into the global default set. ProofScript MUST preserve scoped/named simp-set behavior because it affects proof scripts and automation performance.

## 15.6 Orientation and termination discipline

Equational lemmas are normally oriented toward a simpler canonical form. Users may request reverse orientation explicitly in a simp invocation. Libraries SHOULD avoid simp rule collections that loop or expand terms indefinitely.

The simplifier's normal-form conventions are part of its documented behavior, not logical equality itself: two terms can be propositionally equal without the simplifier choosing either as the normal form of the other.

## 15.7 Simp normal forms

A simplification result is a normal form **relative to the active simp set and configuration**, not a canonical normal form for Lean terms in general. Adding or removing simp lemmas can change the result. Library authors SHOULD orient `[simp]` lemmas toward stable forms and avoid mutually looping rewrite directions.

## 15.8 Terminal and non-terminal simplification

A **terminal** use of `simp` closes the current goal. A **non-terminal** use simplifies a goal and continues proving it. Non-terminal uses are more sensitive to changes in the global simp set; maintainable proofs SHOULD prefer `simp only [...]` or use `simp?` to discover a suitably explicit simp set when the simplification step is intended to be stable across library evolution.

## 15.9 Simplification versus rewriting

Use `rw` when the proof should perform a specific directed equality step. Use `simp` when the objective is normalization using a rule database. Mixing these roles indiscriminately makes proof scripts fragile because changing the simp set can alter which transformations happen automatically.


# 16. The `grind` Tactic

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/The--grind--tactic/](https://lean-lang.org/doc/reference/latest/The--grind--tactic/)

`grind` is retained as Lean-native proof automation. It constructs proof terms that are checked by the kernel; using `grind` does not expand the logical trusted base.

## 16.1 Automation model

`grind` is proof-producing automation inspired by SMT solvers. It maintains a shared fact database and runs cooperating reasoning engines. Its goal is to derive a contradiction from the assumptions plus the negated target; there is no special logical rule added to the kernel.

A simple use:

```ts
theorem chainEq(a b c: Nat, h1: a = b, h2: b = c): a = c := by {
  grind
}
```

The generated proof is kernel checked.

## 16.2 Congruence closure

Congruence closure tracks equivalence classes of terms and propagates equalities through function applications. If `a = b`, it can derive relationships between `f(a)` and `f(b)` and combine them with other facts.

```ts
theorem congrExample(f: Nat → Nat, a b: Nat, h: a = b): f(a) = f(b) := by {
  grind
}
```

## 16.3 Constraint propagation and case analysis

`grind` propagates Boolean/propositional facts and can split on finite cases when useful. Library annotations influence which constructors, equations, and lemmas are exposed to the engine. Such annotations affect automation search but do not change the theorem being proved.

## 16.4 E-matching

Universally quantified lemmas can be instantiated by matching patterns against ground terms already known to `grind`. A library that wants predictable automation SHOULD provide appropriate annotations/triggers according to Lean's `grind` API instead of relying on unrestricted blind instantiation.

## 16.5 Arithmetic and algebraic engines

The pinned `grind` implementation can cooperate with specialized solvers for linear integer arithmetic, linear arithmetic, and algebraic reasoning over supported ring/field structures. These solvers construct proof evidence; they are not unchecked calls to a JavaScript arithmetic oracle.

Example:

```ts
theorem bounded(x y: Int, hx: x ≤ y, hy: y ≤ x): x = y := by {
  grind
}
```

## 16.6 Reducibility and local definitions

Automation may unfold local definitions or selected declarations according to reducibility settings. The transparency mode is part of elaboration/tactic behavior; `grind` must not treat opaque declarations as definitionally transparent merely to make a proof succeed.

## 16.7 Debugging and minimization

When `grind` fails, diagnostics SHOULD identify useful facts/engines or the failure boundary. Minimization tools can suggest a smaller stable set of lemmas/annotations so a proof does not accidentally depend on a much larger imported context.

ProofScript preserves those capabilities under the same tactic names when available in the pinned baseline. A future backend-independent proof checker only needs the final proof term and environment, not the internal search trace.


# 17. The `mvcgen` Tactic

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/)

`mvcgen` is especially important to ProofScript because the optional verification layer reuses Lean's monadic verification-condition machinery rather than inventing a second logic.

## 17.1 Verification-condition generation model

`mvcgen` reinterprets monadic programs using a weakest-precondition (`WP`) semantics. A weakest precondition maps a desired postcondition to the least condition sufficient to guarantee it for the modeled program.

The proof flow is conceptually:

```text
program + desired postcondition
       ↓ WP interpretation
weakest-precondition goal
       ↓ mvcgen
verification conditions / invariants
       ↓ tactics or direct proofs
kernel-checked theorem
```

This is ordinary theorem proving over the `Std.Do` framework, not a new kernel rule.

## 17.2 Stateful predicates

`Std.Do.SPred` represents predicates over an abstract state tuple. The framework provides pure embeddings, logical connectives, quantifiers, entailment, and state-value access. These are library definitions whose types and proofs are checked normally.

ProofScript keeps syntax such as `spred(...)`, state-predicate entailment, and other `Std.Do` notation where the pinned baseline provides it. A TypeScript-like contract syntax in Appendix A may elaborate to this framework but MUST NOT redefine it.

## 17.3 Hoare triples and postconditions

Hoare-style specifications are represented using weakest preconditions and explicit pre/post predicates. For state and exception monads, a postcondition may need to describe both normal results and exceptional exits.

A ProofScript verification layer therefore cannot interpret

```ts
ensures result > 0
```

for an arbitrary monad until a model descriptor says what “result,” final state, and exceptional paths mean.

## 17.4 Verification conditions

`mvcgen` simplifies the WP expression, applies registered specification theorems, introduces invariants where required, and emits sufficient subgoals. The generated VCs are the authoritative proof obligations.

For loops, obligations can include:

- invariant initialization;
- invariant preservation;
- reasoning about the exit condition;
- obligations for `break`, `continue`, early return, or exceptions when those control paths exist.

A source-level invariant annotation is not itself a proof.

## 17.5 Enabling new monads

To support a new monad, a library author must provide a lawful predicate-transformer interpretation and adequacy/specification results for the primitive operations used by `mvcgen`. Merely defining `Monad M` is insufficient.

This requirement is inherited directly by ProofScript verification extensions: “monadic contracts” are only as strong as the registered and checked model connecting the monad to its WP semantics.

## 17.6 Proof mode

The `mvcgen` proof mode exposes generated obligations in a form intended for interactive proof. ProofScript SHOULD preserve the same proof-state content even if editor rendering differs.

A common style is:

```ts
theorem verifiedProgram: SomeProgramSpec := by {
  mvcgen
  · simp
  · omega
}
```

The exact remaining goals depend on the program and imported specification lemmas; the important invariant is that all discharged goals produce ordinary checked proof terms.


# 18. Functors, Monads and `do`-Notation

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Functors___-Monads-and--do--Notation/](https://lean-lang.org/doc/reference/latest/Functors___-Monads-and--do--Notation/)

ProofScript preserves Lean's programming abstractions and laws: `Functor`, `Pure`, `Seq`, `SeqLeft`, `SeqRight`, `Applicative`, `Alternative`, `Bind`, `Monad`, lifting classes, transformer stacks, and `do` elaboration.

## 18.1 Core type classes

Lean's programming hierarchy contains both the familiar composite classes and smaller operation-specific classes. ProofScript MUST preserve all of these names and their instance-search roles rather than collapsing them into a JavaScript `Promise` API:

- `Functor` — mapping (`<$>`, `<&>`);
- `Pure` — injection of pure values;
- `Seq` — applicative function application (`<*>`);
- `SeqLeft` — sequence effects and retain the left result (`<*`);
- `SeqRight` — sequence effects and retain the right result (`*>`);
- `Applicative` — the composite applicative interface;
- `Alternative` — applicative failure/recovery (`failure`, `<|>`);
- `Bind` — data-dependent sequencing (`>>=`, `=<<`);
- `Monad` — `Applicative` plus `Bind`.

`Seq`, `SeqLeft`, and `SeqRight` delay their second computation as required by Lean's API, so an implementation MUST NOT eagerly evaluate those arguments merely because the target language normally evaluates call arguments eagerly.


Lean's programming abstractions are layered:

- `Functor` supplies mapping;
- `Pure` injects pure values;
- `Seq`, `SeqLeft`, and `SeqRight` support applicative sequencing;
- `Applicative` combines functor/pure/sequencing structure;
- `Alternative` supplies failure/choice;
- `Bind` supplies monadic binding;
- `Monad` combines the required interfaces.

The class hierarchy and API names remain Lean concepts. ProofScript does not replace them with JavaScript `Promise`, iterator protocols, or `async`/`await` semantics.

## 18.2 Laws

`LawfulFunctor`, `LawfulApplicative`, and `LawfulMonad` record equations expected of well-behaved instances. Having methods with the right types is not the same as satisfying the laws.

For a lawful functor, mapping the identity acts as identity and mapping composition agrees with composed mappings. Monad laws express left identity, right identity, and associativity in Lean's library formulation.

These laws are propositions proved about an instance; they are not assumptions automatically inserted for every user-defined `Monad`.

## 18.3 Infix operators

The reference operator set includes at least:

```text
g <$> x       Functor.map
x <&> g       reversed map
mf <*> mx     Seq.seq
x <* y        SeqLeft.seqLeft
x *> y        SeqRight.seqRight
x <|> y       Alternative.orElse
x >>= f       Bind.bind
f =<< x       reversed bind
f >=> g       left-to-right Kleisli composition
g <=< f       right-to-left Kleisli composition
```

These are Lean operators with Lean precedence, laziness/delaying behavior, and typeclass dispatch. They are not borrowed JavaScript operators.


ProofScript preserves standard operators and their class-driven semantics:

```text
<$>    functor map
<&>    reverse-position map
<*>    applicative sequencing
*>     discard left result
<*     discard right result
<|>    alternative choice
>>=    bind
=<<    reverse bind
>=>    Kleisli composition
<=<    reverse Kleisli composition
```

They are not JavaScript operators, and their precedence comes from Lean's notation declarations.

## 18.4 `do` sequential computations

A monadic bind in ProofScript:

```ts
def readName: IO(String) := {
  do {
    let stdin ← IO.getStdin;
    let line ← stdin.getLine;
    return line.trim;
  }
}
```

`let x ← action` sequences `action` and binds its result. `let x := value` remains a pure local binding inside the `do` sequence.

Pattern binds can fail through the monad's supported failure mechanism when the pattern is refutable, exactly as specified by Lean's `do` elaborator.

## 18.5 Assertion forms in `do`

Lean's `do` language already has runtime assertion forms such as `assert! cond` and `debug_assert! cond`. Current upstream Lean also has a non-reserved `assert P` `doElem` used by verification-condition generation: it records a proposition for `vcgen` and has no runtime effect. Because ProofScript's verification appendix also offers a pure/local `assert` alias, dispatch MUST remain syntax-category-sensitive.

For the Lean 4.33.1 baseline, only forms actually present in the pinned parser/import set are BASELINE. A later/current-upstream `doElem` form is TRACKING until confirmed in the baseline. In any version where Lean provides `assert` as a `doElem`, that Lean-native meaning wins inside `doSeq`; the ProofScript `have`-alias form MUST NOT shadow it.

## 18.6 Early return

Inside `do`, `return e;` is an early-return `do` element. It is distinct from the term-level `return e` accepted outside explicit `do`.

```ts
def firstPositiveOrZero(xs: List(Int)): Id(Int) := {
  do {
    for (x in xs) {
      if (x > 0) {
        return x;
      }
    }
    return 0;
  }
}
```

Bare early return produces the appropriate unit/empty return behavior of the current elaboration context. The pinned Lean rules, including dependent `do match`, govern typing.

## 18.7 Mutable locals

`let mut` is notation implemented inside `do`; it is not a general mutable variable in pure terms.

```ts
def sumArray(xs: Array(Nat)): Id(Nat) := {
  do {
    let mut total := 0;
    for (x in xs) {
      total := total + x;
    }
    return total;
  }
}
```

The elaborator translates mutable-local syntax into state-passing structure compatible with the enclosing monad. Proofs and runtime behavior therefore remain tied to Lean's elaboration rules rather than JavaScript variable mutation.

## 18.8 Control structures and iteration

Lean `do` syntax includes conditional execution, `unless`, `do match`, `for`, `while`, `repeat`, `break`, and `continue` where supported by the pinned baseline. These forms are part of the `do` embedded language.

A loop example:

```ts
def countUntil(limit: Nat): Id(Nat) := {
  do {
    let mut n := 0;
    while (n < limit) {
      n := n + 1;
    }
    return n;
  }
}
```

A verification tool must reason about the elaborated loop semantics rather than assuming JavaScript `while` semantics merely because the syntax looks familiar.

## 18.9 Monad lifting and transformer stacks

Lean provides lifting classes for embedding actions from one monad into a transformer stack. Transformer order matters to semantics: state-over-exception is not generally the same as exception-over-state. ProofScript MUST preserve the concrete monad/transformer type rather than flattening it into a generic effect set.


# 19. Basic Propositions

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Basic-Propositions/](https://lean-lang.org/doc/reference/latest/Basic-Propositions/)

## 19.1 Propositions, Bool, equality, and decisions

ProofScript retains three distinct layers:

1. propositions (`P : Prop`),
2. evidence/decision procedures (`Decidable(P)`),
3. Boolean computations (`Bool`).

### Propositional operators

```text
a = b
 a ≠ b
P ∧ Q
P ∨ Q
¬P
P → Q
P ↔ Q
```

### Boolean operators

```text
a == b
a != b
x && y
x || y
!x
```

Lean's `BEq` is not required to be lawful or agree with propositional equality unless additional laws are provided. [Basic Type Classes](https://lean-lang.org/doc/reference/latest/Type-Classes/Basic-Classes/)

Permanent invariant:

```text
Prop ≠ Bool
Eq   ≠ BEq
Decidable(P) ≠ Bool
```

---

## 19.2 Truth and falsity

`True` is an inductive proposition with a trivial constructor; `False` has no constructors. From `False`, any proposition can be derived through elimination.

```ts
theorem trivialTruth: True := by {
  trivial
}

theorem exFalso(P: Prop, h: False): P := by {
  exact False.elim(h)
}
```

## 19.3 Conjunction and disjunction

`P ∧ Q` is `And P Q`; proving it requires proofs of both sides.

```ts
theorem swapAnd(P Q: Prop): P ∧ Q → Q ∧ P := by {
  intro h
  exact And.intro(h.right, h.left)
}
```

`P ∨ Q` is `Or P Q`; proving it chooses one constructor, while eliminating it requires reasoning about both cases.

```ts
theorem orComm(P Q: Prop): P ∨ Q → Q ∨ P := by {
  intro h
  cases h with
  | inl hp => exact Or.inr(hp)
  | inr hq => exact Or.inl(hq)
}
```

## 19.4 Negation and iff

Negation is definitionally `P → False`, not a Boolean `!` operation:

```ts
def NotP(P: Prop): Prop := {
  ¬P
}
```

`P ↔ Q` packages implications in both directions. It is propositional equivalence; `propext` can turn a proof of `P ↔ Q` into propositional equality `P = Q`.

## 19.5 Universal quantification

Universal quantification is a dependent function type whose codomain lies in `Prop`:

```ts
theorem selfEq: ∀ n: Nat, n = n := by {
  intro n
  rfl
}
```

Canonical ProofScript retains `∀`; `forall` may remain an accepted Lean spelling where the baseline does.

## 19.6 Existential quantification

`Exists` is an inductive proposition carrying a witness and proof:

```ts
theorem existsZero: ∃ n: Nat, n = 0 := by {
  exact Exists.intro(0, rfl)
}
```

Eliminating an existential in a proof exposes the witness locally. It does not permit unrestricted extraction of computational data from `Prop` in violation of Lean's proposition-elimination restrictions.

## 19.7 Propositional equality

`a = b` is `Eq a b`, an inductive proposition with reflexivity as its constructor. Core operations include reflexivity, symmetry, transitivity, substitution/casting, and congruence.

```ts
theorem symmExample(a b: Nat, h: a = b): b = a := by {
  exact h.symm
}
```

Equality substitution can transport terms across equal types/indices. The `▸` notation and `Eq.subst` preserve Lean semantics.

## 19.8 Heterogeneous equality

`HEq a b` expresses equality between terms whose types may not initially be definitionally identical. It is used in dependent reasoning and generated code where ordinary `Eq` is too restrictive. ProofScript retains `HEq`/`≍`; it does not collapse heterogeneous equality into host-language reference equality.


# 20. Basic Types

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Basic-Types/](https://lean-lang.org/doc/reference/latest/Basic-Types/)

ProofScript retains Lean primitive and foundational type names. TypeScript/Rust/Go aliases are not canonical replacements.

## 20.1 Numeric families and overloaded arithmetic

`Nat` represents arbitrary-precision natural numbers in the logical language. It has kernel/inductive significance and must not be replaced by IEEE-754 host numbers.

```ts
def huge: Nat := {
  123456789012345678901234567890
}
```

`Int` represents arbitrary-precision signed integers. Fixed-precision integer families have width-specific modular/checked behavior according to Lean's APIs and compiler model.

`Fin(n)` is a dependent pair-like bounded natural whose value carries a proof that it is less than `n`:

```ts
def lastIndex{n: Nat}(h: 0 < n): Fin(n) := {
  ⟨n - 1, by omega⟩
}
```

## 20.2 Bitvectors

`BitVec n` is indexed by its bit width. Bitvector operations are width-aware and suitable for bit-precise reasoning.

```ts
def byteMask: BitVec(8) := {
  0xff
}
```

A JavaScript backend may use `BigInt`, typed arrays, or another representation, but the source semantics are `BitVec`, not JS bitwise-number semantics.

## 20.3 Floating-point numbers

`Float` and `Float32` have Lean's logical model plus efficient native runtime representations. Their arithmetic follows IEEE-style floating behavior as defined by Lean, including special values and signed zero behavior. ProofScript MUST NOT make `Float` definitionally identical to ECMAScript `Number`.

```ts
def z: Float := {
  0.0
}
```

Cross-backend conformance must specify NaN, signed zero, rounding, conversions, and bit-level observations where Lean exposes them.

## 20.4 Characters and strings

`Char` is Lean's character type; `String` is Lean's string abstraction. String literals elaborate to `String`, character literals to `Char`.

```ts
def greeting: String := {
  "hello"
}

def letter: Char := {
  'λ'
}
```

A backend encoding is an implementation detail as long as all documented operations preserve Lean behavior.

## 20.5 `Unit`, `Empty`, and `Bool`

`Unit` has one canonical constructor `()`. `Empty` has no constructors. `Bool` has `false` and `true` and is computational data.

```ts
def done: Unit := {
  ()
}

def flag: Bool := {
  true
}
```

`Bool` conditions and propositions remain distinct; bridging them uses explicit classes/functions such as `decide` or `Bool`-to-Prop propositions, not implicit identity.

## 20.6 `Option`, products, sums, and lists

```ts
def maybe: Option(Nat) := {
  .some(3)
}

def pair: Nat × String := {
  (3, "three")
}

def either: Sum(Nat, String) := {
  .inl(3)
}

def nums: List(Nat) := {
  [1, 2, 3]
}
```

These are inductive/product values with Lean constructors and eliminators. Tuple/list surface syntax is notation, not JavaScript array/object semantics.

## 20.7 Arrays and byte arrays

`Array A` is an efficient persistent array abstraction whose compiled implementation can exploit uniqueness. Safe indexed access requires proof or a checked/optional access form.

```ts
def first(xs: Array(Nat), h: 0 < xs.size): Nat := {
  xs[0]
}
```

`ByteArray` is specialized for bytes and should retain Lean's efficient representation/operations.

## 20.8 Ranges

Range notation and range objects integrate with `for`/iterators. They are library values describing bounded iteration rather than JavaScript `for` syntax.

```ts
def firstFive: List(Nat) := {
  [0, 1, 2, 3, 4]
}
```

Equivalent range-based examples SHOULD use the exact range notation supported by the pinned Lean baseline.

## 20.9 Maps and sets

Lean's standard map/set structures have explicit key-equivalence/order/hash requirements depending on the chosen implementation (`HashMap`, tree maps, etc.). ProofScript MUST preserve those typeclass constraints and semantics rather than mapping every structure to JS `Map`/`Set`.

## 20.10 Subtypes

A subtype contains a value plus a proof of a predicate:

```ts
def PositiveNat := { n: Nat // 0 < n };

def onePositive: PositiveNat := {
  ⟨1, by decide⟩
}
```

The proof is runtime-irrelevant, but the subtype remains a distinct logical type. This is not equivalent to a TypeScript refinement annotation erased before checking.

## 20.11 Lazy computations

Lean's lazy/thunk facilities explicitly delay computation. Their logical representation and runtime forcing behavior are defined by Lean's library/runtime model. Because ordinary Lean evaluation is strict at runtime, laziness must be requested through these explicit abstractions.


# 21. IO

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/IO/](https://lean-lang.org/doc/reference/latest/IO/)

ProofScript is pure at the logical level; effects are represented by `IO` and other monadic values rather than by unrestricted ambient side effects.

## 21.1 `IO`, `EIO`, and `BaseIO`

Lean models effects as values in monads. `IO A` describes an IO computation that may return `A` or an `IO.Error`; `EIO E A` generalizes the error type; `BaseIO A` represents base effects without the same typed error channel. Conversions between these monads retain Lean's explicit API.

An action is a value:

```ts
def hello: IO(Unit) := {
  do {
    IO.println("hello");
  }
}
```

Declaring `hello` does not perform output. The effect occurs when the action is executed by the runtime.

## 21.2 Error handling

Errors are part of the IO result model. Exception-catching/translation functions such as Lean's `catchExceptions`, `ofExcept`, and conversions between `EIO`/`IO` preserve their typed semantics.

```ts
def safeRead: IO(String) := {
  try
    do {
      let stdin ← IO.getStdin;
      stdin.getLine
    }
  catch e =>
    return s!"error: {e}";
}
```

The exact `try` syntax is governed by the Lean `do` grammar; the example illustrates that error control remains inside the monadic effect language.

## 21.3 Console IO

```ts
def greet(name: String): IO(Unit) := {
  do {
    IO.println(s!"Hello, {name}");
  }
}
```

Console output is sequenced by the `IO` action. A backend may call Node/Bun/browser APIs internally, but the source API remains Lean's IO abstraction unless an explicit backend extension is imported.

## 21.4 Mutable references

`IO.Ref A` (and related reference APIs) represent mutable cells whose effects are sequenced in IO.

Conceptually:

```ts
def counter: IO(Nat) := {
  do {
    let r ← IO.mkRef(0);
    r.set(1);
    r.get
  }
}
```

References are not interchangeable with pure `let mut` syntax; one is a runtime reference, the other is local `do` elaboration.

## 21.5 Files, handles, and streams

File APIs distinguish paths, file handles, streams, modes, and errors. ProofScript SHOULD preserve the upstream API types for Lean-compatible code.

The exact file-opening and handle-construction names are part of the pinned Lean library API rather than new ProofScript syntax. ProofScript preserves those APIs under its normal call-shaping rules; this reference therefore does not invent a separate JavaScript-style file object. Compiler/backend adapters must implement the same observable behavior for every supported file/stream primitive.

## 21.6 Platform and environment information

System information and environment-variable access are IO/platform observations:

```ts
def home: IO(Option(String)) := {
  IO.getEnv("HOME")
}
```

Such values cannot be reduced by the kernel to host results.

## 21.7 Timing and randomness

Time and random-number APIs are explicit effects. Proofs about them require a model or assumptions; a kernel proof cannot inspect the wall clock or ambient entropy source.

## 21.8 Processes

Launching processes crosses a major trust/host boundary. Process configuration, standard streams, exit codes, and errors retain Lean's typed API. Sandboxed backends MAY reject unsupported process operations but MUST report them as unsupported rather than silently changing semantics.

## 21.9 Tasks and threads

`Task A` and thread APIs model concurrent computations. They are not source aliases for JavaScript `Promise<A>`. A JS backend may use promises/workers internally only under a documented correspondence relation that preserves the Lean task API's ordering, failure, cancellation, and synchronization observations that the source exposes.


# 22. Iterators

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Iterators/](https://lean-lang.org/doc/reference/latest/Iterators/)

Iterators remain Lean library abstractions that can expose pure or monadic sequences of values.

## 22.1 Iterator state and purity

An iterator contains the state needed to obtain subsequent elements. Because source semantics are pure, taking a step returns a new iterator state rather than invalidating the previous value. Runtime uniqueness optimizations may reuse storage without changing this observable behavior.

## 22.2 Pure and monadic iterators

The standard iterator framework distinguishes pure `Iter`-style iterators from monadic `IterM`-style iterators. A monadic iterator can perform effects while producing elements.

The framework exposes a step result conceptually equivalent to:

```text
yield value nextState
skip nextState
done
```

The exact types are `IterStep`/`Std.Iter.Step` and their monadic counterparts in the pinned library.

## 22.3 Finiteness and productivity

Reasoning about iterator consumers often requires evidence that iteration terminates or continues to make productive progress. The standard library exposes `Finite`, `Productive`, and termination helpers for this purpose. These properties are logical structures, not watchdog timeouts.

## 22.4 Stepping

Low-level stepping APIs expose one iterator transition. Consumers usually prefer higher-level folds/combinators, but step operations are essential for defining and proving properties of custom iterators.

## 22.5 Consuming iterators

Common consumers include folds, monadic folds, length, `any`, `all`, `find?`, index access, and draining monadic iterators.

A pure fold can be used conceptually as:

```ts
-- Exact iterator-construction notation depends on the imported collection API.
def total(xs: List(Nat)): Nat := {
  xs.foldl(fun (acc: Nat, x: Nat) => acc + x, 0)
}
```

When the same computation is expressed through `Std.Iter`, the yielded sequence rather than the original collection type determines the consumer semantics.

## 22.6 Iterator combinators

Mapping, filtering, taking/dropping, zipping, flattening, and related combinators construct new iterators lazily from existing ones. They SHOULD avoid eagerly materializing intermediate collections unless the API explicitly requests collection output.

This allows iteration across heterogeneous source collections without converting them to one common concrete container first.

## 22.7 Reasoning about iterators

The iterator library supplies laws/specifications connecting steps, consumers, and combinators. ProofScript proofs reason about these ordinary definitions. Backend optimizations must preserve the yielded element/effect sequence described by those proofs.


# 23. Notations and Macros

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Notations-and-Macros/](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/)

Full ProofScript mode is syntactically extensible. This requirement is fundamental: parser tables can change while a file is being processed.

## 23.1 Notation and custom syntax

Retain Lean's parser extension facilities:

```text
declare_syntax_cat
syntax
notation
prefix
postfix
infix
infixl
infixr
```

These extend parser tables dynamically and participate in precedence and pretty printing. ProofScript must not inherit JavaScript operator precedence for user-defined Lean notation. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) [Macros / Notations and Macros](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Macros/)

---

## 23.2 Macros

Retain:

```text
macro
macro_rules
```

plus Lean's hygienic syntax quotations, antiquotations, and splices. [Macros / Notations and Macros](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Macros/)

Because ProofScript changes concrete syntax, a ProofScript quotation represents **ProofScript syntax**, not necessarily the identical `Syntax` tree produced by the Lean parser for textually different Lean source. Compatibility is defined after intended macro expansion/elaboration, not by requiring surface AST identity.

---

## 23.3 Elaborators and custom tactics

Retain Lean's extension architecture:

```text
elab
elab_rules
term elaborators
command elaborators
tactic elaborators
custom syntax categories
environment extensions
```

A faithful implementation must allow new command syntax to mutate the environment/parser so later source sees it.

---

## 23.4 Incremental parser requirement

This is normative, not optional. Lean parses and elaborates one command, updates the state—including syntax tables and open namespaces—and only then parses the next command. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)

ProofScript must therefore follow conceptually:

```text
state₀
  ↓ parse command₁ with grammar₀
Syntax₁
  ↓ macro / elaborate / kernel-check
state₁ + grammar₁
  ↓ parse command₂ with grammar₁
Syntax₂
  ↓ ...
```

A conventional whole-file fixed TypeScript parser is insufficient for full Lean-like extensibility.

---

## 23.5 Parser model and syntax values

Lean syntax is represented as data (`Syntax`) with node kinds, token/literal nodes, identifiers, source information, and internal choice/group nodes. Typed wrappers such as `TSyntax` associate syntax values with parser categories.

ProofScript MUST retain this model closely enough that metaprograms can inspect syntax kinds and source relationships with the same conceptual distinctions. A fixed TypeScript AST with no dynamic syntax kinds is insufficient.

## 23.6 Custom operators and precedence

Operators are parser declarations with explicit precedence and associativity.

```ts
infixl:65 " <+> " => Nat.add

#check 1 <+> 2 <+> 3;
```

The numeric precedence is interpreted by Lean's dynamic Pratt-style parser. It is not mapped to whichever JavaScript operator happens to look similar.

## 23.7 Notation scopes

Notation may be global, local, or scoped. Libraries SHOULD place domain-specific notation in scopes when global activation would create conflicts.

```ts
open scoped MyNotation;
```

Opening the scope can change how subsequent source parses, which is why scopes belong to parser state.

## 23.8 Defining syntax categories

A new syntax category and production can be declared:

```ts
declare_syntax_cat colorLit
syntax "red" : colorLit
syntax "green" : colorLit
```

A term-level syntax form can then reference the category and either macro-expand or use a custom elaborator. Non-reserved tokens SHOULD be used where appropriate to avoid unnecessarily stealing ordinary identifiers.

## 23.9 Macros and hygiene

Macros transform syntax into syntax under Lean's hygienic name-management discipline. Newly introduced identifiers receive macro scopes so that expansion does not accidentally capture or get captured by user identifiers.

```ts
syntax "twice" term : term
macro_rules
  | `(twice $x) => `($x + $x)
```

Quasiquotation constructs syntax trees; antiquotation/splices insert syntax values. Matching quotations can destructure syntax by kind and shape.

## 23.10 Macro failure and priority

Multiple macro rules may be registered for a syntax kind. A rule can signal “unsupported” so another rule may be tried, while a real error aborts expansion. Priorities influence dispatch order. ProofScript MUST preserve this distinction because it affects extensibility and compatibility.

## 23.11 Elaborators

When macro translation is insufficient, a custom elaborator can directly process syntax. Term elaborators receive an expected type and can create metavariables, invoke typeclass search, unify expressions, and synthesize a core term. Command elaborators can modify the environment. Tactic elaborators operate on proof states.

```text
term_elab
command_elab
tactic
elab_rules
```

remain semantic extension points, not merely plugin callbacks around a closed TypeScript compiler.

## 23.12 Extending `do`

Lean allows libraries to introduce custom `do`-sequence elements. These extensions participate in the `do` parser/elaborator category and should lower into ordinary monadic/control constructs. They do not create a general-purpose JavaScript statement AST.

## 23.13 Extending output and pretty printing

Pretty-printer and output extensions can control how elaborated terms, diagnostics, traces, and custom syntax are rendered. Formatting is an observation layer: it may not silently change source meaning, and source-preserving tools must respect quotation/custom-syntax boundaries.


# 24. Build Tools and Distribution

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/](https://lean-lang.org/doc/reference/latest/Build-Tools-and-Distribution/)

The official Lean toolchain remains the semantic/reference checker toolchain for Lean-backed profiles. ProofScript adds its own package-facing CLI without redefining Lake or Elan.

## 24.1 Lake

When Lean is used as the oracle/checker, ProofScript SHOULD interoperate with Lake projects and delegate Lean dependency/build work to Lake rather than duplicating its mature dependency graph and incremental compilation semantics.

## 24.2 Managing Toolchains with Elan

Lean-backed verification SHOULD pin an exact Lean toolchain and may use Elan to install/select it. A moving default toolchain is not sufficient for a reproducible certificate.

## 24.3 ProofScript `psc` CLI

The canonical ProofScript CLI is a **proposed normative interface**, specified at a behavior level rather than as a kernel component. This reference does not claim the commands are implemented merely because their behavior is specified. A production toolchain SHOULD expose at least:

```text
psc check       parse/elaborate/type-check ProofScript source
psc build       produce configured target artifacts
psc emit-lean   materialize corresponding Lean source/artifacts
psc certify     create a statement/environment/artifact-bound verification record
psc verify      independently replay/validate a certificate and its referenced proof artifact
```

Exact flags may evolve independently of source syntax when certificate formats and trust claims are versioned.

## 24.4 Package Distribution

ProofScript packages and compiler plugins may be distributed through npm. A package that contributes Lean-backed logical functionality must also ship or declare the corresponding `.lean` source/artifacts, required modules, toolchain baseline, and verification metadata so the Lean side can be reproduced and checked.

Plugin distribution is therefore separable from proof trust: npm distributes bytes; the Lean checker and certificate manifest establish what logical artifacts those bytes correspond to.

---

## 24.5 The Lean toolchain components

The upstream Lean toolchain includes the compiler/elaborator (`lean`), build system (`lake`), bundled C compiler wrapper (`leanc`), supporting native build tools, and an independent environment checker (`leanchecker`/the checker name used by the pinned toolchain). ProofScript should reuse these components when delegating Lean-backed verification rather than reimplementing them solely for branding.

## 24.6 Lake project concepts

Lake manages packages, dependencies, libraries, executable targets, build facets, and incremental dependency tracking. A ProofScript project that emits a Lean verification project SHOULD produce ordinary Lake metadata so the generated proof project can be built with standard Lean tooling.

Conceptual generated layout:

```text
proof/
  lakefile.toml or lakefile.lean
  lean-toolchain
  Proof/
    Main.lean
    Generated/
      ModuleA.lean
```

ProofScript source remains the user-facing source of truth; the generated Lake project is an auditable Lean artifact.

## 24.7 Elan and reproducibility

Elan selects and installs Lean toolchains. Verification artifacts SHOULD pin the exact toolchain string/commit needed for replay.

```text
lean-toolchain
```

must be treated as part of a reproducibility manifest, not a convenience hint. A certificate created against Lean 4.33.1 cannot be silently replayed against an arbitrary future `stable` and still claim identical baseline semantics.

## 24.8 `psc check`

`psc check` performs ProofScript source checking for the active project/profile. For the Lean-backed profile, the strongest practical design is:

```text
ProofScript parse/elaborate
   ↓
normalized Lean-equivalent artifacts
   ↓
Lean toolchain check
```

The command SHOULD cache frontend and Lean build results using content/environment hashes, but cache hits are performance optimizations. They MUST NOT bypass invalidation when syntax extensions, imports, toolchain versions, options, or generated proof artifacts change.

## 24.9 `psc build`

`psc build` produces the configured executable/library target after successful source checking. Different backends may have different capability sets. A target MUST reject source constructs whose semantics it cannot preserve rather than quietly emulating them with weaker host behavior.

## 24.10 `psc certify`

Certification binds together at least:

- source identity/hash;
- normalized/exported Lean artifact identity;
- theorem/declaration types being claimed;
- imports/base environment;
- approved axiom manifest;
- exact Lean and ProofScript toolchain versions;
- checker outcome;
- optional backend artifact hash and execution-correspondence evidence.

A certificate is evidence that specific artifacts were checked. It is not a proof merely because it contains hashes.

## 24.11 `psc verify`

Verification consumes a certificate plus referenced proof/environment artifacts and independently checks the bound claims. It SHOULD fail distinctly for:

- invalid proof/declaration;
- statement mismatch;
- unapproved assumption;
- missing artifact;
- hash/version mismatch;
- unsupported certificate version;
- resource exhaustion;
- checker implementation failure.

These outcomes must not be collapsed into a single Boolean “verified.”

## 24.12 npm and plugins

Compiler/frontend/backend plugins may be distributed through npm because npm is a transport/ecosystem mechanism. Logical trust comes from what the package contributes and how those contributions are verified.

A plugin that adds a theorem-backed language feature SHOULD package:

```text
package JS/TS implementation
Lean source or generated proof artifact
manifest of exported logical declarations
supported Lean/ProofScript baselines
certificate or reproducible verification recipe
```

A plugin can later be promoted into core by stabilizing its syntax/API, integrating its Lean definitions/proofs into the core repository, migrating conformance tests, and retaining compatible artifact identities where feasible.


# Validating a ProofScript Proof

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/ValidatingProofs/](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)

A valid kernel proof is evidence for the **elaborated proposition**, not automatically evidence that the source specification, generated backend, or user's informal intent was translated correctly.

A strict verification result MUST bind:

1. ProofScript source identity and normalized syntax/contract identity where relevant;
2. the exact elaborated theorem statement;
3. referenced definitions and environment/module identities;
4. the accepted axiom/assumption manifest;
5. checker/toolchain versions and configuration;
6. the checker outcome;
7. for an execution claim, backend/compiler/runtime settings and artifact identity.

`psc verify` must distinguish semantic rejection from unsupported features, implementation errors, and resource exhaustion. Hashes identify artifacts; they do not prove that a translation is correct.

---

## Validation layers

A robust validation workflow separates several questions that are often incorrectly merged:

1. **Did the parser/elaborator accept the source?**
2. **Did the kernel accept the generated proof/declarations?**
3. **Does the accepted theorem state the property the user intended?**
4. **Which axioms and imported assumptions does the theorem depend on?**
5. **If executable code is claimed correct, what evidence connects the checked model to the generated binary/JS/WASM?**

### Inspect the theorem type

Before trusting automation, inspect the exact elaborated statement:

```ts
#check MyModule.correctness;
#print MyModule.correctness;
```

### Inspect assumptions

```ts
#print axioms MyModule.correctness;
```

Strict verification SHOULD reject hidden `sorry` dependencies, unapproved user axioms, and any native-computation assumptions that the selected profile has not approved.

### Replay independently

For Lean-backed artifacts, generated `.lean`/`.olean` material SHOULD be replayable with the pinned Lean toolchain and, where assurance demands it, an independent checker. This guards against a frontend that emitted a valid proof of the wrong proposition only when statement binding is also independently checked.

### Proof versus execution

A theorem about a function's Lean semantics does not automatically prove that a JavaScript/WASM/native backend faithfully implements that function. An execution certificate must separately bind and validate the compiler/runtime correspondence claim.


# Error Explanations

ProofScript diagnostics SHOULD preserve Lean error categories where the same elaboration/kernel condition is involved, while adding source-oriented explanations for ProofScript-specific parse and alias rules.

Important ProofScript-specific diagnostics include:

- missing mandatory outer `def` body braces for the standard `:=` form;
- missing body-level `;` after an intermediate body prelude;
- forbidden body-level trailing `;` after the final body term;
- use of `f()` or `def f()` in standard syntax;
- use of JavaScript object-literal syntax where a Lean structure term is required;
- use of JavaScript function-return semantics outside the Lean `do`/term-return categories;
- unsupported target capability or backend mapping;
- unresolved verification obligation;
- unapproved axiom/assumption in a strict certificate.

---

## Common error categories

A ProofScript implementation SHOULD classify errors by phase because the remedy depends on where processing failed.

### Parse errors

Examples include unmatched braces, missing `;` after a `defBodyPrelude`, malformed match alternatives, or syntax that is unavailable because the required notation scope was not opened.

```ts
def bad: Nat := {
  let x := 1
  x
}
```

This is a ProofScript definition-body parse error because the intermediate `let` prelude requires the body-level separator.

### Elaboration errors

Examples include unsolved implicit arguments, type mismatches, failed coercions, ambiguous overloaded notation, or failed instance synthesis.

```ts
def bad: Nat := {
  "not a Nat"
}
```

The syntax parses but cannot elaborate at the expected type `Nat`.

### Termination errors

A recursive `def` can parse and type-check locally yet fail because recursion was not justified as structural or well-founded.

### Tactic errors

A tactic may be inapplicable to the current goal or may leave unsolved goals. This is an elaboration failure of the proof term, not a kernel inconsistency.

### Kernel rejection

If the frontend constructs a malformed core declaration, the kernel rejects it. Such an error generally indicates a compiler/elaborator bug or invalid serialized artifact rather than ordinary source misuse.

### Backend/unsupported-feature errors

A program can be logically valid while a chosen backend does not support an FFI operation, concurrency primitive, or representation requirement. Report this as backend unsupported, not as a type error and not as a weakened translation.


# Release Notes

## v0.1 Initial Language Reference — 6 September 2026

- Establishes **The ProofScript Language Reference v0.1** with Lean 4.33.1 as the pinned semantic compatibility baseline.
- Preserves the complete audited language semantics, chapter structure, grammar decisions, verification extensions, conformance model, and trust boundaries of the source reference.
- Uses `ProofScript` as the language identity and `.ps` as the canonical source-file extension.
- Renames directly related source-facing identifiers, examples, anchors, and conformance-test paths from the previous language identity to ProofScript equivalents.
- Makes no intentional semantic language change beyond identity, version, file-extension, and directly related reference naming.


# Supported Platforms

ProofScript language semantics are platform-independent at the reference level. This draft does **not** certify any ProofScript implementation/platform combination. A release may claim platform support only from a tested toolchain manifest; Lean's own supported-platform matrix does not automatically become a ProofScript backend support guarantee.


Source-language semantics are platform-independent within the pinned Lean model. Execution backends may support different host platforms.

A platform/backend support claim MUST distinguish:

- frontend parsing/elaboration support;
- Lean-oracle/checker availability;
- native/runtime compilation support;
- JavaScript/TypeScript backend support;
- WASM backend support;
- FFI support;
- execution-correspondence assurance level.

Platform support must never be described as a logical-language difference unless the source construct is explicitly target-capability-gated.

---

# Index

This Markdown draft uses heading-based navigation. A generated HTML/reference implementation SHOULD build a symbol/syntax/tactic index from the same documentation metadata used to render individual reference entries.

Key entries: `:=`, `=`, `==`, `→`, `∀`, `∃`, `def`, `function`, `const`, `let`, `let mut`, `have`, `theorem`, `opaque`, `axiom`, `abbrev`, `inductive`, `structure`, `class`, `instance`, `match`, `if`, `bif`, `do`, `return`, `by`, `simp`, `grind`, `mvcgen`, `contract`, `requires`, `ensures`, `assert`, `ghost`, `old`, `invariant`, `namespace`, `section`, `import`, `syntax`, `macro`, `elab`.

---

# Appendix A. ProofScript Verification Extensions

> **Layering rule.** Everything in Chapters 1–24 is the Lean-compatible language reference. This appendix defines additive ProofScript verification syntax. None of these constructs is a kernel primitive or a replacement for a Lean concept.

## A.1 Extension-layer identity and non-interference

ProofScript v0.1 defines the small verification-oriented surface layer for software contracts. The layer is designed under a stricter rule than ordinary syntax sugar:

> **A verification extension is admissible only when its complete logical meaning can be translated into existing Lean declarations, terms, propositions, proof obligations, or the existing `Std.Do` predicate-transformer framework, with no new kernel primitive, no new environment declaration kind, and no change to Lean's definitional equality.** [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) [Elaborators](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Elaborators/) [Function Application / automatic parameters](https://lean-lang.org/doc/reference/latest/Terms/Function-Application/) [Theorems and elaborator/kernel checking](https://lean-lang.org/doc/reference/latest/Definitions/Theorems/)

The base-language fidelity invariant remains authoritative. In particular:

1. a `.ps` program that does not use the verification extensions must have exactly the same ProofScript semantics it had before this appendix was added;
2. `contract`, `requires`, `ensures`, `satisfies`, `invariant`, `ghost`, `old`, `result`, and the **ProofScript pure/local `assert` alias** are **not kernel concepts**; Lean-native `doElem` assertion forms, when present in the pinned Lean parser/import set, remain Lean constructs and are not redefined by this appendix;
3. extension elaboration must terminate in ordinary Lean-compatible core expressions and declarations that the same kernel checks;
4. a failed contract proof is a compile/elaboration failure, never a reason to insert a runtime assumption into the logical environment;
5. extension syntax must not reinterpret `Prop`, `Bool`, `IO`, `do`, `let`, `have`, `termination_by`, `unsafe`, `axiom`, or any other Lean construct;
6. no verification extension may silently add axioms, `sorry`, `unsafe` declarations, or `implemented_by` replacements;
7. a compiler may erase verification artifacts only when that erasure follows Lean's existing proof/runtime irrelevance or a separately verified ghost non-interference rule. [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) [`requires`/`ensures`, ghost effect, and erasure/non-interference](https://fstar-lang.org/tutorial/book/part1/part1_lemmas.html) [specification features and ghost code non-interference](https://docs.adacore.com/spark2014-docs/html/ug/en/source/specification_features.html)

### A.1.1 Contextual-token rule

The verification words should be **contextual/non-reserving parser symbols wherever Lean's parser architecture permits it**, analogous to Lean's `&"token"` / non-reserved syntax mechanism and leading-identifier behavior. This avoids needlessly stealing ordinary identifiers such as `result`, `old`, `requires`, or `assert`. [Defining New Syntax / `Syntax` representation](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Defining-New-Syntax/) [defining new syntax, non-reserved tokens, keywords, and escape…](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Defining-New-Syntax/)

Normative consequences:

- `result` and `old` are always contextual, never global reserved identifiers;
- `requires`, `ensures`, and `satisfies` are recognized only in contract/declaration-tail syntax categories;
- `invariant` is recognized only in the verified-loop/specification category;
- the ProofScript **pure/local** `assert` alias is recognized only in its proof/specification category, including the registered verification-prelude position of a `defBodyBlock`; inside `doSeq`, any Lean-native `assert`/`assert!`/`debug_assert!` form admitted by the pinned environment keeps its Lean meaning;
- `ghost` is recognized only as a specification-phase modifier/binding form;
- `contract` is the only top-level extension introducer, and implementations should make even it non-reserving when possible;
- if a source translator encounters a Lean identifier that collides with an active extension token, Lean's existing escaped-identifier mechanism `«... »` remains sufficient to represent the name faithfully. [Source Files and Modules / Namespaces and Sections](https://lean-lang.org/doc/reference/latest/Source-Files-and-Modules/) [defining new syntax, non-reserved tokens, keywords, and escape…](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Defining-New-Syntax/)

This rule preserves the spirit of Lean's dynamic syntax system: the set of words recognized as syntax should be scoped and category-sensitive rather than treated as a permanently closed JavaScript-style keyword table.

---

## A.2 Normative extension set and status

| Extension | v0.1 status | Kernel impact | Canonical Lean meaning | Runtime impact |
|---|---|---|---|---|
| `contract` | **NORMATIVE** | none | macro/elaboration to `Prop`-valued definitions and/or specification theorems | none by itself |
| `requires` | **NORMATIVE** | none | proof parameter / precondition; automatic parameter allowed | proof argument erased when proposition-valued |
| `ensures` | **NORMATIVE** | none | theorem/postcondition or `Std.Do` postcondition | theorem/proof erased |
| `result` | **NORMATIVE, contextual** | none | binder for the return value in a postcondition | none |
| `satisfies` | **NORMATIVE** | none | generated theorem that a declaration inhabits/satisfies a `Prop` specification | none |
| pure/local `assert` | **ERGONOMIC EXTENSION ALIAS** | none | `have`/local proof obligation | no runtime check; does not replace Lean `do` assertion forms |
| `ghost` | **NORMATIVE THEOREM-LOCAL SUBSET; BROADER FORMS DEFERRED** | none | Appendix A.8 theorem-side pure local binding | no runtime capture or general data erasure annotation |
| `old` | **NORMATIVE, RESTRICTED contextual** | none | pre-state binder/snapshot in a formal state model | none |
| `invariant` | **NORMATIVE when a proof model exists** | none | invariant hypothesis/VC, preferably through `Std.Do` for monadic loops | none |

The following earlier ideas are **not** added as standard verification keywords in v0.1:

| Candidate | Decision | Reason |
|---|---|---|
| `decreases` | **DO NOT ADD** | Lean already has `termination_by` / `decreasing_by`; a duplicate name would obscure the Lean concept. |
| declaration modifier `pure` | **DO NOT ADD** | `pure` already has a precise applicative/monadic meaning; purity/effects belong in Lean types or a future formally specified effect contract. |
| `interface` | **DO NOT ADD** | overlaps/conflicts conceptually with `structure`, `class`, and `contract`. |
| OO `implements` | **DO NOT ADD** | misleading class/interface connotation; use proof-oriented `satisfies`. |
| unchecked `as` / `cast` | **DO NOT ADD** | conflicts with Lean's checked coercion model. |
| generic `trusted` | **DO NOT ADD** | collapses Lean's distinct `axiom`, `unsafe`, `opaque`, `noncomputable`, and implementation-replacement concepts. |
| `assume` | **DO NOT ADD AS SAFE SYNTAX** | an unproved assumption changes the trust basis; use an explicit Lean `axiom` or separately marked unsafe/trust mechanism so `#print axioms` remains meaningful. |
| `async` / `await` | **DO NOT ADD TO FAITHFUL CORE** | `IO` and `do` are not Promise semantics. |
| `reads` / `writes` / `modifies` | **DEFER** | useful only after a precise state/effect/frame model is selected; `Std.Do` should be evaluated before inventing a second effect logic. |

---

## A.3 `contract`: a specification layer, not a new logical object

A `contract` describes a proposition about a declaration. It does **not** add a kernel declaration kind analogous to `def`, `theorem`, or `inductive`.

For a pure function-like declaration with arguments `x` and result type `B`, an inline contract is interpreted through ordinary propositions:

```text
Pre(x)          : Prop
Post(x, result) : Prop

ContractHolds(f) : Prop :=
  ∀ x (hPre: Pre(x)), Post(x, f(x, hPre))
```

Multiple `requires` clauses are ordered proof assumptions and multiple `ensures` clauses are ordered proof obligations. Implementations may also form their conjunctions for reporting, but they must preserve individual source locations and dependency order.

### A.3.1 Inline contract syntax

```ts
def pred(n: Nat): Nat
  contract value {
    requires hPositive: 0 < n;
    ensures (result) => result < n :=
      by {
        omega
      };
  }
:= {
  n - 1
}
```

The contract does not change the arithmetic meaning of `pred`; it adds an admissibility proof at calls and a theorem about the returned value.

### A.3.2 No implicit trust

If the postcondition cannot be proved, the declaration is rejected as a verified contract declaration. The implementation must **not** recover by:

```text
sorry
axiom generated_contract
unsafe assume ...
```

unless the user explicitly writes a trust-affecting Lean construct already defined elsewhere by the language. Contract verification therefore inherits the same kernel-checking discipline as ordinary theorems. [Theorems / Axioms](https://lean-lang.org/doc/reference/latest/Definitions/Theorems/) [Validating a Lean Proof / build checker tools](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)

---

## A.4 `requires`: lower to an ordinary proof parameter

For pure/total definitions, a `requires` clause should lower to a proposition-valued parameter. The recommended ergonomic lowering uses Lean's existing **automatic parameter** mechanism so omitted proofs can be synthesized by a tactic at the call site. Lean documents `autoParam` as an elaboration gadget: it uses a tactic to fill an omitted argument and does not add a new core type-system feature. [Function Application / automatic parameters](https://lean-lang.org/doc/reference/latest/Terms/Function-Application/)

Surface ProofScript:

```ts
def pred(n: Nat): Nat
  contract value {
    requires hPositive: 0 < n;
  }
:= {
  n - 1
}
```

Normative generated-Lean shape:

```lean
def pred
    (n : Nat)
    (hPositive : 0 < n := by proofscript_contract) :
    Nat :=
  n - 1
```

The default tactic and configuration must be identified in the build manifest. The tactic must construct an accepted proof term and satisfy the transitive axiom policy in “Validating a ProofScript Proof”; its spelling alone provides no assurance. A recommended initial tactic is deliberately conservative (for example: assumptions, trivial simplification, registered contract lemmas, then user-configurable automation).

### A.4.1 Explicit proof passing

ProofScript must always permit an explicit proof instead of relying on automation:

```ts
pred(n, hPositive := hn)
```

This lowers to an ordinary named Lean argument.

### A.4.2 Multiple and dependent requirements

Requirements are elaborated in source order, and a later requirement may depend on earlier parameters/proofs exactly as Lean dependent binders may:

**Schematic (not an acceptance-test example):**

```text
def slice(xs: Array(A), i: Nat, j: Nat): Array(A)
  contract value {
    requires hi: i <= xs.size;
    requires hj: j <= xs.size;
    requires hij: i <= j;
  }
:= {
  ...
}
```

Each proof parameter is logically ordinary. When its type is a proposition, its proof is runtime-irrelevant and erased by Lean's compilation model. [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/)

### A.4.3 Why `requires` is not a new global axiom

A `requires P` clause does **not** assert `P` globally. It changes the admissible call interface: every completed safe application producing the result must provide or synthesize a term of type `P`; partial applications retain the proof parameter. The body reasons under a local proof parameter. No unchecked global proof of `P` is introduced by the clause; the approved dependency policy still applies to supplied proofs.

---

## A.5 `ensures` and contextual `result`

An `ensures` clause generates a theorem whose statement relates the inputs, any requirement proofs, and the actual definition application.

Surface:

```ts
def inc(n: Nat): Nat
  contract value {
    ensures (result) => result = n + 1 :=
      by {
        rfl
      };
  }
:= {
  n + 1
}
```

Normative Lean shape:

```lean
def inc (n : Nat) : Nat :=
  n + 1

theorem inc.__ensures_1 (n : Nat) :
    let result := inc n
    result = n + 1 := by
  rfl
```

Generated theorem names must have stable exported identities or a documented correspondence map. They may be omitted only from a specifically logical comparison; metaprograms and downstream proofs can observe them. The theorem statement and its link to the actual definition are normative.

### A.5.1 `result` is a binder, not a global identifier

`result` exists only in the syntactic scope introduced by an `ensures` clause. It is replaced by a fresh binder whose value is the actual function application. Outside that scope, `result` remains an ordinary identifier.

### A.5.2 Multiple postconditions

**Schematic (not an acceptance-test example):**

```text
ensures (result) => P(result) := by { ... };
ensures (result) => Q(result) := by { ... };
```

should generate separate kernel-checked theorems plus, optionally, a derived conjunction theorem. Separate theorems improve diagnostics, compositional reuse, and proof automation without changing semantics.

### A.5.3 Postcondition proofs are not compiler assertions

An `ensures` clause is valid only if the corresponding theorem term is accepted by Lean. Runtime testing may be offered separately, but runtime testing must never be treated as evidence that the theorem is proved.

---

## A.6 Named `contract` declarations and `satisfies`

Reusable contracts normalize to **ordinary Lean logical content plus frontend-only contract-signature metadata**. A named declaration without a mode is a value contract; monadic named contracts must identify the monadic-model descriptor in Appendix A. The logical content is a `Prop`-valued predicate over candidate implementations. The metadata records the source binders and `requires` binders so that `satisfies` can expand the declaration into exactly the same ordinary Lean binder structure that an inline contract would have produced. The metadata is not a kernel declaration kind, but it remains in a versioned frontend environment extension for downstream elaboration and must be validated against the emitted logical signature as required by this appendix.

ProofScript:

```ts
contract StrictlyDecreases(n: Nat): Nat {
  requires hPositive: 0 < n;
  ensures (result) => result < n;
}
```

Conceptual Lean logical normalization:

```lean
def StrictlyDecreases
    (f : (n : Nat) → (hPositive : 0 < n) → Nat) : Prop :=
  ∀ (n : Nat) (hPositive : 0 < n),
    f n hPositive < n
```

The frontend additionally remembers, outside the kernel, that satisfying this contract requires the binder sequence `(n : Nat) (hPositive : 0 < n)` and result type `Nat`.

An implementation may then state:

```ts
def pred(n: Nat): Nat
  satisfies StrictlyDecreases := {
  n - 1
}
```

Before ordinary declaration elaboration, `satisfies StrictlyDecreases` expands the missing contract proof binder exactly as the inline `requires` form would:

```lean
def pred
    (n : Nat)
    (hPositive : 0 < n := by proofscript_contract) : Nat :=
  n - 1
```

and ProofScript generates an ordinary theorem:

**Schematic (not an acceptance-test example):**

```text
theorem pred.__satisfies_StrictlyDecreases :
    StrictlyDecreases pred := by
  ...
```

If a declaration already writes a corresponding binder or inline requirement, normalization must use the explicit telescope correspondence in this appendix. It must not merge distinct assumptions just because their types unify. A mismatch or ambiguous mapping is an elaboration error. This makes named and inline contracts semantically convergent instead of two contract systems.

### A.6.1 `satisfies` is not OO `implements`

`satisfies` means **proof of a proposition**, not nominal inheritance, structural assignability, vtable conformance, prototype conformance, or typeclass registration. No `instance` is created unless the source explicitly requests one.

### A.6.2 Contract abstraction is logically ordinary

Because a named contract becomes an ordinary `Prop`-valued definition, users retain all Lean mechanisms for combining, quantifying over, proving, and refactoring contracts. The extension therefore improves notation without inventing a second specification logic.

---

## A.7 Pure/local `assert`: proof-obligation alias with category isolation

Lean already has the proof-structuring concept `have`. Therefore ProofScript's **pure/local** `assert` is not a new canonical logical construct; it is an optional verification alias that immediately normalizes to a local proposition proof. This rule applies only in the registered ProofScript proof/specification or `defBodyBlock`-prelude category. It does **not** reinterpret Lean-native `doElem` assertions or runtime `assert!`/`debug_assert!`.

ProofScript:

```ts
assert i <= xs.size;
```

Conceptual normalization:

```lean
have _ : i <= xs.size := by
  proofscript_contract
```

An explicit proof form should also be accepted:

```ts
assert i <= xs.size :=
  by {
    omega
  };
```

### A.7.1 No runtime meaning for the ProofScript pure/local alias

The ProofScript pure/local `assert P` alias must not compile to:

```text
if not P then throw/panic
```

for that alias. Lean's existing `assert!` and `debug_assert!` keep their runtime meanings, and a Lean-native verification `assert` inside `doSeq`, when available in the pinned environment, keeps its own VC-generation meaning. Category isolation prevents these constructs from being conflated.

### A.7.2 Formatter policy

Because Lean already has `have`, canonical Lean-oriented normalization may display the desugared `have`; a source-preserving editor may keep `assert`. This follows the existing alias policy rather than creating a second proof ontology.

---

## A.8 `ghost`: specification-phase data with a mandatory non-interference rule

`ghost` is useful, but it is the extension most likely to become unsound at the executable-correspondence boundary if specified casually.

Lean only guarantees that **propositions/proofs are runtime irrelevant**. It does not state that an arbitrary `Nat`, `Array`, structure, or function becomes erasable merely because the programmer labels it "ghost". [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/)

Therefore ProofScript defines `ghost` by phase separation, not by an unchecked compiler annotation.

### A.8.1 Normative rule

A ghost binding:

```ts
ghost let initial := model(x);
```

is available only to:

- contract propositions;
- generated contract theorems;
- proof blocks;
- other ghost bindings;
- specification-only model definitions that themselves satisfy the ghost restrictions.

A ghost value must **not** influence:

- a runtime return value;
- runtime control flow;
- mutable runtime state;
- an FFI argument/result;
- an `IO`/`Task` action;
- the selected runtime implementation of a function;
- any other computationally observable output.

The standard accepted subset is the theorem-local phase rule in this appendix. Broader ghost usage is rejected unless a separately specified conservative phase checker or checked erasure certificate establishes its eligibility.

### A.8.2 Preferred implementation model

The strongest initial implementation is to elaborate ghost bindings into the **proof side** of generated theorems rather than into the executable definition. For example, a ghost snapshot used only to prove a postcondition can become an ordinary `let` inside the theorem proof or theorem statement. Because the enclosing theorem inhabits `Prop`, the resulting proof artifact is runtime irrelevant according to Lean's existing semantics. [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/)

Where a persistent witness must be represented as a proposition, Lean's `Exists`/`Nonempty`-style encodings can additionally exploit restricted elimination from `Prop` to prevent extraction of proof-only witnesses into general computational data.

### A.8.3 External evidence, not external semantics

F* and SPARK both enforce the same fundamental engineering rule: ghost/specification data must not affect ordinary executable behavior. F* enforces an effect/erasure boundary; SPARK checks that ghost code cannot affect program behavior. These systems justify the usefulness of the feature, but ProofScript still defines ghost semantics only through Lean-compatible proof separation and its own non-interference theorem/checker. [`requires`/`ensures`, ghost effect, and erasure/non-interference](https://fstar-lang.org/tutorial/book/part1/part1_lemmas.html) [specification features and ghost code non-interference](https://docs.adacore.com/spark2014-docs/html/ug/en/source/specification_features.html)

---

## A.9 `old`: pre-state reference only under an explicit semantic model

`old(e)` is contextual syntax usable only in specifications. It never means "evaluate `e` again at runtime".

### A.9.1 Pure definitions

For an ordinary pure Lean definition, input parameters are immutable. `old(e)` therefore denotes a fresh proof-side snapshot of a **pure expression over values available at declaration entry**.

Conceptually:

```text
old(e)
  ↦ let __old_e := e
     ... use __old_e in the generated proposition ...
```

No executable snapshot is necessary if the snapshot is used only in a theorem.

### A.9.2 Stateful/monadic definitions

For stateful code, `old` is legal only when the program is interpreted by an explicit formal state model. The preferred v0.1 route is Lean's `Std.Do` weakest-precondition framework: preconditions may mention initial state values and postconditions may mention returned values and final state. A generated contract theorem must bind a schematic entry state, relate it to the actual entry state in the precondition, and interpret `old(...)` in that entry environment, following the monadic-model rules in this appendix. [`mvcgen`, predicate transformers, verification conditions, and…](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/) [enabling `mvcgen`, weakest-precondition models, adequacy, Hoar…](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/Enabling--mvcgen--For-Monads/)

### A.9.3 Forbidden cases

ProofScript must reject `old(e)` when `e` depends on ambient effects for which no adequate formal model exists, including arbitrary external `IO`, time, files, sockets, foreign mutable memory, or JavaScript host state unless the selected backend/monad supplies a verified specification model.

This restriction is deliberate. Why3 and Dafny demonstrate the usefulness of pre-state operators, but their meaning relies on an explicit program-state semantics. ProofScript must not pretend that raw Lean `IO` provides such a model automatically. [`requires`, `ensures`, loop `invariant`, ghost state, pre-stat…](https://dafny.org/dafny/DafnyRef/DafnyRef) [`requires`, `ensures`, invariants, variants, and the `old` pre…](https://why3.org/doc/syntaxref.html)

---

## A.10 `invariant`: verification condition, not altered loop semantics

ProofScript retains Lean's `for`, `while`, `repeat`, `break`, and `continue` semantics exactly. `invariant` adds a proof obligation around a loop; it does not redefine the loop.

### A.10.1 Pure/explicit recursion

For a loop-like construct elaborated to an explicit recursive helper, an invariant `I(state)` is valid only when ProofScript generates and proves the usual obligations:

1. **Initialization:** `I` holds before the first iteration.
2. **Preservation:** assuming `I` and the loop condition, one body step re-establishes `I`.
3. **Exit use:** `I` together with loop exit facts is available to prove the surrounding postcondition.

### A.10.2 `do` loops and `Std.Do`

For monadic Lean programs, v0.1 SHOULD preferentially lower loop contracts to Lean's existing `Std.Do` verification framework. The official `mvcgen` framework interprets monadic programs using weakest preconditions, represents specifications as Hoare triples, uses explicit loop invariants, and generates verification conditions that are ultimately ordinary Lean proof goals. [`mvcgen`, predicate transformers, verification conditions, and…](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/) [enabling `mvcgen`, weakest-precondition models, adequacy, Hoar…](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/Enabling--mvcgen--For-Monads/)

Surface direction:

**Schematic (not an acceptance-test example):**

```text
for (x in xs)
  invariant Inv(xs, x, acc) {
  ...
}
```

Conceptually, the contract elaborator supplies the corresponding `Std.Do.Invariant` / invariant argument when constructing the Hoare-triple proof. The implementation may use `mvcgen` to discharge/generate VCs, but `mvcgen` is automation only: all resulting proof terms remain kernel checked.

### A.10.3 Monad capability requirement

A monadic contract receives only the guarantee licensed by the complete model descriptor in this appendix, including the selected WP/law instances, postcondition shape, modeled runner, primitive specifications and adequacy result. Lean's own documentation explicitly requires such instances for useful `mvcgen` reasoning and an adequacy theorem for new monads. [enabling `mvcgen`, weakest-precondition models, adequacy, Hoar…](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/Enabling--mvcgen--For-Monads/)

If no adequate model exists, ProofScript must reject the strong `invariant`/stateful contract rather than silently replacing it with testing or a host-language assumption.

---

## A.11 Pure contracts vs monadic contracts

ProofScript has **one contract framework with explicitly recorded value or monadic interpretation** as defined in this appendix. Result type shape alone does not select the interpretation.

### A.11.1 Pure/total result

For:

```text
f : A → B
```

contracts lower to ordinary propositions, proof parameters, and theorems:

```text
requires  → proposition-valued parameter (optionally autoParam)
ensures   → theorem about f's returned value
invariant → theorem/VC around explicitly modeled recursion
```

### A.11.2 Monadic result

For:

```text
f : A → m B
```

when `m` has a verified weakest-precondition interpretation, contracts should lower to a Hoare-triple/specification theorem in `Std.Do`:

```text
requires  → Hoare precondition / initial-state assertion
ensures   → Hoare postcondition over result/final state/exception shape
invariant → loop invariant consumed by verification-condition generation
old       → schematic initial-state value
result    → postcondition return-value binder
```

Generated specification theorems should be eligible for the existing `@[spec]` mechanism when their shape satisfies `Std.Do`'s specification-lemma requirements. This permits compositional verification without inventing a parallel contract database. [`mvcgen`, predicate transformers, verification conditions, and…](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/)

### A.11.3 Exceptions and abrupt control flow

A postcondition for a monad that can throw must not silently ignore exceptional paths. `Std.Do`'s postcondition shape explicitly distinguishes the return value, state components, and exceptions. ProofScript must either:

- require clauses that cover the relevant exceptional behavior;
- use a proven no-throw condition; or
- reject a contract whose claimed postcondition would be ambiguous.

---

## A.12 Contract proof generation and trust boundary

The extension adds no kernel rule. Its translator remains part of the source-to-proposition trust boundary unless independently checked or proved, and accepted proofs remain subject to “Validating a ProofScript Proof”.

```text
ProofScript contract syntax
      ↓
contextual parser
      ↓
contract normalizer/elaborator
      ↓
ordinary Lean terms / proof params / theorems / Std.Do specs
      ↓
Lean elaboration
      ↓
Lean kernel
```

A bug in the contract elaborator can still misrepresent the programmer's intended source specification while producing a valid Lean theorem. This is the same source-to-core fidelity issue already identified for the general ProofScript frontend. The following source-to-proposition safeguards are normative:

1. generated `.lean` output (or an equivalent normalized-view command) that exposes every elaborated contract;
2. source mappings from every generated requirement/postcondition theorem back to the `.ps` clause;
3. differential tests for the contract normalizer;
4. deterministic normalized contract AST/IR suitable for hashing in artifact certificates;
5. no hidden axioms or `sorry` in generated contract proofs;
6. independent Lean checking of generated contract theorems in high-assurance builds.

The kernel proves **the elaborated proposition**. Tooling must therefore make that proposition easy to inspect.

---

## A.13 Extension grammar sketch

The grammar is intentionally contextual. An implementation based on Lean's parser infrastructure should use non-reserved atoms where practical rather than adding every annotation word to the global token table. [Defining New Syntax / `Syntax` representation](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Defining-New-Syntax/) [defining new syntax, non-reserved tokens, keywords, and escape…](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Defining-New-Syntax/)

```text
contractBlock ::= &"contract" contractMode? "{" contractClause* "}"
contractMode ::= &"value" | &"monadic" "(" modelDescriptor ")"
-- omitted mode is always value; it is not inferred from the result type

declContractTail ::= contractBlock
                   | satisfiesClause+

contractClause ::= requiresClause
                 | ensuresClause
                 | extensionContractClause

requiresClause ::= &"requires" (ident ":")? term ";"

ensuresClause  ::= &"ensures" resultBinder "=>" term proofProvision? ";"

resultBinder   ::= "(" ident ")"
                 | "(" ident ":" term ")"

proofProvision ::= ":=" term

satisfiesClause ::= &"satisfies" term proofProvision? ";"?

ghostBinding   ::= &"ghost" letLikeBinding

oldTerm        ::= &"old" "(" term ")"

assertStmt     ::= &"assert" term proofProvision? ";"

loopSpec       ::= (&"invariant" term proofProvision?)*
```

`term` above means the full ProofScript term category, so contract propositions retain dependent types, typeclasses, notation, macros, and user-defined syntax. This is important: the verification layer must not introduce a weaker "specification expression language" beside Lean's own terms.

---

## A.14 Generated-artifact example

Source:

```ts
def pred(n: Nat): Nat
  contract value {
    requires hPositive: 0 < n;
    ensures (result) => result < n :=
      by {
        omega
      };
  }
:= {
  n - 1
}
```

Inspectable generated Lean:

```lean
def pred
    (n : Nat)
    (hPositive : 0 < n := by proofscript_contract) : Nat :=
  n - 1

theorem pred.__ensures_1
    (n : Nat)
    (hPositive : 0 < n) :
    pred n hPositive < n := by
  unfold pred
  omega
```

Properties of this lowering:

- `requires` is an ordinary proposition proof parameter;
- omission is an elaborator convenience via `autoParam`, not a kernel assumption;
- `ensures` becomes an ordinary theorem;
- theorem proofs are runtime irrelevant;
- the runtime result remains `Nat` rather than a new contract-wrapper runtime object;
- an explicit proof may always be passed to the function;
- an external Lean installation can inspect and re-check the generated theorem.

---

## A.15 Why these extensions are sounder than copying a verification language wholesale

The spellings are familiar from Dafny, Why3, F*, and SPARK, all of which provide combinations of preconditions, postconditions, invariants, old/pre-state values, and ghost state. [`requires`, `ensures`, loop `invariant`, ghost state, pre-stat…](https://dafny.org/dafny/DafnyRef/DafnyRef) [`requires`, `ensures`, invariants, variants, and the `old` pre…](https://why3.org/doc/syntaxref.html) [`requires`/`ensures`, ghost effect, and erasure/non-interference](https://fstar-lang.org/tutorial/book/part1/part1_lemmas.html) [specification features and ghost code non-interference](https://docs.adacore.com/spark2014-docs/html/ug/en/source/specification_features.html) [loop invariant proof obligations](https://docs.adacore.com/spark2014-docs/html/ug/en/source/how_to_write_loop_invariants.html)

ProofScript does **not** inherit their semantics. The borrowed words are accepted because Lean supplies suitable expressive mechanisms that preserve this project's chosen foundation; this is not a universal strength ranking:

| User-facing idea | ProofScript semantic foundation |
|---|---|
| precondition | proposition-valued dependent/automatic parameter or `Std.Do` precondition |
| postcondition | ordinary theorem or `Std.Do` postcondition |
| proof assertion | `have` / theorem obligation |
| named contract | ordinary `Prop`-valued definition |
| contract satisfaction | ordinary theorem |
| loop invariant | proof obligation / `Std.Do` invariant |
| pre-state value | explicit theorem binder / weakest-precondition state variable |
| ghost data | theorem/specification-phase value with non-interference enforcement |

The normative design decision is:

> **ProofScript borrows verification vocabulary, not verification semantics. Lean remains the specification language and proof theory underneath every extension.**

---

## A.16 Extension safety checklist

A future ProofScript verification feature is eligible for the standard language only if all answers below are satisfactory:

1. **Can it be expressed as ordinary Lean terms/propositions/theorems or an already formalized Lean verification framework?**
2. **Does it avoid a new kernel primitive or declaration kind?**
3. **Can the generated proposition be independently shown to users and checked by Lean?**
4. **If it is erased, is erasure justified by `Prop` runtime irrelevance or a proved non-interference rule?**
5. **If it refers to program state, is that state represented by an explicit formal semantics rather than ambient host behavior?**
6. **Does it preserve Lean's distinctions (`Prop`/`Bool`, `do`/Promise, `termination_by`, `axiom`, `unsafe`, etc.)?**
7. **Can a failed proof cause only verification failure, never an implicit assumption?**
8. **Can extension tokens remain contextual/non-reserving enough to avoid unnecessary source incompatibility?**
9. **Does the construct compose with macros/elaborators and the incremental parser rather than requiring a closed TypeScript grammar?**
10. **Can the extension's normalized semantics be hashed/certified for source-to-proof artifact auditing?**

If a proposed feature fails one of these tests, it should remain a library macro, an explicitly unsafe facility, or a deferred research item rather than becoming a standard ProofScript keyword.

---

# Appendix B. Conformance and Trust

This appendix defines how ProofScript compatibility and assurance claims are evaluated. Logical checking, source-to-core fidelity, environment compatibility, and executable-backend correspondence are distinct claims.

## Conformance is a family of explicit observations

The official type-system documentation states that Lean's definitional equality is not transitive. Preserve Lean's actual documented metatheory; do not replace it with an idealized calculus. [Lean type system](https://lean-lang.org/doc/reference/latest/The-Type-System/)

Define `Conforms(B, O, rho, T, L)` using a baseline `B`, observation set `O`, explicit name correspondence `rho`, and ProofScript/Lean artifacts `T` and `L`. This is a **conformance judgment**, not a quotient by transitive definitional equality.

| Observation family | Required evidence |
|---|---|
| Logical declarations | Independently admitted corresponding declarations, types, safety and permitted assumptions. |
| Core representation | Structural correspondence with a documented set of permitted metadata/name transformations. |
| Conversion | Individually recorded conversion outcomes in specified environments and contexts. |
| Elaboration | Corresponding implicit insertion, coercions, instances, dependent matching, recursion results and relevant extensions. |
| Metaprogramming | A declared observation boundary for names, syntax, attributes, source information and generated artifacts. |
| Execution | A separately specified runtime observation relation and compiler/runtime evidence. |

A comparison algorithm MUST NOT close conversion successes transitively or assume a universal normal form exists. Structural matching is the preferred auditable baseline for corresponding exported terms. Any additional normalization requires justification for its precise domain. A proof of extensional equality can establish a weaker correspondence without establishing identical reduction or elaboration behavior; label that difference.

Checker/conformance outcomes MUST distinguish `accepted`, `rejected`, `resource_exhausted`, `unsupported`, and `implementation_error`. Only semantic acceptance and semantic rejection support an acceptance comparison. A timeout, crash, or missing feature is inconclusive. Finite differential testing is evidence about the corpus, not a proof of global equivalence or consistency.

## Verification profiles and axiom discipline

Lean's validation guidance distinguishes proving a theorem from proving the intended theorem. It also documents native computation assumptions: since 4.29.0, native decision procedures can introduce individual axioms for computed assertions. Checking only for `sorryAx` or the older `Lean.trustCompiler` name is insufficient. [Validating a Lean proof](https://lean-lang.org/doc/reference/latest/ValidatingProofs/)

**Normative profile design:** these profiles change acceptance labels and deployment policy, not Lean's calculus or the meaning of source constructs.

| Profile | Meaning |
|---|---|
| Lean-compatible development | Supports the selected Lean constructs, including explicit axioms, placeholders and unsafe programming where Lean permits them; reports their status. |
| Strict proof artifact | Independently checks the artifact against an intended statement and an explicit foundational-axiom manifest; rejects every unapproved transitive assumption. |
| Execution-correspondence claim | Adds specified compiler, runtime, primitive, host and FFI correspondence evidence to a precisely identified logical artifact. |

A strict axiom manifest MUST bind each approved assumption to its identity, type and trusted base-environment provenance. It may select the project's approved Lean foundations, including classical axioms where intended; “strict” does not mean arbitrarily banning ordinary Lean mathematics. Newly declared or native-generated assumptions require an explicitly different trust manifest and a qualified result. User consent to an assumption never turns it into a proved proposition.

Contract automation MAY use external/native solvers for search, but strict acceptance requires an approved proof term or checked certificate. All indirect dependencies count. This rule applies equally to a hand-written theorem, an imported lemma, an automatically generated contract proof and an adequacy theorem.

An artifact record MUST bind source and normalized contract identities, theorem type, referenced definitions, environment/axiom manifest, checker version and outcome. An execution claim additionally binds compiler/runtime settings and output bytes. Hashes identify artifacts; they do not prove translation correctness. An independent statement comparison or a checked translation argument remains necessary.

## Contracts: explicit interpretation and exact telescopes

Keep the pure proof-parameter/theorem scheme, but remove inference based solely on a result looking like `m B`. For example, `Option(Nat)` can describe data or an effect. **Every normalized contract MUST record its interpretation.**

Canonical v0.1 syntax retains `contract value { ... }` for an ordinary value contract. The legacy `contract { ... }` form is retained as an alias for `contract value { ... }`, independent of imported instances. `contract monadic(Model) { ... }` selects a registered model descriptor; its model obligations are specified in the monadic-model section of this appendix. A named contract records the same mode. These are contextual words in the contract category, not new kernel constructs.

For value mode, ordered requirements `P1`, ..., `Pk` generate ordered proposition-valued parameters `h1`, ..., `hk` after the source telescope. Later requirements may mention earlier proof binders. The executable body sees those binders. A postcondition sees all inputs and requirement proofs plus its fresh result binder. The declaration's explicit result type retains its ordinary header scope; if it needs a proof binder in that type, write the binder in the header and match it explicitly through the contract signature rather than giving a later clause retroactive scope.

A completed safe application producing a result must supply the requirement proofs. A partial application can retain them as parameters. Requirements are local assumptions under binders, not new global axioms. Automatic proof search is convenience; explicitly passing the proof MUST always remain possible.

For named contracts, preserve binder identity, order, class, universe dependencies, result type, mode, and model. Matching inline and named requirements MUST use an explicit telescope correspondence. Do not merge distinct assumptions merely because their types unify. Reject ambiguous correspondence. Imported contract metadata MUST be checked against its logical predicate and module identity before it controls elaboration.

Each `ensures` generates a theorem about the actual definition application. Its source-facing proof goal exposes a local result definition and the actual body by an explicit generated unfolding step; it must not accidentally prove a proposition about a fresh unrelated variable. Obligations form an acyclic dependency order. A definition and all its required specification theorems MUST be committed as one verified unit; failure cannot leave a published verified label or create an axiom recovery path.

Preconditions can be inconsistent. A vacuously true contract is logically valid and may be useless. Report its full precondition. A satisfiability witness or intended-domain coverage theorem is a distinct optional result, never silently inferred from contract verification.

## Monadic contracts describe a model, with conditional guarantees

Lean's `mvcgen` documentation requires a WP interpretation, appropriate laws, and an adequacy connection for new monads. Its state examples explicitly relate a schematic entry value to the actual initial state. [Enabling mvcgen for monads](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/Enabling--mvcgen--For-Monads/)

A v0.1 model descriptor MUST identify the monad and transformer order, resolved WP and law instances, result/postcondition shape, modeled runner or transition semantics, primitive specification lemmas, adequacy theorem, and their dependency manifest. These are frontend records pointing to ordinary checked Lean declarations; the record itself is not a new logical axiom. A model missing any component required for its advertised guarantee is not eligible for that guarantee.

Monadic `requires` generates a Hoare precondition. It **does not** globally force every ordinary Lean caller to prove that precondition before constructing or running the action. A contract theorem establishes conditional correctness in its model. Global enforcement requires a separately specified indexed interface or verification discipline and must not be advertised as already provided.

The descriptor must provide typed assertion/result/state binders and a renderer for the complete generated proposition. Until that grammar and descriptor instance are supplied, a monadic contract form is an extension interface, not a claim of implemented support for arbitrary monads. Users can always express the ordinary Lean specification theorem directly.

For a simple StateM model, `old(e)` is interpreted using a fresh `s0` and the logical shape:

```text
for every s0:
  pre(s)          := (s = s0) ∧ Pre(s0)
  post(r, sFinal) := Post(s0, r, sFinal)
  old(e)         := e evaluated in the entry environment at s0
```

This is a schematic definition of translation, not literal `Std.Do` syntax. Transformer stacks use their exact state tuple and failure behavior. `old` may not capture later locals or a result binder, re-run effects, or invent a heap snapshot. A pure old-expression is a theorem-side expression over entry inputs. Existing runtime state and foreign APIs require an explicit model.

Normal-return-only specifications default to the selected model's no-throw postcondition, using `PostCond.noThrow` where applicable. Exception-permitting specifications must fill the relevant postcondition branches explicitly; no silent `mayThrow` fallback is allowed. The official framework provides these distinct postcondition constructions. [Predicate transformers](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/Predicate-Transformers/)

Loop invariants must be attached to the actual elaborated loop and its proved rule. Initialization, preservation and exit reasoning are an explanatory outline, not a substitute for covering `break`, `continue`, early return and exceptional exits. The generated WP goal is authoritative. [Verification conditions](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/Verification-Conditions/)

Neither a loop invariant nor a fixed-point equation alone licenses a claim of termination or total executable correctness. Record exactly whether the selected model proves partial correctness, termination, or another property. A model adequacy theorem does not by itself prove that JS, Wasm, a scheduler, or an FFI implements that model.

## A precise initial ghost subset

Lean's proof irrelevance and proof erasure support theorem-side artifacts; they do not make arbitrary computational data erasable just because it is annotated. [Lean propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/)

In v0.1, the supported standard `ghost` subset is **pure local specification data inside a proof or generated specification artifact**. It lowers to an ordinary theorem-side `let`. Its scope and dependencies must remain within that artifact. It cannot be an effectful snapshot, runtime capture, implementation selector, or erased data parameter in the executable function. An implementation may conservatively reject broader usage even if a user believes it observationally irrelevant.

The checker must inspect elaborated dependencies, including inserted instances/coercions and macro-generated terms. Computational influence can occur through a dictionary or dependent type, not merely a directly written return expression. General ghost data crossing into program elaboration is DEFERRED until a conservative phase system and erasure theorem or checked certificate format are specified. This is a reduction in unsupported claims, not a replacement of Lean's proof theory.

`Exists` and `Nonempty` can be useful specification encodings. Their elimination restrictions do not imply that classical noncomputable witness selection is impossible; ordinary Lean noncomputability and compilation restrictions remain in force.

## Kernel implementation and executable correspondence

The previously established exact-integer, immutable-value, deterministic-map and explicit-error rules are retained. Their purpose is to prevent host implementation details from silently changing the calculus. The following additional requirements are design deductions from the stated adversarial checking goal:

1. A strict checker receives validated inert serialization in a fresh process or equivalently isolated checker context. Decoding and checking do not execute user callbacks, module initializers, getters, proxies or metaprograms. Object freezing alone is not isolation.
2. Admission validates declaration references, scope, universe data, inductive/recursor data and artifact structure before trusting them. Imported checked status is not self-authenticating.
3. Caches include every semantically relevant environment/context/configuration dependency. Hash-consing or hashes can accelerate comparison; hash equality alone is not logical equality.
4. Checker exceptions, invalid serialization and resource exhaustion never become acceptance. Tooling distinguishes these from logical rejection.
5. Replay binds the intended theorem and base environment separately from the untrusted source elaborator. Two checkers agreeing on the wrong statement are not evidence of source fidelity.

For a backend claim, define the observation domain before proving preservation: values, exceptions, termination/divergence, state/effect traces, allowed nondeterminism, and host failures as applicable. Equality of pure return values is insufficient for effectful programs. Complexity is a separate optional claim. Proof/type erasure, closures, numeric/string representations, optimization passes, logical/compiled replacement attributes and foreign primitives each require preservation evidence or an explicit trusted assumption.

The reference's separate treatment of elaborated recursive definitions and compiled predefinitions reinforces this boundary; a checked logical term is not automatically a compiler-correctness theorem. [Elaboration and compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)


## ProofScript Semantic Fidelity Invariant

For each ProofScript program fragment `S` with a corresponding Lean program `L`:

```text
ProofScript S
   ↓ parse + alias normalization + macro expansion + elaboration
E_PS

Lean L
   ↓ parse + macro expansion + elaboration
E_Lean
```

The compatibility requirement is the versioned observation judgment in Appendix B. `E_PS` and `E_Lean` are compared using an explicit name map and permitted structural transformations; there is no blanket metadata erasure or transitive-conversion normalization.

### Required equivalence dimensions

- declaration kind;
- universe parameters and constraints;
- elaborated declaration type;
- elaborated value/core expression when available;
- binder information;
- reducibility hints / opacity behavior;
- safety status;
- mutual-group membership;
- generated inductive constructor/recursor signatures;
- instance registrations and priorities;
- relevant environment extension entries;
- theorem dependencies/axioms;
- definitional-equality outcomes;
- reduction behavior (`#reduce` where meaningful);
- pattern/recursive equation theorems where part of Lean's output;
- compiled behavior for executable safe code, tested separately from proof soundness.

### Observation-specific exclusions

A logical comparison may exclude source positions, lexical whitespace, alias spelling and explicitly mapped private names. Documentation comments, named-argument binder names, syntax data and reflective metadata are not globally irrelevant. Exact raw Lean/ProofScript Syntax identity is not generally claimed; see Chapter 2 and Appendix B.

---

## Differential conformance suite

Build a corpus of paired files:

```text
tests/conformance/lean/*.lean
tests/conformance/proofscript/*.ps
```

For each pair export a normalized semantic snapshot, e.g. NDJSON:

```json
{
  "name": "Example.add",
  "kind": "definition",
  "levels": [],
  "type": "...normalized core expr...",
  "value": "...normalized core expr...",
  "reducibility": "regular",
  "safety": "safe"
}
```

Compare:

1. declaration types;
2. values when transparent/available;
3. core expression trees modulo alpha/source metadata;
4. declaration metadata relevant to kernel/elaboration;
5. environment registrations;
6. reduction and definitional equality test vectors;
7. runtime outputs for executable examples.

### Alias tests

Require:

```ts
def f(x: Nat): Nat := {
  x
}

function f(x: Nat): Nat := {
  x
}
```

to normalize to the same canonical `DefDecl`.

Require:

```ts
def x: Nat := {
  1
}

const x: Nat := {
  1
}
```

to normalize to the same canonical `DefDecl`.

---

## Kernel cross-checking

Lean itself values independent kernel implementations because explicit proof terms can be checked independently. High-assurance ProofScript implementations SHOULD exploit this property. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)

Recommended staged trust strategy:

1. ProofScript frontend emits/exportable Lean-compatible core declarations.
2. ProofScript TS kernel checks them.
3. During development, check exports with the pinned Lean kernel and an independent checker where practical. Strict proof artifacts additionally require validated serialization, an independently bound intended statement and Validating a ProofScript Proof/Appendix B isolation; replay alone is insufficient.
4. Differential fuzzing targets declaration/type/value equality and definitional equality.
5. Compiler correctness is tested separately using runtime differential tests.

---



## What “most sound” means for ProofScript

“Sound” must not be used as one undifferentiated marketing word. ProofScript needs four independently testable claims:

1. **Logical kernel soundness.** The trusted kernel accepts only declarations valid in the targeted Lean-style core theory, relative to explicitly declared axioms and kernel primitives. Lean's reference describes the kernel as a small checker for a version of the Calculus of Constructions with full dependent types, inductive types, an impredicative proof-irrelevant `Prop`, a predicative non-cumulative data-universe hierarchy, quotient types with a definitional computation rule, eta equality, and universe polymorphism. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) [The Type System](https://lean-lang.org/doc/reference/latest/The-Type-System/) [Propositions](https://lean-lang.org/doc/reference/latest/The-Type-System/Propositions/) [Quotients](https://lean-lang.org/doc/reference/latest/The-Type-System/Quotients/)
2. **Source-to-core fidelity.** ProofScript parsing, macros, alias expansion, elaboration, typeclass synthesis, coercion insertion, pattern compilation, and recursion elaboration must construct the same *meaning* as the corresponding Lean 4 source. Bugs here may cause the source to mean something other than intended even if the kernel still rejects invalid terms.
3. **Environment compatibility.** Declarations must preserve semantically relevant environment information: declaration kind, universe parameters, type/value, reducibility/transparency, safety, inductive metadata, generated recursors/equation lemmas, attributes, instance tables, namespaces, scopes, and module exposure. [Definitions](https://lean-lang.org/doc/reference/latest/Definitions/Definitions/) [`src/Lean/Declaration.lean`](https://github.com/leanprover/lean4/blob/master/src/Lean/Declaration.lean) [kernel declaration kinds](https://github.com/leanprover/lean4/blob/master/src/Lean/Declaration.lean)
4. **Execution correspondence.** JavaScript/WASM produced by the compiler must behave like the checked ProofScript program. This is a compiler/runtime property, not a consequence of kernel soundness. Lean itself deliberately sends recursive pre-definitions to the compiler while sending justified transformed definitions to the kernel, illustrating that proof checking and executable code generation have different trust boundaries. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)

The v0.1 specification therefore forbids the phrase “the kernel proves the generated JavaScript correct” unless an additional verified-compiler or translation-validation argument exists.

### Lean's metatheory must be copied accurately, not idealized

A faithful implementation should not silently replace Lean's actual definitional-equality theory with a textbook system. The current reference explicitly notes that Lean's type theory lacks subject reduction in the usual metatheoretic sense, definitional equality is not necessarily transitive, and type checking can be made non-terminating, while logical soundness is not affected. These are surprising but specification-relevant facts. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) [The Type System](https://lean-lang.org/doc/reference/latest/The-Type-System/)

**Decision:** ProofScript targets Lean's observable kernel acceptance/definitional-equality behavior, not an idealized “clean CIC” that happens to look similar.

---

## Exact logical-foundation wording

The specification should **not** say merely “Lean is CIC exactly” and stop there. The more faithful description is:

> **Lean 4's kernel implements a version of the Calculus of Constructions extended with Lean's universe discipline, inductive types/recursors, an impredicative and definitionally proof-irrelevant `Prop`, quotient primitives with computation, eta equality, and universe-polymorphic constants.** [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/)

This is CIC-like in the broad sense that inductive families extend dependent type theory, but “textbook Calculus of Inductive Constructions” is not a sufficient executable specification of Lean's kernel. ProofScript therefore copies the concrete Lean kernel rules and differential behavior rather than treating the name of a calculus as the specification.

---

## Compatibility levels

ProofScript must publish compatibility claims by level rather than saying “Lean-compatible” without qualification.

| Level | Name | v0.1 target | Meaning |
|---|---|---|---|
| L0 | Kernel semantic compatibility | **Required** | Equivalent core declarations are accepted/rejected consistently with the targeted Lean kernel rules. |
| L1 | Core representation compatibility | **Required conceptually** | Mirror `Expr`, `Level`, `BinderInfo`, declaration kinds, inductive/recursor metadata closely enough for direct structural differential testing; byte identity is not required. |
| L2 | Elaboration semantic compatibility | **Required** | Equivalent surface programs elaborate to equivalent core/environment artifacts. |
| L3 | Source-feature capability compatibility | **Required** | Every major Lean language concept has a ProofScript representation, though concrete syntax may differ. |
| L4 | Syntax-extension capability compatibility | **Required** | ProofScript supports extensible syntax categories, hygienic macros, and custom elaborators with equivalent expressive power. |
| L5 | Exact Lean macro-source compatibility | **Not claimed** | Changed concrete syntax/kinds mean arbitrary Lean macros cannot be assumed to work unmodified. Translation adapters may cover subsets. |
| L6 | Lean library compatibility | **Staged goal** | `Init` and `Std` can be translated/reimplemented/imported semantically; Mathlib is a later ecosystem milestone. |
| L7 | `.olean` binary compatibility | **Not a goal** | ProofScript need not reproduce Lean's serialized in-memory format or implementation ABI. |

This avoids the false inference that semantic compatibility automatically implies source, macro, library, or binary compatibility. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) [Defining New Syntax / `Syntax` representation](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Defining-New-Syntax/) [Hygienic Macros](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Macros/)

---

## Semantic fidelity relation

Use `Conforms(B, O, rho, T, L)` as defined in Appendix B. It records the baseline, observation domain and name correspondence. It does not assume transitivity of Lean definitional equality.

Required dimensions include declaration kinds and types, universe parameters, binder information, safety, reducibility, inductive/recursor metadata, elaboration registrations, generated equations and individually checked conversion outcomes. A logical comparison may omit designated source metadata; a metaprogramming comparison may observe it. A proof of propositional equality is not automatically interchangeable with structural or conversion compatibility. Runtime correspondence is separate.

Only the explicit observation contract determines what can be renamed or omitted. Inconclusive checker outcomes are not semantic rejections.

---

## Syntax/semantic-layer taxonomy

A central reference rule is to say **where each concept lives**. Rich Lean surface forms are frequently not kernel primitives. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) [The Type System](https://lean-lang.org/doc/reference/latest/The-Type-System/)

| Feature family | Parser | Macro | Elaborator | Environment | Kernel | Compiler | Runtime / Library |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| identifiers / tokens | ✓ |  | resolution |  |  |  |  |
| `def` header/body | ✓ | possible sugar | ✓ | Definition | checks type/value | ✓ |  |
| `function` / `const` alias | ✓ | **✓ built-in** | receives expanded `def` when alias dispatch is reached; source CST/quotations may still observe alias syntax | Definition | no alias concept | same as `def` after expansion | no JS alias semantics |
| Pi / `forall` | ✓ | notation aliases | ✓ |  | **Pi/forallE** | erasure/closure conversion later |  |
| lambda | ✓ |  | ✓ |  | **Lam** | ✓ | closure |
| multi-argument call | ✓ | structural syntax | ✓ to nested `App` |  | **App** unary | ✓ | call ABI later |
| `let` | ✓ | rich forms | ✓ | local | **letE** | ✓ |  |
| `have` | ✓ |  | ✓ nondependent/opaque local handling | local | represented through elaborated local/core machinery | erased if proof |  |
| `match` | ✓ | pattern macros | **✓ matcher compilation** | helper decls | no `match` Expr primitive | compiler can consume pre-definition |  |
| structural recursion | ✓ |  | **✓ recursion elaboration** | defs + equations | recursors/checks result | pre-definition compiled |  |
| well-founded recursion | ✓ |  | **✓ proof construction** | defs + equations | checks resulting terms | pre-definition compiled |  |
| `partial` | ✓ |  | ✓ | partial definition | logically opaque treatment | compiled | executable recursion |
| `partial_fixpoint` | ✓ |  | ✓ fixed-point proof | defs + generated equations | checks justification | pre-definition compiled |  |
| inductive/coinductive fixpoints | ✓ |  | ✓ monotonicity/fixpoint construction | defs + principles | checks constructed terms | as applicable | order-theory library machinery |
| `inductive` | ✓ |  | ✓ header/preprocessing | Inductive declaration | **checks inductive declaration / creates core recursor info** | compiler representation | data runtime |
| `structure` | ✓ | syntax sugar over specialized inductive frontend | ✓ | inductive + projection metadata | inductive/recursor rules | optimized representation | data runtime |
| `class` | ✓ | structure-like sugar | ✓ | class metadata + inductive/structure declarations | ordinary checked terms/inductive |  | instance synthesis is elaborator machinery |
| `instance` | ✓ |  | ✓ | definition + instance extension | checks declaration |  | synthesis is compile-time search |
| coercion | syntax trigger |  | **✓ inserts term using CoeT machinery** | class instances | checks inserted term |  | library classes |
| `if` / `dite` | ✓ | notation | ✓ |  | ordinary constants/apps | optimized | `Decidable`/`ite` library |
| `bif` | ✓ | notation/macro inline | ✓ |  | ordinary constants/apps | optimized | `cond` / `Bool` |
| `do` | ✓ | local rewrites/macros | **✓ effect transformations** |  | no `do` primitive | compiled transformed/predef code | Monad/ForIn library classes |
| tactics / `by` | ✓ | extensible tactic macros | **✓ produces term** | may use env | checks produced term only |  | tactic library |
| attributes | ✓ | attr syntax | handler execution | **environment extensions** | only resulting declarations matter | may influence compiler | extensible framework |
| syntax declarations | **✓ mutate parser tables** |  | command elaborator | parser/env extensions |  |  |  |
| macros | ✓ | **✓** | expansion interleaved | macro table |  |  |  |
| elaborators | ✓ |  | **✓** | elaborator table | outputs checked |  |  |
| namespaces/sections | ✓ |  | command elaboration | scope/name state |  |  |  |
| imports/module exposure | header parser |  | module loading | public/private/meta env | affects available constants/bodies | dependency/code loading | module init |
| `initialize` | ✓ |  | command elaboration | initializer tables + optional declaration | declaration checked as relevant | ✓ | **IO initialization** |
| FFI attributes | ✓ |  | attr/elab validation | compiler metadata | logical declaration remains Lean term | **✓** | foreign ABI |

---

## Declaration model: source spelling vs semantic declaration

Lean's kernel-level declaration datatype distinguishes `Axiom`, `Definition`, `Theorem`, `Opaque`, `Quot`, `MutualDefinition`, and `Inductive`; constructor and recursor information are subsequently represented in the environment. It does **not** have JavaScript-style `FunctionDeclaration` or `ConstDeclaration` categories. [`src/Lean/Declaration.lean`](https://github.com/leanprover/lean4/blob/master/src/Lean/Declaration.lean) [kernel declaration kinds](https://github.com/leanprover/lean4/blob/master/src/Lean/Declaration.lean)

| Source syntax | Canonical? | Alias? | Semantic/environment effect | Reducibility / reasoning | Compiler behavior | Trust implication |
|---|:---:|:---:|---|---|---|---|
| `def` | ✓ | no | Definition (or mutual definition after recursion elaboration where applicable) | semireducible by default | compiled when computable/safe | kernel checks logical form |
| `function` | no | built-in macro | **exactly corresponding `def`** | exactly corresponding `def` | exactly corresponding `def` | adds no trust power |
| `const` | no | built-in macro | **exactly corresponding binderless `def`** | exactly corresponding `def` | exactly corresponding `def` | adds no trust power |
| `theorem` | ✓ | no | Theorem | irreducible/opaque for ordinary reduction | proof erased | kernel checks proof term |
| `opaque` | ✓ | no | Opaque | body unavailable to ordinary delta reduction | body may compile / `implemented_by` may redirect | kernel checks witness when provided |
| `abbrev` | ✓ | no | definition-like declaration with reducible behavior | aggressively reducible | compiles as applicable | kernel checks |
| `axiom` / `constant` forms | ✓ | no | Axiom | no body | generally cannot compute unless proof-only use or runtime replacement pattern | enlarges assumptions |
| `inductive` | ✓ | no | Inductive | recursor computation rules | data representation compiled | kernel inductive checker is trusted |
| `structure` | ✓ | no | specialized frontend to inductive/metadata | projections / eta rules | optimized representation possible | kernel checks induced declaration |
| `class` | ✓ | no | structure/inductive + class registry | ordinary underlying terms |  | synthesis machinery outside kernel |
| `instance` | ✓ | no | definition-like declaration + instance registry | based on underlying declaration |  | search outside kernel; term checked |
| `partial def` | ✓ | no | partial definition representation/logically opaque | no equational reasoning from body | recursive program compiled | requires inhabited/nonempty codomain constraints as Lean specifies |
| `unsafe def` | ✓ | no | unsafe definition | unavailable to safe logical reasoning | compiled | outside logical sound subset; unsafe is contagious |
| `partial_fixpoint` clause | ✓ | no | justified definition + generated equations | propositional equations, not ordinary definitional reduction | original program compiled | justification checked |
| `inductive_fixpoint` | ✓ | no | least `Prop` fixpoint construction | generated equations/induction principle | as applicable | monotonicity justification checked |
| `coinductive_fixpoint` | ✓ | no | greatest `Prop` fixpoint construction | generated equations/coinduction principle | as applicable | monotonicity justification checked |
| `coinductive` | ✓ | no | declarative frontend for coinductive predicate | coinduction reasoning | as applicable | elaborates through fixpoint theory |
| `initialize` | ✓ | no | module initialization registration, optionally named value | not a new kernel declaration category by itself | initialization code compiled/interpreted | execution trust separate |

**Normative alias rule:** `function` and `const` are part of the ergonomic source grammar but are implemented as built-in command macros. A macro expansion from either alias to `def` occurs before ordinary declaration elaboration. Macro/CST tooling can still inspect the original source node and expansion trace. [Elaboration and Compilation](https://lean-lang.org/doc/reference/latest/Elaboration-and-Compilation/) [Defining New Syntax / `Syntax` representation](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Defining-New-Syntax/) [Hygienic Macros](https://lean-lang.org/doc/reference/latest/Notations-and-Macros/Macros/)

---

# Appendix C. Lean-to-ProofScript Surface Map

| Lean concept | Canonical ProofScript | Status | Semantic rule |
|---|---|---|---|
| `def f (x : A) : B := t` | `def f(x: A): B := { t }` | structural sugar | same `def` declaration after body lowering |
| binderless `def x : A := t` | `def x: A := { t }` | structural sugar | no empty `()` parameter list |
| `fun (x : A) => t` | `fun (x: A) => t` | unchanged concept | optional arrow-lambda alias may expand to `fun` |
| `f x y` | `f(x, y)` | structural sugar | one source application group; preserve elaboration grouping |
| `(f x) y` | `f(x)(y)` | structural sugar | two application groups |
| `let x := v; body` | `let x := v; body` | retained | `let`, not TypeScript `const`, is canonical local binding |
| `let mut x := v` in `do` | same | retained | mutation remains `do`-specific |
| `match ... with | ...` | `match (...) { | ... }` | structural sugar | canonical `|`; no branch terminator |
| `namespace N ... end N` | `namespace N { ... }` | structural sugar | same namespace state |
| `section ... end` | `section { ... }` | structural sugar | same section state |
| structure instance `{ x := v }` | same inner structure syntax | unchanged concept | no JS object literal semantics |
| `theorem`, `opaque`, `axiom`, `abbrev`, `example` | same keywords | unchanged | preserve declaration distinctions |
| `function` | optional alias for simple `def` | ProofScript alias | no new semantic declaration kind |
| `const` (top-level) | optional alias for simple `def` | ProofScript alias | never canonical local binding |
| `=` | `=` | retained | propositional equality |
| `==` | `==` | retained | Boolean equality via `BEq` |
| `:=` | `:=` | retained | value/definition/field provision, category-sensitive |
| `by` | `by { ... }` | structural sugar | same tactic term |
| `do` | `do { ... }` | structural sugar | same `do` embedded language |
| `--`, `/- -/` | same | retained | nested Lean block comments; no `//` alias |
| `@[attr]` | same | retained | Lean attributes, not TS decorators |

---

# Appendix D. Grammar and Parser Requirements

This appendix contains the bootstrap grammar and normalization constraints required to implement the canonical surface. It is subordinate to the semantic rules in Chapters 1–24: grammar sugar may reshape Lean syntax but may not introduce incompatible semantics.

## Bootstrap grammar principles

The full grammar is dynamic. This fragment defines the repaired basic call, binder and match slice; it is not a complete parser, precedence specification or catalog of Lean binders. Section 2.2 and the category-ownership rules in this appendix govern parsing and quotation boundaries. Advanced forms need dedicated productions and versioned conformance cases.

```text
sourceFile       ::= moduleHeader? importHeader* command*
command          ::= defDeclaration
                  | functionAliasDeclaration
                  | constAliasDeclaration
                  | otherBuiltInCommand
                  | registeredCustomCommand

-- Canonical `def` has distinct body-specific productions. This prevents a
-- generic tail from being attached to body forms that Lean does not permit.
defDeclaration   ::= defRhsDeclaration
                   | defEquationDeclaration
                   | defStructWhereDeclaration

-- Lean's simple and equation forms admit their documented termination suffix
-- before an optional local `where` declaration section.
defRhsDeclaration ::= modifiers? "def" declId binder* resultType?
                      ":=" defBodyBlock terminationSuffix? localWhereSection? defDeriving? terminator?

defEquationDeclaration ::= modifiers? "def" declId binder* resultType?
                           defEquationBody terminationSuffix? localWhereSection? defDeriving? terminator?

-- The third Lean `def` value form is specifically structure-field initialization.
-- It may be followed by the separate local helper `where` section, but it does
-- not inherit the simple/equation termination suffix.
defStructWhereDeclaration ::= modifiers? "def" declId binder* resultType?
                              defStructWhereBody localWhereSection? defDeriving? terminator?

-- `function` and `const` are deliberately narrower command aliases. They have
-- only the mandatory braced `:=` body form and then expand to the corresponding
-- RHS `def` command before ordinary declaration elaboration. They do not create
-- equation-body or structure-field-`where` alias value grammars.
functionAliasDeclaration ::= modifiers? "function" declId binder+ resultType?
                             ":=" defBodyBlock aliasRhsTail? defDeriving? terminator?

constAliasDeclaration ::= modifiers? "const" declId resultType?
                          ":=" defBodyBlock aliasRhsTail? defDeriving? terminator?

-- `terminator?` records parser-level compatibility acceptance, not canonical
-- formatting. With no following tail, canonical brace-bodied output ends at `}`
-- and emits no declaration-level semicolon. Tail-bearing declarations follow
-- the selected tail/declaration termination grammar.

-- For the standard `:=` form, the body braces are mandatory and are owned
-- by the declaration grammar. The ordinary term parser begins inside them.
defBodyBlock     ::= "{" defBodySequence "}"

defBodySequence  ::= defBodyPrelude* defBodyFinal

-- The literal semicolon is owned by defBodyBlock sequencing. There is no ASI.
defBodyPrelude   ::= localLetPrefix ";"
                  | localHavePrefix ";"
                  | verificationAssertPrefix ";"

-- IMPORTANT ordered-dispatch rule (not expressible in plain EBNF alone):
-- at the immediate defBodySequence level, before parsing defBodyFinal, the
-- parser first tests for a supported standard prelude form. If one matches,
-- it commits to defBodyPrelude and MUST consume its trailing literal `;`.
-- Failure to find that `;` is an error; there is no fallback that reparses the
-- same source as an ordinary continuation-bearing `let`/`have` final term.
-- Only when no top-level prelude form matches is one ordinary term parsed as
-- defBodyFinal, after which the parser requires the body-closing `}`.

-- `localLetPrefix` is a body-specific *head* production that mirrors the
-- supported term-level `let` family from the `let`/`have` rules in Chapters 7 and 13 (including supported `let rec`,
-- pattern/anaphoric forms and their options) up to, but not including, the
-- continuation. It MUST NOT invoke the ordinary full continuation-bearing
-- `let` term parser and then split the result after parsing. The remainder of
-- defBodySequence supplies the continuation after the mandatory outer `;`.
-- `localHavePrefix` analogously mirrors only the head of ProofScript `have`.
-- Nested terms inside a binding value/type/proof are parsed normally and keep
-- their own category-local separators.
-- `verificationAssertPrefix` exists only when the verification extension is enabled and expands
-- to an ordinary proof binding before continuation construction.

defBodyFinal     ::= term

-- `defBodyFinal` is the value of `defBodyBlock`. A semicolon token immediately
-- following the completed final term at def-body level is a syntax error.
-- Nested terms may contain semicolons only according to their own categories.
-- `return e;` is not a DefDecl-body statement production. Lean nevertheless
-- has an ordinary term-level `termReturn` outside explicit `do`; as a final body
-- term it appears without a body-level trailing `;`. Inside `doSeq`, `doReturn`
-- is a distinct do-element parser with early-return semantics.

-- Upstream `Termination.suffix` is nullable because both of its components are
-- optional. ProofScript names only the NONEMPTY wrapper here; the `?` at each use site
-- is the sole representation of absence. The production MUST consume at least one
-- termination/fixpoint/decreasing token sequence accepted by the pinned grammar.
terminationSuffix ::= nonemptyTerminationSuffixAcceptedBySelectedLeanDefGrammar

-- Alias tail is itself nonempty, avoiding `optional(nullable)` ambiguity.
aliasRhsTail       ::= terminationSuffix localWhereSection?
                     | localWhereSection
defDeriving        ::= derivingClauseAcceptedBySelectedLeanDefGrammar

-- The local helper layer is separate from all three value forms. Upstream
-- `whereDecls` is specifically a semicolon-separated sequence of `letRecDecl`,
-- not an arbitrary nested-command list. Each helper may carry its own nonempty
-- termination suffix through the `letRecDecl` grammar. A trailing separator is
-- accepted because upstream `whereDecls` allows one. `finally` belongs here.
localWhereSection  ::= "where" "{" localWhereDeclList? "}" finallySection?
localWhereDeclList ::= localWhereDecl (";" localWhereDecl)* ";"?
localWhereDecl      ::= localDocComment? localAttributes? localLetDecl localTerminationSuffix?
localLetDecl        ::= letDeclAcceptedBySelectedLeanWhereGrammar
localTerminationSuffix ::= nonemptyTerminationSuffixAcceptedBySelectedLeanLetRecGrammar
finallySection      ::= "finally" "{" tacticSeq? whereFinallySubsection* "}"
whereFinallySubsection ::= "|" identifier "=>" tacticSeq

-- The structure-field value form mirrors Lean's `whereStructInst`. ProofScript uses
-- a braced, comma-separated field-provision surface consistent with structure
-- instance values; each field remains an ordinary Lean structInstField concept.
defEquationBody    ::= equationBodyAcceptedBySelectedLeanDefGrammar
defStructWhereBody ::= "where" "{" (structWhereField ("," structWhereField)* ","?)? "}"
structWhereField    ::= structInstFieldAcceptedBySelectedLeanGrammar

otherBuiltInCommand ::= theoremDeclaration
                     | opaqueDeclaration
                     | abbrevDeclaration
                     | axiomDeclaration
                     | inductiveDeclaration
                     | structureDeclaration
                     | classDeclaration
                     | instanceDeclaration
                     | mutualDeclaration
                     | otherLeanCommand

resultType       ::= ":" term

binder           ::= "(" explicitEntry ("," explicitEntry)* ","? ")"
                  | leanGroupedExplicitBinder
                  | "{" implicitEntries "}"
                  | "⦃" strictImplicitEntries "⦄"
                  | "[" instanceBinder "]"
                  | otherLeanBinderProduction
explicitEntry    ::= binderName ":" term default?
default          ::= ":=" term

application      ::= applicationHead "(" argument ("," argument)* ","? ")"
applicationHead  ::= atomicOrPostfixTerm | "@" explicitApplicationHead
argument         ::= term | identifier ":=" term
lambda           ::= "fun" nonemptyLambdaBinderList ("=>" | "↦") term
patternLambda    ::= "fun" matchCase+
piType           ::= term "→" term
forallTerm       ::= "∀" nonemptyBinderList "," term
existsTerm       ::= "∃" nonemptyBinderList "," term
matchTerm        ::= "match" matchOptions? "(" discriminant ("," discriminant)* ")"
                    "{" matchCase* "}"
discriminant     ::= term | identifier ":" term
patternSequence  ::= pattern ("," pattern)*
matchCase        ::= "|" patternSequence ("|" patternSequence)* "=>" term

-- When `match` occurs as a `doElem`, its RHS category changes from `term` to
-- `doSeq`, matching Lean's `doMatchAlts := matchAlts (rhsParser := doSeq)`.
doMatchElem      ::= "match" doMatchOptions? "(" discriminant ("," discriminant)* ")"
                    "{" doMatchCase* "}"
doMatchCase      ::= "|" patternSequence ("|" patternSequence)* "=>" doBranchSeq
doBranchSeq      ::= doSeqAcceptedByProofScriptDoGrammar

-- Lean also has `termReturn` outside explicit `do`. Same-line term presence is
-- significant in the pinned grammar; absence denotes the bare return form.
termReturn       ::= "return" sameLineTerm?
```

**Contextual match-boundary rule:** the match parser owns top-level `|` only at its own alternative boundary; nested term/custom categories consume their own tokens first. Before the current alternative's single `=>` has been consumed, a top-level `|` introduces another `patternSequence` belonging to that same alternative. After `=>`, the parser consumes exactly one RHS `term` using the ordinary dynamic term grammar; only when that term parser returns does a following top-level `|` begin the next alternative, while `}` closes the match. There is no `branchTerminator` production. A `;` or `,` after the completed RHS at match level is a syntax error; punctuation nested inside the RHS remains owned by its nested category. Pattern-matching functions reuse the same ordinary-term alternative structure after canonical `fun`. When `match` is parsed as a `doElem`, the same LHS/pattern-sequence structure is retained but the RHS parser is `doSeq`; match-level `|`/`}` boundaries are recognized only after that do-sequence parser returns.

Imports remain in the module-header grammar rather than becoming arbitrary nested commands. The fragment does not authorize empty calls, compact standard DefDecl-family `:= term` bodies, JavaScript automatic semicolon insertion, general JS statements inside definition blocks, JavaScript-style function-return statements (while preserving Lean `termReturn` and `doReturn`), built-in `case` aliases for alternatives, branch-level `;`/`,` terminators, or all combinations of declaration tails. Within `defBodyBlock`, each intermediate prelude has a mandatory literal `;`, while the final term is the block value and has no body-level trailing `;`. The mandatory outer brace after a standard DefDecl-family `:=` is consumed by `defBodyBlock`; any brace that starts the final term is therefore nested and belongs to the ordinary term grammar. Structure-instance fields, `do` elements, tactic syntax, match branches, declarations, and custom brace forms keep their own separators and do not inherit the def-body rule. Commas inside a nested term are owned by that term. Expression, tactic, `do`, quotation and custom-category parsers retain their distinct boundaries. Macro and command elaboration update parser state incrementally.

---

## Built-in alias macro rules

Normatively:

```text
macro command:
  function f binders :? T? := { body } tail?
    ↦ def f binders :? T? := { body } tail?

macro command:
  const x :? T? := { body } tail?
    ↦ def x :? T? := { body } tail?

The alias productions do not accept equation-clause or structure-field-`where` value forms.
Because they expand to the simple braced `:=` form, only the termination suffix, local `where`
declaration section, and `deriving` material accepted after that expanded simple `def` may follow.

category-specific def-body lowering:
  def f binders :? T? := { finalTerm }
    ↦ def f binders :? T? := finalTerm

  def f binders :? T? := { letPrefix ; rest }
    ↦ def f binders :? T? :=
        corresponding ordinary Lean-compatible let term
        whose continuation is lowerDefBody({ rest })

  def f binders :? T? := { havePrefix ; rest }
    ↦ analogous ordinary have/continuation term

  def f binders :? T? := { assertPrefix ; rest }
    ↦ expand `assert` per Appendix A `assert` rules, then continue with the resulting proof binding

The alias and body rules are invoked only when their registered syntax is reached
by normal interleaved macro/elaboration dispatch. They do not descend into
quotations, raw syntax, or unrelated custom categories.

term/syntax aliases:
  (binders) => body        ↦ fun (binders) => body
  A -> B                   ↦ A → B
  forall binders, body     ↦ ∀ binders, body
  exists binders, body     ↦ ∃ binders, body
  x <- action              ↦ x ← action
  do<- body                ↦ do← body
```

There is deliberately no built-in `case ... =>` alias for `| ... =>`, and no JavaScript-style function-return alias. `case` remains a Lean tactic-category keyword. `return` preserves Lean's own two relevant parser roles: `doReturn` in `doSeq` and `termReturn` in ordinary term syntax.

`const` is intentionally restricted to the binderless declaration shape. A function-valued binderless definition is still allowed:

```ts
const inc: Nat -> Nat := {
  (n: Nat) => n + 1
}
```

because the alias classifies the **source declaration shape**, not the semantic type of the value. The `->` and arrow-only lambda shown here are likewise optional aliases; canonical formatting emits `→` and `fun`.

## Core application normalization

First elaborate the source application group under the function-application rules in Chapter 13. After implicit/named/default/automatic argument processing has produced the explicit core argument sequence `a1 ... an`, construct:

```text
foldl App elaboratedHead [a1, ..., an]
```

The familiar `App(App(f,x),y)` shape is only the case where the final sequence is exactly `[x,y]`. No uncurried kernel application is introduced. Empty source calls are rejected; a bare identifier is not an empty call.

## Structural block correspondences

```text
namespace N { commands }
  ≃ namespace N; commands; end N

section S { commands }
  ≃ section S; commands; end S

match (x) { | p => e | q => f }
  ≃ Lean match x with | p => e | q => f

do { doElements }
  ≃ Lean do doElements

def f(...): T := { e }
  ≃ Lean def f ... : T := e

def f(...): T := { let x := a; b }
  ≃ Lean def f ... : T :=
      let x := a
      b

def p: Point := { { x := 0, y := 0 } }
  ≃ Lean def p : Point := { x := 0, y := 0 }

def io: IO(Unit) := { do { IO.println("x"); } }
  ≃ Lean def io : IO Unit := do IO.println "x" 
```

The definition-body correspondences preserve the same expected type, telescope, recursion/termination context, safety/transparency phase, and declaration kind. The outer braces are consumed before ordinary term elaboration; nested structure/`do`/`by`/custom terms retain their own syntax. No JavaScript function-return or statement-completion semantics are introduced; Lean `termReturn` remains an ordinary term when selected by the term parser.

These are semantic correspondences, not a requirement that an implementation literally emit Lean source.

---

# Appendix E. Conformance Acceptance-Test Profile

This appendix is normative for claims that a ProofScript implementation conforms to the reference.

## E.1 Fixture classes

A conformance corpus SHOULD separate:

```text
tests/conformance/positive/
tests/conformance/negative/
tests/differential/lean/
tests/differential/proofscript/
tests/security/
```

A **positive** fixture must parse, elaborate, and reach the expected accepted declaration/environment observation. A **negative** fixture must fail for the specified semantic reason rather than merely crash or time out. Differential fixtures compare a ProofScript source form with its intended Lean counterpart under an explicit observation profile.

## E.2 Required high-risk fixtures

The corpus MUST cover at least:

- `def` simple bodies, equation clauses, structure-field `where`, local `where`, `finally`, termination/decreasing suffixes, and deriving placement;
- `function`/`const` alias expansion and quotation observability;
- application grouping, named arguments, implicit/strict-implicit/instance/default/automatic arguments, tuple-vs-multiple arguments, and rejection of `f()`;
- all four binder classes and dependent comma-separated binders;
- structure instances/updates and the absence of JavaScript object semantics;
- ordinary `match`, multiple discriminants, multiple pattern sequences, dependent matching, and `do match` RHS sequencing;
- term-level `return` versus `do` early return;
- `let`, `have`, `let rec`, `let mut`, assignment, `break`, `continue`, loops, and effect forwarding;
- typeclass priorities, output parameters, default instances, coercions to types/sorts/functions;
- quotations, antiquotations, macros, dynamic syntax registration, and elaborator dispatch;
- `opaque` with and without a right-hand side;
- `simp`, `grind`, and `mvcgen` smoke/conformance cases applicable to the pinned baseline;
- pure contracts, named contracts, monadic model descriptors, `old`, loop invariants, the pure/local `assert` alias, and category isolation from Lean-native `do` assertion forms;
- strict axiom/dependency checking and malformed-environment security cases.

## E.3 Result taxonomy

A runner MUST distinguish at least:

```text
accepted
rejected
unsupported
resource_exhausted
implementation_error
```

Only `accepted` and semantic `rejected` outcomes can be used as direct semantic conformance evidence. A timeout, missing feature, crash, or checker failure is inconclusive rather than a valid rejection.

## E.4 Baseline manifest

Every published conformance result MUST bind:

- ProofScript reference revision;
- Lean toolchain version and source revision;
- ProofScript implementation revision;
- parser-extension/import set;
- standard-library revision;
- semantic options;
- checker configuration;
- test-corpus revision;
- backend/runtime revision when execution correspondence is claimed.

A moving `latest`, `stable`, or repository `master` identifier is insufficient as the sole baseline identifier.

---

# Editorial Sources

The chapter structure and semantic coverage were compared against the official Lean Language Reference at <https://lean-lang.org/doc/reference/latest/> and the official release index on 6 September 2026. Because `/latest/` is a moving deployment target, its displayed version is not normative for ProofScript. ProofScript v0.1 remains pinned to Lean 4.33.1; later-only behavior is **TRACKING** until an explicit baseline upgrade.


This reference is a ProofScript specification, not a reproduction of the Lean manual. Its structure and Lean-semantic descriptions are aligned to the official Lean Language Reference and the audited source specification used as the revision source.

Primary upstream navigation: <https://lean-lang.org/doc/reference/latest/>  
Stable ProofScript semantic target: Lean 4.33.1  
Tracked upstream documentation version at revision time: Lean 4.34.0-rc2
