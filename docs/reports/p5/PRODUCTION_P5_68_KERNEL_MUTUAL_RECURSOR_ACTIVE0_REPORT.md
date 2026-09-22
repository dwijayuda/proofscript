# P5.68 Kernel Mutual Recursor Active Report

P5.68 is a bounded trusted-boundary kernel improvement. It does not claim ProofScript is the same full theory as Lean 4, does not claim fully formal K3, and does not add formal Lean 4 equivalence proofs.

## Scope

The active PSKernel-derived TypeScript kernel now supports typed mutual recursor synthesis and iota reduction for audited mutual-inductive slices:

- direct zero-parameter Type mutual inductives
- shared and genuinely dependent uniform parameters
- indexed mutual families with per-family motive/index telescopes
- higher-order strictly positive mutual recursion with pointwise induction hypotheses
- mutual Prop families with Prop-only motives and mutual K disabled

The implementation remains fail-closed for unsupported whole-Lean mutual/nested generality.

## TDD evidence

RED on P5.67:

```text
AMut.rec stayed stuck instead of reducing by mutual iota.
Mutual higher-order and Prop profile boundaries had stale or overbroad behavior.
```

GREEN on P5.68:

```text
npm run test:kernel:mutual-recursor-active0
all five mutual suites pass with exact Lean 4.33.1 observations
```

Exact Lean 4.33.1 probes cover admission, recursor generation observations, iota reduction, universe mismatch rejection, positivity rejection, Prop-only mutual recursors, and mutual-K non-reduction.

## Verification evidence

Fresh local and fresh-extract validation passed:

```text
npm run build -- --pretty false
npm run test:kernel:mutual-recursor-active0
npm run test:differential
npm run test:kernel:recursor-k
npm run test:kernel:heq-primitive
npm run test:kernel:nonmutual-recursor-defeq0
npm run test:kernel:smoke
npm run test:p5:baseline
npm run test:architecture
npm run test:conformance
npm run test:standalone-small
npm run verify:k3tb:publish
```

The long production wrapper timed out during Wave A and was not counted as a pass. Its tail was rerun directly and passed:

```text
test:wave-a
test:integration:ui0
test:integration:ui1
test:integration:ui2
test:integration:ui3
test:integration:ui4
test:integration
test:coverage
```

Exact Lean differential remains green:

```text
Lean 4.33.1
commit 819816b2e0a3bf405af45ae5c7af2491d8f5bee6
25/25 PASS
```

## Release integrity

The source ZIP excludes `node_modules`, `dist`, `*.tsbuildinfo`, nested ZIPs, and non-vendor tarballs. It preserves exactly three intentional vendored npm tarballs under `vendor/npm` for offline installation.

## PSC-1 counts

```text
Tracked PSC-1 features: 66
Supported PSC-1 features: 66
Executable supported features: 65
Verification matrix claims: 77
Required verification claims: 75
Verification commands tracked: 220
Traceability sources checked: 135 / 135
Proof obligations: 10
Required for formal Lean 4 equivalence: 8
Formal Lean 4 equivalence proven obligations: 0
```

## Trust boundary

```text
K3-TB trusted-boundary: YES
Fully formal K3: NO
Full Lean 4 equivalence: NO
ProofScript same theory as full Lean 4: NO
Formal Lean 4 equivalence proven obligations: 0
```
