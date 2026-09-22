# Appendix A — Complete Surface Feature Registry

Status: **Normative registry draft v0.7.0**

Every surface feature must be registered before it is implemented in the Lean-verified profile.

## A.1 Feature table

| ID | Class | ProofScript form | Canonical Lean concept | Compatibility cost | Status |
|---|---|---|---|---|---|
| L-CORE-LEAN | L | inherited Lean syntax | same Lean syntax | none | inherited |
| L-LEAN434-ERASED-DO | L | `erased` bindings in `do` | same Lean 4.34 syntax | none; verification-only erasure semantics must be preserved | inherited S1 |
| L-LEAN434-MONOTONICITY-BY | L | `monotonicity_by` declaration suffix | same Lean 4.34 syntax | contextual to coinductive/mixed cliques | inherited S1 |
| L-LEAN434-RECALL | L | `recall` / `recall?` | same Lean 4.34 commands | must not mutate the environment | inherited S1 |
| L-LEAN434-LIA-GROBNER-PARAMS | L | `lia [...]` / `grobner [...]` | same Lean 4.34 tactic syntax | tactic-category only | inherited S1 |
| D-CALL | D | `f(x, y)` | `f x y` | none for protected spaced application | admitted S1 |
| D-EXPLICIT-PARAMS | D | `(x : A, y : B)` in registered headers | `(x : A) (y : B)` | header grammar difference | admitted S1 |
| D-DECL-SEMI | D | declaration `;` in registered declarations | declaration boundary | category-specific only | admitted S1 |
| D-CONST-ALIAS | D | `const name : T := e;` | `def name : T := e` | contextual declaration-head alias | admitted S1 |
| D-FUNCTION-ALIAS | D | `function f(x : A) : T := e;` | `def f (x : A) : T := e` | contextual declaration-head alias | admitted S1 |
| E-IF-BRACE | E | `if (c) { t } else { e }` | `if c then t else e` | braces could be Lean term syntax elsewhere | admitted S1 |
| E-STRUCT-BODY | E | `structure S where { members }` | native structure body | outer braces differ from Lean structure-field syntax | admitted S1 |
| E-CLASS-BODY | E | `class C where { members }` | native class/structure body | same family as structure | admitted S1 |
| E-INDUCTIVE-BODY | E | `inductive T where { ctors }` | native constructor sequence | `.ps` owns braced constructor list | admitted S1 |
| E-MATCH-BODY | E | `match x with { alts }` | native match alternatives | brace/semicolon presentation differs | admitted S1 |
| E-WHERE-BODY | E | `where { decls }` | native local declarations | explicit delimiters/separators | admitted S1 |

## A.2 Lean 4.34 inherited-feature rule

The version-specific L IDs above are capability markers for features added or materially changed in the pinned Lean 4.34 line. They do **not** make those constructs ProofScript-owned syntax. The reference-Lean profile defers to Lean; a standalone profile may claim each ID independently only with the listed compatibility evidence.

## A.3 X — Semantic Divergence / Rejected X-class families

The following are not admitted into the Lean-verified core:

```text
JavaScript truthiness
TypeScript any / unknown as proof escape
implicit null / undefined semantics
prototype inheritance
JavaScript class semantics
unrestricted return
throw/catch as silent Lean effect replacement
Promise semantics as silent replacement for Lean IO/effects
<T> replacing Lean implicit/dependent binders
function hoisting
this binding
```

## A.4 Alias-specific rules

`const`:

- is a contextual declaration-head alias;
- requires no explicit declaration parameter group;
- may declare a value whose type is a function type;
- lowers to `def`;
- does not mean JavaScript object immutability.

`function`:

- is a contextual declaration-head alias;
- requires at least one explicit declaration parameter group;
- lowers to `def`;
- does not introduce JavaScript hoisting, `this`, prototypes, statement bodies, or unrestricted `return`.

## A.5 Registry evolution rule

A new feature requires:

1. stable ID;
2. class L/D/E/X;
3. exact source grammar;
4. canonical Lean lowering;
5. compatibility cost;
6. DX justification;
7. parser positive and negative cases;
8. lowering tests/theorems;
9. production-refinement obligation;
10. manifest inclusion.

## A.6 Machine-readable mirror

The normative prose registry is mirrored in:

```text
conformance/feature-registry.json
```

The JSON registry exists so compiler implementations, CI checks, and future proof tooling can fail closed on unknown or unregistered feature IDs.
