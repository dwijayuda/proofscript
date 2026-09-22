# 00 — ProofScript Project Constitution

## 1. Mission

ProofScript exists to become a practical programming language and theorem prover that can eventually live without Lean 4 while remaining semantically faithful to Lean 4 concepts.

The project has two simultaneous goals:

1. **Near-term:** ship a small complete standalone language profile, PSC-1, that is useful for real programs and small proofs without Lean 4 installed.
2. **Long-term:** grow toward full Lean-like language coverage through a production-grade architecture, formal proof obligations, and auditable conformance.

## 2. Identity

ProofScript is not TypeScript with proofs bolted on.

ProofScript is:

- Lean-semantics-oriented;
- TypeScript-ecosystem-oriented;
- standalone-first over time;
- proof-aware from the beginning;
- small-profile-first for implementation speed.

The slogan is:

```text
Change the surface shape, never invent a different logical concept.
```

## 3. Non-negotiable principles

### 3.1 Semantic faithfulness

Every standard ProofScript semantic concept must correspond to a Lean-compatible concept unless the feature is explicitly marked experimental, unsafe, or nonstandard.

### 3.2 Small first, full later

The project must first make PSC-1 work well. PSC-1 is the small complete profile.

Full Lean-like ProofScript remains the future goal, but full coverage must not block the small standalone subset.

### 3.3 Fail closed

Unsupported language, kernel, proof, parser, elaborator, or backend behavior must reject with a clear error.

It must never silently pass because “maybe Lean would accept it.”

### 3.4 Kernel before convenience

If a source program cannot elaborate into kernel-checkable declarations, it is not accepted in the trusted profile.

### 3.5 Proof obligations over test illusion

Tests are necessary for smoke and regression evidence, but tests are not proofs. Every semantic claim needs a proof obligation or a documented trust assumption.

### 3.6 Production-grade architecture

Fast development is allowed. Spaghetti architecture is not.

Fast work must preserve package boundaries, public contracts, and migration paths.

### 3.7 No false equivalence claims

Until proven, the project must not claim:

- full Lean 4 equivalence;
- fully formal K3;
- complete Lean language coverage;
- proof of compiler correctness;
- proof of JS runtime semantic equivalence.

Use conservative trust labels.

## 4. Official profiles

### 4.1 PSC-1: Small Complete Standalone Profile

PSC-1 is the first product target.

It supports:

- small `.ps` source parsing;
- explicit definitions;
- pure total functions;
- Nat, Bool, Unit, String later, Option/List/Result;
- simple structures;
- simple non-indexed inductives;
- canonical Eq;
- theorem declarations;
- tiny proof language;
- kernel replay/check/certify;
- JavaScript output for executable subset.

### 4.2 Full ProofScript

Full ProofScript is the future target.

It may include:

- Lean-like dynamic parser;
- macros;
- syntax quotations;
- tactic framework;
- typeclass search;
- coercions;
- indexed/mutual/nested inductives;
- advanced recursion;
- richer standard library;
- richer JS/TS backend;
- Lean import/oracle/differential tooling.

Full ProofScript must be built as extensions over the same clean architecture, not by rewriting the project into a second language.

## 5. Amendment rule

This constitution may be amended only by a written decision record.

Every amendment must state:

- reason;
- affected files;
- compatibility impact;
- trust-boundary impact;
- migration plan;
- proof obligations added or retired.
