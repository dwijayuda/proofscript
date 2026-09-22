# P5.71 Kernel propext Active Report

P5.71 is a bounded trusted-boundary kernel prelude improvement. It does not claim ProofScript is the same full theory as Lean 4, does not claim fully formal K3, and does not add formal Lean 4 equivalence proofs.

## Scope

The active PSKernel-derived TypeScript kernel can now install Lean 4.33.1-style propositional extensionality support in the checked primitive prelude when requested:

- `Iff`
- `Iff.intro`
- generated `Iff.rec`
- trusted axiom `propext`

`propext` is represented with the pinned Lean 4.33.1 type `∀ {a b : Prop}, (a ↔ b) → a = b`. It is not a computational primitive and does not add a new reduction rule.

## TDD evidence

RED on P5.70:

```text
AssertionError [ERR_ASSERTION]: primitive installer must install Iff before propext when requested
```

GREEN on P5.71:

```text
npm run test:kernel:propext-active0
KERNEL_PROPEXT_ACTIVE0=PASS exact-lean=PASS
```

Exact Lean 4.33.1 probes cover `#print Iff`, `#print propext`, and a proof term `propext h : P = Q` from `h : P ↔ Q`.

## Verification evidence

Fresh local and fresh-extract validation passed:

```text
npm run build -- --pretty false
npm run test:kernel:propext-active0
npm run test:kernel:quot-sound-active0
npm run test:kernel:quotient-defeq0
npm run test:differential
npm run test:kernel:recursor-k
npm run test:kernel:heq-primitive
npm run test:kernel:mutual-recursor-active0
npm run test:kernel:nonmutual-recursor-defeq0
npm run test:kernel:smoke
npm run test:p5:baseline
npm run test:architecture
npm run test:conformance
npm run test:standalone-small
npm run verify:k3tb:publish
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

The P5.71 source ZIP excludes `node_modules`, `dist`, `*.tsbuildinfo`, nested ZIPs, and non-vendor tarballs. It preserves exactly three intentional vendored npm tarballs under `vendor/npm` for offline installation.

## PSC-1 counts

```text
Tracked PSC-1 features: 66
Supported PSC-1 features: 66
Executable supported features: 65
Verification matrix claims: 80
Required verification claims: 78
Verification commands tracked: 230
Traceability sources checked: 138 / 138
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
