# The ProofScript Language Reference

Status: **Authoritative draft v0.6.1 — compiler-ready reference package**  
Semantic baseline: **Lean 4.33.1** (`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`)  
Documentation source studied: uploaded Lean Language Reference archive (`leanlangref.7z`, latest track observed as Lean 4.34.0-rc2) and ProofScript semantic-surface specification v0.5.2.  
Current evidence level: **S1 specified**. This document **MUST NOT claim S2** until the pinned Lean toolchain executes the reference parser/lowering proofs.

The keywords **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative when they appear in normative sections.

## 0. Reading guide and status

This reference defines the intended `.ps` source language for ProofScript. It is not a tutorial and it is not a copy of the Lean Language Reference. It is a ProofScript-authored language reference whose verified profile is defined by canonical lowering to Lean.

The governing principle is:

> **TypeScript-friendly syntax where it helps; Lean semantics wherever it matters.**

The central semantic equation is:

```text
meaningPS(p) := meaningLean(lower(p))
```

The reference separates four kinds of statements:

- **Normative syntax** — what `.ps` source may contain.
- **Canonical lowering** — what Lean artifact a `.ps` construct means.
- **Compatibility note** — where `.ps` deliberately differs from `.lean` source syntax.
- **Proof status** — whether a feature is merely specified, reference-proved, production-refined, or connected to a formal Lean model.

The full v0.6.1 surface is S1 specified. The included proof plan targets S2, but S2 is not claimed here.

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

A `.ps` file is processed command-by-command, not as one context-free file detached from Lean's environment.

```text
initial Lean/ProofScript frontend state
  ↓
parse command₁ using ProofScript + pinned Lean categories
  ↓
lower command₁ to canonical Lean
  ↓
Lean macro expansion / elaboration / kernel checking
  ↓
updated environment and syntax tables
  ↓
parse command₂ under the updated state
  ↓
...
```

The reference processing pipeline is:

```text
ProofScript source (.ps)
      ↓
ProofScript parser-category overlay over pinned Lean categories
      ↓
classified surface nodes (L/D/E)
      ↓
canonical reference lowering
      ↓
canonical Lean syntax
      ↓
pinned Lean macro expansion and elaboration
      ↓
Lean core expressions / declarations / environment
      ↓
pinned Lean kernel or selected formal checker
      ↓
optional backend artifacts such as TypeScript
```

ProofScript's Lean-verified profile MUST NOT insert another type system, theorem checker, or proof logic between canonical lowering and Lean elaboration.

The compiler SHOULD expose canonical Lean with a command such as:

```text
psc file.ps --emit-lean
```

That emitted Lean is both a trust artifact and a user-facing explanation tool.

## 3. Semantic authority and consistency

Lean is the semantic authority for the Lean-verified ProofScript profile.

ProofScript MUST NOT redefine:

- terms or types;
- universes;
- dependent functions;
- propositions or proofs;
- inductive types, constructors, recursors, or eliminators;
- pattern-matching semantics;
- definitional equality;
- recursion, termination, or positivity;
- coercions or typeclass synthesis;
- effect semantics;
- tactic semantics;
- theorem acceptance;
- kernel acceptance.

The theorem-level conservativity goal is environment-relative:

```text
ΓPS ⊢PS P
      ->
lowerEnv(ΓPS) ⊢Lean lower(P)
```

A valid relative consistency statement is:

```text
LeanConsistent(lowerEnv Γ)
      ->
PSConsistent(Γ)
```

This does not prove that the lowered Lean environment is consistent. Axioms, `sorryAx`, unsafe extensions, and trusted runtime boundaries remain visible trust assumptions.

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

This is not a v0.6.1 theorem goal:

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

`DEFER` does not mean “known native Lean.” It means ProofScript declines ownership and lets the active Lean grammar accept, reject, or resolve the fragment.

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

The following design is attractive but **not admitted in v0.6.1**:

```proofscript
function square(x : Nat) : Nat {
  x * x
}
```

If admitted later, it should be a registered D/E feature with explicit parser, lowering, and source-map obligations. It should lower to the same Lean declaration body, but the current v0.6.1 normative surface does not rely on it.

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
f/*c*/(x)   DEFER under the v0.6.1 adjacency policy
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

ProofScript-owned term features in v0.6.1 include:

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

## 15. Pattern matching

ProofScript accepts native Lean match syntax and admits a braced E-MATCH-BODY form:

```proofscript
function getOrElse(value : Option Nat, fallback : Nat) : Nat :=
  match value with {
    | .none => fallback;
    | .some x => x;
  };
```

Patterns remain native Lean in v0.6.1:

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

ProofScript v0.6.1 does not admit TypeScript arrow lambdas as normative syntax:

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

## 18. Effects, monads, and `do`

Lean effect semantics are inherited.

ProofScript may accept bracketed `do` syntax only if the pinned Lean 4.33.1 grammar confirms the supported form as inherited Lean, or if a future E-class rule admits and proves the exact lowering.

```proofscript
function greet(_ : Unit) : IO Unit := do {
  let name <- IO.getLine;
  IO.println(s!"Hello {name}");
};
```

`return` is not a universal early return. It retains Lean's `do`-notation meaning and is valid only in Lean contexts where it is meaningful.

Mutable locals, loops, `break`, `continue`, exceptions, and monadic sequencing retain Lean's meanings. ProofScript does not silently replace Lean effects with JavaScript `Promise` semantics.

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

v0.6.1 does not admit `namespace Math { ... }` or `section { ... }` because command scopes interact with incremental environment state.

Attributes, modifiers, options, and imports are inherited through the pinned Lean command grammar unless separately classified.

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

A verified release MUST record:

```text
proofscript_spec_version
proofscript_compiler_revision
lean_version
lean_commit
formal_model_revision
surface_feature_registry_version
axiom_policy
runtime_profile_revision
```

ProofScript tooling SHOULD expose axiom dependencies for theorem claims and MUST distinguish:

- no axioms;
- standard Lean axioms only;
- declared project axioms;
- `sorryAx` dependencies;
- unsafe/trusted runtime assumptions.

For adversarial or high-assurance validation, the project should use independent checking of the emitted Lean artifact or selected formal checker artifacts.

## 27. Build tools and packages

ProofScript packages may contain:

```text
.ps source files
.psx target-specific source files
.lean canonical artifacts
.ts emitted TypeScript artifacts
proof manifests
runtime package declarations
```

A package manager integration may distribute `.ps` libraries through npm-like workflows, but the proof manifest must state which artifacts are verified and which are merely executable.

Potential commands:

```text
psc check file.ps
psc file.ps --emit-lean
psc buildts file.ps
psc buildtslean file.ps
psc certify package
```

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
D-CALL is S2 reference-proved against Lean 4.33.1.
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

## 31. Current limitations

v0.6.1 is an authoritative draft derived from v0.5.2 and the Lean reference study. It is not yet a machine-checked implementation.

Still required for S2:

- exact Lean 4.33.1 parser/toolchain execution;
- reference parser implementation;
- D-CALL lowering proof;
- D declaration-header/alias parser proofs;
- E-class parser/lowering proofs;
- category-lifting proof obligations;
- stateful command driver tests;
- protected-neighbor and third-party-collision tests;
- no `sorry`/`admit` in claimed theorem files.

## 32. References used

Primary design inputs:

- Uploaded Lean Language Reference archive: `leanlangref.7z`.
- Current ProofScript v0.5.2 semantic-surface package.
- Lean official reference documentation for processing model, syntax/macro extension, function application, type system, definitions, tactic proofs, axioms, and proof validation.

See Appendix B for the Lean coverage map and Appendix F for the version-manifest template.
## 25. Conformance artifacts and implementation readiness

v0.6.1 adds a conformance layer so the reference can guide implementation, not only prose review.

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

