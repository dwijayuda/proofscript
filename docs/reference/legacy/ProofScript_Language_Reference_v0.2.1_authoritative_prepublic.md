# The ProofScript Language Reference

**Semantically faithful, TypeScript-oriented Lean 4**  
**Reference:** v0.2.1-prepublic-review-4  
**Language compatibility target:** Lean 4.33.1 stable semantics  
**Pinned Lean source revision:** `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`  
**Reference-structure baseline:** current Lean Language Reference (https://lean-lang.org/doc/reference/latest/)  
**Date:** 10 September 2026

> **Normative identity.** ProofScript expresses Lean 4 language concepts, logical semantics, elaboration behavior, proof mechanisms, metaprogramming model, programming model, and trust boundaries through a TypeScript-oriented concrete syntax. The governing rule is: **change the shape, never the concept**.
>
> **Version rule.** The ProofScript v0.2.x semantic line is semantically pinned to Lean 4.33.1. The moving `/latest/` Lean Language Reference and Lean `master` are used for navigation and forward tracking only; they MUST NOT silently redefine the ProofScript baseline. A conformance release MUST pin the exact Lean toolchain/source revision and classify post-baseline material as **TRACKING** until an explicit baseline upgrade.
>
> **Canonical-token rule.** When Lean has an explicit concept-introducing token or operator, ProofScript retains it canonically unless a purely structural delimiter/layout replacement is sufficient. TypeScript-oriented aliases are optional syntax, never new semantic categories.
>
> **v0.2 zero-extension rule.** Standard `.ps` introduces **no ProofScript-specific verification-language semantics**. ProofScript may reshape the concrete presentation of concepts that exist in the pinned Lean baseline, but it MUST NOT add a parallel contract, ghost-state, pre-state, invariant, effect, ownership, or proof system. Historical experimental spellings such as `contract`, ProofScript-owned `requires`/`ensures`, `satisfies`, `ghost`, pre-state `old`, and a ProofScript-owned `invariant` clause have no standard ProofScript meaning in the v0.2.x semantic line.
>
> **Semantic-containment invariant.** Every standard ProofScript semantic concept MUST correspond to a concept in the pinned Lean baseline. Structural aliases/sugar may change shape, grouping delimiters, or layout only when their normalization is deterministic and preserves the relevant Lean parsing/elaboration/kernel observations claimed by the conformance profile.
>
> **v0.2.1 pre-public evidence status.** This revision is a semantic/presentation cleanup of the v0.2 reference, not a Lean-baseline upgrade. Lean remains pinned to 4.33.1 / `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`. The built-in production inventory and precedence inventory are treated as closed evidence inputs under their recorded boundaries; standalone implementation conformance remains a separate C3/C7 property.

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

Cross-cutting ProofScript material is isolated in appendices: [Verification in ProofScript](#appendix-a-verification-in-proofscript-zero-extension-policy), [Conformance and Trust](#appendix-b-conformance-and-trust), [Lean-to-ProofScript Surface Map](#appendix-c-lean-to-proofscript-surface-map), [Grammar](#appendix-d-grammar-and-parser-requirements), and [Conformance Acceptance Tests](#appendix-e-conformance-acceptance-test-profile).

---

# 1. Introduction

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/Introduction/](https://lean-lang.org/doc/reference/latest/Introduction/)

ProofScript is both a dependently typed programming language and a theorem-proving language because its semantic target is Lean 4. Its purpose is not to reinterpret Lean using TypeScript semantics. Instead, it presents Lean concepts in a syntax that is friendlier to TypeScript-oriented programmers while preserving the distinctions that matter to elaboration, kernel checking, metaprogramming, and execution.

## 1.1 History

ProofScript began as a research specification for expressing Lean 4 faithfully through a TypeScript-oriented surface. The v0.1 reference revision separates the stable language reference from the earlier audit/research narrative and adopts the official Lean reference's conceptual organization.

## 1.2 Typographical Conventions

- `ts` fenced blocks show ProofScript source or source fragments using the canonical surface for the construct being illustrated.
- `lean` fenced blocks show corresponding Lean 4 source when useful.
- `text` fenced blocks are grammar fragments, schemas, pseudocode, or explicitly schematic source and are **not** source acceptance-test claims.
- A `ts` or `lean` example without a **Schematic** label is a conformance-test candidate, but its expected result is part of the example metadata: the default is **accepted**; an explicitly labeled **Negative example** / **Expected rejection** must be rejected in the stated phase; an explicitly labeled **Separate fixtures** block denotes alternatives that MUST be tested in isolated fixture environments rather than concatenated as one module.
- A source example may require an explicit fixture context (imports, prior declarations, section/namespace scope, universe declarations, or a category wrapper). The context MUST be recorded by the executable reference harness; missing context is not a semantic rejection.
- A prose label such as **Conceptually** does not weaken the syntax contract of a `ts` fence: if an example is intentionally schematic, pseudocode, or Lean-shaped rather than canonical ProofScript, it MUST use a `text` fence and/or an explicit **Schematic** label.
- **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are normative terms.
- “Lean-native” means the construct has Lean semantics and is preserved directly or through structural surface sugar.
- “ProofScript structural sugar” means ProofScript-owned concrete presentation whose complete meaning is a deterministic presentation of an existing pinned-Lean concept and adds no semantic category.

## 1.3 How to Cite This Work

When citing this revision, identify it as *The ProofScript Language Reference*, v0.2, and include the semantic compatibility target Lean 4.33.1 and pinned source revision `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`. the v0.2.x line is the zero-extension semantic baseline: it removes the experimental ProofScript-owned verification layer while preserving the pinned Lean semantic target.

## 1.4 Versioning and Compatibility

ProofScript v0.2 targets Lean 4.33.1 stable semantics. The reference layout follows the current Lean manual for navigational parity. A future baseline upgrade requires an explicit compatibility revision; a moving `latest` documentation URL never silently changes ProofScript semantics.

### Baseline evidence policy

For a conformance claim, the normative baseline is the pinned Lean 4.33.1 toolchain/source revision recorded in the release manifest. Official `/latest/` pages are explanatory and tracking evidence; current `master` source is never silently substituted for the pinned parser/elaborator. When current upstream behavior differs from or postdates 4.33.1, this reference labels it **TRACKING** until an explicit ProofScript baseline revision.

### Security precedence over historical compatibility

If a pinned upstream baseline is later shown to admit a declaration or artifact through a **confirmed soundness or trusted-checker-integrity bug**, ProofScript MUST NOT intentionally reproduce that acceptance merely to preserve historical parity. A security exception may only **strengthen validation or rejection** for the affected vector; it MUST NOT be used to accept something the pinned baseline rejects, silently change an unaffected construct's meaning, or broaden the trusted base.

Every such exception MUST be explicit in the release manifest under a `securityExceptions` list and record, when known: the affected Lean baseline, upstream issue/CVE/advisory identity, affected conformance vector, fix provenance, ProofScript checker behavior, and whether exact historical L0 acceptance parity is intentionally waived for that vector. Until an adequate fix is available, strict profiles MUST reject or report the affected artifact as a security/unsupported outcome rather than accept it. This rule has precedence over exact historical-acceptance compatibility only for the documented security vector.

This v0.2.x revision line inherits the executable-reference discipline established during the v0.1 audit line: examples are conformance-test candidates with an explicit expected outcome and fixture context. A production conformance release MUST report their executed status against the pinned Lean 4.33.1 baseline and the selected ProofScript implementation profile.

### Upstream-first semantic policy

For any proposed language-level feature `F`:

```text
if F exists in the pinned Lean baseline:
    ProofScript may expose F faithfully

if F exists only in a later Lean release, release candidate, or master:
    F is TRACKING only

if F is absent from the pinned Lean baseline:
    standard ProofScript does not invent F
```

A future stable Lean release may therefore add concepts to a future ProofScript baseline, but adoption requires an explicit baseline upgrade and delta audit. Merely reserving a word in anticipation is forbidden when no pinned-Lean grammar production requires it.

### Compatibility revisions and syntax stability

Within a published v0.2.x compatibility line, patch revisions may repair or complete concrete syntax without changing the language's Lean-equivalent meaning. A patch revision MAY clarify separators, delimiters, precedence declarations, grammar factoring, formatter output, parser recovery, or an example whose spelling conflicts with an already normative rule. A patch revision MUST NOT make an already-valid canonical program elaborate to a different Lean-compatible meaning. Such a change requires an explicit semantic compatibility revision.

Every source-syntax family tracked during implementation SHOULD carry one of these statuses:

| Status | Meaning | Implementation rule |
|---|---|---|
| **STABLE** | Canonical spelling and semantic correspondence are fixed for the current semantic line. | Compiler, formatter, reference, and conformance tests must agree; incompatible changes require a compatibility revision. |
| **PROVISIONAL** | Lean-equivalent meaning is fixed, but concrete grammar details are still being completed or mechanically validated. | Implement conservatively; any clarification must update grammar, examples, and tests together. |
| **TRACKING** | Upstream Lean behavior postdates the pinned baseline or is being evaluated for a future baseline. | Must not silently affect v0.2.x acceptance or semantics. |
| **DEFERRED** | The feature lacks a complete admissible semantic/grammar contract for standard ProofScript. | Reject as unsupported in conforming profiles; do not guess. |

A syntax change is not complete until the language reference, bootstrap/executable grammar, canonical formatter expectation, positive fixtures, negative fixtures, and parser implementation agree. When they disagree, the pinned Lean semantic concept resolves meaning; no implementation artifact wins merely because it was written first.

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

**Retained-alias decision.** `function` and top-level binderless `const` remain standard ergonomic aliases because they materially lower the entry barrier for TypeScript-oriented users while their declaration position and strict expansion-to-`def` guarantee keep the semantic boundary explicit. This retention is deliberate and does not generalize to anonymous arrow functions, local `const`, JS return semantics, or other JavaScript function/binding behavior.

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
| lambda introducer | `fun` | `fun` | UNCHANGED; arrow-only lambda syntax is rejected |
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
  }
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

A pinned 4.33.1 conformance corpus MUST therefore include malicious/malformed environment declarations covering the documented 4.33 fixes. ProofScript MUST never intentionally reproduce an upstream soundness bug merely for historical compatibility; the **Security precedence over historical compatibility** rule governs any such conflict.

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
  }
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



## 2.11 Info Trees and interactive metadata

**Documentation status:** the processing/elaboration coverage is retained from the audited v0.1.x line; v0.2 removes only the ProofScript-owned verification-extension layer and keeps the Lean 4.33.1 semantic target.

Elaboration produces more than kernel-checkable declarations. Interactive tooling needs metadata that connects source syntax to elaborated meaning. ProofScript therefore preserves the Lean concept of **Info Trees**: side-table data associated with source syntax that may record elaborated core expressions, proof states and local/metavariable contexts, identifier-resolution/context information, macro-expansion information, and extensible custom information. Tooling can derive features such as completion, hover, navigation, interactive goals, and documentation display from Info Trees together with the environment and server/index data; those user-facing results are not all asserted to be stored literally as Info Tree payloads.

Info-tree data is **not part of the trusted kernel proof object**. A malformed or missing Info Tree can break editor behavior, diagnostics, navigation, or macro/tool observations without by itself changing which core declarations the kernel accepts. Nevertheless, Info Trees are part of the **frontend-observation contract** when ProofScript claims Lean-compatible interactive behavior.

A conforming implementation MUST therefore distinguish at least:

- source `Syntax` and its source ranges;
- synthetic syntax introduced by macros/elaborators;
- elaborated core terms/declarations;
- message/trace output;
- Info Tree entries used by interactive tooling;
- kernel-checked environment content.

When source-to-core conformance is compared under Appendix B, Info Trees are compared only under an explicitly declared tooling/metaprogramming observation profile. They are not globally erased as "irrelevant metadata," because macros, editors, code actions, and custom tooling may observe them.

## 2.12 Elaboration results and semantic snapshots

The result of processing a ProofScript command is not merely a Boolean success flag. For conformance work, implementations SHOULD be able to export a normalized semantic snapshot containing the applicable subset of:

```text
syntax kind / source correspondence
declaration name and kind
universe parameters
declaration type
value / predefinition / core expression when available
binder information
reducibility / opacity / safety
inductive and generated-declaration metadata
instance / attribute / environment-extension registrations
message and trace observations when selected
Info Tree observations when selected
dependency / axiom information
```

This snapshot is an **untrusted observation artifact** unless independently checked. Its purpose is to make ProofScript-vs-Lean differences auditable. A snapshot serializer MUST NOT become a hidden source of semantic equality by normalizing away differences that Appendix B says are observable.

## 2.13 `pp.match` and predefinition presentation

Lean's pretty printer can present elaborated matcher applications back through `match` notation. The `pp.match` option controls this presentation behavior. ProofScript preserves this distinction: pretty-printing a predefinition as source-like `match` syntax does not imply that pattern matching is a primitive kernel expression.

For differential conformance, tools SHOULD support both a source-oriented presentation and an internal/core-oriented presentation when practical. Toggling `pp.match` or an equivalent ProofScript inspection option is an observation-layer choice; it must not alter the checked declaration.

The exact option inventory and rendering behavior are versioned against the pinned Lean 4.33.1 baseline rather than inferred from a newer `/latest/` deployment.


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



## 3.9 `#guard_msgs` and message-expectation tests

`#guard_msgs` is a frontend/testing command for asserting that a command emits expected messages. It does **not** create a proposition and does not contribute an assumption to the logical environment.

ProofScript MUST preserve the conceptual distinction between messages selected for checking, messages dropped by the guard, messages allowed to pass through, comparison policy, and the enclosed command's own elaboration result.

The exact grammar and defaults are versioned against the pinned Lean 4.33.1 command grammar. A conformance harness SHOULD use `#guard_msgs`-style tests for diagnostics that are deliberately part of the selected observation profile, while avoiding brittle comparisons of unstable autogenerated names unless the corresponding pretty-printing options are fixed.

## 3.10 Formatted Output, `Std.Format`, and `Repr`

Lean-style human-readable output is not specified as ad-hoc JavaScript stringification. `Repr` produces a structured formatted representation, conventionally through `Std.Format`, and a renderer chooses line breaks and indentation subject to width and layout constraints.

ProofScript therefore preserves three separate concepts: a value's logical type and constructors; a `Repr`/formatting description used to display it; and the final rendered text observed by a user or test.

A TypeScript backend MAY implement compatible formatting with different internal objects, but `Repr(A)` is not identified with JavaScript `toString`, JSON serialization, or Node's inspection protocol. When formatted output is included in a conformance profile, line width, pretty-printer options, Unicode policy, and other rendering inputs MUST be recorded.

## 3.11 Diagnostic and presentation observation boundary

Diagnostics, traces, pretty-printed terms, formatted values, source positions, and Info Tree data are frontend/tooling observations rather than kernel truth. However, they can be intentionally tested and relied upon by metaprograms, editors, and regression suites.

ProofScript conformance therefore distinguishes logical acceptance/rejection, frontend elaboration result, diagnostic/message observations, pretty-printing observations, and runtime output observations. A mismatch in diagnostic wording MUST NOT be reported as kernel unsoundness; conversely, a compiler MUST NOT claim full interactive compatibility while discarding all diagnostic/Info Tree differences as semantically irrelevant.


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
inductive Option(A: Type u): Type u where {
  | none
  | some(value: A)
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
inductive Vector(A: Type u): Nat → Type u where {
  | nil: Vector(A, 0)

  | cons{n: Nat}(
    head: A,
    tail: Vector(A, n),
  ): Vector(A, n + 1)
}
```

The parameter/index distinction is semantic and must be retained.

### Canonical constructor boundaries

In the canonical brace-shaped `inductive` surface, each constructor entry begins with the Lean constructor marker `|`. A constructor entry ends when the enclosing constructor-signature parser returns and the parent parser sees the next top-level `|` or the closing `}`. Therefore canonical ProofScript does **not** write `;` after inductive constructors:

```ts
inductive Result(E: Type, A: Type): Type where {
  | error(error: E)
  | ok(value: A)
}
```

The `|` marker owns the constructor-entry boundary. This aligns constructors with match alternatives while keeping constructor declarations semantically distinct from pattern branches. Legacy semicolon-terminated constructor entries may be accepted only as a noncanonical migration form; the canonical formatter MUST remove those semicolons. Thus `match` alternatives likewise remain unterminated at branch level:

```ts
def unwrapOr(r: Result(String, Nat), fallback: Nat): Nat := {
  match (r) {
    | .error _ => fallback
    | .ok value => value
  }
}
```

This category ownership is normative: inductive constructor declarations use top-level `|`/`}` boundaries; `match` alternatives use their `| pattern => term` boundary and have no branch terminator. Neither category uses branch/constructor-level `;` as canonical punctuation.

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
inductive Color where {
  | red
  | green
  | blue
}
```

A parameter is uniform across constructors, while an index may vary and can carry information used by dependent elimination:

```ts
inductive Vec(A: Type): Nat → Type where {
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
inductive Direction where {
  | north
  | south
} deriving Repr, BEq
```

### Structures

Structures are inductive types with one constructor plus generated projections and update support.

```ts
structure Point where {
  x: Int;
  y: Int;
}

def origin: Point := { x := 0, y := 0 }
```

Structure extension preserves Lean's parent-field semantics rather than JavaScript prototype inheritance:

```ts
structure NamedPoint extends Point where {
  name: String;
}
```

## 4.11 Quotients and setoids

A `Setoid A` packages an equivalence relation on `A`. `Quotient` forms values modulo that relation. Functions out of a quotient must prove that their result respects the equivalence relation.

Conceptually:

```ts
structure ModRel(n: Nat) where {
  rel: Nat → Nat → Prop;
}
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



## 5.8 The Meta Phase

Lean modules distinguish information needed for ordinary program/proof elaboration from information needed for metaprogramming. ProofScript preserves the **meta phase** and the meanings of `meta` imports/declarations rather than compiling all imported material into one JavaScript module namespace.

Phase information is part of environment compatibility because it affects which declarations, syntax extensions, tactics, and compiled artifacts are available in which context. A TypeScript backend MAY place meta tooling in separate generated packages/bundles, but that packaging is an implementation decision and must preserve the source-visible phase rules.

## 5.9 Elaborated Modules

The semantic result of elaborating a module is an environment containing declarations plus relevant side tables and extension data. For module-system profiles, the environment additionally records public/private exposure and phase information.

A Lean-backed implementation may materialize `.olean`/`.ilean` artifacts. An independent ProofScript implementation may serialize another format, but a high-assurance serialized module MUST bind or preserve enough data to replay/check declaration kinds, universes, types/values where applicable, inductive/generated metadata, relevant attributes/instances/environment extensions, exposure/phase information, and dependency/baseline identity.

Serialized editor/server information may be stored separately from the logical environment. The distinction between checked environment data and source/editor indexing data MUST remain visible to certification tooling.

## 5.10 Module System Errors and Porting Patterns

Moving code into a stricter module visibility regime can expose accidental dependencies on private bodies, proofs, meta declarations, or non-exported environment extensions. Such failures are **environment/exposure errors**, not evidence that the underlying theorem became false.

ProofScript diagnostics SHOULD identify which declaration or environment fact is unavailable and which import/exposure boundary caused the failure. Tools MUST NOT repair the problem by silently making every imported implementation detail public.

Compatibility switches inherited from the pinned Lean baseline retain their exact scope and are conformance-visible when they affect whether a module is accepted.

## 5.11 Packages, Libraries, and Targets

A module name, a package, a library, and a build target are distinct concepts. ProofScript source-module semantics follow the Lean-compatible module model; package managers and build tools provide dependency discovery, artifact production, and distribution around that model.

```text
.ps source modules              language/module layer
Lean modules / .olean artifacts reference-oracle/checking layer
npm packages                    distribution mechanism
TypeScript/JavaScript outputs   executable backend artifacts
psc targets/profiles            build configuration
```

npm distribution does not redefine import visibility, kernel trust, or theorem dependencies. A package that claims verified logical content MUST bind its source/artifact hashes, ProofScript reference revision, Lean 4.33.1 toolchain/source identity, and axiom/dependency manifest as required by the certification profile.

## 5.12 Reproducible module identity

For conformance and certification, module identity must be reproducible. A build manifest SHOULD record the module import name, source hash, dependency/module hashes or locked revisions, parser-extension/import profile, standard-library revision, and semantic options that can affect elaboration.

Two source files that happen to emit the same JavaScript text are not thereby the same logical module. Module identity is determined by the checked environment and its declared dependency context, not by generated runtime code alone.


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

Canonical ProofScript may use an inline single-expression RHS or an explicit multi-step body block:

```ts
def answer: Nat := 42;

def add(a: Nat, b: Nat): Nat := a + b;

def shifted(n: Nat): Nat := {
  let doubled := n * 2;
  let shifted := doubled + 1;
  shifted
}
```

Concept: `def` adds a new defined constant to the environment. Parameters are elaborated into lambdas and the declaration type into Pi types. ProofScript reshapes the source header and selected body delimiters, but it does not add a new declaration kind or core-expression form. [Definitions](https://lean-lang.org/doc/reference/latest/Definitions/Definitions/)

### Simple definition RHS forms

For the simple `:=` form of `def`, ProofScript v0.2.x has two canonical RHS styles:

| RHS style | Canonical form | Closing rule |
|---|---|---|
| Inline non-self-delimiting term | `def x: T := expr;` | command terminator `;` required |
| Self-delimiting RHS/body | `def x: T := { ... }`, `def x: T := by { ... }`, `def x: T := do { ... }`, etc. | no command-level `;` |

Examples:

```ts
def single(n: Nat): Nat := n + 1;

def p: Point := { x := 0, y := 0 }

def multiStep(n: Nat): Nat := {
  let doubled := n * 2;
  let shifted := doubled + 1;
  shifted
}
```

The old blanket rule “every simple `def` RHS must be `:= { ... }`” is withdrawn for the v0.2.x semantic line. It created noisy double-brace examples and contradicted useful Lean-shaped declarations such as subtype aliases. Inline `def` is now standard when the RHS is a single non-self-delimiting term and the command is terminated by `;`.

### Body blocks and final values

A multi-step body block is used when ProofScript owns a sequence of local binding prefixes followed by a final term:

```ts
def f(n: Nat): Nat := {
  let x := n + 1;
  let y := x * 2;
  y
}
```

Conceptually:

```text
lowerDefBody({ let x := n + 1; rest })
  = let x := n + 1
    lowerDefBody({ rest })

lowerDefBody({ final })
  = final
```

The semicolon after an intermediate `let` or `have` is a body-sequence separator, not a JavaScript statement terminator. The final term has no body-level semicolon. Empty blocks are invalid; write `()` when the intended value is `Unit`.

### Structure values and Option B `where { ... }`

Under Option B, canonical ProofScript keeps Lean's structure-field `where` value form and adds braces for the region:

```ts
structure Point where {
  x: Nat;
  y: Nat;
}

def origin: Point where {
  x := 0,
  y := 0
}
```

A braced structure value remains valid where the ordinary term grammar accepts it:

```ts
def origin2: Point := { x := 0, y := 0 }
```

but the public teaching style prefers `where { ... }` for structure-field definitions because it matches Lean's declaration value form and avoids double wrapping. This is not canonical:

```ts
def origin: Point := {
  { x := 0, y := 0 }
}
```

The double-brace form may be understood as a nested term-body style in a permissive compatibility profile, but it is not canonical public syntax. A definition such as `def x: Nat := {{ xx := 3 }}` should fail elaboration unless the inner braced term actually has type `Nat`; ordinary structure-field syntax does not magically construct a natural number.

### `function` alias

```ts
function add(a: Nat, b: Nat): Nat := a + b;
```

normalizes at the alias expansion point to:

```ts
def add(a: Nat, b: Nat): Nat := a + b;
```

A block body is also allowed when the corresponding simple `def` body would be allowed:

```ts
function shifted(n: Nat): Nat := {
  let doubled := n * 2;
  doubled + 1
}
```

`function` has **no** JS function declaration semantics: no `this`, prototype, constructor behavior, `new`, JS hoisting, JS return completion, or distinct function-object declaration kind.

### `const` alias

```ts
const answer: Nat := 42;

const computed: Nat := {
  let x := 40;
  x + 2
}
```

normalize to binderless `def` declarations with the same simple RHS forms:

```ts
def answer: Nat := 42;

def computed: Nat := {
  let x := 40;
  x + 2
}
```

`const` has **no** ECMAScript lexical-environment, TDZ, reference-mutability, or runtime binding semantics. ECMAScript `const` really is a lexical immutable binding; ProofScript `const` is intentionally only a friendly spelling for a Lean `def`. [Variable Declarations](https://www.typescriptlang.org/docs/handbook/variable-declarations) [Declarations / `let` and `const`](https://tc39.es/ecma262/2026/multipage/ecmascript-language-statements-and-declarations.html)

### Alias restrictions

Normative v0.2.x rule:

- `function` is allowed only for a simple `def` written with declaration binders.
- `const` is allowed only for a top-level/module-level simple `def` without declaration binders.
- Local `const` is **not part of canonical ProofScript v0.2.x**; local immutable bindings remain Lean `let`.
- Aliases may use the same inline or self-delimiting simple RHS forms as `def`.
- Aliases expand through their registered command-macro rules when reached by the interleaved expansion/elaboration process in the parsing/macro-expansion rules in Chapter 2.
- Diagnostics should describe the resulting Lean concept as a definition.
- Canonical formatter output prefers `def` and applies the same closing rule: inline non-self-delimiting RHS uses `;`; self-delimiting RHS has no command-level `;`.
- There is no JavaScript-style function-return statement; `do`, `by`, `match`, and structure terms keep their Lean/ProofScript term meanings.

### Declaration body consistency doctrine

Full consistency does **not** mean every declaration kind receives the same literal outer braces. It means every declaration kind has exactly one category-owned body or entry region, and that region determines its separators and closing rule.

Canonical policy for the v0.2.x semantic line:

| Declaration family | Canonical body/region | Closing/separator rule |
|---|---|---|
| executable `def` inline RHS | `:= expr;` | inline non-self-delimiting term requires `;` |
| executable `def` self-delimiting RHS | `:= { ... }`, `:= by { ... }`, `:= do { ... }` | no command-level `;` |
| `function` / top-level `const` aliases | same simple RHS family as `def` | expand to `def`; formatter may prefer `def` |
| equation `def` | `where { | pattern => rhs ... }` alternatives | `where { ... }` is self-delimiting; no branch semicolons |
| structure-field `where` def | `where { field := value, ... }` | self-delimiting structure-field value form |
| theorem/example tactic proof | `:= by { tactic-sequence }` | no command-level `;`; tactic grammar owns internal `;` and `<;>` |
| theorem/example inline term proof | `:= proofTerm;` | inline proof term requires `;` |
| `abbrev` | inline abbreviation RHS | normally terminated by `;` unless an explicitly self-delimiting RHS form is documented |
| `opaque` with value | Lean-compatible opaque RHS | closing follows the selected RHS shape; opacity/trust behavior is the semantic distinction |
| `axiom` | no body | declaration terminator `;` |
| `inductive` | `where { | ctor ... }` | constructor list region; no canonical constructor semicolons |
| `structure` / `class` | `where { field: T; ... }` | field-list region owns semicolon separators |
| `instance` | selected Lean-compatible instance RHS, often `where { ... }` or a structure value | avoid canonical `:= { { ... } }` double braces |

Therefore the recommended simplification is **category-owned bodies with self-delimiting closure**, not universal double-bracing. Public canonical v0.2.x should avoid making theorem proofs, structure values, and instance values harder to read merely for mechanical symmetry.

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
theorem addZero(n: Nat): n + 0 = n := by {
  simp
}
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
}
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

ProofScript keeps Lean's overloaded `where` concept, but the public reference must teach three visually similar cases separately:

| Form | Shape | Category | Meaning | Separator policy |
|---|---|---|---|---|
| Structure-field value `where` | `def origin: Point where { x := 0, y := 0 }` | declaration value form | provides fields of the result structure | comma-separated field provisions |
| Local-helper `where` | `def f(...): T := { body } where { helper(...): U := ...; }` | declaration tail | introduces local recursive helper declarations | semicolon-separated local helper declarations |
| `where ... finally` | `where { ... } finally { tactics }` | local-helper finalization | solves metavariable/termination/helper obligations by tactics | tactic grammar, not runtime cleanup |

These are not interchangeable. A parser, formatter, and diagnostic engine MUST report which `where` category was selected rather than treating all braced `where` forms as one generic block.

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
}
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

Lean's definition grammar distinguishes simple values, equation clauses, and structure-field `where` values. ProofScript preserves those categories while using Option B `where { ... }` for declaration-owned equation/structure-field regions.

Simple value:

```ts
def inc(n: Nat): Nat := {
  n + 1
}
```

Equation clauses:

```ts
def isZero: Nat → Bool where {
  | 0 => true
  | _ => false
}
```

The older Lean-layout equation spelling may be accepted in migration or Lean-compatibility input, but canonical ProofScript formats equation definitions with `where { ... }`.

Structure-field value form:

```ts
structure PairBox where {
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

Strict verification profiles MUST reject or explicitly whitelist such assumptions by identity, type, and provenance.

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
class EqLike(A: Type) where {
  eq(a: A, b: A): Bool;
}
```

This does **not** imply JavaScript prototypes, `this`, `new`, runtime subclass dispatch, or nominal class-object semantics.

### Extension

```ts
class Ord(A: Type) extends EqLike(A) where {
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
instance: EqLike(Nat) where {
  eq(a: Nat, b: Nat) := a == b
}
```

Parameterized:

**Schematic (not an acceptance-test example):**

```text
instance {A: Type} [EqLike(A)]: EqLike(List(A)) where {
  ...
}
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
class Sized(A: Type) where {
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
instance: Sized(String) where {
  size := String.length
}
```

Instance names may be generated when omitted. Priorities influence search order:

```ts
instance (priority := 200): Inhabited(Nat) where {
  default := 0
}
```

ProofScript MUST preserve the priority and local/scoped registration semantics because they can change which term elaborates successfully.

## 10.5 Output parameters

`outParam` and `semiOutParam` guide synthesis by changing which typeclass parameters are treated as outputs during search. They do not change the kernel type of the class and are not variance markers.

A class may use an output parameter conceptually as:

```ts
class Elem(A: outParam(Type), C: Type) where {
  firstOpt: C → Option(A);
}
```

Avoid public examples such as `first?: C → Option(A);`. In ProofScript, a Lean-style identifier may end in `?`, so `first? : T` can be a valid name followed by a type separator. But the compact spelling `first?: T` looks exactly like a TypeScript optional-property annotation. Public examples should either choose a non-ambiguous name such as `firstOpt`, or write whitespace-sensitive documentation as `first? : T` when the question mark is truly part of the Lean identifier. A canonical formatter MAY insert a space before `:` after identifiers ending in `?` to avoid this false friend.

`outParam` wraps the parameter's type, just as in Lean. Instance search may therefore use the input `C` to determine `A`; `semiOutParam` uses the same wrapper shape but retains a pre-existing value while selecting candidates.

## 10.6 Default instances

`@[default_instance]` registers fallback candidates used in elaboration problems such as overloaded numerals and operations. Default instance priority is part of elaboration semantics and SHOULD be included in differential tests.

## 10.7 Deriving

`deriving` invokes registered deriving handlers after a data declaration. For example:

```ts
structure User where {
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



## 12.7 Primitive runtime contracts

A compiler/runtime may replace logically defined operations with specialized primitives for performance. Such primitives are trusted **only for the execution-correspondence claim**, unless they also participate in elaboration or kernel checking. Their obligation is to implement the source operation's documented observations for the supported representation domain.

For every backend primitive, a conformance registry SHOULD record the source declaration/operation, logical type/model, backend symbol, input/output representation, failure behavior, observable allocation/mutation behavior, platform assumptions, and runtime differential fixtures.

## 12.8 TypeScript/JavaScript representation profiles

The standard ProofScript semantics do not prescribe one JavaScript representation for all values. Representation choices are backend-profile decisions constrained by observable equivalence.

The standard backend MUST NOT silently equate `Nat`/`Int` with IEEE-754 `number` for unbounded arithmetic, `Option(A)` with `A | null` when the representation is not injective, `IO(A)` or `Task(A)` with `Promise<A>` as source identities, or Lean arrays/strings with mutable JS arrays/UTF-16 strings unless supported operations satisfy the stated correspondence relation.

A backend MAY use `number`, `bigint`, typed arrays, JS strings, promises, workers, or host objects internally when a representation theorem, validator, or sufficiently strong conformance contract establishes the required observations.

## 12.9 Execution observation profiles

Execution correspondence is stated relative to an explicit observation family. For pure code, the initial profile SHOULD include returned constructor/value structure, numeric/bit-level results where applicable, termination/divergence where distinguished, and executable failure behavior.

Effectful profiles additionally include ordered effect traces appropriate to the model, such as file results, console text, process exit status, state transitions, or task synchronization events. Host scheduling details that the source API does not expose need not be identical; source-visible ordering and synchronization obligations must be preserved.

## 12.10 Host failures, FFI, and certification

A backend can be logically correct yet fail because the host runs out of memory, denies file permissions, lacks an FFI symbol, or terminates a worker. Certification MUST distinguish such host/runtime failures from logical rejection and from a backend semantic mismatch.

Foreign code, `@[extern]`, `@[implemented_by]`, process execution, native addons, and other host bridges are explicit trust boundaries. Strict certificates SHOULD list them in a foreign/trusted-component manifest rather than presenting them as consequences of kernel checking.


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

ProofScript requires the `fun` concept introducer for function abstractions. The TypeScript/JavaScript-style arrow-only spelling is intentionally **not** standard ProofScript syntax.

**Negative example — expected parse rejection:**

```ts
(x: Nat) => x + 1
(x: A, y: B) => f(x, y)
```

Multiple surface parameters after `fun` still lower to nested Lean lambdas; they do not introduce JavaScript multi-argument function semantics. `=>` remains the Lean lambda/branch/syntax-rule right-hand-side token and stays distinct from canonical `→`. Lean's native `↦` alternative may also be accepted where Lean accepts it.

Requiring `fun` is both conceptual and grammatical: it explicitly announces a lambda binder sequence, cleanly supports Lean's explicit, implicit, strict-implicit, and instance-implicit binder forms, avoids ambiguity with grouped/binder syntax, and avoids importing JavaScript arrow-function expectations such as lexical `this`, `async`, rest parameters, destructuring, or JS block-return semantics.

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
structure Point where {
  x: Int;
  y: Int;
}
```

### Defaults

```ts
structure Config where {
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
theorem refl{A: Type}(x: A): x = x := by {
  rfl
}
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

### Advanced Lean-native term-level `return` outside explicit `do`

This is an advanced Lean-native form. Beginner-facing ProofScript material SHOULD prefer `return` only inside explicit `do { ... }` blocks, because TypeScript users will otherwise read it as early function return. A linter MAY warn when term-level `return` appears outside explicit `do` unless the surrounding code opts into advanced Lean compatibility.

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



## 14.9 Running Tactics and completion criteria

A tactic may fail, succeed with remaining subgoals, or succeed with no subgoals. A tactic proof is complete only when all generated goals are discharged and the produced proof term passes kernel checking. `by { ... }` is structural ProofScript syntax around the same Lean-compatible tactic execution model.

## 14.10 Reading Proof States

Tooling SHOULD expose the ordered goals, the main goal, goal/case names, accessible and inaccessible assumptions, local definitions, metavariables selected by the presentation profile, and each goal target. Proof-state presentation is an Info Tree/editor observation; a display difference is distinct from a difference in the underlying metavariable context or generated proof term.

Inaccessible assumptions may still be used by tactics that search the local context. Tactic facilities such as `case`, `next`, `rename_i`, and assumption-by-type mechanisms remain Lean-compatible ways to structure or name generated local context.

## 14.11 The Tactic Language and hygiene

Each tactic is syntax in the extensible `tactic` category. Tactic scripts execute against proof states with tactic-specific sequencing/focus constructs. ProofScript braces do not turn tactics into JavaScript statements, and `;`/`<;>` retain their tactic-combinator meanings.

Tactic syntax is hygienic: source names should resolve through the tactic framework's lexical/source context rather than accidentally capturing names generated inside proof terms.

## 14.12 Tactic Options

Tactic options can affect search, transparency, simplification, tracing, eliminator selection, resource behavior, and presentation. They are frontend configuration, not alternate kernel axioms. Fixtures depending on tactic options MUST record the relevant option environment; exact names/defaults remain pinned to Lean 4.33.1.

## 14.13 Tactic Reference inventory

The final manual SHOULD provide a machine-readable inventory entry for every built-in tactic in the supported import profile. At minimum, the inventory classifies closing/refinement tactics, introduction, constructor/logical tactics, elimination, rewriting/simplification, goal control, sequencing/control, diagnostics, and automation.

Documentation of a tactic is not a claim that the current ProofScript implementation supports it. Implementation status and reference-target status remain separate.

## 14.14 Targeted Rewriting with `conv`

`conv` is a dedicated conversion-tactic language for navigating to selected subterms and performing targeted rewriting/simplification, including beneath binders where ordinary rewriting may not directly operate. It shares proof-state infrastructure with tactics but has its own extensible syntax and navigation commands.

ProofScript preserves `conv` as a Lean tactic concept rather than translating it to a TypeScript AST transformation. Exact navigation/control/rewrite forms are versioned against Lean 4.33.1 and belong in the tactic inventory.

## 14.15 Naming Bound Variables

Generated or rewritten binders may need stable source-facing names. ProofScript preserves Lean's bound-variable naming/hint mechanisms, including the role of `binderNameHint` where used by the pinned baseline. These names are generally not proof-relevant, but they may be observable to tactics, diagnostics, termination obligations, and Info Trees.


## 14.16 Lean 4.33 automatic proof suggestions

Lean 4.33 added optional automatic `try?` suggestions at common proof sites. The options `autoTry.onEmptyProof`, `autoTry.onUnsolvedGoal`, and `autoTry.onSorry` default to off in the 4.33 line and affect interactive suggestion behavior rather than kernel rules. A ProofScript implementation that claims Lean 4.33.1 editor/elaboration compatibility SHOULD preserve the same option meanings and suggestion trigger points, while a non-interactive checker MAY ignore presentation of the suggestion after preserving acceptance semantics. [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/)

These options are tooling/elaboration observations. Enabling a suggestion never licenses insertion of an unproved term into a certified artifact: any accepted replacement must elaborate to an ordinary proof term and pass the normal kernel/axiom policy.


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


## 16.8 Lean 4.33 configuration and bit-vector coverage

The Lean 4.33 baseline adds the `liaSteps` configuration option to bound `grind`'s linear-integer-arithmetic search and includes proof-producing propagators/fixes for bit-vector literal operations. ProofScript does not introduce a different arithmetic engine or configuration meaning: when the selected tactic profile exposes these 4.33 facilities, their observable proof-search/configuration behavior is part of tactic compatibility, while the resulting proof term remains the object checked by the kernel. [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/)

Search limits, heuristics, and diagnostics are not logical axioms. A timeout or exhausted `liaSteps` budget is an inconclusive automation outcome, not evidence that the proposition is false.


# 17. The `mvcgen` Tactic

**Upstream correspondence:** [https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/)

`mvcgen` is important to ProofScript because v0.2 exposes Lean-native verification rather than inventing a second verification logic. Its meaning is exactly the meaning supplied by the pinned Lean environment and imported libraries.

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

ProofScript keeps `Std.Do` concepts and notation where the pinned baseline provides them. v0.2 defines no parallel TypeScript-like contract syntax over this framework.

## 17.3 Hoare triples and postconditions

Hoare-style specifications are represented using weakest preconditions and explicit pre/post predicates. For state and exception monads, a postcondition may need to describe both normal results and exceptional exits.

ProofScript does not add an independent postcondition syntax here. Verification uses the actual Hoare/WP/postcondition objects and tactics provided by the pinned Lean environment, so result, final-state, and exceptional-path meaning comes from those Lean-native definitions.

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

ProofScript inherits this requirement directly: any claim made through Lean-native monadic verification is only as strong as the registered and checked model connecting the monad to its WP semantics.

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


## 17.7 Lean 4.33 `vcgen`, explicit frames, and `@[frameproc]`

Lean 4.33 keeps the original `mvcgen` tactic and also renames the experimental Sym-based `mvcgen'` line to `vcgen`. The 4.33 `vcgen` surface includes the corresponding `with` discharger and `simplifying_assumptions` / `until` / `invariants` forms. ProofScript MUST treat `mvcgen` and `vcgen` as distinct Lean-native tactic surfaces when both are present in the pinned 4.33.1 environment; it MUST NOT collapse them merely because they generate related verification conditions. [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/)

Lean 4.33 also adds an explicit `frames` clause to `vcgen`. A frame records a state assertion/resource that a matched program preserves even when the registered specification does not mention it. This is proof-state/specification machinery, not implicit mutable-state semantics.

Automatic frame inference is registered with the Lean attribute `@[frameproc]`. A frame procedure describes how a program type frames a resource; `vcgen` may then carry that resource across a call without requiring the user to provide the corresponding explicit `frames` clause. The 4.33 mechanism is generalized beyond one lattice-meet encoding and can support any frame operator satisfying the required join-preservation law. [Lean 4.33 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.33.0/)

Normative ProofScript consequences for the Lean 4.33.1 baseline:

1. `vcgen`, `frames`, and `@[frameproc]` are Lean-native baseline concepts, not ProofScript verification keywords.
2. The ProofScript v0.2.x semantic line defines no parallel contract/invariant lowering or frame database; it preserves the pinned Lean `Std.Do`/VC-generation machinery as the authoritative verification model.
3. Frame inference is automation. The proof obligations and produced proof terms remain authoritative; a successful heuristic match does not add a kernel rule.
4. Backend/runtime compilation does not inherit separation-logic or resource-preservation guarantees merely because `vcgen` discharged a theorem; the theorem states exactly the proved property under its model.
5. A standalone ProofScript implementation that has not implemented `vcgen`/`@[frameproc]` MUST report that tactic capability as unsupported while preserving the language/reference meaning.


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

Lean's `do` language already has runtime assertion forms such as `assert! cond` and `debug_assert! cond`. Current upstream Lean also has a non-reserved `assert P` `doElem` used by verification-condition generation: it records a proposition for `vcgen` and has no runtime effect. ProofScript does **not** add a second pure/local `assert` alias for `have`.

For the Lean 4.33.1 baseline, only forms actually present in the pinned parser/import set are BASELINE. A later/current-upstream `doElem` form is TRACKING until confirmed in the baseline. Whenever Lean provides `assert` as a `doElem`, ProofScript preserves that Lean-native meaning inside `doSeq`; local proof structure outside such a category uses Lean's `have` concept.

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
def PositiveNat := { n: Nat // 0 < n }

def onePositive: PositiveNat := {
  ⟨1, by decide⟩
}
```

The proof is runtime-irrelevant, but the subtype remains a distinct logical type. This is not equivalent to a TypeScript refinement annotation erased before checking.

## 20.11 Lazy computations

Lean's lazy/thunk facilities explicitly delay computation. Their logical representation and runtime forcing behavior are defined by Lean's library/runtime model. Because ordinary Lean evaluation is strict at runtime, laziness must be requested through these explicit abstractions.



## 20.12 Individual type-family reference catalog

The broad sections above establish the semantics. For final reference depth, the following type families are independently findable and SHOULD each receive machine-readable registry entries. This catalog does not introduce new source constructs; it decomposes existing coverage.

### 20.12.1 Natural Numbers — `Nat`

`Nat` is arbitrary-precision and non-negative in the logical language. A TS backend must preserve exact supported `Nat` arithmetic rather than silently routing large values through IEEE-754 `number`.

### 20.12.2 Integers — `Int`

`Int` is arbitrary-precision signed integer data with Lean-compatible constructors, arithmetic, comparisons, and conversions. Exact source integer operations require exact backend results.

### 20.12.3 Finite Natural Numbers — `Fin(n)`

`Fin(n)` contains natural values strictly less than `n`. Its bound is part of the dependent type even when the proof component is erased at runtime.

### 20.12.4 Fixed-Precision Integers

`UInt8/16/32/64`, `USize`, `Int8/16/32/64`, and `ISize` retain width/platform-sensitive Lean families. The registry must specify representation, conversions, arithmetic/bitwise behavior, and overflow/failure behavior per operation.

### 20.12.5 Bitvectors — `BitVec(n)`

`BitVec(n)` is width-indexed bit-precise data. JS `number` bitwise operators are not a general semantic identity because they operate through host-specific fixed widths.

### 20.12.6 Floating-Point Numbers — `Float`, `Float32`

The Lean 4.33 logical/runtime split remains authoritative. Backend correspondence must explicitly cover signed zero, NaNs, rounding, conversions, comparisons/equality mechanisms, and bit-level observations exposed by the baseline.

### 20.12.7 Characters — `Char`

Host UTF-16 code units are not automatically the source `Char` domain. Encoding/decoding and character operations must preserve the Lean-compatible character model.

### 20.12.8 Strings — `String`

A JS host string is an implementation candidate, not a semantic identity. Indexing units, iteration, Unicode behavior, slicing, conversions, and supported operations must match the source contract.

### 20.12.9 `Unit`

`Unit` has one inhabitant. Runtime erasure/sentinels are valid only when source-visible observations cannot distinguish them.

### 20.12.10 `Empty`

`Empty` has no constructors. Safe checked compilation cannot manufacture a source-observable inhabitant.

### 20.12.11 `Bool`

`Bool` is computational data, distinct from `Prop`. Boolean branching/equality and proof bridges remain explicit Lean concepts.

### 20.12.12 `Option(A)`

`Option(A)` is a tagged optional-value type. Sentinel/null representations are valid only when injective for the supported `A` representation and when pattern/equality/FFI observations are preserved.

### 20.12.13 Tuples and Products

Products are typed constructor/projection values, not JavaScript arrays. Runtime flattening or unboxing is permitted only when observationally equivalent.

### 20.12.14 Sums — `Sum(A, B)`

`Sum` is a tagged disjoint union with constructor identity. It is not an untagged TypeScript union.

### 20.12.15 Lists — `List(A)`

Lists retain Lean inductive constructors/eliminators and list notation. Alternative runtime representations must preserve pattern matching, recursion, equality, and supported library behavior.

### 20.12.16 Arrays — `Array(A)`

Arrays retain value semantics even when uniqueness permits in-place native optimization. A mutable JS array may implement storage only under aliasing/update rules that preserve ProofScript observations.

### 20.12.17 Byte Arrays — `ByteArray`

Byte arrays need a byte-oriented runtime profile covering size, indexing, slicing/copying, conversion, FFI, and mutation/uniqueness observations.

### 20.12.18 Ranges

Range notation/objects are iteration values. Exact endpoint/step/notation behavior is pinned to Lean 4.33.1 and should be fixture-tested.

### 20.12.19 Maps and Sets

Each selected standard map/set family retains its specific equality/order/hash/typeclass contracts; the source concept is not universally JavaScript `Map`/`Set`.

### 20.12.20 Subtypes

A subtype is a value plus proof of a predicate. Proof erasure does not make the logical subtype identical to its carrier before checking.

### 20.12.21 Lazy Computations

Explicit lazy/thunk APIs control delayed computation and forcing. JavaScript closures/promises are not automatically semantic identities; memoization, sharing, effects, and repeated forcing follow the selected source API.

### 20.12.22 Basic-type backend registry fields

For every executable foundational type supported by TypeScript, the machine-readable reference SHOULD record stable type-family ID, Lean 4.33.1 correspondence, canonical spelling, logical model/constructors, runtime representation, literals/notation, conversions, primitive operations, failure/overflow rules, FFI representation, and runtime differential fixtures.


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



## 21.10 IO reference-depth expansion map

The broad families above remain authoritative. The final manual decomposes them into the following independently findable effect domains so the TypeScript/Node correspondence boundary is explicit rather than implied.

### 21.10.1 Logical Model

Reduction of pure terms is distinct from execution of side effects. `IO(A)` describes ordered effects that may return `A` (or fail according to the error model); kernel checking does not itself perform host IO. `IO`, `EIO`, and `BaseIO` retain their Lean distinctions and conversions.

### 21.10.2 Control Structures

`do`, bind, return, error handling, loops, early return, mutation syntax, and effect forwarding retain their Lean-compatible monadic/control semantics even when lowered to JS control flow.

### 21.10.3 Console Output

The backend profile should define encoding, newline, buffering/flush, and failure observations when visible. Node stdout/stderr are implementation mechanisms, not source identities.

### 21.10.4 Mutable References

Runtime refs must preserve source aliasing, sequencing, and concurrency visibility. They are distinct from local `let mut` elaboration.

### 21.10.5 Files, File Handles, and Streams

Capability profiles should cover bytes/text, EOF, seeking, positions, flush/close, modes, paths, and host failures. Unsupported host operations are reported as unsupported, not silently weakened.

### 21.10.6 System and Platform Information

OS/architecture/arguments/executable-path observations are runtime effects. Reproducible proofs must not silently treat ambient host facts as mathematical constants.

### 21.10.7 Environment Variables

Environment access/mutation is platform IO. The profile records absence behavior, encoding, permission/sandbox restrictions, and target availability.

### 21.10.8 Timing

Wall-clock, monotonic/process timing, sleeping, units, and range behavior are host effects. Proofs about timing require an explicit model/assumptions beyond kernel checking.

### 21.10.9 Processes

Process creation, streams, exit status, termination, and host errors form a significant capability/trust boundary. Browser/restricted targets may legitimately report this domain unsupported.

### 21.10.10 Random Numbers

Randomness is effectful. The profile distinguishes explicit deterministic PRNG state/seeds from ambient/system entropy when the source API does, and records distribution/range behavior for supported primitives.

### 21.10.11 Tasks and Threads

`Task(A)` is not source-identical to `Promise<A>`. A JS backend may use promises/workers internally only under a relation that preserves the result/failure, waiting/synchronization, ordering, cancellation/termination, and shared-reference observations that are source-visible in the pinned Lean 4.33.1 API/profile.

## 21.11 IO backend capability manifest

A TypeScript/JavaScript build that claims IO execution correspondence SHOULD publish capability statuses for console, references, files/streams, platform info, environment, timing, processes, randomness, tasks/threads, and foreign/native extensions. Logical acceptance of an `IO` term does not imply every backend can execute every host primitive.


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

Strict verification MUST reject hidden `sorry` dependencies, unapproved user axioms, and any native-computation assumptions that the selected profile has not approved.

### Replay independently

For Lean-backed artifacts, generated `.lean`/`.olean` material SHOULD be replayable with the pinned Lean toolchain and, where assurance demands it, an independent checker. This guards against a frontend that emitted a valid proof of the wrong proposition only when statement binding is also independently checked.

### Proof versus execution

A theorem about a function's Lean semantics does not automatically prove that a JavaScript/WASM/native backend faithfully implements that function. An execution certificate must separately bind and validate the compiler/runtime correspondence claim.


# Error Explanations

ProofScript diagnostics SHOULD preserve Lean error categories where the same elaboration/kernel condition is involved, while adding source-oriented explanations for ProofScript-specific parse and alias rules.

Important ProofScript-specific diagnostics include:

- ambiguous or malformed simple `def` RHS closure, such as a missing `;` after an inline non-self-delimiting RHS;
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

Examples include unmatched braces, missing `;` after a `defBodyPrelude`, malformed match alternatives, a missing `;` after a canonical inductive constructor/structure/class field declaration, or syntax that is unavailable because the required notation scope was not opened.

**Negative example — expected parse rejection:**

```ts
def bad: Nat := {
  let x := 1
  x
}
```

This is a ProofScript definition-body parse error because the intermediate `let` prelude requires the body-level separator.

### Elaboration errors

Examples include unsolved implicit arguments, type mismatches, failed coercions, ambiguous overloaded notation, or failed instance synthesis.

**Negative example — expected elaboration rejection:**

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

## v0.2 Zero-Extension Language Baseline — 9 September 2026

- Keeps the semantic compatibility target at **Lean 4.33.1**, pinned to source revision `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.
- Removes the entire ProofScript-owned Verification Extensions language layer. Standard v0.2 defines no ProofScript-specific `contract`, `requires`, `ensures`, `satisfies`, `ghost`, pre-state `old`, special `result`, or universal ProofScript `invariant` semantics.
- Preserves Lean-native verification: `Prop`, theorem/proof terms, dependent propositions, termination proofs, `Std.Do`, `mvcgen`, `vcgen`, invariant specification machinery, Hoare/WP specifications, and related library/tactic concepts available in the pinned baseline.
- Strengthens the governing rule to **change the shape, never the concept, and do not add a standard semantic concept absent from the pinned Lean baseline**.
- Removed historical extension spellings are not reserved merely because older ProofScript drafts used them. Where the pinned Lean grammar permits an ordinary identifier, the spelling remains an ordinary identifier.
- Features appearing only in newer Lean releases, release candidates, or `master` are **TRACKING** until an explicit ProofScript baseline upgrade.
- Retains the v0.1.9 parser/elaboration/kernel/runtime fidelity work unrelated to the removed extension layer.
- Grammar completeness remains an explicit closure task; the reference does not claim that every built-in production/precedence entry has already been mechanically extracted.

## Historical v0.1.x line

The v0.1.x research line explored a ProofScript-owned software-contract surface and progressively hardened its grammar. That experiment is **not** part of v0.2. Historical references and audits remain useful design evidence but are non-normative where they conflict with this reference.


# Supported Platforms

ProofScript language semantics are platform-independent at the reference level. This reference does **not** certify any ProofScript implementation/platform combination. A release may claim platform support only from a tested toolchain manifest; Lean's own supported-platform matrix does not automatically become a ProofScript backend support guarantee.


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

This Markdown reference uses heading-based navigation. A generated HTML/reference implementation SHOULD build a symbol/syntax/tactic index from the same documentation metadata used to render individual reference entries.

Key entries: `:=`, `=`, `==`, `→`, `∀`, `∃`, `def`, `function`, `const`, `let`, `let mut`, `have`, `theorem`, `opaque`, `axiom`, `abbrev`, `inductive`, `structure`, `class`, `instance`, `match`, `if`, `bif`, `do`, `return`, `by`, `simp`, `grind`, `mvcgen`, `vcgen`, `frames`, `frameproc`, Lean-native assertions, `Std.Do.Invariant`, `namespace`, `section`, `import`, `syntax`, `macro`, `elab`.

---

# Appendix A. Verification in ProofScript: Zero-Extension Policy

This appendix is normative. The ProofScript v0.2.x semantic line is theorem-proving and verified-programming because its semantic baseline is Lean 4—not because ProofScript adds a second verification language.

## A.1 No parallel verification ontology

Standard `.ps` adds no ProofScript-specific verification semantic categories. In particular, v0.2 defines no special language meaning for historical experimental forms named:

```text
contract
requires
ensures
satisfies
result
ghost
old
invariant
```

This list records historical spellings only. It is **not** a reserved-word list.

ProofScript verification uses the concepts present in the pinned Lean baseline, including as applicable:

- `Prop` and propositions-as-types;
- theorem, lemma, example, and ordinary proof terms;
- explicit/implicit proof arguments and dependent function types;
- equality, `Subtype`, `Decidable`, and ordinary logical connectives/quantifiers;
- tactic proofs and checked tactic-generated terms;
- structural/well-founded termination and the corresponding proof obligations;
- Lean-native `Std.Do`, weakest-precondition, Hoare-style, invariant/specification, `mvcgen`, `vcgen`, frame and specification-lemma machinery available in Lean 4.33.1.

These remain Lean concepts/library facilities. Their presence does not create a ProofScript-specific kernel rule or verification calculus.

## A.2 Semantic containment

For every standard ProofScript source construct `P`, there must exist a pinned-Lean concept or composition of pinned-Lean concepts `L` such that the claimed ProofScript meaning is the documented structural presentation/normalization of `L`.

ProofScript MUST NOT standardize a source construct whose semantic meaning depends on inventing a declaration kind, logical connective, conversion rule, verification judgment, effect semantics, ownership discipline, or proof rule absent from the pinned Lean baseline.

This does not forbid ordinary user libraries, macros, syntax extensions, tactics, elaborators, or domain-specific verification frameworks. Such facilities are ordinary Lean-compatible extensibility; they do not become built-in ProofScript semantics merely because a project imports them.

## A.3 Structural sugar is allowed

Zero-extension does not mean byte-for-byte Lean concrete syntax. ProofScript may provide structural presentation such as:

```text
Lean                          ProofScript
f x y                         f(x, y)
namespace N ... end           namespace N { ... }
match x with | ...            match (x) { | ... => ... }
by ...                        by { ... }
```

A structural transformation is admissible only when:

1. it maps deterministically to an existing pinned-Lean concept;
2. it does not create a second semantic interpretation;
3. its parser/category ownership is specified;
4. source/elaboration observability differences are documented where macros or quotations can observe them;
5. the formatter and conformance suite agree on its canonical form.

## A.4 Historical extension spellings are unreserved by default

Removing an experimental feature does not permanently reserve its spelling. Unless Lean 4.33.1 itself gives a spelling special meaning in the current syntax category, ProofScript must treat it according to the ordinary pinned-Lean identifier/token rules.

Thus a spelling such as `old` or `ghost` may name an ordinary declaration when the underlying identifier grammar permits it. `old(x)` is then ordinary grouped function application to a declaration named `old`; it has no built-in pre-state meaning.

Likewise, the mere character sequences `contract`, `requires`, `ensures`, `satisfies`, `result`, or `invariant` do not trigger historical ProofScript semantics.

## A.5 Lean-native verification is authoritative

ProofScript preserves the verification facilities actually present in Lean 4.33.1. For monadic program verification, this includes the `Std.Do`/WP/VC machinery described in Chapter 17. Invariant meaning comes from the relevant Lean verification objects/tactics and their imported libraries, not from a universal ProofScript loop annotation.

Automation remains untrusted proof search: a tactic or solver may search for evidence, but the resulting theorem/proof/certificate must satisfy the selected checking profile. Successful automation does not add a kernel rule.

## A.6 No ProofScript pre-state or ghost semantics

ProofScript v0.2 defines no built-in pre-state operator and no ghost phase. A verification model that needs entry-state values binds/model them explicitly through ordinary Lean-compatible definitions, theorem parameters, state predicates, weakest-precondition objects, or library-specific syntax.

Proof-only data uses ordinary proof/theorem mechanisms. Proof erasure follows Lean's proposition/proof semantics; arbitrary computational data does not become erasable merely because a project calls it “ghost.”

## A.7 Upstream future features are TRACKING

If a later stable Lean release introduces native contract/specification syntax or another verification concept, that feature is **not** retroactively part of v0.2. A future ProofScript baseline may expose it only after:

1. pinning the exact stable Lean release/source revision;
2. inventorying its parser productions and category ownership;
3. determining its elaborated/environment meaning;
4. running positive and negative Lean fixtures;
5. specifying any ProofScript structural reshaping;
6. comparing relevant semantic snapshots/observations;
7. publishing an explicit baseline delta.

Lean release candidates, `master`, proposals, or documentation for post-baseline versions are tracking evidence only.

## A.8 Future keyword policy

ProofScript MUST NOT reserve a word merely because a future Lean or ProofScript feature might want it.

A spelling may be special only because:

- the pinned Lean grammar currently registers/uses it; or
- a ProofScript structural production currently maps it to an existing pinned-Lean concept.

Future-syntax watchlists have no lexical or parser effect. If a later Lean baseline introduces a conflicting meaning for a ProofScript-owned structural alias, the Lean meaning has precedence for that new baseline; the alias must be proved unambiguous, moved to an optional compatibility layer, or removed.

## A.9 Conformance requirements

A zero-extension conformance suite MUST test both sides of removal:

1. historical extension source forms are not silently accepted with their old ProofScript semantics; and
2. historical spellings remain ordinary identifiers where Lean 4.33.1 permits them.

The suite must also verify that Lean-native theorem proving and verification facilities already claimed by the implementation are not broken by the cleanup.

A parser that “removes” the old DSL by globally reserving all of its words is nonconforming.

## A.10 Language/library boundary

A library may define reusable specifications, contracts-as-predicates, Hoare triples, state snapshots, proof automation, or domain-specific syntax. Those are ordinary library/metaprogramming facilities. They become standard ProofScript language semantics only through a future reference revision satisfying the semantic-containment and pinned-baseline rules above.

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

Proof automation MAY use external/native solvers for search, but strict acceptance requires an approved proof term or checked certificate under the selected profile. All indirect dependencies count. This rule applies equally to a hand-written theorem, an imported lemma, tactic-generated proof, checked certificate, or adequacy theorem.

An artifact record MUST bind the source/normalized statement identity appropriate to the claim, theorem type, referenced definitions, environment/axiom manifest, checker version and outcome. An execution claim additionally binds compiler/runtime settings and output bytes. Hashes identify artifacts; they do not prove translation correctness. An independent statement comparison or a checked translation argument remains necessary.

## Verification automation is Lean-native and untrusted

ProofScript v0.2 defines no contract elaborator, contract proof procedure, ghost erasure pass, pre-state operator, or ProofScript-owned invariant elaboration as part of the standard language. Therefore these mechanisms contribute no additional trusted-language path.

Lean-native tactics and verification libraries may still perform sophisticated automation. Their trust treatment follows the ordinary ProofScript/Lean boundary:

- parser/macro/elaborator/tactic code is not itself a proof;
- generated propositions/statements must be inspectable under the selected source-to-core assurance profile;
- generated proof terms/declarations must be checked by the selected checker/kernel profile;
- external/native solvers are proof search unless their result is an explicitly trusted assumption in the manifest;
- all transitive axioms/assumptions count toward the theorem's assurance label;
- proving a theorem does not establish that a TypeScript/JavaScript backend implements the theorem's modeled execution semantics.

For `Std.Do`, `mvcgen`, `vcgen`, invariant specifications, frames, and related facilities, the exact guarantee is the ordinary Lean theorem produced under the imported WP/model/adequacy assumptions. ProofScript does not strengthen that theorem by syntax.

## Verification-model adequacy remains a library theorem

When a Lean verification library models state, exceptions, IO-like effects, or another monad, its WP interpretation and adequacy theorems determine what is proved. ProofScript does not invent a host-state snapshot, exception model, scheduler model, or FFI model.

A proof about a formal state-transition model is therefore distinct from an execution-correspondence claim about JavaScript, Wasm, native code, a scheduler, filesystem, network, or foreign API. The latter requires the separate backend/runtime evidence described below.

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

**Separate fixtures — compare these in isolated environments, not as one module.** Require:

```ts
def f(x: Nat): Nat := {
  x
}
```

and

```ts
function f(x: Nat): Nat := {
  x
}
```

to normalize to the same canonical `DefDecl`.

**Separate fixtures — compare these in isolated environments, not as one module.** Require:

```ts
def x: Nat := {
  1
}
```

and

```ts
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

The v0.2 specification therefore forbids the phrase “the kernel proves the generated JavaScript correct” unless an additional verified-compiler or translation-validation argument exists.

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

| Level | Name | v0.2 target | Meaning |
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
| `fun (x : A) => t` | `fun (x: A) => t` | unchanged concept | `fun` is required; arrow-only lambda syntax is rejected |
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

## D.1 What "complete standalone grammar" means

ProofScript deliberately inherits Lean's **extensible parsing model**. Consequently, a single closed EBNF listing every future term or command is neither required nor sufficient for a standalone implementation. The standalone target is a complete **executable dynamic grammar system** that can start from a finite bootstrap and then reproduce the parser-state changes caused by syntax/notation/scoping commands.

A conforming standalone grammar implementation MUST specify or implement all of the following:

1. lexical/token and whitespace/comment rules, including dynamic keyword/token registration where the selected baseline exposes it;
2. bootstrap syntax categories and the built-in productions needed to parse the commands that can extend those categories;
3. precedence and associativity semantics, including application precedence and category-specific precedence contexts;
4. command-by-command parser-state transition rather than whole-file parsing against a permanently fixed grammar;
5. syntax/notation/operator registration, scoped activation, priorities, longest-match behavior, and preservation of unresolved ambiguities for elaboration where the pinned baseline does so;
6. category ownership for separators and delimiters (`defBodyBlock`, constructor lists, structure/class fields, structure instances, `match`, `do`, tactics, quotations, and custom categories);
7. source-information and syntax-kind behavior required by quotation, macros, diagnostics, and tooling;
8. a versioned inventory of built-in productions for the pinned Lean baseline plus explicit ProofScript structural aliases;
9. deterministic serialization or hashing of every parser/environment input that a published conformance result treats as semantically observable.

A development implementation MAY temporarily delegate a still-PROVISIONAL built-in production to the pinned Lean oracle/translator, but it MUST report that feature as not yet standalone. A production cannot be labeled standalone merely because an external Lean parser happened to accept the generated source.

The long-term implementation source of truth SHOULD be machine-readable. Once an executable grammar registry is introduced, the reference tables and conformance fixtures SHOULD be generated from or mechanically checked against that same registry so documentation and parser code cannot silently drift.

### D.1.1 Current v0.2 syntax-status inventory

This inventory describes specification maturity, not implementation coverage:

| Syntax family | Status | Reason |
|---|---|---|
| semantic punctuation `:=`, `=`, `==`, `→`, `=>`, `←` | **STABLE** | meaning and canonical roles are fixed by the semantic-punctuation invariant |
| zero-extension verification policy | **STABLE** | no ProofScript-owned verification grammar/semantics; verification is inherited from pinned Lean |
| historical verification-extension spellings | **NOT RESERVED / NO PS SEMANTICS** | ordinary token/identifier behavior follows pinned Lean grammar; no legacy DSL interpretation |
| lambda introducer `fun` and rejection of arrow-only `(binders) => body` | **STABLE** | preserves the Lean lambda concept introducer and avoids JS arrow-function false friends |
| local proof structure via `have`; no ProofScript-local `assert` alias | **STABLE** | avoids collision with Lean-native verification/runtime assertion forms |
| simple `def` RHS closure policy | **PROPOSED STABLE** | inline non-self-delimiting RHS needs `;`; self-delimiting RHS/body closes without command-level `;` |
| grouped application `f(a, b)` and rejection of `f()` | **STABLE** | normalization to curried `App` is explicit |
| canonical `match (...) { | ... => ... }` branch boundary | **STABLE** | branch-level `;`/`,` are forbidden; nested RHS categories own their punctuation |
| `inductive` constructor `|`/`}` boundaries; no canonical `;` | **PROPOSED STABLE** | each constructor already begins with a strong `|` marker; formatter removes legacy constructor semicolons |
| `structure` / `class` field `;` separators | **STABLE** | canonical examples and grammar use declaration-list punctuation |
| complete built-in Lean 4.33.1 production inventory | **INVENTORY COMPLETE / CONFORMANCE IN_PROGRESS** | 1,059/1,059 initial active runtime syntax kinds are production-accounted; 11/11 former opaque families have exact source productions; standalone positive/negative ProofScript parser replay remains open |
| exact precedence/associativity for the pinned standard parser environment | **COMPLETE (C4 PASS)** | 1,059/1,059 active syntax kinds plus 119/119 standard scoped activations are exact-accounted; dynamic transition semantics are separately closed by C5 |
| dynamic syntax/notation/operator extension protocol | **COMPLETE TRANSITION MECHANISM (C5 PASS)** | 11/11 transition families are accounted; 40 standard scopes / 119 activated kinds / 75 parser aliases are exact-anchored; macro/quotation observability is closed separately by C6 |
| post-4.33 Lean syntax/features | **TRACKING** | not part of the pinned v0.2.x semantic baseline |

A compiler MAY implement PROVISIONAL syntax, but its conformance report must identify the coverage and tests rather than silently promoting the syntax to STABLE.

## D.2 Bootstrap grammar principles

The full grammar is dynamic. This fragment defines the repaired basic call, binder and match slice; it is not by itself a complete parser, precedence specification or catalog of Lean binders. Section 2.2 and the category-ownership rules in this appendix govern parsing and quotation boundaries. Advanced forms need dedicated productions and versioned conformance cases.

```text
sourceFile       ::= moduleHeader? importHeader* command*
command          ::= defDeclaration
                  | functionAliasDeclaration
                  | constAliasDeclaration
                  | classifiedLeanCommand
                  | registeredCustomCommand

-- `classifiedLeanCommand` is not an opaque catch-all. It means dispatch through
-- the pinned runtime `command` category, then require that the resulting syntax
-- kind has an explicit ProofScript classification in the versioned command
-- registry. An unclassified command kind is a reference-closure failure, not
-- silently accepted standard ProofScript. The exact initial `import Lean`
-- registry is `ProofScript_Lean4331_Command_Syntax_Registry_v0.2.json`; later
-- commands may extend the category according to the dynamic parser-state rules.
classifiedLeanCommand ::= parserState.category("command")
                          where syntaxKindIsExplicitlyClassifiedForProofScript

-- Canonical brace-shaped declaration lists use category-owned boundaries.
-- Inductive constructors are introduced by `|`; no canonical semicolon is written.
-- A constructor entry ends when its signature parser returns and the parent parser
-- sees the next top-level `|` or `}`. Structure/class fields still require `;`
-- because they do not have a mandatory constructor-marker introducer.
inductiveDeclaration ::= modifiers? "inductive" declId binder* resultType?
                         "{" inductiveConstructor* "}" inductiveDeriving? terminator?
inductiveConstructor ::= "|" nestedDeclModifiers? ident constructorSignature?
legacyInductiveConstructor ::= inductiveConstructor ";"
-- `legacyInductiveConstructor` is accepted only in explicit migration mode;
-- canonical formatting emits `inductiveConstructor` without the semicolon.

-- Lean 4.33.1 `structFields` is exactly the union of four field/binder families:
-- `structExplicitBinder`, `structImplicitBinder`, `structInstBinder`, and
-- `structSimpleBinder`. ProofScript preserves those binder classes but owns the
-- enclosing brace list and mandatory `;` item separator. `class` uses the same
-- field grammar as `structure`; class semantics are added by elaboration/instance
-- registration, not by a second field parser.
structureFieldList ::= structureField*
structureField     ::= structureExplicitField ";"
                     | structureImplicitField ";"
                     | structureInstanceField ";"
                     | structureSimpleField ";"
classFieldList     ::= structureFieldList
classField         ::= structureField

structureExplicitField ::= nestedDeclModifiers? "(" fieldName+ fieldDeclSignature? fieldDefault? ")"
structureImplicitField ::= nestedDeclModifiers? "{" fieldName+ fieldDeclSignatureRequired "}"
structureInstanceField ::= nestedDeclModifiers? "[" fieldName+ fieldDeclSignatureRequired "]"
structureSimpleField ::= nestedDeclModifiers? fieldName fieldDeclSignature? fieldDefault?

fieldName             ::= identifier
fieldDeclSignature    ::= binder* resultType?
fieldDeclSignatureRequired ::= binder* resultType
fieldDefault          ::= ":=" term

-- Exact modifier order follows Lean 4.33.1 `declModifiers true`. Presentation
-- details of doc comments/attribute lists are delegated to their own categories,
-- not to an unspecified structure-field subgrammar.
nestedDeclModifiers ::= docComment? attributes? visibility? "protected"?
                        ("meta" | "noncomputable")? "unsafe"?
                        ("partial" | "nonrec")?

-- These semicolons are declaration-list punctuation. Match alternatives are
-- governed separately by matchCase below and intentionally have no terminator.

-- Canonical `def` has distinct body-specific productions. This prevents a
-- generic tail from being attached to body forms that Lean does not permit.
defDeclaration   ::= defRhsDeclaration
                   | defEquationDeclaration
                   | defStructWhereDeclaration

-- Lean's simple and equation forms admit their documented termination suffix
-- before an optional local `where` declaration section.
defRhsDeclaration ::= modifiers? "def" declId binder* resultType?
                      ":=" defSimpleRhs terminationSuffix? localWhereSection? defDeriving? declarationClose(defSimpleRhs)

defEquationDeclaration ::= modifiers? "def" declId binder* resultType?
                           defEquationBody terminationSuffix? localWhereSection? defDeriving? terminator?

-- The third Lean `def` value form is specifically structure-field initialization.
-- It may be followed by the separate local helper `where` section, but it does
-- not inherit the simple/equation termination suffix.
defStructWhereDeclaration ::= modifiers? "def" declId binder* resultType?
                              defStructWhereBody localWhereSection? defDeriving? selfDelimitedClose

-- `function` and `const` are deliberately narrower command aliases. They accept
-- the same simple RHS closure policy as `def`, then expand to the corresponding
-- RHS `def` command before ordinary declaration elaboration. They do not create
-- equation-body or structure-field-`where` alias value grammars.
functionAliasDeclaration ::= modifiers? "function" declId binder+ resultType?
                             ":=" defSimpleRhs aliasRhsTail? defDeriving? declarationClose(defSimpleRhs)

constAliasDeclaration ::= modifiers? "const" declId resultType?
                          ":=" defSimpleRhs aliasRhsTail? defDeriving? declarationClose(defSimpleRhs)

-- Closing policy:
--   inline non-self-delimiting RHS     requires a command terminator `;`
--   self-delimiting RHS/body/region    emits no command-level `;` canonically
-- A command-level terminator after a self-delimiting RHS is accepted only in
-- explicit migration/source-preserving mode and is removed by canonical formatting.
-- This policy answers the `def p: Point := { x := 0, y := 0 }` case: the braced
-- structure value is self-delimiting, so no trailing `;` is canonical.
defSimpleRhs       ::= inlineNonSelfDelimitedTerm
                    | selfDelimitedRhs

inlineNonSelfDelimitedTerm ::= term where termSourceExtentIsNotSelfDelimited

selfDelimitedRhs   ::= defBodyBlock
                    | selfDelimitedTerm

-- `selfDelimitedTerm` is a classification of term syntax whose source extent is
-- closed by its own delimiter, such as a braced structure value, `by { ... }`,
-- explicit `do { ... }`, `match (...) { ... }`, or another registered term form
-- that declares a closed extent. It is not a JavaScript block category.
selfDelimitedTerm  ::= term where termSourceExtentIsSelfDelimited

declarationClose(defSimpleRhs) ::= terminator              -- when RHS is inlineNonSelfDelimitedTerm
                                | selfDelimitedClose       -- when RHS is selfDelimitedRhs
selfDelimitedClose ::= ε

-- `terminator?` in legacy productions records parser-level compatibility
-- acceptance, not canonical formatting. With no following tail, canonical
-- self-delimited output ends at its closing delimiter and emits no declaration-level
-- semicolon. Inline non-self-delimiting output requires `;` so the command boundary
-- is explicit.

-- A `defBodyBlock` is the multi-step ProofScript term-body form. It is not the
-- only valid simple `def` RHS.
defBodyBlock     ::= "{" defBodySequence "}"

defBodySequence  ::= defBodyPrelude* defBodyFinal

-- The literal semicolon is owned by defBodyBlock sequencing. There is no ASI.
defBodyPrelude   ::= localLetPrefix ";"
                  | localHavePrefix ";"

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
-- defBodySequence supplies the continuation after the mandatory body-sequence separator `;`.
-- `localHavePrefix` analogously mirrors only the head of ProofScript `have`.
-- Nested terms inside a binding value/type/proof are parsed normally and keep
-- their own category-local separators.

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
terminationSuffix ::= terminationPrimary decreasingBy?
                    | decreasingBy
terminationPrimary ::= terminationBy
                     | terminationByQuery
                     | partialFixpointClause
                     | coinductiveFixpointClause
                     | inductiveFixpointClause
terminationBy      ::= "termination_by" "structural"? terminationBinderArrow? term
terminationBinderArrow ::= binderName+ "=>"
terminationByQuery ::= "termination_by?"
partialFixpointClause ::= "partial_fixpoint" monotonicityClause?
coinductiveFixpointClause ::= "coinductive_fixpoint" monotonicityClause?
inductiveFixpointClause ::= "inductive_fixpoint" monotonicityClause?
monotonicityClause ::= "monotonicity" term
decreasingBy       ::= "decreasing_by" "{" tacticSeq? "}"

-- The factoring above is deliberately NONNULLABLE. It is the ProofScript
-- presentation of exact Lean 4.33.1 `Termination.suffix`, whose first and
-- second components are independently optional. Absence is represented only
-- by the `?` at a declaration use site, never by a nullable suffix production.

-- Alias tail is itself nonempty, avoiding `optional(nullable)` ambiguity.
aliasRhsTail       ::= terminationSuffix localWhereSection?
                     | localWhereSection

defDeriving        ::= "deriving" derivingClass ("," derivingClass)*
derivingClass      ::= exposeDeriving? derivingTerm
exposeDeriving     ::= "@[" "expose" "]"
derivingTerm       ::= term
-- `derivingTerm` is parsed with Lean's `withForbidden "for" termParser`
-- constraint in this position; top-level `for` is therefore not consumed as
-- part of the deriving class expression.

-- The local helper layer is separate from all three value forms. Upstream
-- `whereDecls` is specifically a semicolon-separated sequence of `letRecDecl`,
-- not an arbitrary nested-command list. Each helper may carry its own nonempty
-- termination suffix through the `letRecDecl` grammar. A trailing separator is
-- accepted because upstream `whereDecls` allows one. `finally` belongs here.
localWhereSection  ::= "where" "{" localWhereDeclList? "}" finallySection?
localWhereDeclList ::= localWhereDecl (";" localWhereDecl)* ";"?
localWhereDecl      ::= localDocComment? localAttributes? localLetDecl localTerminationSuffix?
localLetDecl        ::= localLetIdDecl
                      | localLetPatternDecl
                      | localLetEquationDecl
localLetIdDecl      ::= identifier binder* resultType? ":=" term
localLetPatternDecl ::= pattern resultType? ":=" term
localLetEquationDecl ::= identifier binder* resultType? defEquationBody
localTerminationSuffix ::= terminationSuffix
finallySection      ::= "finally" "{" tacticSeq? whereFinallySubsection* "}"
whereFinallySubsection ::= "|" identifier "=>" tacticSeq

-- The structure-field value form mirrors Lean's `whereStructInst`. ProofScript uses
-- a braced, comma-separated field-provision surface consistent with structure
-- instance values; each field remains an ordinary Lean structInstField concept.
defEquationBody    ::= defEquationClause+
defEquationClause  ::= "|" patternSequence ("|" patternSequence)* "=>" term
defStructWhereBody ::= "where" "{" (structWhereField ("," structWhereField)* ","?)? "}"

-- Exact Lean 4.33.1 `Term.structInstField` is an lvalue followed by an optional
-- field-declaration tail. The tail is supplied by the registered
-- `structInstFieldDecl` parsers: either `:= private? term` or `private?` equation
-- alternatives. ProofScript changes only the surrounding list punctuation to
-- its canonical comma-separated structure-instance surface. Punning remains the
-- no-tail case (`x` abbreviates `x := x`).
structWhereField       ::= structInstLVal structInstFieldBinder* resultType? structInstFieldValue?
structInstLVal          ::= structInstLValHead structInstLValSuffix*
structInstLValHead      ::= identifier | fieldIndex | "[" term "]"
structInstLValSuffix    ::= "." (identifier | fieldIndex) | "[" term "]"
fieldIndex              ::= naturalLiteral
structInstFieldBinder   ::= binderName | binder
structInstFieldValue    ::= ":=" "private"? term
                          | "private"? matchCase+

-- The former broad `otherBuiltInCommand` / `otherLeanCommand` placeholders have
-- been removed. Built-in and imported command coverage is now an explicit
-- machine-registry obligation through `classifiedLeanCommand` above. This avoids
-- pretending a static EBNF list can model Lean's command-by-command extensible
-- parser while still making every accepted standard command auditable by syntax
-- kind, source origin, and ProofScript classification.

resultType       ::= ":" term

binder           ::= explicitBinder
                  | implicitBinder
                  | strictImplicitBinder
                  | instanceImplicitBinder
binderName       ::= identifier | "_"
binderNameGroup  ::= binderName+
binderType       ::= ":" term
binderDefault    ::= ":=" term

-- One explicit group can retain Lean-style shared-name grouping (`x y: A`)
-- while comma-separated entries provide the canonical TypeScript-shaped form
-- (`x: A, y: B`). Both elaborate to the same binder classes.
explicitBinder      ::= "(" explicitBinderEntry ("," explicitBinderEntry)* ","? ")"
explicitBinderEntry ::= binderNameGroup binderType? binderDefault?
implicitBinder      ::= "{" binderNameGroup binderType? "}"
strictImplicitBinder ::= "⦃" binderNameGroup binderType? "⦄"
instanceImplicitBinder ::= "[" (identifier ":")? term "]"

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
doBranchSeq      ::= doSeq

doSeq            ::= doSeqBracketed | doSeqIndent
doSeqBracketed   ::= "{" doSeqItem+ "}"
doSeqIndent      ::= doSeqItem+
-- `doSeqIndent` additionally enforces Lean's `many1Indent` column constraint:
-- every item begins at the same or a greater indentation level than the first.
doSeqItem        ::= registeredDoElem ";"?
registeredDoElem ::= parserState.category("doElem")

-- `registeredDoElem` is not an opaque static placeholder: it denotes the
-- versioned dynamic Pratt category in the current parser state. For the exact
-- v0.2.x `import Lean` baseline snapshot, the companion machine registry records
-- all 32 registered `doElem` syntax kinds. Later commands may extend the
-- category according to the dynamic parser-state protocol.

-- Advanced Lean-native compatibility form: Lean also has `termReturn` outside explicit `do`.
-- Same-line term presence is significant in the pinned grammar; absence denotes the bare
-- return form. Beginner-facing ProofScript style should prefer `return` only inside
-- explicit `do { ... }`; a linter may warn on term-level `return` outside `do`.
termReturn       ::= "return" sameLineTerm?
```

**Contextual inductive-constructor-boundary rule:** inside `inductive { ... }`, the parent constructor-list parser recognizes a top-level `|` as the next constructor and `}` as the end of the list only after the nested constructor-signature parser has returned. A `|` occurring inside a nested term/custom syntax category belongs to that category. There is no canonical `constructorTerminator` production. A semicolon after a completed constructor is accepted only under an explicit legacy-migration mode and is removed by canonical formatting.

**Contextual match-boundary rule:** the match parser owns top-level `|` only at its own alternative boundary; nested term/custom categories consume their own tokens first. Before the current alternative's single `=>` has been consumed, a top-level `|` introduces another `patternSequence` belonging to that same alternative. After `=>`, the parser consumes exactly one RHS `term` using the ordinary dynamic term grammar; only when that term parser returns does a following top-level `|` begin the next alternative, while `}` closes the match. There is no `branchTerminator` production. A `;` or `,` after the completed RHS at match level is a syntax error; punctuation nested inside the RHS remains owned by its nested category. Pattern-matching functions reuse the same ordinary-term alternative structure after canonical `fun`. When `match` is parsed as a `doElem`, the same LHS/pattern-sequence structure is retained but the RHS parser is `doSeq`; match-level `|`/`}` boundaries are recognized only after that do-sequence parser returns.

Imports remain in the module-header grammar rather than becoming arbitrary nested commands. The fragment does not authorize empty calls, JavaScript automatic semicolon insertion, general JS statements inside definition blocks, JavaScript-style function-return statements (while preserving Lean `termReturn` and `doReturn`), built-in `case` aliases for alternatives, branch-level `;`/`,` terminators, or all combinations of declaration tails. Inline non-self-delimiting simple `def`/`function`/`const` RHS forms require a command terminator `;`; self-delimiting RHS/body forms close at their own delimiter and do not use a canonical command-level `;`. Within `defBodyBlock`, each intermediate prelude has a mandatory literal `;`, while the final term is the block value and has no body-level trailing `;`. Structure-instance fields, `do` elements, tactic syntax, match branches, declarations, and custom brace forms keep their own separators and do not inherit the def-body rule. Commas inside a nested term are owned by that term. Expression, tactic, `do`, quotation and custom-category parsers retain their distinct boundaries. Macro and command elaboration update parser state incrementally.

## D.3 Canonical punctuation ownership matrix

| Category | Entry separator / terminator | Trailing form | Rule |
|---|---|---|---|
| `inductive { ... }` constructor entry | top-level `|` / `}` boundary | `;` **not canonical**; legacy `;` may be migration-only | constructor-marker punctuation |
| `structure { ... }` / `class { ... }` field | `;` | **required** after final field | declaration-list punctuation |
| inline `def/function/const ... := expr` RHS | command terminator | `;` **required** | inline non-self-delimiting declaration closure |
| self-delimiting declaration RHS/body | closing delimiter | command-level `;` **not canonical** | braces/`by`/`do`/`where` close their own region |
| `def ... := { ... }` intermediate `let`/`have` prelude | `;` | required after each prelude | body-sequence separator |
| `def ... := { finalTerm }` final term | none | body-level `;` **forbidden** | final term is the block value |
| `match (...) { | p => rhs ... }` alternative | none | branch-level `;`/`,` **forbidden** | parser boundary is the next top-level `|` or `}` after RHS parsing returns |
| structure instance `{ x := v, y := w }` field provision | `,` | governed by structure-instance grammar | term-local punctuation |
| function/application arguments `f(a, b)` | `,` | optional trailing comma only where explicitly admitted | application-group punctuation |
| `do { ... }` | category-specific `doSeq` | not inherited from def/match rules | Lean `do` semantics |
| tactic `by { ... }` | tactic-sequence grammar | not inherited from def/match rules | tactic category |

No punctuation token becomes a universal statement terminator. New syntax extensions MUST declare which category owns their separators and how nested categories return control to their parent parser.

## D.3.1 Declaration body consistency doctrine

The canonical grammar uses **category-owned bodies**, not a universal JavaScript-like block grammar. The design goal is full consistency of ownership, not identical punctuation after every keyword.

| Family | Canonical region | Notes |
|---|---|---|
| simple executable `def` / `function` / top-level `const` | inline RHS with `;` or self-delimiting RHS/body without command-level `;` | same simple `def` semantics; no JS statements |
| equation definitions | equation alternatives | alternatives already have `| ... =>` boundaries |
| structure-field `where` definitions | `where { field := value, ... }` | structure-value region, comma-separated |
| theorem/example tactic proof | `:= by { tacticSeq }` | `by { ... }` is already a proof-term region |
| structure/class declarations | `{ field; ... }` | field-list region, semicolon-separated |
| inductive declarations | `{ | ctor ... }` | constructor-list region, `|`-introduced entries |
| axiom declarations | no body | assumptions have no proof/value body |

A future strict-brace style MAY additionally accept or require `:= { proofTerm }` for theorem-term proofs, but public canonical v0.2.x should not force noisy double braces such as `theorem t: P := { by { ... } }`, `def p: Point := { { field := value } }`, or `instance: C := { { field := value } }`.

## D.4 Formatter canonicalization invariant

For source accepted by the canonical formatter, formatting MUST be idempotent modulo explicitly documented non-semantic output metadata:

```text
format(parse(format(parse(source))))
  = format(parse(source))
```

The formatter MUST emit canonical punctuation from the table above, including removal of legacy semicolons after inductive constructor entries, and MUST NOT preserve a noncanonical alias merely because the parser accepted it, unless a source-preserving editor mode is explicitly selected. Formatter tests are semantic-surface tests: they do not prove kernel correctness, but they prevent multiple accidental canonical spellings from emerging.

---

## Built-in alias macro rules

Normatively:

```text
macro command:
  function f binders :? T? := rhs tail?
    ↦ def f binders :? T? := rhs tail?

macro command:
  const x :? T? := rhs tail?
    ↦ def x :? T? := rhs tail?

The alias productions do not accept equation-clause or structure-field-`where` value forms.
Because they expand to the simple `def` RHS family, they inherit the inline/self-delimiting
closing policy plus the termination suffix, local `where` declaration section, and `deriving`
material accepted after that expanded simple `def`.

category-specific def-body lowering:
  def f binders :? T? := { finalTerm }
    ↦ def f binders :? T? := finalTerm

  def f binders :? T? := { letPrefix ; rest }
    ↦ def f binders :? T? :=
        corresponding ordinary Lean-compatible let term
        whose continuation is lowerDefBody({ rest })

  def f binders :? T? := { havePrefix ; rest }
    ↦ analogous ordinary have/continuation term

The alias and body rules are invoked only when their registered syntax is reached
by normal interleaved macro/elaboration dispatch. They do not descend into
quotations, raw syntax, or unrelated custom categories.

term/syntax aliases:
  A -> B                   ↦ A → B
  forall binders, body     ↦ ∀ binders, body
  exists binders, body     ↦ ∃ binders, body
  x <- action              ↦ x ← action
  do<- body                ↦ do← body
```

There is deliberately no built-in `case ... =>` alias for `| ... =>`, and no JavaScript-style function-return alias. `case` remains a Lean tactic-category keyword. `return` preserves Lean's own two relevant parser roles: `doReturn` in `doSeq` and `termReturn` in ordinary term syntax.

`const` is intentionally restricted to the binderless declaration shape. A function-valued binderless definition is still allowed:

```ts
const inc: Nat -> Nat := fun (n: Nat) => n + 1;
```

because the alias classifies the **source declaration shape**, not the semantic type of the value. The `->` spelling remains an optional ASCII alias for `→`; function abstraction itself still requires the canonical Lean concept introducer `fun`.

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

def p: Point := { x := 0, y := 0 }
  ≃ Lean def p : Point := { x := 0, y := 0 }

def io: IO(Unit) := do { IO.println("x"); }
  ≃ Lean def io : IO Unit := do IO.println "x" 
```

The definition-body correspondences preserve the same expected type, telescope, recursion/termination context, safety/transparency phase, and declaration kind. The outer braces are consumed before ordinary term elaboration; nested structure/`do`/`by`/custom terms retain their own syntax. No JavaScript function-return or statement-completion semantics are introduced; Lean `termReturn` remains an ordinary term when selected by the term parser.

These are semantic correspondences, not a requirement that an implementation literally emit Lean source.

---


---

# Exact Lean 4.33.1 Closure Evidence — Draft 4

This section records **reference-engineering evidence**, not new ProofScript semantics. The exact Lean 4.33.1 release archive was reconstructed and SHA-256 verified as `890afd185370f85666025b883914ab4f4b339136f8c96167b69cfb62aecaf235`; its `bin/lean --version` reports commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`.

The exact release source identifies the upstream productions behind the opaque bootstrap families:

- structure/class fields: `Command.structExplicitBinder`, `structImplicitBinder`, `structInstBinder`, `structSimpleBinder`, `structFields`;
- `def` deriving: `Command.derivingClass`, `derivingClasses`, `optDefDeriving`;
- equation-form definition RHS: `Command.declValEqns` → `Term.matchAltsWhereDecls`;
- local `where` declarations: `Term.letRecDecl`, `Term.whereDecls`;
- termination suffix: `Termination.suffix` and its `terminationBy`, `terminationBy?`, `partialFixpoint`, `coinductiveFixpoint`, `inductiveFixpoint`, and `decreasingBy` components;
- binder family: `Term.explicitBinder`, `implicitBinder`, `strictImplicitBinder`, `instBinder`, `bracketedBinder`;
- structure-instance fields: `Term.structInstField`, `structInstFields`, `structInstFieldDef`, and `structInstFieldEqns`.

These identities materially reduce ambiguity. Draft 18 now packages a standalone machine-readable production-root registry for all 1,059 active initial syntax kinds and preserves the exact 11-family source ledger. C3 remains **IN_PROGRESS** because the established closure policy also requires complete standalone ProofScript positive/negative differential replay; the bounded 5/5 upstream Lean fixture corpus does not satisfy that stronger requirement.

Machine-readable evidence is in `ProofScript_Grammar_Placeholder_Closure_Ledger_v0.2.json`.

### Command classification registry — Draft 6 closure evidence

For the exact Lean 4.33.1 `import Lean` profile of the v0.2.x semantic line, all **143** runtime-registered `command` syntax kinds are semantically classified in `ProofScript_Lean4331_Command_Classification_v0.2.json`. The command-dispatch rule in this specification MUST consult that versioned registry rather than an open-ended `otherLeanCommand` production. `NOT_APPLICABLE` rows are internal/helper extension instances whose generic registration/replay remains part of dynamic-parser conformance; they are not silently discarded. This completes command-category *classification*, not the full C1/C3 grammar closure.



---

## Draft 10 exact runtime category classification evidence

The following `import Lean` runtime parser categories are now classification-closed against exact Lean 4.33.1 source/runtime evidence:

- `command`: 143/143
- `term`: 297/297
- `level`: 7/7
- `binderPred`: 11/11
- `doElem`: 32/32
- `attr`: 45/45
- tactic-pattern categories (`mcasesPat`, `mintroPat`, `mrefinePat`, `mrevertPat`, `rcasesPat`, `rintroPat`): 28/28
- `structInstFieldDecl`: 2/2
- `prec` + `prio` + `stx`: 35/35

This is **classification closure**, not complete parser-behavior closure. C3 still requires complete standalone grammar behavior; **C4 is PASS** for the pinned standard parser environment; C5 is **PASS** for the explicit dynamic parser-state transition-mechanism boundary; and C6 is **PASS** for the quotation/antiquotation/macro-observability mechanism boundary. The machine registries remain the evidence surface for the categories above; broad parser/formatter differential replay remains C7.


## Draft 11 tactic-category classification evidence

The exact Lean 4.33.1 `import Lean` runtime `tactic` category is classification-closed at **284/284**. Individual tactics retain Lean spelling and semantics; the structural ProofScript change belongs to the enclosing `by { ... }` term. The generic `unknown` parser and the server cancellation test-only tactic are not independent language features. Three `simp!`-family tactic registrations are macro-generated and are therefore accounted from the runtime registry rather than a one-to-one source declaration row.

This does not close tactic elaborator, proof-state, InfoTree, diagnostic, or formatter equivalence; those remain conformance evidence obligations.


## Draft 12 complete initial runtime syntax classification

For the exact Lean 4.33.1 `import Lean` environment, all **1,059 / 1,059** registered syntax kinds now have an explicit ProofScript classification. This closes the *classification inventory* of the initial runtime parser state. It did **not by itself** close dynamic parser replay or macro semantics; Draft 19 subsequently closes C5 by accounting for all transition families and exact incremental/scoped anchors, and Draft 20 closes C6 by accounting for the generic quotation/antiquotation/macro-observability mechanisms with fresh exact-toolchain fixtures.

The machine-readable authority for this checkpoint is `ProofScript_Lean4331_Runtime_Syntax_Classification_v0.2.json`. Human-readable grammar prose may summarize families instead of duplicating all 1,059 rows.


## Exact Lean 4.33.1 precedence/associativity closure — Draft 17

This section records conformance evidence; it does not change ProofScript v0.2.x semantics. C4 is closed by `ProofScript_Lean4331_Precedence_Associativity_Registry_v0.2.json` and the exact differential fixture report. The registry accounts for all 1,059 active syntax kinds under `import Lean`, all 119 standard scoped activations, exact mixfix associativity, and exact source constraints for handwritten parser values. Dynamic parser-state mutations are separately closed by the Draft 19 C5 boundary.


## Exact Lean 4.33.1 production-root accounting — Draft 18

`ProofScript_Lean4331_Grammar_Production_Registry_v0.2.json` joins the C1 runtime registry to the C4 parser evidence and accounts for every one of the **1,059** active syntax kinds under the exact `import Lean` state. The partition is **819 evaluated parser descriptions + 240 exact-source handwritten parser values**, with zero missing or overlapping runtime kinds.

The recovered `ProofScript_Grammar_Placeholder_Closure_Ledger_v0.2.json` retains exact source productions for all **11** former opaque grammar families and reports **0** opaque production references remaining. The recovered exact Lean bounded corpus is **5/5 PASS**.

This closes the production-root *inventory* question but does not by itself close C3: the family coverage matrix records where dedicated negative and standalone ProofScript parser differential fixtures are still absent. Dynamic syntax-state transition semantics are closed by C5; quotation/macro-observability mechanisms are closed by C6; broad parser/formatter differential replay remains C7.


## Exact Lean 4.33.1 dynamic parser-state closure — Draft 19

`ProofScript_Lean4331_Dynamic_Parser_State_Registry_v0.2.json` defines the C5 state boundary and accounts for all **11 / 11** parser-state transition families. Exact anchors include **40** registered standard parser scopes, **119 / 119** unique scoped activated syntax kinds, a **501 → 563** standard-scope token union (**+62**), and **75 / 75** reconciled parser aliases.

The existing exact-toolchain probes cover same-file incremental syntax/macro installation and imported scoped syntax rejection-before-activation followed by parsing/macro elaboration after `open scoped`. Draft 19 packages those observations and their historical raw-output hashes in `ProofScript_Lean4331_C5_Probe_Evidence_v0.2.json`; it does not fabricate the raw stdout files that were not retained by the earlier package.

C5 is therefore **PASS** under the explicit transition-mechanism boundary. Arbitrary future grammar states are not pre-enumerated because the language is intentionally extensible; a conforming implementation must instead replay the closed transition families incrementally and fail closed on unsupported transitions. Draft 20 separately closes C6 for quotation/antiquotation, hygiene, macro failure/priority, source relationships, and expansion observability.

## Exact Lean 4.33.1 macro/quotation observability closure — Draft 20

`ProofScript_Lean4331_C6_Macro_Observability_Registry_v0.2.json` defines the C6 mechanism boundary and accounts for all **11 / 11** generic quotation/antiquotation/macro-observability families against exact Lean 4.33.1 source. The boundary covers typed quotation/category identity, ordinary/nested/repetition/separator/suffix antiquotation and splicing, escaped staging, quotation-pattern kind/shape matching, hygiene/fresh macro scopes, source relationships, unsupported-rule fallback, hard-error termination, priority/dispatch, and recursive expansion observability.

Draft 20 also performs a **fresh native Lean 4.33.1 replay at commit `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**. `ProofScript_Lean4331_C6_Fixture_Report_v0.2.json` records **3 / 3 PASS**. Decisive observations include hygienic non-capture (`7`, not the macro-local `100`), unsupported-rule fallback (`41`), high-priority dispatch (`2`), escaped antiquotation as `ident.antiquot`, a hard macro error that prevents fallback, and typed quotation/category mismatch rejection.

C6 is therefore **PASS** under the explicit macro/quotation mechanism boundary. This is not an implementation-completeness claim for the standalone compiler and does not close C3 or C7. The language remains open to user-authored macros; conformance is defined by faithfully implementing or delegating the closed generic mechanisms rather than pre-enumerating every future macro program.


---

## Draft 21 differential conformance evidence

Draft 21 adds a reference-owned C3/C7 corpus of **42 ProofScript source cases** (21 required-accept, 21 required-reject). All 21 positive cases carry canonical Lean 4.33.1 counterparts and passed the exact pinned native oracle; seven upstream grammar-negative counterparts also reject under the exact oracle. The corpus is evidence for concrete boundary behavior, not a replacement for the complete 1,059-kind production registry.

The frozen current standalone frontend is intentionally treated as a conformance subject rather than an authority. Its black-box parser replay accepts 5/21 required-positive cases and parser-rejects 15/21 required-negative cases; unsupported-feature failures are not counted as intended grammar rejection. The shipped formatter remains scaffold-only. Consequently C3 and C7 remain **IN_PROGRESS**. No normative syntax or semantics are changed to accommodate implementation gaps.

Machine-readable evidence:

- `ProofScript_C3_C7_Differential_Corpus_v0.2.json`
- `ProofScript_Lean4331_C3_C7_Oracle_Report_v0.2.json`
- `ProofScript_CurrentFrontend_C3_C7_Replay_v0.2.json`
- `ProofScript_C7_Parser_Formatter_Differential_Boundary_v0.2.md`
