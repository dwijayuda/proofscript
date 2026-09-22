# P5.70 Kernel Quot.sound Active Report

P5.70 is a bounded trusted-boundary kernel quotient-theory improvement. It does not claim ProofScript is the same full theory as Lean 4, does not claim fully formal K3, and does not add formal Lean 4 equivalence proofs.

## Scope

The active PSKernel-derived TypeScript kernel now installs Lean 4.33.1-style `Quot.sound` as part of canonical quotient initialization:

- `Quot`
- `Quot.mk`
- `Quot.lift`
- `Quot.ind`
- `Quot.sound`

`Quot.sound` is represented as a trusted quotient primitive axiom with the pinned Lean 4.33.1 type, not as a user-supplied external axiom requiring a separate verifier allow-list. This makes the quotient theory closer to Lean's initialized kernel environment while preserving explicit trust-boundary labeling.

## TDD evidence

RED on P5.69:

```text
AssertionError [ERR_ASSERTION]: primitive installer must install Quot.sound
```

GREEN on P5.70:

```text
npm run test:kernel:quot-sound-active0
KERNEL_QUOT_SOUND_ACTIVE0=PASS exact-lean=PASS
```

Exact Lean 4.33.1 probes cover `@Quot.sound`, `#print Quot.sound`, and the equality witness shape `Quot.mk r a = Quot.mk r b` from a proof of `r a b`.

## Verification evidence

Fresh local and fresh-extract validation passed:

```text
npm run build -- --pretty false
npm run test:kernel:quot-sound-active0
npm run test:kernel:quotient-defeq0
npm run test:differential
npm run test:kernel:recursor-k
npm run test:kernel:heq-primitive
npm run test:kernel:mutual-recursor-active0
npm run test:kernel:nonmutual-recursor-defeq0
npm run test:kernel:smoke
npm run test:standalone-small
npm run test:p5:baseline
npm run test:architecture
npm run test:conformance
npm run verify:k3tb:publish
```

The long `verify:production:no-build` wrapper timed out, so it is not counted as a pass. Its remaining production tail was rerun directly and passed.

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

The P5.70 source ZIP excludes `node_modules`, `dist`, `*.tsbuildinfo`, nested ZIPs, and non-vendor tarballs. It preserves exactly three intentional vendored npm tarballs under `vendor/npm` for offline installation.

## PSC-1 counts

```text
Tracked PSC-1 features: 66
Supported PSC-1 features: 66
Executable supported features: 65
Verification matrix claims: 79
Required verification claims: 77
Verification commands tracked: 227
Traceability sources checked: 136 / 136
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

## Final artifact

The final external release report carries the source ZIP SHA-256. The in-tree report intentionally does not embed the ZIP hash to avoid self-referential archive drift.
