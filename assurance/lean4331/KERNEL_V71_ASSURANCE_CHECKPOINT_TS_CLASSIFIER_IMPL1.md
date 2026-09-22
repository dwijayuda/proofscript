# ProofScript Kernel v71 Assurance Checkpoint — TypeScript Classifier Implementation 1

Date: 2026-09-10

## Identity

- ProofScript Core format: **71**
- Profile: **`KERNEL-level-instantiation-conformance1`**
- Lean semantic baseline: **4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantics changed in this checkpoint: **NO**

This checkpoint extends the implementation-correspondence evidence for the non-mutual inductive classifier. It does not change the trusted checker semantics.

## New formal contract

`TypeScriptClassifierImplementationContract.lean` defines a small implementation-evidence contract:

1. source-slice audit evidence must be clean;
2. runtime classifier vectors must have zero failures;
3. every rejected vector must be atomic;
4. accepted outcomes remain the only path that exposes the classifier witness used by the heavier theorem stack.

The module is intentionally independent of JavaScript runtime semantics. It does **not** prove every TypeScript branch. It formalizes the bridge contract that the direct source/runtime audit satisfies.

Effective formal stack/contract count:

> **31 effective formal modules/contracts, zero reported `sorryAx`**

This is the inherited 30-module classifier stack plus the new implementation contract.

## Direct TypeScript implementation audit

`kernel-inductive-nonmutual-ts-implementation-correspondence-tests.ts` audits the actual shipped TypeScript source path and the exported runtime path.

Source-slice functions checked:

- `positiveRecursiveFieldType`
- `checkConstructorFieldUniverse`
- `propEliminationMotivePolicy`
- `checkSimpleInductive`
- `checkIndexedInductive0`
- `checkAndAddDeclaration`

The audit checks **46 source obligations** with **0 missing**. The obligations include:

- WHNF before recursive classification;
- Pi-domain recursive-occurrence rejection;
- uniform-parameter matching through `defEq`;
- recursive occurrence inside indices rejected;
- constructor-field universe ceiling;
- Prop exemption for field universes;
- staged atomic admission;
- exact constructor-result family/parameter/index checks;
- generator branch selection for simple, parameterized, indexed, and indexed-recursive recursors.

The source-slice hashes are recorded in the evidence file.

## Runtime implementation vectors

The actual exported `checkAndAddDeclaration` path is exercised with:

- **5 accepted families**;
- **4 rejected families**;
- **4/4 atomic rejections**;
- **4 option sentinels**;
- **0 failures**.

The runtime vectors cover WHNF/defEq uniform parameters, indexed recursive parameters, higher-order pointwise IH construction, Eq-like Prop/K metadata, Prop universe exemption, negative recursion, malformed indexed recursion, nonuniform result parameter, and universe overflow.

The bridge also composes with the exact Lean-backed classifier evidence:

> `NONMUTUAL_CLASSIFIER_COMPONENTS=5 FAILURES=0`

Final implementation-bridge result:

> `TS_CLASSIFIER_IMPL_CORRESPONDENCE_FAILURES=0`

## Release checks

All six bounded mandatory v71 assurance gates pass with explicit exit status 0:

1. foundation/formal/implementation-contract — **PASS**
2. level/expression instantiation — **PASS**
3. typing/reduction — **PASS**
4. conversion/projection — **PASS**
5. recursor/quotient/generated-recursor — **PASS**
6. declaration/direct+indexed/non-mutual classifier implementation — **PASS**

Additional checks:

- TypeScript build — **PASS**
- ProofScript conformance smoke corpus — **PASS**
- source-level Lean differential — **23/25**, with only the already-known generated-Lean frontend/exporter cases `reduction-recursion` and `equation-patterns` failing; these are not counted as kernel-equivalence evidence.

No timeout is interpreted as success.

## Claim boundary

This checkpoint is **not K3 whole-kernel equivalence**.

It establishes a stronger bounded implementation bridge for the non-mutual classifier path, but full O-IMPL still requires either:

1. a formal semantics for the restricted TypeScript trusted subset; or
2. extraction of the trusted checker/classifier into a proof-oriented model;

followed by whole-kernel coverage.

## Next target

Proceed to **mutual inductive admission correspondence** while keeping this non-mutual TypeScript implementation bridge as the regression boundary.
