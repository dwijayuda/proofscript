# P5.67 Kernel HEq Primitive Report

P5.67 is a bounded trusted-boundary kernel improvement. It does not claim ProofScript is the same full theory as Lean 4, does not claim fully formal K3, and does not add formal Lean 4 equivalence proofs.

## Scope

The active PSKernel-derived TypeScript kernel now installs Lean 4.33.1-style heterogeneous equality primitives in the checked primitive prelude:

- `HEq`
- `HEq.refl`
- generated `HEq.rec`

The implementation uses ordinary checked inductive admission and existing K-like recursor reduction machinery. It does not trust a frontend flag that claims HEq behavior.

## TDD evidence

RED on P5.66:

```text
AssertionError [ERR_ASSERTION]: primitive installer must install HEq
```

GREEN on P5.67:

```text
npm run test:kernel:heq-primitive
KERNEL_HEQ_PRIMITIVE0=PASS exact-lean=PASS
```

Exact Lean 4.33.1 positive and negative probes cover `HEq.rec` K-reduction for matching heterogeneous endpoints and non-reduction/rejection for mismatched endpoints.

## Verification evidence

Fresh local and fresh-extract validation passed:

```text
npm run build -- --pretty false
npm run test:kernel:heq-primitive
npm run test:kernel:recursor-k
npm run test:kernel:nonmutual-recursor-defeq0
npm run test:differential
npm run test:wave-b
npm run test:wave-e
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:p5:baseline
npm run test:architecture
npm run test:conformance
npm run verify:k3tb:publish
```

The long `verify:production:no-build` wrapper timed out, so it is not counted as a pass. Its remaining production tail was rerun directly and passed:

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

K3-TB publish verification remains explicitly bounded:

```text
K3TB_PUBLISH_PREFLIGHT_VERIFY_STATUS=PASS
K3TB_PUBLISH_PREFLIGHT_VERIFY_BOUNDARY=PUBLISH_PREFLIGHT_NOT_FULLY_FORMAL_K3
```

## Release integrity

The P5.67 source ZIP excludes `node_modules`, `dist`, `*.tsbuildinfo`, nested ZIPs, and non-vendor tarballs. It preserves exactly three intentional vendored npm tarballs under `vendor/npm` for offline installation.

## PSC-1 counts

```text
Tracked PSC-1 features: 66
Supported PSC-1 features: 66
Executable supported features: 65
Verification matrix claims: 76
Required verification claims: 74
Verification commands tracked: 217
Traceability sources checked: 129 / 129
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
