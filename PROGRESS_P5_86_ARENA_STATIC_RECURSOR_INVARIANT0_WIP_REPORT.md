# P5.86 Arena Static Recursor Invariant0 WIP Report

Status: WIP / not frozen.

## Purpose

Continue Arena-driven kernel alignment without fixture-name shortcuts. P5.86 adds a generic trusted-import invariant for lean4export single non-mutual inductive declarations: the recursor block must contain exactly the recursor derived for that inductive. Extra or orphan recursor constants are malformed trusted export data and must be rejected, not declined as unsupported.

## External corpus

Source: uploaded `results(1).json` and `lean-arena-tests.tar.gz`.

- Arena revision: `a538455e201c1be48a11963cb83058649a36dc0e`
- lean4export: `3.1.0`
- Lean: `4.29.1`
- Tutorial tests: 140 total, 93 expected accept, 47 expected reject

This remains Arena evidence only. ProofScript's pinned internal oracle remains Lean 4.33.1. No full Lean 4 equivalence is claimed.

## Semantic change

In `packages/arena-checker/src/translate.ts`, a supported single non-mutual `inductive` export now rejects `recs.length !== 1` with `ArenaMalformedInputError`.

Rationale: for a single non-mutual inductive declaration, the checker must derive the recursor from the inductive declaration and reject any additional exported recursor. This addresses the `extra-rec` and `orphan-rec` Arena static attacks generically.

No kernel-codec change. This is an Arena importer / trusted export validation change, not a new trusted computation rule.

## Related Lean 4.33.1 probe

While rerunning kernel smoke, an older smoke fixture used an invalid universe-polymorphic `Sort u` family. Exact Lean 4.33.1 rejects such families because the result universe is not definitionally `Prop` but may instantiate to `Prop`. The smoke fixture was corrected to use the Lean-valid `Type u` shape (`Sort (u+1)`) for `Box` and `ListLike`.

## TDD evidence

RED on current P5.85 WIP baseline:

```text
npm run test:arena:single-inductive-recursor-invariant
bad/extra-rec.ndjson must reject malformed single-inductive recursor block, got 2
```

GREEN after implementation:

```text
npm run test:arena:single-inductive-recursor-invariant
ARENA_SINGLE_INDUCTIVE_RECURSOR_INVARIANT0=PASS
```

## Arena static non-performance result

Measured with `npm run test:arena:static-nonperf` over the uploaded non-performance static subset:

```text
total: 26
expected accept: 4
expected reject: 22
accepted good: 4
rejected bad: 13
declined unsupported: 9
wrong accepts: 0
wrong rejects: 0
checker crashes: 0
not run: 0
```

Delta from the previous static report:

```text
rejected bad: 11 -> 13
wrong accepts: 0 -> 0
declined unsupported: 11 -> 9
```

## Tutorial result preservation

P5.86 bounded reruns over the uploaded tutorial corpus preserve the P5.85 full tutorial agreement:

```text
140 / 140 tutorial files accounted
93 / 93 expected-good accepted
47 / 47 expected-bad rejected
0 declined unsupported
0 wrong accepts
0 wrong rejects
0 crashes
```

The monolithic tutorial wrapper is not counted because it can hit tool timeouts; range-bounded reruns completed successfully.

## Verification completed

Worktree:

- `npm run build -- --pretty false`: PASS
- `npm run test:arena:single-inductive-recursor-invariant`: PASS
- `npm run test:arena:large-elim-param-reject`: PASS
- `npm run test:arena:static-nonperf`: PASS
- `npm run test:kernel:smoke`: PASS
- `npm run test:p5:baseline`: PASS
- `npm run test:architecture`: PASS
- `npm run test:standalone-small`: PASS
- bounded real tutorial reruns: PASS 140/140 agreement

Fresh extract from generated WIP source ZIP:

- source residue: node_modules 0, dist 0, tsbuildinfo 0, nested ZIPs 0, non-vendor tgz 0, vendor/npm tgz 3
- `npm install --offline --no-audit --no-fund`: PASS
- `npm run build -- --pretty false`: PASS
- `npm run test:arena:single-inductive-recursor-invariant`: PASS
- `npm run test:arena:static-nonperf`: PASS
- `npm run test:kernel:smoke`: PASS
- `npm run test:p5:baseline`: PASS
- `npm run test:architecture`: PASS

Not completed after the P5.86 changes:

- full exact Lean 4.33.1 differential rerun
- full conformance wrapper/range split
- K3-TB publish full rerun
- full release freeze gate

## Trust boundary

K3-TB trusted-boundary only. Not fully formal K3. Not full Lean 4 equivalence. ProofScript same theory as full Lean 4: not claimed. Formal Lean 4 equivalence proven obligations remain 0.
