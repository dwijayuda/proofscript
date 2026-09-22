# ProofScript Specification Authority

Status: active policy for the PS1/PS2 convergence track.

## 1. Language reference

The active source-language baseline is:

```text
ProofScript Language Reference v0.6.1
```

Repository path:

```text
specs/language/ProofScript_Language_Reference_v0.6.1.md
```

The v0.6.1 reference is versioned and immutable as a released/reference baseline. Corrections that change language meaning require a new version rather than silent edits.

Older v0.1/v0.1.x language references are historical/legacy material only unless a specific assurance artifact explicitly identifies them.

## 2. v0.6.1 compiler-ready conformance package

The compiler-ready v0.6.1 package defines more than prose. Its authority includes:

- the registered feature set;
- feature-registry/schema data;
- positive/negative conformance cases;
- canonical Lean lowering cases;
- diagnostics expectations;
- parser/lowering API contract;
- runtime-profile requirements;
- proof-obligation/claim-level definitions.

PS2 should import/normalize these machine-readable assets into the repository and run them against the production frontend.

The registered v0.6.1 surface features are:

```text
L-CORE-LEAN
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

## 3. Native implementation authority

The implementation is allowed to support more internal Core/kernel functionality than the v0.6.1 surface reference exposes.

That does not automatically make every accepted source form part of the language.

For product claims:

```text
source feature
  -> must be registered by the active language profile
  -> must have tests/conformance evidence
  -> must lower to explicit checked Core
  -> must be accepted/rejected by the native checker according to that profile
```

Unknown/unregistered source syntax must not silently become a ProofScript-owned verified feature.

## 4. v0.7 development

v0.7 is the next language specification track.

Existing KA138–KA146 implementation work for contracts, obligations, state models, loop invariants, and monadic lowering is valuable implementation evidence, but it is not automatically the final v0.7 specification.

A v0.7 feature becomes product-authoritative only when it has:

1. a registered feature ID;
2. grammar;
3. static semantics;
4. lowering/meaning;
5. trust-boundary statement;
6. runtime-erasure/correspondence rule where relevant;
7. positive/negative conformance cases;
8. diagnostics;
9. certificate/manifest representation where relevant.

The verification-extension registry uses class:

```text
V — Verification Extension
```

Initial candidate features:

```text
V-REQUIRES
V-ENSURES
V-RESULT
V-ASSERT
V-GHOST
V-OLD
V-INVARIANT
V-DECREASES
V-MONADIC-CONTRACT
V-FRAME
```

## 5. Lean relationship

Lean is the semantic/reference ecosystem, but product authority is explicit by artifact and profile.

Do not conflate these claims:

```text
"lowers to canonical Lean"
"Lean accepts emitted code"
"PSKernel accepts checked Core"
"source frontend refines the reference grammar/lowering"
"runtime output corresponds to the proved program"
"ProofScript kernel is fully equivalent to Lean"
```

Each requires its own evidence.

The product should support native checking without Lean installed for the implemented profile. Exact Lean versions remain reference/oracle and assurance lanes.

## 6. Certificate metadata

Current legacy certificate metadata that reports:

```text
proofscriptReference: v0.1
semanticBaseline: lean-4.33.1
```

must not be carried into a v0.7 product release by inertia.

PS2 must replace hard-coded legacy metadata with an explicit release/profile manifest that records:

- ProofScript spec version;
- implementation/compiler revision;
- kernel/Core profile;
- conformance level;
- exact Lean oracle version/commit when used;
- runtime profile;
- axiom policy;
- artifact hashes.

Historical certificates remain historical and must not be rewritten.

## 7. Claim and conformance levels

Use the v0.6.1 compiler-ready vocabulary exactly.

Normative C-level meanings are:

```text
C0 = static corpus well formed
C1 = reference frontend accepts/rejects corpus correctly
C2 = reference frontend emits canonical Lean corpus
C3 = production frontend matches the reference frontend
C4 = corpus properties covered by machine-checked reference theorems
```

C-levels are separate from S1–S5 proof claims. A production-only parser corpus test must not be labeled C1, and a production-only lowering test must not be labeled C2.

Implementation progress is reported by passing gates/cases, not subjective percentage.

Examples:

```text
v0.6.1 normative conformance: C0
production surface corpus: 20/20
production lowering corpus: 0/12
reference frontend C1/C2: pending
verification features specified: 4/10
Lean differential dimensions: 17/21
```

## 8. Conflict rule

If a document, historical report, source comment, or package metadata conflicts with the active specification authority:

1. do not guess;
2. identify the conflict;
3. keep historical evidence immutable;
4. update active product metadata/docs/code in a separate reviewed change;
5. add a regression test when the conflict affects executable behavior.
