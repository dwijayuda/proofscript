# ProofScript Kernel v71 Assurance Checkpoint — Non-Mutual Classifier 1

Date: 2026-09-10

## Identity

- ProofScript Core format: **71**
- Profile: **`KERNEL-level-instantiation-conformance1`**
- Lean semantic baseline: **4.33.1**
- Lean commit: **`819816b2e0a3bf405af45ae5c7af2491d8f5bee6`**
- Kernel semantics changed in this checkpoint: **NO**

This checkpoint extends the formal and executable assurance boundary only.

## New formal slice

`InductiveNonMutualClassifierCorrespondence.lean` connects the generic raw
non-mutual admission theorem to the classifier boundary used by the shipped v71
checker.

The module defines the certificate interface a successful implementation-side
classifier must expose:

1. a raw constructor type is peeled through the copied parameter telescope;
2. the remaining constructor body satisfies the checked generic body-admission
   predicate;
3. family-level classifier witnesses discharge generic non-mutual admission;
4. classifier-produced normalized packages install through the existing
   non-mutual whole-environment theorem.

The new theorem layer proves:

- `ctorWitness_to_genericAdmission`;
- `ctorClassifier_sound`;
- `familyWitness_to_genericAdmission`;
- `familyClassifier_sound`;
- `classifier_rawAdmission_sound`;
- `classifierPackage_install_preserves`;
- `classifierPackages_wholeEnvironment_sound`.

The effective formal stack is now **30 modules**, inherited 29-module
`GENERIC_NONMUTUAL_ADMISSION1` plus this new module, with **zero reported
`sorryAx`**.

## New executable classifier vectors

`kernel-inductive-nonmutual-classifier-vectors.ts` exercises the actual shipped
TypeScript checker at the classifier boundary.  It covers:

- accepted recursive parameter matching through ordinary WHNF/defEq;
- accepted indexed recursive parameter matching through ordinary WHNF/defEq;
- accepted higher-order indexed recursion with pointwise IH generation;
- accepted Eq-like Prop/K metadata;
- accepted Prop field-universe exemption;
- rejected negative recursive occurrence;
- rejected malformed recursive/indexed occurrence before admission;
- rejected nonuniform constructor-result parameter;
- rejected constructor-field universe overflow;
- atomic rejection for all four malformed vector cases.

Result:

- **5 accepted vector families**
- **4 rejected malformed vector families**
- **1 Prop-exemption case**
- **3 WHNF/defEq uniform-parameter cases**
- **1 higher-order pointwise-IH case**
- **4/4 atomic rejections**
- **0 failures**

## Composed exact bridge

`kernel-inductive-nonmutual-classifier-correspondence-tests.ts` composes the new
vectors with the existing exact Lean-backed evidence:

1. generic non-mutual admission;
2. non-mutual integration;
3. generated non-mutual recursors;
4. whole-environment induction;
5. classifier vector boundary.

Result:

> `NONMUTUAL_CLASSIFIER_COMPONENTS=5 FAILURES=0`

## Release checks

All six bounded mandatory v71 assurance gates pass with explicit exit status 0:

1. foundation/formal — **PASS**
2. level/expression instantiation — **PASS**
3. typing/reduction — **PASS**
4. conversion/projection — **PASS**
5. recursor/quotient/generated-recursor — **PASS**
6. declaration/direct+indexed/non-mutual/generic/classifier admission — **PASS**

Additional checks:

- TypeScript build — **PASS**
- ProofScript conformance smoke corpus — **PASS**
- source-level Lean differential — **23/25**, with only the already-known
  generated-Lean frontend/exporter cases `reduction-recursion` and
  `equation-patterns` failing; these are not counted as kernel-equivalence
  evidence.

No timeout is interpreted as success.

## Claim boundary

This checkpoint **does not establish K3 whole-kernel equivalence**.

It establishes a precise classifier-witness boundary.  The remaining
implementation-correspondence work is to prove, against the actual TypeScript
source subset or an extracted executable model, that every successful branch of
the shipped normalizer/classifier constructs this witness, and that every
rejection branch agrees with exact Lean for the declared non-mutual input domain.

After that, the next major frontier is:

1. mutual inductive admission;
2. nested inductive preprocessing/admission;
3. implementation correspondence for the small TS TCB;
4. final K3 theorem.

## Next target

Proceed with **mutual inductive admission correspondence** unless we decide to
first extract the TypeScript classifier into a smaller proof-oriented model.
