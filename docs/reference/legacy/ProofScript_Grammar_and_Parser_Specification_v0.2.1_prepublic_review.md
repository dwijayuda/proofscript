# ProofScript Grammar and Parser Specification

**Version:** v0.2.1-prepublic-review-4  
**Semantic baseline:** Lean 4.33.1  
**Pinned Lean revision:** `819816b2e0a3bf405af45ae5c7af2491d8f5bee6`  
**Status:** pre-public review-4 draft; canonical syntax and trust wording under review; standalone implementation conformance remains separate

This document isolates the grammar/parser material used by the ProofScript v0.2 language specification. It is derived from the authoritative v0.2 reference and exists so the public Language Reference can remain readable without hiding parser requirements.

ProofScript inherits Lean's extensible, command-by-command parsing model. Consequently a static EBNF alone is not a complete grammar specification. A complete standalone parser requires a finite bootstrap plus dynamic syntax/category/precedence/environment state.

## Closure status

| Gate | Scope | Status |
|---|---|---|
| G1 | lexical/token and whitespace/comment mechanism | normative mechanism; exact environment token snapshots remain conformance evidence |
| G2 | complete built-in Lean 4.33.1 production inventory | **INVENTORY COMPLETE / CONFORMANCE IN_PROGRESS** |
| G3 | exact built-in/imported precedence inventory | **COMPLETE for pinned standard parser environment (C4 PASS)** |
| G4 | dynamic syntax/notation/operator extension protocol | stable concept; standalone coverage provisional |
| G5 | quotation/macro/scope observability | normative concept; implementation coverage separately reported |
| G6 | formatter/parser roundtrip | normative gate |
| G7 | executable-reference differential replay | conformance gate |

G3 is closed for the pinned standard parser environment. G2 production-root accounting is complete, while standalone grammar conformance remains in progress; this remaining evidence gap is not a known logical contradiction.

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

# Bootstrap and Canonical Grammar

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
| final-source-extent declaration closure policy | **PROPOSED STABLE** | a declaration needs `;` only when its final source extent is non-self-delimiting |
| grouped application `f(a, b)` and rejection of `f()` | **STABLE** | normalization to curried `App` is explicit |
| canonical `match (...) { | ... => ... }` branch boundary | **STABLE** | branch-level `;`/`,` are forbidden; nested RHS categories own their punctuation |
| Option B `inductive ... where { ... }` constructor boundaries; no canonical constructor `;` | **PROPOSED STABLE** | each constructor already begins with a strong `|` marker; formatter removes legacy constructor semicolons |
| Option B `structure` / `class` `where { ... }` field `;` separators | **STABLE** | canonical examples and grammar use declaration-list punctuation inside the braced-where region |
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

-- Canonical Option B declaration lists keep Lean `where` and use braces for explicit boundaries.
-- Inductive constructors are introduced by `|`; no canonical semicolon is written.
-- A constructor entry ends when its signature parser returns and the parent parser
-- sees the next top-level `|` or `}`. Structure/class fields still require `;`
-- because they do not have a mandatory constructor-marker introducer.
inductiveDeclaration ::= modifiers? "inductive" declId binder* resultType?
                         "where" "{" inductiveConstructor* "}" inductiveDeriving? finalExtentClose
inductiveConstructor ::= "|" nestedDeclModifiers? ident constructorSignature?
legacyInductiveConstructor ::= inductiveConstructor ";"
-- `legacyInductiveConstructor` is accepted only in explicit migration mode;
-- canonical formatting emits `inductiveConstructor` without the semicolon.

structureDeclaration ::= modifiers? "structure" declId binder* extendsClause? resultType?
                         "where" "{" structureFieldList "}" derivingClause? finalExtentClose
classDeclaration     ::= modifiers? "class" declId binder* extendsClause? resultType?
                         "where" "{" classFieldList "}" derivingClause? finalExtentClose
extendsClause        ::= "extends" term ("," term)*
derivingClause       ::= defDeriving

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
                      ":=" defSimpleRhs terminationSuffix? localWhereSection? defDeriving? finalExtentClose

defEquationDeclaration ::= modifiers? "def" declId binder* resultType?
                           defEquationRegion terminationSuffix? localWhereSection? defDeriving? finalExtentClose

-- The third Lean `def` value form is specifically structure-field initialization.
-- It may be followed by the separate local helper `where` section, but it does
-- not inherit the simple/equation termination suffix.
defStructWhereDeclaration ::= modifiers? "def" declId binder* resultType?
                              defStructWhereBody localWhereSection? defDeriving? finalExtentClose

-- `function` and `const` are deliberately narrower command aliases. They accept
-- the same simple RHS closure policy as `def`, then expand to the corresponding
-- RHS `def` command before ordinary declaration elaboration. They do not create
-- equation-body or structure-field-`where` alias value grammars.
functionAliasDeclaration ::= modifiers? "function" declId binder+ resultType?
                             ":=" defSimpleRhs aliasRhsTail? defDeriving? finalExtentClose

constAliasDeclaration ::= modifiers? "const" declId resultType?
                          ":=" defSimpleRhs aliasRhsTail? defDeriving? finalExtentClose

-- Master closing policy:
--   A declaration requires command-level `;` only when its FINAL SOURCE EXTENT
--   is non-self-delimiting, after RHS/body and all permitted tails have been parsed.
-- This is deliberately stronger than deciding from the immediate RHS alone.
-- For example, `def x: T := helper where { ... }` closes at the final `}` of
-- the local-helper section; `def x: T := helper;` closes with the inline terminator.
-- A command-level terminator after a self-delimiting final extent is accepted only
-- in explicit migration/source-preserving mode and is removed by canonical formatting.
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

finalExtentClose ::= terminator              -- when final source extent is non-self-delimiting
                  | selfDelimitedClose       -- when final source extent is self-delimiting
selfDelimitedClose ::= ε

-- Declaration-tail closure summary. The close is selected from the final source
-- extent after all permitted tails are parsed.
declarationTailClosure ::=
    inlineTermFinalExtent      -> terminator
  | bareCommandFinalExtent      -> terminator
  | terminationByFinalExtent    -> terminator
  | bracedRhsFinalExtent        -> selfDelimitedClose
  | byTacticFinalExtent         -> selfDelimitedClose
  | doBlockFinalExtent          -> selfDelimitedClose
  | whereRegionFinalExtent      -> selfDelimitedClose
  | finallyRegionFinalExtent    -> selfDelimitedClose
  | bracedEquationFinalExtent   -> selfDelimitedClose


-- `terminator?` in legacy productions records parser-level compatibility
-- acceptance, not canonical formatting. Canonical output is determined by
-- final-source-extent: a final braced/`by`/`do`/`where`/`finally` region closes
-- itself, while a final inline term or bare command needs `;`.

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
defEquationRegion  ::= "where" "{" defEquationClause+ "}"
defEquationBody    ::= defEquationClause+  -- legacy/migration Lean-layout input only
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

**Contextual inductive-constructor-boundary rule:** inside `inductive ... where { ... }`, the parent constructor-list parser recognizes a top-level `|` as the next constructor and `}` as the end of the list only after the nested constructor-signature parser has returned. A `|` occurring inside a nested term/custom syntax category belongs to that category. There is no canonical `constructorTerminator` production. A semicolon after a completed constructor is accepted only under an explicit legacy-migration mode and is removed by canonical formatting.

**Contextual match-boundary rule:** the match parser owns top-level `|` only at its own alternative boundary; nested term/custom categories consume their own tokens first. Before the current alternative's single `=>` has been consumed, a top-level `|` introduces another `patternSequence` belonging to that same alternative. After `=>`, the parser consumes exactly one RHS `term` using the ordinary dynamic term grammar; only when that term parser returns does a following top-level `|` begin the next alternative, while `}` closes the match. There is no `branchTerminator` production. A `;` or `,` after the completed RHS at match level is a syntax error; punctuation nested inside the RHS remains owned by its nested category. Pattern-matching functions reuse the same ordinary-term alternative structure after canonical `fun`. When `match` is parsed as a `doElem`, the same LHS/pattern-sequence structure is retained but the RHS parser is `doSeq`; match-level `|`/`}` boundaries are recognized only after that do-sequence parser returns.

Imports remain in the module-header grammar rather than becoming arbitrary nested commands. The fragment does not authorize empty calls, JavaScript automatic semicolon insertion, general JS statements inside definition blocks, JavaScript-style function-return statements (while preserving Lean `termReturn` and `doReturn`), built-in `case` aliases for alternatives, branch-level `;`/`,` terminators, or all combinations of declaration tails. Inline non-self-delimiting simple `def`/`function`/`const` RHS forms require a command terminator `;`; self-delimiting RHS/body forms close at their own delimiter and do not use a canonical command-level `;`. Within `defBodyBlock`, each intermediate prelude has a mandatory literal `;`, while the final term is the block value and has no body-level trailing `;`. Structure-instance fields, `do` elements, tactic syntax, match branches, declarations, and custom brace forms keep their own separators and do not inherit the def-body rule. Commas inside a nested term are owned by that term. Expression, tactic, `do`, quotation and custom-category parsers retain their distinct boundaries. Macro and command elaboration update parser state incrementally.

## D.3 Canonical punctuation ownership matrix

| Category | Entry separator / terminator | Trailing form | Rule |
|---|---|---|---|
| `inductive ... where { ... }` constructor entry | top-level `|` / `}` boundary | `;` **not canonical**; legacy `;` may be migration-only | constructor-marker punctuation |
| `structure ... where { ... }` / `class ... where { ... }` field | `;` | **required** after final field | declaration-list punctuation |
| inline `def/function/const ... := expr` RHS | command terminator | `;` **required** | inline non-self-delimiting declaration closure |
| self-delimiting declaration final extent | closing delimiter | command-level `;` **not canonical** | braces/`by`/`do`/`where`/`finally` close their own region |
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
| structure/class declarations | `where { field; ... }` | field-list region, semicolon-separated |
| inductive declarations | `where { | ctor ... }` | constructor-list region, `|`-introduced entries |
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
