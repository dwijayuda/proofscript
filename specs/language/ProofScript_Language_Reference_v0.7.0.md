# The ProofScript Language Reference

Status: **Authoritative draft v0.7.0 — compiler-ready reference package**  
Semantic baseline: **Lean 4.34.0** (`293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`)  
Documentation source studied: Lean 4.34.0 stable source/reference material, the prior v0.6.1 reference, and current ProofScript implementation evidence. Lean 4.35.0-rc2 is tracked only as a non-normative next-release watch.  
Current evidence level: **S1 specified**. This document **MUST NOT claim S2** until the pinned Lean toolchain executes the reference parser/lowering proofs.

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative when they appear in normative sections.

## 0. Reading guide and status

This reference defines the intended `.ps` source language for ProofScript. It is not a tutorial and it is not a copy of the Lean Language Reference. It is a ProofScript-authored language reference whose verified profile is defined by canonical lowering to Lean.

The governing principle is:

> **TypeScript-friendly syntax where it helps; Lean semantics wherever it matters.**

The central semantic equation is:

```text
meaningPS(p) := meaningLean434(canonicalLower(p))
```

The reference separates four kinds of statements:

- **Normative syntax** — what `.ps` source may contain.
- **Canonical lowering** — what Lean artifact a `.ps` construct means.
- **Compatibility note** — where `.ps` deliberately differs from `.lean` source syntax.
- **Proof status** — whether a feature is merely specified, reference-proved, production-refined, or connected to a formal Lean model.

The full v0.7.0 surface is S1 specified. The included proof plan targets S2, but S2 is not claimed here.

## 1. Design philosophy

ProofScript is a programming language and theorem-proving surface built around Lean semantics. Its purpose is to make verified programming and theorem proving approachable for TypeScript-oriented developers without importing TypeScript's unsound escape hatches or JavaScript runtime model.

ProofScript is not:

- a second Lean kernel;
- TypeScript with dependent types bolted on;
- a textual preprocessor that blindly rewrites punctuation;
- a language where JavaScript `return`, `this`, prototypes, truthiness, `any`, `null`, or `undefined` silently acquire proof-theoretic meaning.

ProofScript is:

- a TypeScript-friendly source surface;
- a Lean-semantic language profile;
- a syntax-directed lowering system;
- a proof and compiler architecture whose trust boundary can be described, tested, and eventually machine-checked.

Important Lean concepts keep Lean names when the name teaches the semantic model: `Prop`, `Type`, `def`, `theorem`, `inductive`, `structure`, `class`, `instance`, `where`, `match`, `with`, `fun`, `by`, `do`, `:=`, `=`, and `==`.

## 2. Processing model and trust boundary

ProofScript v0.7.0 defines semantics, not a mandatory implementation dependency on the Lean executable.

The normative meaning of the Lean-compatible profile is given by canonical lowering into the pinned Lean 4.34.0 semantics. A conforming implementation may realize that meaning through either profile below.

### 2.1 Reference Lean profile

```text
ProofScript source (.ps)
  -> ProofScript parser/category overlay
  -> canonical reference lowering
  -> Lean 4.34.0 elaboration
  -> Lean core declarations
  -> Lean 4.34.0 kernel
```

This path is the reference oracle where Lean frontend behavior is part of a claimed feature.

### 2.2 Standalone pskernel profile

```text
ProofScript source (.ps)
  -> @proofscript/syntax
  -> @proofscript/meta + @proofscript/elab
  -> Lean-compatible core declarations
  -> pskernel
  -> checked Environment / portable module artifact
```

A standalone implementation MUST NOT invent different logical semantics merely because Lean is absent at runtime. It MUST preserve the pinned compatible semantics for every claimed feature.

The standalone path changes implementation dependency, not semantic authority.

### 2.3 Trust separation

Parser, elaborator, tactics, compiler backends, language servers, package managers, browser hosts, and formatters are outside the default logical TCB. Their outputs become trusted only after kernel declaration admission.

pskernel is an independent checker targeting Lean 4.34 semantics. Empirical compatibility evidence does not by itself establish formal equivalence.

The compiler SHOULD expose canonical Lean or an equivalent canonical-core trace wherever the active profile defines such a lowering.

## 3. Semantic authority and consistency

Lean 4.34.0 stable at `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b` is the normative semantic baseline for v0.7.0.

Lean 4.35.0-rc2 at `11acb17ec6b07a8f9e9173e6845197929540936b` is a compatibility-watch target only. RC behavior MUST NOT silently redefine v0.7.0. Rebasing to a newer stable Lean requires an explicit reference revision and regenerated evidence.

ProofScript MUST NOT redefine, for the Lean-compatible profile:

- terms or types;
- universes and dependent functions;
- propositions or proofs;
- inductive types, constructors, recursors, eliminators, or quotients;
- pattern-matching semantics;
- definitional equality;
- recursion, termination, or positivity;
- coercions or typeclass synthesis;
- effect semantics;
- theorem or kernel acceptance.

The theorem-level conservativity goal remains environment-relative:

```text
ΓPS ⊢PS P
  ->
canonicalLowerEnv(ΓPS) ⊢Lean4.34 canonicalLower(P)
```

A standalone implementation additionally owes refinement/compatibility evidence for the claimed profile. Axioms, `sorryAx`, native proof-evaluation/tactic trust assumptions, and trusted runtime/compiler boundaries remain explicit trust assumptions.

Final Lean 4.34 removed the deprecated `Lean.reduceBool`, `Lean.reduceNat`, `Lean.ofReduceBool`, `Lean.ofReduceNat`, and `Lean.trustCompiler` declarations together with the kernel/Meta native-reduction hooks. Therefore native compiler evaluation is **not** part of v0.7.0 definitional equality or kernel WHNF semantics. Native proof tactics, when used, belong to the meta/tactic trust boundary rather than the kernel reduction relation.

## 4. Surface classes: L, D, E, X

Every accepted ProofScript surface feature belongs to exactly one public class.

| Class | Name | Meaning |
|---|---|---|
| L | Inherited Lean | Existing Lean syntax accepted with Lean meaning. |
| D | Conservative Decoration | New ProofScript syntax with a discriminator that does not displace a protected native Lean neighbor. |
| E | Surface Exception | `.ps` intentionally owns a context-specific spelling that may differ from valid `.lean` parsing but lowers deterministically to Lean. |
| X | Semantic Divergence | Would introduce non-Lean semantics; forbidden in the Lean-verified core. |

The class is not cosmetic. It determines parser ownership, compatibility claims, test obligations, and proof obligations.

Examples:

```text
L: :=, =, ==, {α : Type}, [Monad m], fun, by, do, namespace ... end
D: f(x, y), def f(x : A, y : B), const value : A := e, function f(x : A)
E: if (c) { t } else { e }, structure S where { ... }, match x with { ... }
X: JavaScript truthiness, TypeScript any as proof escape, unrestricted return
```

## 5. Source compatibility policy

ProofScript source compatibility with Lean source is a default preference, not a hard law.

For L-class syntax, source compatibility is expected. For D-class syntax, the decorated spelling may be ProofScript-only, but protected neighboring Lean forms must be preserved. For E-class syntax, the source incompatibility is intentional and documented. X-class features are rejected.

This is not a v0.7.0 theorem goal:

```text
∀ s, validLean(s) -> parsePS(s) = parseLean(s)
```

Instead, the relevant goals are:

```text
InheritedSourceCompatible(feature)
ProtectedNeighborPreserved(decoration)
ExceptionCompatibilityCostDocumented(exceptionID)
```

## 6. Lexical syntax and punctuation

ProofScript inherits Lean lexical syntax unless a registered D/E feature states otherwise.

Important punctuation laws:

- `:=` remains definition/binding/update syntax where Lean uses it.
- `=` remains propositional equality.
- `==` remains Boolean equality through Lean mechanisms such as `BEq`.
- `{}` is category-specific; it is not a universal JavaScript block.
- `;` is category-specific; it is never globally erased.
- `()` in expression position is ordinary Lean grouping unless owned by a registered call/header grammar.
- Comments and whitespace may affect D-CALL ownership because adjacency is syntactic.

Global textual rewriting is forbidden. The frontend MUST NOT implement ProofScript by rules such as:

```text
replace all `;`
replace all `{`
insert spaces before every `(`
strip every `then`
```

Lowering is syntax-directed and category-aware.

## 7. Parser integration model

The reference frontend extends pinned Lean parser categories recursively. It does not parse arbitrary Lean subterms as opaque strings.

For each category, the ownership order is:

```text
1. registered E-class production in its exact context
2. registered D-class production whose discriminator holds
3. DEFER to the active pinned Lean category
4. reject unresolved ProofScript-owned ambiguity
```

`DEFER` does not mean “known native Lean.” In the reference profile, ProofScript declines ownership and lets the pinned Lean 4.34 grammar decide. In the standalone profile, the TypeScript parser MUST implement or validate the same inherited subset claimed by that profile; unknown text is not automatically valid merely because no Lean process is present.

The central category-lifting idea is:

```text
LIFT(P) = pinned Lean production P
          with selected recursive child categories replaced by their ProofScript-extended versions,
          preserving every other child/category unchanged
```

For terms:

```text
PS_TERM := LIFT(PINNED_LEAN_TERM)
        + registered D-term extensions
        + registered E-term extensions
```

For commands:

```text
PS_COMMAND := ProofScript-owned declaration/header productions
           + DEFER(command)
```

Term extensions do not automatically extend patterns, tactics, do-elements, or command syntax.

## 8. Declarations

### 8.1 Canonical declaration keyword: `def`

`def` is the canonical general declaration keyword.

```proofscript
def answer : Nat := 42;

def add(x : Nat, y : Nat) : Nat :=
  x + y;
```

Canonical Lean:

```lean
def answer : Nat := 42

def add (x : Nat) (y : Nat) : Nat :=
  x + y
```

A semicolon terminates expression-bodied decorated declarations. Semicolons are not global and do not apply inside arbitrary Lean syntax.

### 8.2 `const` alias

`const` is a parameterless `def` alias. It lowers to Lean `def` and introduces no new declaration kind.

```proofscript
const answer : Nat := 42;
const increment : Nat -> Nat := fun x => x + 1;
```

Canonical Lean:

```lean
def answer : Nat := 42
def increment : Nat -> Nat := fun x => x + 1
```

`const` describes the declaration form, not the value's type. A `const` may have a function type.

Rejected:

```proofscript
const add(x : Nat, y : Nat) : Nat := x + y;
```

because a declaration with explicit declaration parameters should use `def` or `function`.

`const` does not mean JavaScript object-immutability semantics.

### 8.3 `function` alias

`function` is a parameterized `def` alias. It requires at least one explicit declaration parameter group and lowers to Lean `def`.

```proofscript
function add(x : Nat, y : Nat) : Nat :=
  x + y;

function identity {α : Type}(x : α) : α :=
  x;
```

Canonical Lean:

```lean
def add (x : Nat) (y : Nat) : Nat :=
  x + y

def identity {α : Type} (x : α) : α :=
  x
```

Rejected:

```proofscript
function answer : Nat := 42;
```

because there is no explicit parameter group.

`function` does not introduce JavaScript hoisting, `this`, prototypes, statement-body semantics, or unrestricted `return`.

### 8.4 Other definition-like declarations

ProofScript inherits Lean's distinction among `def`, `abbrev`, `example`, `theorem`, and `opaque` unless a registered ProofScript rule says otherwise. The initial declaration aliases canonicalize only to Lean `def`, not to theorem, opaque, abbrev, or example.

### 8.5 Expression-bodied declarations

The current admitted form is:

```proofscript
function square(x : Nat) : Nat :=
  x * x;
```

The semicolon terminates the ProofScript-owned declaration syntax.

### 8.6 Candidate: block-bodied declarations

The following design is attractive but **not admitted in v0.7.0**:

```proofscript
function square(x : Nat) : Nat {
  x * x
}
```

If admitted later, it should be a registered D/E feature with explicit parser, lowering, and source-map obligations. It should lower to the same Lean declaration body, but the current v0.7.0 normative surface does not rely on it.

## 9. Binders and parameters

Lean binder categories remain semantic.

```proofscript
(x : A)        -- explicit binder
{α : Type}     -- implicit binder
{{α : Type}}   -- strict implicit binder
[C α]          -- instance implicit binder
```

ProofScript may comma-group complete explicit binders in registered declaration/header contexts:

```proofscript
function get(n : Nat, i : Fin n) : Fin n :=
  i;
```

Canonical Lean:

```lean
def get (n : Nat) (i : Fin n) : Fin n :=
  i
```

Order is semantically relevant and MUST be preserved.

ProofScript does not replace Lean implicit binders with TypeScript `<T>` syntax:

```proofscript
function identity {α : Type}(x : α) : α := x;
```

not:

```typescript
identity<T>(x)
```

## 10. Function application

D-CALL is the flagship ProofScript decoration.

```proofscript
add(1, 2)
normalize(transform(x))
f()
f((x, y))
```

Lowering:

```lean
add 1 2
normalize (transform x)
f ()
f (x, y)
```

Lean functions are unary at the core level; multiple arguments are represented by currying. Therefore:

```text
f(x, y)  ->  (f x) y
```

not an n-ary application primitive.

The tuple distinction is mandatory:

```proofscript
f(x, y)     -- two curried arguments
f((x, y))   -- one tuple argument through ProofScript call syntax
f (x, y)    -- deferred Lean syntax: one tuple argument by ordinary Lean application
```

The opening `(` is call syntax only when the adjacency discriminator holds. Whitespace or comments between the callable head and `(` cause ProofScript to defer.

```text
f(x)        D-CALL
f (x)       DEFER
f/*c*/(x)   DEFER under the v0.7.0 adjacency policy
```

## 11. Terms

ProofScript terms are Lean terms plus registered D/E term forms.

Inherited Lean term features include, subject to pinned Lean support:

- identifiers;
- literals;
- type ascription;
- function types;
- lambdas with `fun`;
- `let`;
- structures and constructors;
- native conditionals;
- native pattern matching;
- proof terms;
- holes;
- quotations/antiquotations where admitted by the Lean profile.

ProofScript-owned term features in v0.7.0 include:

- D-CALL: `f(x, y)`;
- E-IF-BRACE: `if (c) { t } else { e }`;
- E-MATCH-BODY: `match x with { | p => rhs; }`.

## 12. Conditionals

ProofScript accepts native Lean conditionals through defer:

```proofscript
if c then t else e
```

ProofScript also admits E-IF-BRACE:

```proofscript
if (c) {
  t
} else {
  e
}
```

Canonical Lean:

```lean
if c then
  t
else
  e
```

The condition must be parenthesized in the E form. Each branch contains exactly one term. The braces do not create JavaScript statement semantics.

Rejected as a generic statement block:

```proofscript
if (c) {
  x;
  y;
} else {
  z
}
```

Sequencing requires an inherited Lean sequencing construct such as `do`.

Lean remains responsible for deciding whether the condition is a proposition with a `Decidable` instance or a Boolean coerced appropriately.

## 13. Structures, classes, and instances

### 13.1 Structures

ProofScript admits an E-class braced structure body:

```proofscript
structure Point where {
  x : Float;
  y : Float;
}
```

Canonical Lean:

```lean
structure Point where
  x : Float
  y : Float
```

The outer braces delimit the ProofScript structure body. Field semantics, constructor generation, projections, updates, and record behavior remain Lean's.

Implicit and instance fields may appear inside the braced body using Lean binder syntax:

```proofscript
structure Box where {
  {α : Type};
  [showα : ToString α];
  value : α;
}
```

Canonical Lean:

```lean
structure Box where
  {α : Type}
  [showα : ToString α]
  value : α
```

### 13.2 Structure values and updates

Structure value/update syntax is inherited Lean, not a generic ProofScript block:

```proofscript
const origin : Point := { x := 0, y := 0 };

function moveX(p : Point, dx : Float) : Point :=
  { p with x := p.x + dx };
```

### 13.3 Classes and instances

Classes are Lean typeclasses, not JavaScript classes.

```proofscript
class Sized(α : Type) where {
  size : α -> Nat;
}

instance : Sized String where {
  size(s : String) : Nat := s.length;
}
```

Canonical lowering preserves Lean class/instance semantics.

ProofScript does not introduce `constructor`, `extends`, `static`, prototype, or `this` semantics in the Lean-verified profile.

## 14. Inductive types and constructors

ProofScript admits an E-class braced inductive body:

```proofscript
inductive Result(α : Type, ε : Type) where {
  | ok(value : α);
  | error(error : ε);
}
```

Canonical Lean:

```lean
inductive Result (α : Type) (ε : Type) where
  | ok (value : α)
  | error (error : ε)
```

Constructor order, parameters, indices, result types, positivity, universe behavior, generated recursors, and elimination principles are Lean's responsibility after lowering.

Constructor declaration parameter decoration does not imply TypeScript-like pattern syntax.

Lean 4.34 also adds the native declaration suffix `monotonicity_by` for coinductive predicates and inductive declarations participating in mixed coinductive cliques. In the reference-Lean profile this is inherited L-class syntax. v0.7.0 introduces no alternate ProofScript spelling. A standalone frontend may claim this capability only when it preserves Lean 4.34's placement restrictions and tactic-elaboration meaning.

## 15. Pattern matching

ProofScript accepts native Lean match syntax and admits a braced E-MATCH-BODY form:

```proofscript
function getOrElse(value : Option Nat, fallback : Nat) : Nat :=
  match value with {
    | .none => fallback;
    | .some x => x;
  };
```

Patterns remain native Lean in v0.7.0:

```proofscript
| .some x => x
```

not:

```proofscript
| .some(x) => x
```

Right-hand sides recursively use the ProofScript term category:

```proofscript
match value with {
  | .some x => normalize(transform(x));
  | .none => default;
}
```

## 16. Lambdas and function types

Anonymous functions use Lean `fun`:

```proofscript
fun x => x + 1
fun (x : Nat) => x + 1
```

Function types use Lean arrows:

```proofscript
Nat -> Nat
(x : Nat) -> Fin x -> Nat
```

ProofScript v0.7.0 does not admit TypeScript arrow lambdas as normative syntax:

```typescript
(x) => x + 1
```

The reason is not parser impossibility. The reason is semantic clarity: `fun` is easy to learn and marks a true Lean lambda.

## 17. Proofs and tactics

Theorems retain Lean vocabulary and proof structure:

```proofscript
theorem addZero(n : Nat) : n + 0 = n := by {
  simp
}
```

Tactic syntax is inherited Lean unless a future tactic-specific ProofScript extension is admitted. Term-level semicolon and brace rules do not apply inside tactic parsing.

The tactic language constructs proof terms. The kernel checks the resulting proof artifacts. A tactic bug should not become a proof-system inconsistency if the kernel boundary is respected.

Lean 4.34 extends inherited tactic syntax so `lia` and `grobner` may take Grind-style parameter lists such as `lia [h]` and `grobner [= lemma]`. These are L-class tactic forms. ProofScript does not reinterpret the bracket syntax; a standalone tactic package may support them only with the corresponding Lean 4.34 elaboration behavior.

## 18. Effects, monads, and `do`

Lean effect semantics are inherited.

ProofScript may accept bracketed `do` syntax only if the pinned Lean 4.34.0 grammar confirms the supported form as inherited Lean, or if a future E-class rule admits and proves the exact lowering.

```proofscript
function greet(_ : Unit) : IO Unit := do {
  let name <- IO.getLine;
  IO.println(s!"Hello {name}");
};
```

`return` is not a universal early return. It retains Lean's `do`-notation meaning and is valid only in Lean contexts where it is meaningful.

Mutable locals, loops, `break`, `continue`, exceptions, and monadic sequencing retain Lean's meanings. ProofScript does not silently replace Lean effects with JavaScript `Promise` semantics.

### 18.1 Lean 4.34 verification-only `erased` bindings

Lean 4.34 adds inherited `do` elements for verification-only state:

```lean
do
  erased x := e
  erased mut y : Nat := 0
  erased z ← action
  ...
```

These bindings are backed by Lean's `Erased` mechanism: verification constructs such as loop invariants and assertions may use them while executable code does not carry their logical value as ordinary runtime state.

For ProofScript:

- the reference-Lean profile treats these forms as L-class syntax;
- a standalone frontend MUST preserve verification-only scope and erasure if it accepts them;
- future ProofScript `ghost` syntax MUST document whether it lowers to this Lean mechanism or has a distinct verified lowering;
- the TypeScript backend MUST NOT accidentally reify erased proof-only values into observable JavaScript state.

## 19. Basic propositions and logic

ProofScript inherits Lean's propositions-as-types foundation.

`Prop` remains Lean `Prop`. A theorem statement is a type in `Prop`, and a proof is a term inhabiting that type.

```proofscript
theorem selfEq {α : Type}(x : α) : x = x := by {
  rfl
}
```

Logical connectives, quantifiers, equality, and decidability are inherited from Lean. ProofScript does not add a separate Boolean/proposition logic.

## 20. Basic types and literals

The verified core preserves Lean primitive/foundational names:

```text
Nat Int UInt8 UInt16 UInt32 UInt64 USize Float Bool Char String Unit
```

Other inherited standard types include, when available in the selected profile:

```text
Option List Array ByteArray Subtype Fin
```

The TypeScript backend may use runtime representations, but the Lean-verified meaning of these types remains the corresponding Lean meaning. Backend correspondence is a separate executable-profile obligation.

## 21. Typeclasses and coercions

ProofScript inherits Lean typeclass synthesis and coercion insertion.

Instance binders remain Lean syntax:

```proofscript
function showTwice {α : Type}[ToString α](x : α) : String :=
  ToString.toString(x) ++ ToString.toString(x);
```

ProofScript does not replace typeclasses with TypeScript interfaces. A future TypeScript backend may generate interfaces or runtime dictionaries as implementation artifacts, but that does not change the verified Lean meaning.

## 22. Namespaces, sections, imports, attributes, and options

ProofScript retains native Lean command scoping:

```proofscript
namespace Math

function square(x : Nat) : Nat := x * x;

theorem squareZero : square(0) = 0 := by {
  rfl
}

end Math
```

v0.7.0 does not admit `namespace Math { ... }` or `section { ... }` because command scopes interact with incremental environment state.

Attributes, modifiers, options, and imports are inherited through the pinned Lean command grammar unless separately classified.

Lean 4.34 also includes the built-in `recall` and `recall?` commands for checked restatements of existing declarations. In the reference-Lean profile they are inherited L-class commands. Their defining property is that the displayed type/value is checked for definitional equality with the existing declaration without introducing a new declaration. A standalone implementation claiming support MUST preserve that non-mutating environment behavior.

## 23. Notations, macros, and language extensions

ProofScript exists in a Lean ecosystem where syntax can be extended. Therefore it must be explicit about ownership.

- Inside a registered ProofScript D/E context, ProofScript owns the specified source pattern.
- Outside owned contexts, ProofScript defers to Lean.
- If imported third-party syntax collides with a registered D/E context in a way that would affect verified interpretation, the verified profile fails closed unless compatibility is registered.

ProofScript macros must lower to canonical Lean or be rejected from the Lean-verified profile. A macro that produces unchecked assumptions, bypasses the lowerer, or hides semantic divergence is forbidden.

## 24. TypeScript executable profile

The Lean-verified profile and executable TypeScript profile are related but distinct.

The Lean-verified profile answers:

```text
What does this ProofScript program mean logically?
```

The TypeScript executable profile answers:

```text
Does emitted TypeScript/JavaScript compute according to the Lean executable meaning for the supported executable subset?
```

The TypeScript backend MUST define runtime representations for supported executable types, including `Nat`, `Int`, `Bool`, `String`, `Unit`, `Option`, arrays/lists, and user inductives/structures.

It MUST NOT silently replace Lean semantics with JavaScript semantics. For example:

- `Nat` is not arbitrary JS `number` without overflow/precision policy.
- `Int` needs a precise representation policy.
- `==` must follow the specified Lean/BEq meaning, not JavaScript loose equality.
- `Option` is not implicit `null`/`undefined`.
- effects must have a declared correspondence model.

## 25. Diagnostics, source maps, formatter, and IDE behavior

ProofScript's product goal includes developer friendliness. Therefore frontend correctness also includes user-facing correctness.

The reference names these separate non-kernel properties:

```text
SourceMapCorrectness
DiagnosticLocationCorrectness
FormatterRoundtrip
HoverBindingCorrectness
CanonicalLeanTraceability
```

Generated punctuation and keywords may use synthetic source positions, but recursively embedded user syntax must preserve source association, binding identity, and hygiene information needed for elaboration and diagnostics.

A ProofScript error should point to `.ps` source locations whenever possible, not only to generated Lean.

## 26. Trust, axioms, and validation

A verified release MUST record distinct version axes:

```text
proofscript_spec_version
proofscript_compiler_revision
proofscript_module_format_version
pskernel_api_version
lean_semantics_version
lean_semantics_commit
implementation_profile
formal_model_revision
surface_feature_registry_version
axiom_policy
runtime_profile_revision
```

These fields MUST NOT be collapsed into one package semver.

Tooling SHOULD expose theorem axiom dependencies and MUST distinguish ordinary axioms, project axioms, `sorryAx`, unsafe/trusted runtime assumptions, and native/meta proof-evaluation assumptions such as those used by native proof tactics. Final Lean 4.34 has no `NativeEvaluator`-style kernel reduction extension.

High-assurance releases SHOULD use independent checking against the pinned Lean oracle and/or other compatible checkers in addition to pskernel.

## 27. Build tools, packages, and portable modules

ProofScript is intended to live naturally in the JavaScript/npm ecosystem while retaining Lean-compatible logical semantics.

Package artifacts may contain:

```text
.ps          ProofScript source
.psx         explicitly target-specific/non-Lean-compatible source
.lean        canonical/reference Lean artifact
.ts/.js      emitted executable TypeScript/JavaScript
.psmodule    portable checked-module artifact
manifests    hashes, dependencies, compatibility and assurance metadata
```

Recommended layering:

```text
@proofscript/syntax -> @proofscript/meta -> @proofscript/elab -> pskernel
                                             |
                                             +-> @proofscript/module

checked declarations -> @proofscript/compiler-ir -> @proofscript/backend-ts
                                             |
                                             +-> @proofscript/runtime

syntax/meta/elab/module -> @proofscript/language -> @proofscript/lsp
```

Portable modules SHOULD record module-format version, semantic/kernel compatibility, dependency hashes, deterministic declaration payload, integrity hash, and optional non-logical metadata. A valid hash MUST NOT bypass kernel declaration admission.

npm is the package/dependency substrate. ProofScript SHOULD build on npm/package.json rather than clone Lake as a second package manager.

Official JavaScript-ecosystem package implementation source SHOULD be authored in TypeScript, checked strictly, and emitted as ESM JavaScript. Hand-authored `.mjs` package implementations require an explicit exception.

## 28. Claim ladder

ProofScript claim levels are:

| Level | Meaning |
|---|---|
| S1 specified | Grammar, feature class, lowering, compatibility cost, and proof obligation documented. |
| S2 reference-proved | Reference parser/lowering properties machine-checked for the claimed features. |
| S3 production-refined | Shipped frontend proved or certification-compared against the reference frontend. |
| S4 formal-model connected | Lowered artifacts connected to a pinned formal Lean typing/checking model. |
| S5 official-implementation correspondence | Formal model correspondence with the exact pinned official Lean implementation established for the claimed scope. |

Public claims MUST name the exact highest achieved level.

Avoid:

```text
ProofScript is fully equivalent to Lean.
```

Prefer:

```text
D-CALL is S2 reference-proved against Lean 4.34.0.
```

or:

```text
E-IF-BRACE is S1 specified and lowers canonically to Lean `if`; source compatibility cost is documented.
```

## 29. Feature registry summary

The complete registry is Appendix A. Current admitted D/E features:

```text
D-CALL
D-EXPLICIT-PARAMS
D-DECL-SEMI
D-CONST-ALIAS
D-FUNCTION-ALIAS
E-IF-BRACE
E-STRUCT-BODY
E-CLASS-BODY
E-INDUCTIVE-BODY
E-MATCH-BODY
E-WHERE-BODY
```

Current rejected X families include:

```text
JavaScript truthiness
TypeScript any as proof escape
implicit null/undefined option semantics
prototype inheritance
unrestricted JavaScript return
Promise semantics silently replacing Lean effects
<T> replacing Lean implicit/dependent binders
```

## 30. Minimum conformance suite

An implementation claiming conformance to this reference MUST, at minimum, test:

```text
const answer : Nat := 42;
const increment : Nat -> Nat := fun x => x + 1;
function add(x : Nat, y : Nat) : Nat := x + y;
function answer : Nat := 42;                  -- rejected
const add(x : Nat, y : Nat) : Nat := x + y;   -- rejected
f(x)
f(x,y)
f()
f (x)
f (x,y)
f/*comment*/(x)
fun x => f(x)
g(f(x), h(y))
if (c) {t} else {e}
if c then t else e
structure Point where { x : Nat; y : Nat; }
structure Box where { {α : Type}; [ToString α]; value : α; }
inductive Result(α : Type, ε : Type) where { | ok(value : α); | error(error : ε); }
match value with { | .none => default; | .some x => f(x); }
```

## 31. Current limitations and next evidence

v0.7.0 is an authoritative candidate aligned to Lean 4.34.0 stable. It remains S1 specified until the relevant parser/lowering/refinement obligations are discharged.

Still required before stronger source-language claims:

- reference Lean 4.34 frontend/lowering evidence for inherited/DEFER behavior;
- standalone TypeScript parser/elaborator differential evidence;
- D/E lowering and protected-neighbor obligations;
- stateful command/import tests;
- third-party syntax collision tests;
- no `sorry`/`admit` in theorem files used for stronger claimed levels;
- separate formal evidence before any claim that pskernel is formally equivalent to the Lean 4.34 kernel.

Kernel compatibility evidence and source-frontend conformance remain separate evidence tracks.

## 32. References used

Primary current inputs:

- Lean 4.34.0 stable at `293d5d0c0c3f3dded4688b3ccd6a33939ac5102b`.
- prior ProofScript Language Reference v0.6.1 and its compiler-ready conformance artifacts;
- current ProofScript/pskernel implementation evidence for the standalone JavaScript ecosystem architecture;
- Lean 4.35.0-rc2 at `11acb17ec6b07a8f9e9173e6845197929540936b` as a non-normative compatibility watch only.

See Appendix B for the Lean coverage map, Appendix F for the version-manifest template, Appendix J for implementation/package architecture, and Appendix K for the stable Lean 4.34 delta audit.

## 33. Conformance artifacts and implementation readiness

v0.7.0 adds a conformance layer so the reference can guide implementation, not only prose review.

The normative machine-readable registry is:

```text
conformance/feature-registry.json
```

It records each admitted L/D/E feature, its canonical Lean lowering, current claim level, and proof obligations. The schema is:

```text
conformance/feature-registry.schema.json
```

The conformance corpus is split into:

```text
conformance/cases/positive.jsonl
conformance/cases/negative.jsonl
conformance/cases/lowering.jsonl
```

A production implementation MUST NOT claim conformance merely because it accepts similar-looking examples. It must classify owned syntax by feature ID, reject unregistered exceptions, and emit canonical Lean matching the reference relation.

The initial build order is:

1. load and validate the registry/corpus;
2. implement D-CALL reference lowering;
3. implement declaration aliases and explicit parameters;
4. implement E-IF-BRACE;
5. implement braced declarations;
6. implement E-MATCH-BODY;
7. add stateful Lean parser integration;
8. compare production and reference frontend outputs.

This chapter does not raise the proof claim above S1. It makes S2/S3 work more concrete.

